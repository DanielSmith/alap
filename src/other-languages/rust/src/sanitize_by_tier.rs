// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Tier-aware sanitizers — Rust port of src/core/sanitizeByTier.ts.
//!
//! Consumers (renderers, anything that takes a validated link and
//! forwards it into a rendered surface) read provenance off each link
//! and apply the appropriate rule: strict on anything that crossed a
//! trust boundary (storage adapter, protocol handler, unstamped),
//! loose on author-tier links the developer hand-wrote.
//!
//! Fail-closed policy: a link with no provenance stamp is treated as
//! untrusted. `validate_config` stamps every link it returns, so the
//! only way an unstamped link ends up here is if it bypassed
//! validation — a code path that should not exist in normal use.

use crate::link_provenance;
use crate::sanitize::{sanitize_url, sanitize_url_strict};
use crate::types::Link;

/// Loose sanitize for author-tier, strict otherwise.
///
/// Author-tier gets [`sanitize_url`] (permits `tel:`, `mailto:`, and
/// any custom developer-intended scheme that is not explicitly
/// dangerous). Everything else — including unstamped — gets
/// [`sanitize_url_strict`] (http / https / mailto only).
#[must_use]
pub fn sanitize_url_by_tier(url: &str, link: &Link) -> String {
    if link_provenance::is_author_tier(link) {
        sanitize_url(url)
    } else {
        sanitize_url_strict(url)
    }
}

/// Author keeps its `css_class`; everything else drops it (returns `None`).
///
/// Attacker-controlled class names can target CSS selectors that
/// exfiltrate data via `content: attr(...)`, trigger layout-driven
/// side channels, or overlay visible UI to mislead the user. There is
/// no narrow allowlist that beats "do not let untrusted input pick a
/// class at all."
#[must_use]
pub fn sanitize_css_class_by_tier(css_class: Option<&str>, link: &Link) -> Option<String> {
    match css_class {
        Some(c) if link_provenance::is_author_tier(link) => Some(c.to_owned()),
        _ => None,
    }
}

/// Author passes `target_window` through (including `None`);
/// everything else clamps to `Some("_blank")` unconditionally.
///
/// Even when a non-author link did not specify its own target, we
/// still clamp to `_blank` rather than let it inherit the author's
/// named-window default (e.g. `"fromAlap"`). Letting a storage- or
/// protocol-tier link ride into an author-reserved window would let
/// it overwrite whatever the author had open there.
#[must_use]
pub fn sanitize_target_window_by_tier(
    target_window: Option<&str>,
    link: &Link,
) -> Option<String> {
    if link_provenance::is_author_tier(link) {
        target_window.map(|s| s.to_owned())
    } else {
        Some("_blank".to_owned())
    }
}
