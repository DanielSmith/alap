// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! URL sanitization — blocks dangerous schemes (`javascript:`, `data:`, etc.).
//!
//! Three entry points:
//!
//!   - [`sanitize_url`]              — loose; allows http, https, mailto,
//!                                     tel, relative, empty; blocks the
//!                                     dangerous set.
//!   - [`sanitize_url_strict`]       — http / https / mailto only (plus
//!                                     relative / empty).
//!   - [`sanitize_url_with_schemes`] — configurable scheme allowlist.

use std::sync::LazyLock;

use regex::Regex;

use crate::types::Link;

static CONTROL_CHAR_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\x00-\x1f\x7f]").expect("CONTROL_CHAR_RE is a valid regex"));

static DANGEROUS_SCHEME: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(javascript|data|vbscript|blob)\s*:").expect("DANGEROUS_SCHEME is a valid regex")
});

static SCHEME_MATCH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:").expect("SCHEME_MATCH is a valid regex")
});

/// Default allowlist used by [`sanitize_url_with_schemes`] when the
/// caller passes `None`. http and https only.
pub const DEFAULT_SCHEMES: &[&str] = &["http", "https"];

/// Allowlist used by [`sanitize_url_strict`]: http / https / mailto.
pub const STRICT_SCHEMES: &[&str] = &["http", "https", "mailto"];

/// Returns the URL unchanged if safe, or `"about:blank"` if it uses a
/// dangerous scheme (`javascript:`, `data:`, `vbscript:`, `blob:`).
///
/// Allows: http, https, mailto, tel, relative URLs, empty string.
/// Blocks are case-insensitive; control characters are stripped before
/// the scheme check to defeat `java\nscript:` disguises.
#[must_use]
pub fn sanitize_url(url: &str) -> String {
    if url.is_empty() {
        return url.to_owned();
    }
    let normalized = CONTROL_CHAR_RE.replace_all(url, "");
    let normalized = normalized.trim();
    if DANGEROUS_SCHEME.is_match(normalized) {
        "about:blank".to_owned()
    } else {
        url.to_owned()
    }
}

/// Strict URL sanitizer — http / https / mailto only (plus relative
/// URLs and empty string). Use for links whose origin has not been
/// verified as author-tier: protocol handler results, storage-loaded
/// configs, etc.
#[must_use]
pub fn sanitize_url_strict(url: &str) -> String {
    sanitize_url_with_schemes(url, Some(STRICT_SCHEMES))
}

/// Sanitize `url` against a configurable scheme allowlist.
///
/// Runs the dangerous-scheme blocklist first (defence in depth:
/// `javascript:` is blocked even when it appears in the allowlist).
/// Relative URLs pass through unchanged regardless of the allowlist.
/// Passing `None` uses [`DEFAULT_SCHEMES`] (http / https only).
#[must_use]
pub fn sanitize_url_with_schemes(url: &str, allowed_schemes: Option<&[&str]>) -> String {
    let base = sanitize_url(url);
    if base == "about:blank" || base.is_empty() {
        return base;
    }

    let schemes = allowed_schemes.unwrap_or(DEFAULT_SCHEMES);

    let normalized = CONTROL_CHAR_RE.replace_all(&base, "");
    let normalized = normalized.trim();
    if let Some(caps) = SCHEME_MATCH.captures(normalized) {
        let scheme = caps
            .get(1)
            .expect("capture group 1 guaranteed by regex")
            .as_str()
            .to_lowercase();
        if !schemes.iter().any(|s| *s == scheme) {
            return "about:blank".to_owned();
        }
    }

    base
}

pub(crate) fn sanitize_link(link: &Link) -> Link {
    let mut out = link.clone();
    if !out.url.is_empty() {
        let safe = sanitize_url(&out.url);
        if safe != out.url {
            out.url = safe;
        }
    }
    out
}
