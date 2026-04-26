// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Tests for `sanitize_by_tier` — tier-aware URL / cssClass / targetWindow.

use alap::link_provenance::must_stamp;
use alap::sanitize_by_tier::{
    sanitize_css_class_by_tier, sanitize_target_window_by_tier, sanitize_url_by_tier,
};
use alap::{Link, Tier};

fn stamped_link(tier: Tier) -> Link {
    let mut link = Link {
        url: "/a".into(),
        ..Default::default()
    };
    must_stamp(&mut link, tier);
    link
}

fn unstamped_link() -> Link {
    Link {
        url: "/a".into(),
        ..Default::default()
    }
}

// ---- URL: author tier ----

#[test]
fn url_author_keeps_https() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_url_by_tier("https://example.com", &link),
        "https://example.com"
    );
}

#[test]
fn url_author_keeps_http() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_url_by_tier("http://example.com", &link),
        "http://example.com"
    );
}

#[test]
fn url_author_keeps_tel() {
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_url_by_tier("tel:+15551234", &link), "tel:+15551234");
}

#[test]
fn url_author_keeps_mailto() {
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_url_by_tier("mailto:a@b.com", &link), "mailto:a@b.com");
}

#[test]
fn url_author_keeps_custom_scheme() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_url_by_tier("obsidian://open?vault=foo", &link),
        "obsidian://open?vault=foo"
    );
}

#[test]
fn url_author_still_blocks_javascript() {
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_url_by_tier("javascript:alert(1)", &link), "about:blank");
}

#[test]
fn url_author_still_blocks_data() {
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_url_by_tier("data:text/html,x", &link), "about:blank");
}

#[test]
fn url_author_keeps_relative() {
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_url_by_tier("/foo/bar", &link), "/foo/bar");
}

// ---- URL: storage tier ----

#[test]
fn url_storage_remote_keeps_https() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(
        sanitize_url_by_tier("https://example.com", &link),
        "https://example.com"
    );
}

#[test]
fn url_storage_remote_keeps_mailto() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(sanitize_url_by_tier("mailto:a@b.com", &link), "mailto:a@b.com");
}

#[test]
fn url_storage_remote_rejects_tel() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(sanitize_url_by_tier("tel:+15551234", &link), "about:blank");
}

#[test]
fn url_storage_remote_rejects_custom_scheme() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(
        sanitize_url_by_tier("obsidian://open?vault=foo", &link),
        "about:blank"
    );
}

#[test]
fn url_storage_local_rejects_tel() {
    let link = stamped_link(Tier::StorageLocal);
    assert_eq!(sanitize_url_by_tier("tel:+15551234", &link), "about:blank");
}

#[test]
fn url_storage_remote_still_blocks_javascript() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(sanitize_url_by_tier("javascript:alert(1)", &link), "about:blank");
}

// ---- URL: protocol tier ----

#[test]
fn url_protocol_keeps_https() {
    let link = stamped_link(Tier::Protocol("web".into()));
    assert_eq!(
        sanitize_url_by_tier("https://example.com", &link),
        "https://example.com"
    );
}

#[test]
fn url_protocol_rejects_tel() {
    let link = stamped_link(Tier::Protocol("web".into()));
    assert_eq!(sanitize_url_by_tier("tel:+15551234", &link), "about:blank");
}

#[test]
fn url_protocol_rejects_custom_scheme() {
    let link = stamped_link(Tier::Protocol("atproto".into()));
    assert_eq!(sanitize_url_by_tier("obsidian://open", &link), "about:blank");
}

#[test]
fn url_protocol_blocks_javascript() {
    let link = stamped_link(Tier::Protocol("web".into()));
    assert_eq!(sanitize_url_by_tier("javascript:alert(1)", &link), "about:blank");
}

// ---- URL: unstamped (fail-closed) ----

#[test]
fn url_unstamped_rejects_tel() {
    let link = unstamped_link();
    assert_eq!(sanitize_url_by_tier("tel:+15551234", &link), "about:blank");
}

#[test]
fn url_unstamped_keeps_https() {
    let link = unstamped_link();
    assert_eq!(
        sanitize_url_by_tier("https://example.com", &link),
        "https://example.com"
    );
}

#[test]
fn url_unstamped_blocks_javascript() {
    let link = unstamped_link();
    assert_eq!(sanitize_url_by_tier("javascript:alert(1)", &link), "about:blank");
}

// ---- cssClass ----

#[test]
fn css_class_author_keeps_class() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_css_class_by_tier(Some("my-class"), &link),
        Some("my-class".to_owned())
    );
}

#[test]
fn css_class_author_keeps_multi_word() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_css_class_by_tier(Some("primary special"), &link),
        Some("primary special".to_owned())
    );
}

#[test]
fn css_class_author_none_stays_none() {
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_css_class_by_tier(None, &link), None);
}

#[test]
fn css_class_storage_remote_drops() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(sanitize_css_class_by_tier(Some("my-class"), &link), None);
}

#[test]
fn css_class_storage_local_drops() {
    let link = stamped_link(Tier::StorageLocal);
    assert_eq!(sanitize_css_class_by_tier(Some("my-class"), &link), None);
}

#[test]
fn css_class_protocol_drops() {
    let link = stamped_link(Tier::Protocol("web".into()));
    assert_eq!(sanitize_css_class_by_tier(Some("my-class"), &link), None);
}

#[test]
fn css_class_protocol_none_stays_none() {
    let link = stamped_link(Tier::Protocol("web".into()));
    assert_eq!(sanitize_css_class_by_tier(None, &link), None);
}

#[test]
fn css_class_unstamped_drops() {
    let link = unstamped_link();
    assert_eq!(sanitize_css_class_by_tier(Some("my-class"), &link), None);
}

// ---- targetWindow ----

#[test]
fn target_window_author_keeps_self() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_target_window_by_tier(Some("_self"), &link),
        Some("_self".to_owned())
    );
}

#[test]
fn target_window_author_keeps_blank() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_target_window_by_tier(Some("_blank"), &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_author_keeps_named_window() {
    let link = stamped_link(Tier::Author);
    assert_eq!(
        sanitize_target_window_by_tier(Some("fromAlap"), &link),
        Some("fromAlap".to_owned())
    );
}

#[test]
fn target_window_author_passes_none_through() {
    // Author-tier intentionally preserves None so the caller's fallback
    // chain still applies.
    let link = stamped_link(Tier::Author);
    assert_eq!(sanitize_target_window_by_tier(None, &link), None);
}

#[test]
fn target_window_storage_clamps_self_to_blank() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(
        sanitize_target_window_by_tier(Some("_self"), &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_storage_clamps_named_window() {
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(
        sanitize_target_window_by_tier(Some("fromAlap"), &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_storage_clamps_none_to_blank() {
    // Non-author tier forces _blank even when input is None.
    let link = stamped_link(Tier::StorageRemote);
    assert_eq!(
        sanitize_target_window_by_tier(None, &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_storage_local_clamps() {
    let link = stamped_link(Tier::StorageLocal);
    assert_eq!(
        sanitize_target_window_by_tier(Some("_parent"), &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_protocol_clamps() {
    let link = stamped_link(Tier::Protocol("web".into()));
    assert_eq!(
        sanitize_target_window_by_tier(Some("fromAlap"), &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_unstamped_clamps() {
    let link = unstamped_link();
    assert_eq!(
        sanitize_target_window_by_tier(Some("_self"), &link),
        Some("_blank".to_owned())
    );
}

#[test]
fn target_window_unstamped_none_clamps() {
    let link = unstamped_link();
    assert_eq!(
        sanitize_target_window_by_tier(None, &link),
        Some("_blank".to_owned())
    );
}
