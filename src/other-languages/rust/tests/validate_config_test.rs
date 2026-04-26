// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

use alap::link_provenance;
use alap::{
    sanitize_link_urls, validate_config, validate_config_with_options, Link, Tier, ValidateOptions,
};
use serde_json::json;

// --- Structural validity ---

#[test]
fn minimal_valid_config_passes() {
    let input = json!({
        "allLinks": {
            "item1": { "url": "https://example.com" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links.contains_key("item1"));
    assert_eq!(cfg.all_links["item1"].url, "https://example.com");
}

#[test]
fn preserves_settings_when_valid() {
    let input = json!({
        "allLinks": {
            "item1": { "url": "https://example.com" }
        },
        "settings": {
            "listType": "ul",
            "menuTimeout": 5000
        }
    });
    let cfg = validate_config(input).unwrap();
    assert_eq!(cfg.settings["listType"], json!("ul"));
    assert_eq!(cfg.settings["menuTimeout"], json!(5000));
}

#[test]
fn preserves_macros_when_valid() {
    let input = json!({
        "allLinks": {
            "item1": { "url": "https://example.com" }
        },
        "macros": {
            "favs": { "linkItems": "item1" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.macros.contains_key("favs"));
    assert_eq!(cfg.macros["favs"].link_items, "item1");
}

#[test]
fn preserves_search_patterns_when_valid() {
    let input = json!({
        "allLinks": {
            "item1": { "url": "https://example.com" }
        },
        "searchPatterns": {
            "simple": "bridge"
        }
    });
    let cfg = validate_config(input).unwrap();
    assert_eq!(cfg.search_patterns["simple"], json!("bridge"));
}

// --- Rejection of non-object input ---

#[test]
fn returns_err_on_null_input() {
    let result = validate_config(json!(null));
    assert!(result.is_err());
}

#[test]
fn returns_err_on_string_input() {
    let result = validate_config(json!("string"));
    assert!(result.is_err());
}

// --- allLinks validation ---

#[test]
fn returns_err_when_all_links_missing() {
    let result = validate_config(json!({}));
    assert!(result.is_err());
}

#[test]
fn returns_err_when_all_links_is_array() {
    let result = validate_config(json!({ "allLinks": [] }));
    assert!(result.is_err());
}

#[test]
fn skips_links_with_missing_url() {
    let input = json!({
        "allLinks": {
            "good": { "url": "https://example.com" },
            "bad": { "label": "no url here" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links.contains_key("good"));
    assert!(!cfg.all_links.contains_key("bad"));
}

#[test]
fn skips_non_object_links() {
    let input = json!({
        "allLinks": {
            "good": { "url": "https://example.com" },
            "bad": "not a link"
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links.contains_key("good"));
    assert!(!cfg.all_links.contains_key("bad"));
}

// --- URL sanitization ---

#[test]
fn sanitizes_javascript_url_to_about_blank() {
    let input = json!({
        "allLinks": {
            "evil": { "url": "javascript:alert(1)" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert_eq!(cfg.all_links["evil"].url, "about:blank");
}

#[test]
fn sanitizes_javascript_in_image_field() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "image": "javascript:alert(1)"
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert_eq!(
        cfg.all_links["item"].image.as_deref(),
        Some("about:blank")
    );
}

#[test]
fn leaves_safe_https_urls_unchanged() {
    let input = json!({
        "allLinks": {
            "safe": { "url": "https://example.com/path?q=1" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert_eq!(cfg.all_links["safe"].url, "https://example.com/path?q=1");
}

// --- Tags ---

#[test]
fn filters_non_string_tags() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "tags": ["good", 42, true, "also_good"]
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert_eq!(cfg.all_links["item"].tags, vec!["good", "also_good"]);
}

#[test]
fn ignores_non_array_tags() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "tags": "not an array"
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links["item"].tags.is_empty());
}

// --- Hyphen restrictions ---

#[test]
fn skips_items_with_hyphenated_ids() {
    let input = json!({
        "allLinks": {
            "my-item": { "url": "https://example.com" },
            "good_item": { "url": "https://example.com" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(!cfg.all_links.contains_key("my-item"));
    assert!(cfg.all_links.contains_key("good_item"));
}

#[test]
fn skips_hyphenated_macro_names() {
    let input = json!({
        "allLinks": {
            "item1": { "url": "https://example.com" }
        },
        "macros": {
            "my-macro": { "linkItems": "item1" },
            "good_macro": { "linkItems": "item1" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(!cfg.macros.contains_key("my-macro"));
    assert!(cfg.macros.contains_key("good_macro"));
}

#[test]
fn skips_hyphenated_search_pattern_keys() {
    let input = json!({
        "allLinks": {
            "item1": { "url": "https://example.com" }
        },
        "searchPatterns": {
            "my-pattern": "bridge",
            "good_pattern": "bridge"
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(!cfg.search_patterns.contains_key("my-pattern"));
    assert!(cfg.search_patterns.contains_key("good_pattern"));
}

#[test]
fn strips_hyphenated_tags_but_keeps_link() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "tags": ["good", "has-hyphen", "fine"]
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links.contains_key("item"));
    assert_eq!(cfg.all_links["item"].tags, vec!["good", "fine"]);
}

#[test]
fn allows_hyphens_in_non_expression_fields() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://my-site.example.com/some-path",
                "label": "My-Label",
                "cssClass": "my-class",
                "description": "A well-known place"
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let link = &cfg.all_links["item"];
    assert_eq!(link.url, "https://my-site.example.com/some-path");
    assert_eq!(link.label.as_deref(), Some("My-Label"));
    assert_eq!(link.css_class.as_deref(), Some("my-class"));
    assert_eq!(link.description.as_deref(), Some("A well-known place"));
}

// --- hooks and guid ---

#[test]
fn preserves_hooks_and_guid() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "hooks": ["item_hover", "item_context"],
                "guid": "550e8400-e29b-41d4-a716-446655440000"
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let link = &cfg.all_links["item"];
    assert_eq!(
        link.hooks.as_deref(),
        Some(vec!["item_hover".to_string(), "item_context".to_string()].as_slice())
    );
    assert_eq!(link.guid.as_deref(), Some("550e8400-e29b-41d4-a716-446655440000"));
}

#[test]
fn filters_non_string_hooks() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "hooks": ["item_hover", 42, true, "item_context"]
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let link = &cfg.all_links["item"];
    assert_eq!(
        link.hooks.as_deref(),
        Some(vec!["item_hover".to_string(), "item_context".to_string()].as_slice())
    );
}

#[test]
fn hooks_none_when_not_provided() {
    let input = json!({
        "allLinks": {
            "item": { "url": "https://example.com" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links["item"].hooks.is_none());
    assert!(cfg.all_links["item"].guid.is_none());
}

#[test]
fn hooks_none_when_empty_array() {
    let input = json!({
        "allLinks": {
            "item": {
                "url": "https://example.com",
                "hooks": []
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(cfg.all_links["item"].hooks.is_none());
}

// --- Regex validation ---

#[test]
fn removes_invalid_regex_patterns() {
    // Rust's regex crate rejects lookbehinds — use as a stand-in for
    // "dangerous" patterns (the crate is inherently ReDoS-safe).
    let input = json!({
        "allLinks": {
            "item": { "url": "https://example.com" }
        },
        "searchPatterns": {
            "evil": "(?<=a)b",
            "safe": "bridge"
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(!cfg.search_patterns.contains_key("evil"));
    assert!(cfg.search_patterns.contains_key("safe"));
}

// --- Prototype pollution ---

#[test]
fn drops_proto_keys_from_all_links() {
    let input = json!({
        "allLinks": {
            "__proto__": { "url": "https://evil.com" },
            "good": { "url": "https://example.com" }
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(!cfg.all_links.contains_key("__proto__"));
    assert!(cfg.all_links.contains_key("good"));
}

#[test]
fn drops_constructor_keys_from_settings() {
    let input = json!({
        "allLinks": {
            "item": { "url": "https://example.com" }
        },
        "settings": {
            "constructor": "evil",
            "listType": "ul"
        }
    });
    let cfg = validate_config(input).unwrap();
    assert!(!cfg.settings.contains_key("constructor"));
    assert!(cfg.settings.contains_key("listType"));
}

// ---------------------------------------------------------------------------
// 3.2 additions
// ---------------------------------------------------------------------------

fn minimal_raw() -> serde_json::Value {
    json!({
        "allLinks": {
            "alpha": { "url": "https://example.com/alpha", "label": "Alpha" }
        }
    })
}

// --- Provenance stamping ---

#[test]
fn provenance_defaults_to_author() {
    let cfg = validate_config(minimal_raw()).unwrap();
    let link = cfg.all_links.get("alpha").unwrap();
    assert!(link_provenance::is_author_tier(link));
}

#[test]
fn provenance_storage_local_stamp() {
    let cfg = validate_config_with_options(
        minimal_raw(),
        ValidateOptions {
            provenance: Tier::StorageLocal,
        },
    )
    .unwrap();
    let link = cfg.all_links.get("alpha").unwrap();
    assert!(link_provenance::is_storage_tier(link));
    assert_eq!(link_provenance::get(link), Some(&Tier::StorageLocal));
}

#[test]
fn provenance_storage_remote_stamp() {
    let cfg = validate_config_with_options(
        minimal_raw(),
        ValidateOptions {
            provenance: Tier::StorageRemote,
        },
    )
    .unwrap();
    let link = cfg.all_links.get("alpha").unwrap();
    assert_eq!(link_provenance::get(link), Some(&Tier::StorageRemote));
}

#[test]
fn provenance_protocol_stamp() {
    let cfg = validate_config_with_options(
        minimal_raw(),
        ValidateOptions {
            provenance: Tier::Protocol("web".into()),
        },
    )
    .unwrap();
    let link = cfg.all_links.get("alpha").unwrap();
    assert!(link_provenance::is_protocol_tier(link));
}

#[test]
fn invalid_provenance_option_rejected() {
    let result = validate_config_with_options(
        minimal_raw(),
        ValidateOptions {
            provenance: Tier::Protocol(String::new()),
        },
    );
    assert!(result.is_err());
}

// --- Hooks allowlist ---

#[test]
fn hooks_author_keeps_all_verbatim() {
    let input = json!({
        "allLinks": {
            "a": { "url": "/a", "hooks": ["hover", "click", "anything"] }
        }
    });
    let cfg = validate_config(input).unwrap();
    let link = cfg.all_links.get("a").unwrap();
    assert_eq!(
        link.hooks,
        Some(vec!["hover".to_string(), "click".into(), "anything".into()])
    );
}

#[test]
fn hooks_non_author_without_allowlist_strips_all() {
    let input = json!({
        "allLinks": {
            "a": { "url": "/a", "hooks": ["hover", "click"] }
        }
    });
    let cfg = validate_config_with_options(
        input,
        ValidateOptions {
            provenance: Tier::StorageRemote,
        },
    )
    .unwrap();
    let link = cfg.all_links.get("a").unwrap();
    assert_eq!(link.hooks, None);
}

#[test]
fn hooks_non_author_intersects_allowlist() {
    let input = json!({
        "settings": { "hooks": ["hover"] },
        "allLinks": {
            "a": { "url": "/a", "hooks": ["hover", "attacker_chosen"] }
        }
    });
    let cfg = validate_config_with_options(
        input,
        ValidateOptions {
            provenance: Tier::Protocol("web".into()),
        },
    )
    .unwrap();
    let link = cfg.all_links.get("a").unwrap();
    assert_eq!(link.hooks, Some(vec!["hover".to_string()]));
}

#[test]
fn hooks_non_author_fully_stripped_when_none_match() {
    let input = json!({
        "settings": { "hooks": ["approved_hook"] },
        "allLinks": {
            "a": { "url": "/a", "hooks": ["evil", "worse"] }
        }
    });
    let cfg = validate_config_with_options(
        input,
        ValidateOptions {
            provenance: Tier::StorageRemote,
        },
    )
    .unwrap();
    let link = cfg.all_links.get("a").unwrap();
    assert_eq!(link.hooks, None);
}

// --- Meta URL sanitization ---

#[test]
fn meta_url_key_sanitized() {
    let input = json!({
        "allLinks": {
            "a": {
                "url": "/a",
                "meta": { "iconUrl": "javascript:alert(1)" }
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let meta = cfg.all_links.get("a").unwrap().meta.as_ref().unwrap();
    assert_eq!(
        meta.get("iconUrl").and_then(|v| v.as_str()),
        Some("about:blank")
    );
}

#[test]
fn meta_url_case_insensitive_match() {
    let input = json!({
        "allLinks": {
            "a": {
                "url": "/a",
                "meta": {
                    "ImageURL": "javascript:alert(1)",
                    "AvatarUrl": "data:text/html,x"
                }
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let meta = cfg.all_links.get("a").unwrap().meta.as_ref().unwrap();
    assert_eq!(meta.get("ImageURL").and_then(|v| v.as_str()), Some("about:blank"));
    assert_eq!(meta.get("AvatarUrl").and_then(|v| v.as_str()), Some("about:blank"));
}

#[test]
fn meta_non_url_key_untouched() {
    let input = json!({
        "allLinks": {
            "a": {
                "url": "/a",
                "meta": { "author": "Someone", "rank": 1, "body": "plain text" }
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let meta = cfg.all_links.get("a").unwrap().meta.as_ref().unwrap();
    assert_eq!(meta.get("author").and_then(|v| v.as_str()), Some("Someone"));
    assert_eq!(meta.get("rank").and_then(|v| v.as_i64()), Some(1));
}

#[test]
fn meta_blocked_keys_recursed() {
    let input = json!({
        "allLinks": {
            "a": {
                "url": "/a",
                "meta": {
                    "__proto__": { "bad": true },
                    "__class__": { "bad": true },
                    "legit": "ok"
                }
            }
        }
    });
    let cfg = validate_config(input).unwrap();
    let meta = cfg.all_links.get("a").unwrap().meta.as_ref().unwrap();
    assert!(!meta.contains_key("__proto__"));
    assert!(!meta.contains_key("__class__"));
    assert_eq!(meta.get("legit").and_then(|v| v.as_str()), Some("ok"));
}

// --- Thumbnail sanitization (the 3.2 audit bug fix) ---

#[test]
fn thumbnail_sanitized() {
    let input = json!({
        "allLinks": {
            "a": { "url": "/a", "thumbnail": "javascript:alert(1)" }
        }
    });
    let cfg = validate_config(input).unwrap();
    let link = cfg.all_links.get("a").unwrap();
    assert_eq!(link.thumbnail.as_deref(), Some("about:blank"));
}

#[test]
fn thumbnail_valid_url_preserved() {
    let input = json!({
        "allLinks": {
            "a": { "url": "/a", "thumbnail": "https://example.com/thumb.jpg" }
        }
    });
    let cfg = validate_config(input).unwrap();
    let link = cfg.all_links.get("a").unwrap();
    assert_eq!(link.thumbnail.as_deref(), Some("https://example.com/thumb.jpg"));
}

// --- sanitize_link_urls helper (direct) ---

#[test]
fn sanitize_link_urls_direct_url() {
    let mut link = Link {
        url: "javascript:alert(1)".into(),
        ..Default::default()
    };
    sanitize_link_urls(&mut link);
    assert_eq!(link.url, "about:blank");
}

#[test]
fn sanitize_link_urls_direct_image() {
    let mut link = Link {
        url: "/a".into(),
        image: Some("data:text/html,x".into()),
        ..Default::default()
    };
    sanitize_link_urls(&mut link);
    assert_eq!(link.image.as_deref(), Some("about:blank"));
}

#[test]
fn sanitize_link_urls_direct_thumbnail() {
    let mut link = Link {
        url: "/a".into(),
        thumbnail: Some("vbscript:bad".into()),
        ..Default::default()
    };
    sanitize_link_urls(&mut link);
    assert_eq!(link.thumbnail.as_deref(), Some("about:blank"));
}

#[test]
fn sanitize_link_urls_direct_meta_url() {
    let mut meta = std::collections::HashMap::new();
    meta.insert("coverUrl".to_string(), serde_json::Value::String("javascript:bad".into()));
    let mut link = Link {
        url: "/a".into(),
        meta: Some(meta),
        ..Default::default()
    };
    sanitize_link_urls(&mut link);
    let meta_after = link.meta.as_ref().unwrap();
    assert_eq!(meta_after.get("coverUrl").and_then(|v| v.as_str()), Some("about:blank"));
}

#[test]
fn sanitize_link_urls_direct_strips_blocked_meta_keys() {
    let mut meta = std::collections::HashMap::new();
    meta.insert("__proto__".to_string(), json!({"x": 1}));
    meta.insert("ok".to_string(), serde_json::Value::String("keep".into()));
    let mut link = Link {
        url: "/a".into(),
        meta: Some(meta),
        ..Default::default()
    };
    sanitize_link_urls(&mut link);
    let meta_after = link.meta.as_ref().unwrap();
    assert!(!meta_after.contains_key("__proto__"));
    assert_eq!(meta_after.get("ok").and_then(|v| v.as_str()), Some("keep"));
}
