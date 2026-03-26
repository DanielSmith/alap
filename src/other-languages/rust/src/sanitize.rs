// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! URL sanitization — blocks dangerous schemes (`javascript:`, `data:`, etc.).

use std::sync::LazyLock;

use regex::Regex;

use crate::types::Link;

static CONTROL_CHAR_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\x00-\x1f\x7f]").unwrap());

static DANGEROUS_SCHEME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^(javascript|data|vbscript|blob)\s*:").unwrap());

/// Returns the URL unchanged if safe, or `"about:blank"` if it uses a
/// dangerous scheme (`javascript:`, `data:`, `vbscript:`, `blob:`).
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
