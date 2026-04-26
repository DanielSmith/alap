// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Tests for `sanitize_url`, `sanitize_url_strict`, `sanitize_url_with_schemes`.

use alap::{sanitize_url, sanitize_url_strict, sanitize_url_with_schemes};

// ---- Loose (sanitize_url) ----

#[test]
fn loose_https_passes() {
    assert_eq!(sanitize_url("https://example.com"), "https://example.com");
}

#[test]
fn loose_http_passes() {
    assert_eq!(sanitize_url("http://example.com"), "http://example.com");
}

#[test]
fn loose_mailto_passes() {
    assert_eq!(sanitize_url("mailto:a@b.com"), "mailto:a@b.com");
}

#[test]
fn loose_tel_passes() {
    assert_eq!(sanitize_url("tel:+15551234"), "tel:+15551234");
}

#[test]
fn loose_relative_passes() {
    assert_eq!(sanitize_url("/foo/bar"), "/foo/bar");
}

#[test]
fn loose_empty_passes() {
    assert_eq!(sanitize_url(""), "");
}

#[test]
fn loose_javascript_blocked() {
    assert_eq!(sanitize_url("javascript:alert(1)"), "about:blank");
}

#[test]
fn loose_javascript_case_insensitive() {
    assert_eq!(sanitize_url("JAVASCRIPT:alert(1)"), "about:blank");
    assert_eq!(sanitize_url("JavaScript:alert(1)"), "about:blank");
}

#[test]
fn loose_data_blocked() {
    assert_eq!(sanitize_url("data:text/html,x"), "about:blank");
}

#[test]
fn loose_vbscript_blocked() {
    assert_eq!(sanitize_url("vbscript:alert(1)"), "about:blank");
}

#[test]
fn loose_blob_blocked() {
    assert_eq!(sanitize_url("blob:https://example.com/abc"), "about:blank");
}

#[test]
fn loose_control_char_newline_blocked() {
    assert_eq!(sanitize_url("java\nscript:alert(1)"), "about:blank");
}

#[test]
fn loose_control_char_tab_blocked() {
    assert_eq!(sanitize_url("java\tscript:alert(1)"), "about:blank");
}

#[test]
fn loose_control_char_null_blocked() {
    assert_eq!(sanitize_url("java\0script:alert(1)"), "about:blank");
}

#[test]
fn loose_whitespace_before_colon_blocked() {
    assert_eq!(sanitize_url("javascript :alert(1)"), "about:blank");
}

// ---- Strict (sanitize_url_strict) ----

#[test]
fn strict_https_passes() {
    assert_eq!(sanitize_url_strict("https://example.com"), "https://example.com");
}

#[test]
fn strict_http_passes() {
    assert_eq!(sanitize_url_strict("http://example.com"), "http://example.com");
}

#[test]
fn strict_mailto_passes() {
    assert_eq!(sanitize_url_strict("mailto:a@b.com"), "mailto:a@b.com");
}

#[test]
fn strict_relative_passes() {
    assert_eq!(sanitize_url_strict("/foo"), "/foo");
}

#[test]
fn strict_empty_passes() {
    assert_eq!(sanitize_url_strict(""), "");
}

#[test]
fn strict_tel_blocked() {
    assert_eq!(sanitize_url_strict("tel:+15551234"), "about:blank");
}

#[test]
fn strict_ftp_blocked() {
    assert_eq!(sanitize_url_strict("ftp://example.com"), "about:blank");
}

#[test]
fn strict_custom_scheme_blocked() {
    assert_eq!(
        sanitize_url_strict("obsidian://open?vault=foo"),
        "about:blank"
    );
}

#[test]
fn strict_javascript_still_blocked() {
    assert_eq!(sanitize_url_strict("javascript:alert(1)"), "about:blank");
}

#[test]
fn strict_data_still_blocked() {
    assert_eq!(sanitize_url_strict("data:text/html,x"), "about:blank");
}

#[test]
fn strict_control_char_still_blocked() {
    assert_eq!(sanitize_url_strict("java\nscript:alert(1)"), "about:blank");
}

// ---- WithSchemes (sanitize_url_with_schemes) ----

#[test]
fn with_schemes_default_allows_http_https() {
    assert_eq!(
        sanitize_url_with_schemes("http://example.com", None),
        "http://example.com"
    );
    assert_eq!(
        sanitize_url_with_schemes("https://example.com", None),
        "https://example.com"
    );
}

#[test]
fn with_schemes_default_blocks_mailto() {
    // Default allowlist is http / https only
    assert_eq!(sanitize_url_with_schemes("mailto:a@b.com", None), "about:blank");
}

#[test]
fn with_schemes_custom_allowlist_permits_obsidian() {
    assert_eq!(
        sanitize_url_with_schemes(
            "obsidian://open?vault=foo",
            Some(&["http", "https", "obsidian"]),
        ),
        "obsidian://open?vault=foo"
    );
}

#[test]
fn with_schemes_custom_allowlist_blocks_unlisted() {
    assert_eq!(
        sanitize_url_with_schemes("ftp://example.com", Some(&["http", "https"])),
        "about:blank"
    );
}

#[test]
fn with_schemes_relative_passes_regardless() {
    assert_eq!(sanitize_url_with_schemes("/foo", Some(&["http"])), "/foo");
}

#[test]
fn with_schemes_dangerous_blocked_even_if_in_allowlist() {
    // Defence-in-depth: dangerous-scheme blocklist runs first, so an
    // allowlist that contains "javascript" still blocks javascript: URLs.
    assert_eq!(
        sanitize_url_with_schemes("javascript:alert(1)", Some(&["javascript"])),
        "about:blank"
    );
}

#[test]
fn with_schemes_empty_allowlist_rejects_scheme_bearing() {
    assert_eq!(
        sanitize_url_with_schemes("http://example.com", Some(&[])),
        "about:blank"
    );
}

#[test]
fn with_schemes_empty_allowlist_passes_relative() {
    assert_eq!(sanitize_url_with_schemes("/foo", Some(&[])), "/foo");
}

#[test]
fn with_schemes_case_insensitive_scheme_match() {
    assert_eq!(
        sanitize_url_with_schemes("HTTPS://example.com", Some(&["https"])),
        "HTTPS://example.com"
    );
}
