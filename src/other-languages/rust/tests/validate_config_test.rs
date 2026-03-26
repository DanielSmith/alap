// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

use alap_core::validate_config;
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
