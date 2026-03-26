// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Config validation and sanitization for untrusted inputs.
//!
//! Port of `src/core/validateConfig.ts`.

use std::collections::HashMap;

use serde_json::Value;

use crate::sanitize::sanitize_url;
use crate::types::{Config, Link, Macro};
use crate::validate::validate_regex;

const BLOCKED_KEYS: &[&str] = &["__proto__", "constructor", "prototype"];

/// Whitelist of allowed fields on a link object.
const LINK_FIELDS: &[&str] = &[
    "url",
    "label",
    "tags",
    "cssClass",
    "image",
    "altText",
    "targetWindow",
    "description",
    "thumbnail",
    "createdAt",
];

/// Validate and sanitize a [`Config`] from an untrusted JSON [`Value`].
///
/// - Verifies structural shape (`allLinks` must be a non-null object)
/// - Sanitizes all URLs (`url`, `image`) via [`sanitize_url`]
/// - Validates and removes dangerous regex search patterns
/// - Filters prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
/// - Rejects hyphens in item IDs, macro names, tag names, and search-pattern keys
///
/// Returns a sanitized [`Config`]. Never mutates the input (we take ownership
/// of the [`Value`]).
///
/// # Errors
///
/// Returns `Err` if the value is not an object or `allLinks` is missing/invalid.
pub fn validate_config(value: Value) -> Result<Config, String> {
    let obj = match value {
        Value::Object(map) => map,
        _ => return Err("Invalid config: expected an object".into()),
    };

    // --- allLinks (required) ---
    let raw_links = match obj.get("allLinks") {
        Some(Value::Object(map)) => map,
        Some(Value::Array(_)) | None => {
            return Err("Invalid config: allLinks must be a non-null object".into());
        }
        Some(_) => {
            return Err("Invalid config: allLinks must be a non-null object".into());
        }
    };

    let mut all_links: HashMap<String, Link> = HashMap::new();

    for (key, link_val) in raw_links {
        if BLOCKED_KEYS.contains(&key.as_str()) {
            continue;
        }

        if key.contains('-') {
            eprintln!(
                "validateConfig: skipping allLinks[\"{key}\"] \
                 — hyphens are not allowed in item IDs. Use underscores instead. \
                 The \"-\" character is the WITHOUT operator in expressions."
            );
            continue;
        }

        let raw_link = match link_val {
            Value::Object(map) => map,
            _ => {
                eprintln!("validateConfig: skipping allLinks[\"{key}\"] — not a valid link object");
                continue;
            }
        };

        // url is required and must be a string
        let url = match raw_link.get("url") {
            Some(Value::String(s)) => s.clone(),
            _ => {
                eprintln!(
                    "validateConfig: skipping allLinks[\"{key}\"] — missing or invalid url"
                );
                continue;
            }
        };

        let sanitized_url = sanitize_url(&url);

        // image — sanitize if present and a string
        let image = match raw_link.get("image") {
            Some(Value::String(s)) => Some(sanitize_url(s)),
            _ => None,
        };

        // tags — must be an array of strings; reject tags containing hyphens
        let tags = match raw_link.get("tags") {
            Some(Value::Array(arr)) => {
                let mut filtered = Vec::new();
                for t in arr {
                    if let Value::String(s) = t {
                        if s.contains('-') {
                            eprintln!(
                                "validateConfig: allLinks[\"{key}\"] \
                                 — stripping tag \"{s}\" (hyphens not allowed in tags). \
                                 Use underscores instead."
                            );
                        } else {
                            filtered.push(s.clone());
                        }
                    }
                    // non-string entries are silently dropped
                }
                filtered
            }
            Some(_) => {
                eprintln!("validateConfig: allLinks[\"{key}\"].tags is not an array — ignoring");
                Vec::new()
            }
            None => Vec::new(),
        };

        // Whitelist remaining optional string fields
        let label = string_field(raw_link, "label");
        let css_class = string_field(raw_link, "cssClass");
        let alt_text = string_field(raw_link, "altText");
        let target_window = string_field(raw_link, "targetWindow");
        let description = string_field(raw_link, "description");
        let thumbnail = string_field(raw_link, "thumbnail");
        let created_at = raw_link.get("createdAt").cloned();

        // Warn about unknown fields (anything not in whitelist)
        for field_key in raw_link.keys() {
            if !LINK_FIELDS.contains(&field_key.as_str()) {
                eprintln!(
                    "validateConfig: allLinks[\"{key}\"] — ignoring unknown field \"{field_key}\""
                );
            }
        }

        all_links.insert(
            key.clone(),
            Link {
                url: sanitized_url,
                label,
                tags,
                css_class,
                image,
                alt_text,
                target_window,
                description,
                thumbnail,
                created_at,
                meta: None,
            },
        );
    }

    // --- settings (optional) ---
    let settings = match obj.get("settings") {
        Some(Value::Object(map)) => {
            let mut out = HashMap::new();
            for (k, v) in map {
                if !BLOCKED_KEYS.contains(&k.as_str()) {
                    out.insert(k.clone(), v.clone());
                }
            }
            out
        }
        _ => HashMap::new(),
    };

    // --- macros (optional) ---
    let macros = match obj.get("macros") {
        Some(Value::Object(map)) => {
            let mut out = HashMap::new();
            for (k, v) in map {
                if BLOCKED_KEYS.contains(&k.as_str()) {
                    continue;
                }
                if k.contains('-') {
                    eprintln!(
                        "validateConfig: skipping macro \"{k}\" \
                         — hyphens are not allowed in macro names. Use underscores instead. \
                         The \"-\" character is the WITHOUT operator in expressions."
                    );
                    continue;
                }
                match v {
                    Value::Object(macro_map) => {
                        if let Some(Value::String(link_items)) = macro_map.get("linkItems") {
                            out.insert(
                                k.clone(),
                                Macro {
                                    link_items: link_items.clone(),
                                    config: macro_map.get("config").cloned(),
                                },
                            );
                        } else {
                            eprintln!(
                                "validateConfig: skipping macro \"{k}\" — invalid shape"
                            );
                        }
                    }
                    _ => {
                        eprintln!("validateConfig: skipping macro \"{k}\" — invalid shape");
                    }
                }
            }
            out
        }
        _ => HashMap::new(),
    };

    // --- searchPatterns (optional) ---
    let search_patterns = match obj.get("searchPatterns") {
        Some(Value::Object(map)) => {
            let mut out = HashMap::new();
            for (k, v) in map {
                if BLOCKED_KEYS.contains(&k.as_str()) {
                    continue;
                }
                if k.contains('-') {
                    eprintln!(
                        "validateConfig: skipping searchPattern \"{k}\" \
                         — hyphens are not allowed in pattern keys. Use underscores instead. \
                         The \"-\" character is the WITHOUT operator in expressions."
                    );
                    continue;
                }

                // String shorthand
                if let Value::String(pattern) = v {
                    let validation = validate_regex(pattern);
                    if validation.safe {
                        out.insert(k.clone(), v.clone());
                    } else {
                        eprintln!(
                            "validateConfig: removing searchPattern \"{k}\" — {}",
                            validation.reason.unwrap_or_default()
                        );
                    }
                    continue;
                }

                // Object form with .pattern field
                if let Value::Object(entry) = v {
                    if let Some(Value::String(pattern)) = entry.get("pattern") {
                        let validation = validate_regex(pattern);
                        if validation.safe {
                            out.insert(k.clone(), v.clone());
                        } else {
                            eprintln!(
                                "validateConfig: removing searchPattern \"{k}\" — {}",
                                validation.reason.unwrap_or_default()
                            );
                        }
                        continue;
                    }
                }

                eprintln!(
                    "validateConfig: skipping searchPattern \"{k}\" — invalid shape"
                );
            }
            out
        }
        _ => HashMap::new(),
    };

    Ok(Config {
        settings,
        macros,
        all_links,
        search_patterns,
        protocols: None,
    })
}

/// Extract an optional string field from a JSON object map.
fn string_field(map: &serde_json::Map<String, Value>, key: &str) -> Option<String> {
    match map.get(key) {
        Some(Value::String(s)) => Some(s.clone()),
        _ => None,
    }
}
