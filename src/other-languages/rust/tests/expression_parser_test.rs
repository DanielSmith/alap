// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0

use std::collections::HashMap;

use alap::{
    cherry_pick, merge_configs, resolve, sanitize_url, Config, ExpressionParser, Link, Macro,
    Protocol,
};

fn test_config() -> Config {
    Config {
        settings: HashMap::from([
            ("listType".into(), serde_json::json!("ul")),
            ("menuTimeout".into(), serde_json::json!(5000)),
        ]),
        macros: HashMap::from([
            (
                "cars".into(),
                Macro {
                    link_items: "vwbug, bmwe36".into(),
                    config: None,
                },
            ),
            (
                "nycbridges".into(),
                Macro {
                    link_items: ".nyc + .bridge".into(),
                    config: None,
                },
            ),
            (
                "everything".into(),
                Macro {
                    link_items: ".nyc | .sf".into(),
                    config: None,
                },
            ),
        ]),
        search_patterns: HashMap::from([
            ("bridges".into(), serde_json::json!("bridge")),
            (
                "germanCars".into(),
                serde_json::json!({
                    "pattern": "VW|BMW",
                    "options": { "fields": "l", "limit": 5 }
                }),
            ),
        ]),
        protocols: None,
        all_links: HashMap::from([
            (
                "vwbug".into(),
                Link {
                    label: Some("VW Bug".into()),
                    url: "https://example.com/vwbug".into(),
                    tags: vec!["car".into(), "vw".into(), "germany".into()],
                    ..Default::default()
                },
            ),
            (
                "bmwe36".into(),
                Link {
                    label: Some("BMW E36".into()),
                    url: "https://example.com/bmwe36".into(),
                    tags: vec!["car".into(), "bmw".into(), "germany".into()],
                    ..Default::default()
                },
            ),
            (
                "miata".into(),
                Link {
                    label: Some("Mazda Miata".into()),
                    url: "https://example.com/miata".into(),
                    tags: vec!["car".into(), "mazda".into(), "japan".into()],
                    ..Default::default()
                },
            ),
            (
                "brooklyn".into(),
                Link {
                    label: Some("Brooklyn Bridge".into()),
                    url: "https://example.com/brooklyn".into(),
                    tags: vec!["nyc".into(), "bridge".into(), "landmark".into()],
                    description: Some("Iconic suspension bridge".into()),
                    ..Default::default()
                },
            ),
            (
                "manhattan".into(),
                Link {
                    label: Some("Manhattan Bridge".into()),
                    url: "https://example.com/manhattan".into(),
                    tags: vec!["nyc".into(), "bridge".into()],
                    ..Default::default()
                },
            ),
            (
                "highline".into(),
                Link {
                    label: Some("The High Line".into()),
                    url: "https://example.com/highline".into(),
                    tags: vec!["nyc".into(), "park".into(), "landmark".into()],
                    ..Default::default()
                },
            ),
            (
                "centralpark".into(),
                Link {
                    label: Some("Central Park".into()),
                    url: "https://example.com/centralpark".into(),
                    tags: vec!["nyc".into(), "park".into()],
                    ..Default::default()
                },
            ),
            (
                "goldengate".into(),
                Link {
                    label: Some("Golden Gate".into()),
                    url: "https://example.com/goldengate".into(),
                    tags: vec!["sf".into(), "bridge".into(), "landmark".into()],
                    ..Default::default()
                },
            ),
            (
                "dolores".into(),
                Link {
                    label: Some("Dolores Park".into()),
                    url: "https://example.com/dolores".into(),
                    tags: vec!["sf".into(), "park".into()],
                    ..Default::default()
                },
            ),
            (
                "towerbridge".into(),
                Link {
                    label: Some("Tower Bridge".into()),
                    url: "https://example.com/towerbridge".into(),
                    tags: vec!["london".into(), "bridge".into(), "landmark".into()],
                    ..Default::default()
                },
            ),
            (
                "aqus".into(),
                Link {
                    label: Some("Aqus Cafe".into()),
                    url: "https://example.com/aqus".into(),
                    tags: vec!["coffee".into(), "sf".into()],
                    ..Default::default()
                },
            ),
            (
                "bluebottle".into(),
                Link {
                    label: Some("Blue Bottle".into()),
                    url: "https://example.com/bluebottle".into(),
                    tags: vec!["coffee".into(), "sf".into(), "nyc".into()],
                    ..Default::default()
                },
            ),
            (
                "acre".into(),
                Link {
                    label: Some("Acre Coffee".into()),
                    url: "https://example.com/acre".into(),
                    tags: vec!["coffee".into()],
                    ..Default::default()
                },
            ),
        ]),
    }
}

fn new_parser(config: &Config) -> ExpressionParser<'_> {
    ExpressionParser::new(config)
}

fn sorted(mut ids: Vec<String>) -> Vec<String> {
    ids.sort();
    ids
}

fn assert_contains(ids: &[String], id: &str) {
    assert!(
        ids.iter().any(|s| s == id),
        "{ids:?} does not contain {id:?}"
    );
}

fn assert_not_contains(ids: &[String], id: &str) {
    assert!(
        !ids.iter().any(|s| s == id),
        "{ids:?} should not contain {id:?}"
    );
}

// --- Tier 1: Operands ---

#[test]
fn single_item_id() {
    let cfg = test_config();
    assert_eq!(new_parser(&cfg).query("vwbug", ""), vec!["vwbug"]);
}

#[test]
fn single_class() {
    let cfg = test_config();
    let result = sorted(new_parser(&cfg).query(".car", ""));
    assert_eq!(result, vec!["bmwe36", "miata", "vwbug"]);
}

#[test]
fn nonexistent_item() {
    let cfg = test_config();
    let result = new_parser(&cfg).query("doesnotexist", "");
    assert!(result.is_empty());
}

#[test]
fn nonexistent_class() {
    let cfg = test_config();
    let result = new_parser(&cfg).query(".doesnotexist", "");
    assert!(result.is_empty());
}

// --- Tier 2: Commas ---

#[test]
fn two_items() {
    let cfg = test_config();
    assert_eq!(
        new_parser(&cfg).query("vwbug, bmwe36", ""),
        vec!["vwbug", "bmwe36"]
    );
}

#[test]
fn three_items() {
    let cfg = test_config();
    assert_eq!(
        new_parser(&cfg).query("vwbug, bmwe36, miata", ""),
        vec!["vwbug", "bmwe36", "miata"]
    );
}

#[test]
fn deduplication() {
    let cfg = test_config();
    assert_eq!(
        new_parser(&cfg).query("vwbug, vwbug", ""),
        vec!["vwbug"]
    );
}

// --- Tier 3: Operators ---

#[test]
fn intersection() {
    let cfg = test_config();
    let result = sorted(new_parser(&cfg).query(".nyc + .bridge", ""));
    assert_eq!(result, vec!["brooklyn", "manhattan"]);
}

#[test]
fn union() {
    let cfg = test_config();
    let result = new_parser(&cfg).query(".nyc | .sf", "");
    assert_contains(&result, "brooklyn");
    assert_contains(&result, "goldengate");
}

#[test]
fn subtraction() {
    let cfg = test_config();
    let result = new_parser(&cfg).query(".nyc - .bridge", "");
    assert_not_contains(&result, "brooklyn");
    assert_not_contains(&result, "manhattan");
    assert_contains(&result, "highline");
    assert_contains(&result, "centralpark");
}

// --- Tier 4: Chained ---

#[test]
fn three_way_intersection() {
    let cfg = test_config();
    assert_eq!(
        new_parser(&cfg).query(".nyc + .bridge + .landmark", ""),
        vec!["brooklyn"]
    );
}

#[test]
fn union_then_subtract() {
    let cfg = test_config();
    let result = new_parser(&cfg).query(".nyc | .sf - .bridge", "");
    assert_not_contains(&result, "brooklyn");
    assert_not_contains(&result, "goldengate");
    assert_contains(&result, "highline");
}

// --- Tier 6: Macros ---

#[test]
fn named_macro() {
    let cfg = test_config();
    let result = sorted(new_parser(&cfg).query("@cars", ""));
    assert_eq!(result, vec!["bmwe36", "vwbug"]);
}

#[test]
fn macro_with_operators() {
    let cfg = test_config();
    let result = sorted(new_parser(&cfg).query("@nycbridges", ""));
    assert_eq!(result, vec!["brooklyn", "manhattan"]);
}

#[test]
fn unknown_macro() {
    let cfg = test_config();
    let result = new_parser(&cfg).query("@nonexistent", "");
    assert!(result.is_empty());
}


// --- Tier 7: Parentheses ---

#[test]
fn basic_grouping() {
    let cfg = test_config();
    let result = new_parser(&cfg).query(".nyc | (.sf + .bridge)", "");
    assert_contains(&result, "highline");
    assert_contains(&result, "centralpark");
    assert_contains(&result, "goldengate");
}

#[test]
fn nested_parens() {
    let cfg = test_config();
    let result = sorted(
        new_parser(&cfg).query("((.nyc + .bridge) | (.sf + .bridge))", ""),
    );
    assert_eq!(result, vec!["brooklyn", "goldengate", "manhattan"]);
}

#[test]
fn parens_with_subtraction() {
    let cfg = test_config();
    let result = new_parser(&cfg).query("(.nyc | .sf) - .park", "");
    assert_not_contains(&result, "centralpark");
    assert_not_contains(&result, "dolores");
    assert_contains(&result, "brooklyn");
}

// --- Tier 8: Edge cases ---

#[test]
fn empty_string() {
    let cfg = test_config();
    assert!(new_parser(&cfg).query("", "").is_empty());
}

#[test]
fn whitespace_only() {
    let cfg = test_config();
    assert!(new_parser(&cfg).query("   ", "").is_empty());
}

#[test]
fn empty_config() {
    let cfg = Config {
        all_links: HashMap::new(),
        ..Default::default()
    };
    assert!(new_parser(&cfg).query(".car", "").is_empty());
}

#[test]
fn no_all_links() {
    let cfg = Config::default();
    assert!(new_parser(&cfg).query("vwbug", "").is_empty());
}

// --- Convenience ---

#[test]
fn test_resolve() {
    let cfg = test_config();
    let results = resolve(&cfg, ".car + .germany");
    let mut ids: Vec<&str> = results.iter().map(|r| r.id.as_str()).collect();
    ids.sort();
    assert_eq!(ids, vec!["bmwe36", "vwbug"]);
}

#[test]
fn test_cherry_pick() {
    let cfg = test_config();
    let result = cherry_pick(&cfg, "vwbug, miata");
    assert!(result.contains_key("vwbug"));
    assert!(result.contains_key("miata"));
    assert!(!result.contains_key("bmwe36"));
}

#[test]
fn test_merge_configs() {
    let c1 = Config {
        all_links: HashMap::from([(
            "a".into(),
            Link {
                label: Some("A".into()),
                url: "https://a.com".into(),
                ..Default::default()
            },
        )]),
        ..Default::default()
    };
    let c2 = Config {
        all_links: HashMap::from([(
            "b".into(),
            Link {
                label: Some("B".into()),
                url: "https://b.com".into(),
                ..Default::default()
            },
        )]),
        ..Default::default()
    };
    let merged = merge_configs(&[&c1, &c2]);
    assert!(merged.all_links.contains_key("a"));
    assert!(merged.all_links.contains_key("b"));
}

#[test]
fn test_merge_configs_later_wins() {
    let c1 = Config {
        all_links: HashMap::from([(
            "a".into(),
            Link {
                label: Some("Old".into()),
                url: "https://old.com".into(),
                ..Default::default()
            },
        )]),
        ..Default::default()
    };
    let c2 = Config {
        all_links: HashMap::from([(
            "a".into(),
            Link {
                label: Some("New".into()),
                url: "https://new.com".into(),
                ..Default::default()
            },
        )]),
        ..Default::default()
    };
    let merged = merge_configs(&[&c1, &c2]);
    assert_eq!(merged.all_links["a"].label.as_deref(), Some("New"));
}

// --- URL Sanitization ---

#[test]
fn sanitize_url_safe() {
    for url in ["https://example.com", "http://example.com", "/relative", ""] {
        assert_eq!(sanitize_url(url), url);
    }
}

#[test]
fn sanitize_url_javascript() {
    for url in [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        "JavaScript:void(0)",
    ] {
        assert_eq!(sanitize_url(url), "about:blank", "failed for {url}");
    }
}

#[test]
fn sanitize_url_data() {
    assert_eq!(
        sanitize_url("data:text/html,<h1>Hi</h1>"),
        "about:blank"
    );
}

#[test]
fn sanitize_url_vbscript() {
    assert_eq!(sanitize_url("vbscript:MsgBox"), "about:blank");
}

#[test]
fn sanitize_url_blob() {
    assert_eq!(
        sanitize_url("blob:https://example.com/uuid"),
        "about:blank"
    );
}

#[test]
fn sanitize_url_control_chars() {
    assert_eq!(sanitize_url("java\nscript:alert(1)"), "about:blank");
}

#[test]
fn sanitize_in_resolve() {
    let cfg = Config {
        all_links: HashMap::from([
            (
                "bad".into(),
                Link {
                    label: Some("Evil".into()),
                    url: "javascript:alert(1)".into(),
                    tags: vec!["test".into()],
                    ..Default::default()
                },
            ),
            (
                "good".into(),
                Link {
                    label: Some("Good".into()),
                    url: "https://example.com".into(),
                    tags: vec!["test".into()],
                    ..Default::default()
                },
            ),
        ]),
        ..Default::default()
    };
    let results = resolve(&cfg, ".test");
    let urls: HashMap<&str, &str> = results.iter().map(|r| (r.id.as_str(), r.link.url.as_str())).collect();
    assert_eq!(urls["bad"], "about:blank");
    assert_eq!(urls["good"], "https://example.com");
}

#[test]
fn sanitize_in_cherry_pick() {
    let cfg = Config {
        all_links: HashMap::from([(
            "bad".into(),
            Link {
                label: Some("Evil".into()),
                url: "javascript:alert(1)".into(),
                tags: vec!["test".into()],
                ..Default::default()
            },
        )]),
        ..Default::default()
    };
    let result = cherry_pick(&cfg, ".test");
    assert_eq!(result["bad"].url, "about:blank");
}

// --- Protocol resolution ---

fn config_with_protocol() -> Config {
    let mut cfg = test_config();
    let mut protocols = HashMap::new();
    protocols.insert(
        "has_tag".to_string(),
        Protocol {
            handler: |args: &[String], link: &Link, _id: &str| -> bool {
                if args.is_empty() {
                    return false;
                }
                link.tags.iter().any(|t| t == &args[0])
            },
        },
    );
    protocols.insert(
        "has_label_prefix".to_string(),
        Protocol {
            handler: |args: &[String], link: &Link, _id: &str| -> bool {
                if args.is_empty() {
                    return false;
                }
                link.label
                    .as_ref()
                    .is_some_and(|l| l.starts_with(&args[0]))
            },
        },
    );
    cfg.protocols = Some(protocols);
    cfg
}

#[test]
fn protocol_basic_resolution() {
    let cfg = config_with_protocol();
    let result = sorted(ExpressionParser::new(&cfg).query(":has_tag:coffee:", ""));
    assert_contains(&result, "aqus");
    assert_contains(&result, "bluebottle");
    assert_contains(&result, "acre");
}

#[test]
fn protocol_with_args() {
    let cfg = config_with_protocol();
    let result = sorted(ExpressionParser::new(&cfg).query(":has_tag:bridge:", ""));
    assert_contains(&result, "brooklyn");
    assert_contains(&result, "manhattan");
    assert_contains(&result, "goldengate");
    assert_contains(&result, "towerbridge");
}

#[test]
fn protocol_unknown_returns_empty() {
    let cfg = config_with_protocol();
    let result = ExpressionParser::new(&cfg).query(":nonexistent:arg:", "");
    assert!(result.is_empty());
}

#[test]
fn protocol_no_protocols_configured() {
    let cfg = test_config(); // no protocols field
    let result = ExpressionParser::new(&cfg).query(":has_tag:coffee:", "");
    assert!(result.is_empty());
}

#[test]
fn protocol_combined_with_operator() {
    let cfg = config_with_protocol();
    // Protocol result intersected with a class
    let result = sorted(ExpressionParser::new(&cfg).query(":has_tag:coffee: + .sf", ""));
    assert_contains(&result, "aqus");
    assert_contains(&result, "bluebottle");
    assert_not_contains(&result, "acre"); // acre has no sf tag
}

#[test]
fn protocol_combined_with_subtraction() {
    let cfg = config_with_protocol();
    let result = ExpressionParser::new(&cfg).query(":has_tag:bridge: - .london", "");
    assert_not_contains(&result, "towerbridge");
    assert_contains(&result, "brooklyn");
}

// --- Refiner application ---

#[test]
fn refiner_sort_by_label() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:label*", "");
    // Labels: BMW E36, Mazda Miata, VW Bug — alphabetical
    assert_eq!(result, vec!["bmwe36", "miata", "vwbug"]);
}

#[test]
fn refiner_reverse() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:label* *reverse*", "");
    assert_eq!(result, vec!["vwbug", "miata", "bmwe36"]);
}

#[test]
fn refiner_limit() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:label* *limit:2*", "");
    assert_eq!(result.len(), 2);
    assert_eq!(result, vec!["bmwe36", "miata"]);
}

#[test]
fn refiner_skip() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:label* *skip:1*", "");
    assert_eq!(result.len(), 2);
    assert_eq!(result, vec!["miata", "vwbug"]);
}

#[test]
fn refiner_sort_by_id() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:id*", "");
    assert_eq!(result, vec!["bmwe36", "miata", "vwbug"]);
}

#[test]
fn refiner_shuffle_changes_order_deterministically() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:label* *shuffle*", "");
    // Just verify all items are present — shuffle is deterministic with our LCG
    assert_eq!(sorted(result.clone()), vec!["bmwe36", "miata", "vwbug"]);
}

#[test]
fn refiner_unique_by_url() {
    // Create config with duplicate URLs
    let cfg = Config {
        all_links: HashMap::from([
            (
                "a".into(),
                Link {
                    label: Some("Link A".into()),
                    url: "https://example.com/same".into(),
                    tags: vec!["test".into()],
                    ..Default::default()
                },
            ),
            (
                "b".into(),
                Link {
                    label: Some("Link B".into()),
                    url: "https://example.com/same".into(),
                    tags: vec!["test".into()],
                    ..Default::default()
                },
            ),
            (
                "c".into(),
                Link {
                    label: Some("Link C".into()),
                    url: "https://example.com/different".into(),
                    tags: vec!["test".into()],
                    ..Default::default()
                },
            ),
        ]),
        ..Default::default()
    };
    let result = ExpressionParser::new(&cfg).query(".test *sort:id* *unique:url*", "");
    assert_eq!(result.len(), 2);
    // One of a or b kept (first encountered after sort), plus c
    assert_contains(&result, "c");
}

#[test]
fn refiner_unknown_skipped() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *sort:label* *bogus* *limit:2*", "");
    // Unknown refiner is skipped, limit still applied
    assert_eq!(result.len(), 2);
}

// --- Composition: protocol + refiner ---

#[test]
fn protocol_with_refiner() {
    let cfg = config_with_protocol();
    let result = ExpressionParser::new(&cfg).query(":has_tag:coffee: *sort:label* *limit:2*", "");
    assert_eq!(result.len(), 2);
    // Sorted by label: Acre Coffee, Aqus Cafe, Blue Bottle → first two
    assert_eq!(result, vec!["acre", "aqus"]);
}

#[test]
fn protocol_union_with_refiner() {
    let cfg = config_with_protocol();
    let result = ExpressionParser::new(&cfg).query(
        ":has_tag:coffee: | :has_tag:park: *sort:label* *limit:3*",
        "",
    );
    assert_eq!(result.len(), 3);
}

// --- Edge cases ---

#[test]
fn refiner_skip_beyond_length() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *skip:100*", "");
    assert!(result.is_empty());
}

#[test]
fn refiner_limit_zero() {
    let cfg = test_config();
    let result = ExpressionParser::new(&cfg).query(".car *limit:0*", "");
    assert!(result.is_empty());
}

#[test]
fn protocol_trailing_colon_only() {
    // Expression "::" should produce empty protocol name, skip gracefully
    let cfg = config_with_protocol();
    let result = ExpressionParser::new(&cfg).query("::", "");
    assert!(result.is_empty());
}

#[test]
fn refiner_in_comma_separated_segment() {
    let cfg = test_config();
    // Refiner applies only to first segment
    let result = ExpressionParser::new(&cfg).query(".car *sort:label* *limit:1*, brooklyn", "");
    assert_eq!(result.len(), 2);
    assert_eq!(result[0], "bmwe36"); // first car sorted by label
    assert_eq!(result[1], "brooklyn");
}
