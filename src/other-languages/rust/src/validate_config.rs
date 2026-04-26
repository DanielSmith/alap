// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Config validation and sanitization for untrusted inputs — Rust port
//! of `src/core/validateConfig.ts`.
//!
//! Takes an untrusted JSON [`Value`] and returns a sanitized,
//! provenance-stamped [`Config`]. Mirrors the 3.2 reference behaviour:
//!
//! - rejects structural invalidity (non-object, missing `allLinks`, list-
//!   shaped `allLinks`);
//! - stamps each validated link with the caller-supplied provenance tier;
//! - enforces the hooks allowlist against non-author tiers (fail-closed
//!   when `settings.hooks` is not declared);
//! - sanitizes every URL-bearing field (`url`, `image`, `thumbnail`, and
//!   any `meta.*Url` key) through [`sanitize_url`];
//! - strips `__proto__` / `constructor` / `prototype` keys (plus the
//!   Python-port dunders retained for cross-port parity) from all
//!   object-shaped fields, including nested `link.meta`;
//! - rejects hyphens in item IDs, tag names, macro names, and
//!   searchPattern keys.
//!
//! Deep-freeze and idempotence-marker are intentionally skipped in the
//! Rust port: Rust's borrow checker enforces `&T` immutability at
//! compile time (no runtime freeze needed), and the input/output types
//! differ (`Value` → `Config`), so a caller cannot re-validate a
//! validated Config via this function in the first place.

use std::collections::HashMap;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::link_provenance;
use crate::sanitize::sanitize_url;
use crate::types::{Config, Link, Macro, Tier};
use crate::validate::validate_regex;

/// Keys silently stripped at every map level during validation.
///
/// JS prototype-pollution set (`__proto__`, `constructor`, `prototype`)
/// + Python-port dunders (`__class__`, `__bases__`, `__mro__`,
/// `__subclasses__`) retained for cross-port parity — Rust has no
/// prototype chain so the first three are harmless here, but keeping
/// the full set means auditors don't need a per-language cheat sheet.
const BLOCKED_KEYS: &[&str] = &[
    "__proto__",
    "constructor",
    "prototype",
    "__class__",
    "__bases__",
    "__mro__",
    "__subclasses__",
];

/// Whitelist of allowed fields on a link object. `meta` was missing
/// from the pre-3.2 list (meta was silently dropped); added here so
/// handlers can attach arbitrary metadata.
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
    "hooks",
    "guid",
    "createdAt",
    "meta",
];

static META_URL_KEY_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)url$").expect("META_URL_KEY_RE is a valid regex"));

/// Options passed to [`validate_config_with_options`].
#[derive(Debug, Clone)]
pub struct ValidateOptions {
    /// The tier to stamp each validated link with. Defaults to
    /// [`Tier::Author`].
    pub provenance: Tier,
}

impl Default for ValidateOptions {
    fn default() -> Self {
        Self {
            provenance: Tier::Author,
        }
    }
}

/// Validate and sanitize a [`Config`] from an untrusted JSON [`Value`],
/// stamping each link with [`Tier::Author`].
///
/// Shortcut for [`validate_config_with_options`] with default options.
///
/// # Errors
///
/// See [`validate_config_with_options`].
pub fn validate_config(value: Value) -> Result<Config, String> {
    validate_config_with_options(value, ValidateOptions::default())
}

/// Validate and sanitize a [`Config`] from an untrusted JSON [`Value`],
/// stamping each link with `opts.provenance`.
///
/// Returns a sanitized [`Config`]. Never mutates the input (we take
/// ownership of the [`Value`]).
///
/// # Errors
///
/// Returns `Err` if:
/// - the value is not a JSON object,
/// - `allLinks` is missing / is a JSON array / is not an object,
/// - `opts.provenance` is structurally invalid (currently only
///   `Tier::Protocol("")`).
pub fn validate_config_with_options(
    value: Value,
    opts: ValidateOptions,
) -> Result<Config, String> {
    if !opts.provenance.is_valid() {
        return Err(format!(
            "invalid ValidateOptions.provenance: {:?}",
            opts.provenance
        ));
    }

    let obj = match value {
        Value::Object(map) => map,
        _ => return Err("Invalid config: expected an object".into()),
    };

    // Hook allowlist — pulled from settings up front so the per-link
    // pass below can filter non-author-tier hooks against it.
    let hook_allowlist: Option<Vec<String>> = obj
        .get("settings")
        .and_then(Value::as_object)
        .and_then(|s| s.get("hooks"))
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        });

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
                eprintln!(
                    "validateConfig: skipping allLinks[\"{key}\"] — not a valid link object"
                );
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

        // Tags — strings only, reject hyphens.
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
                }
                filtered
            }
            Some(_) => {
                eprintln!("validateConfig: allLinks[\"{key}\"].tags is not an array — ignoring");
                Vec::new()
            }
            None => Vec::new(),
        };

        let label = string_field(raw_link, "label");
        let css_class = string_field(raw_link, "cssClass");
        let image = string_field(raw_link, "image");
        let alt_text = string_field(raw_link, "altText");
        let target_window = string_field(raw_link, "targetWindow");
        let description = string_field(raw_link, "description");
        let thumbnail = string_field(raw_link, "thumbnail");
        let guid = string_field(raw_link, "guid");
        let created_at = raw_link.get("createdAt").cloned();

        // Hooks — tier-aware allowlist enforcement.
        let hooks = match raw_link.get("hooks") {
            Some(Value::Array(arr)) => {
                let string_hooks: Vec<String> = arr
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();
                tier_aware_hooks(&opts.provenance, hook_allowlist.as_ref(), &string_hooks, key)
            }
            _ => None,
        };

        // Meta — copy with BLOCKED_KEYS filter at the nested level.
        // `sanitize_link_urls` below runs a second pass that also strips
        // blocked keys and sanitises *Url fields; this first pass makes
        // sure link.meta is already a fresh HashMap.
        let meta = match raw_link.get("meta") {
            Some(Value::Object(meta_map)) => {
                let mut out = HashMap::new();
                for (mk, mv) in meta_map {
                    if BLOCKED_KEYS.contains(&mk.as_str()) {
                        continue;
                    }
                    out.insert(mk.clone(), mv.clone());
                }
                Some(out)
            }
            _ => None,
        };

        // Warn about unknown fields (anything not in the whitelist)
        for field_key in raw_link.keys() {
            if !LINK_FIELDS.contains(&field_key.as_str()) {
                eprintln!(
                    "validateConfig: allLinks[\"{key}\"] — ignoring unknown field \"{field_key}\""
                );
            }
        }

        let mut link = Link {
            url,
            label,
            tags,
            css_class,
            image,
            alt_text,
            target_window,
            description,
            thumbnail,
            hooks,
            guid,
            created_at,
            meta,
            provenance: None,
        };

        // Single source of truth for URL-field sanitization — handles
        // url, image, thumbnail, and any meta.*Url key. Also re-runs
        // the meta BLOCKED_KEYS filter.
        sanitize_link_urls(&mut link);

        // Stamp provenance AFTER the whitelist pass — since the Link
        // struct was built from a fixed set of known fields (and
        // `provenance` is `#[serde(skip)]` so JSON can't set it
        // anyway), the input cannot pre-stamp itself.
        link_provenance::must_stamp(&mut link, opts.provenance.clone());

        all_links.insert(key.clone(), link);
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
                            eprintln!("validateConfig: skipping macro \"{k}\" — invalid shape");
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

                eprintln!("validateConfig: skipping searchPattern \"{k}\" — invalid shape");
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

/// Single source of truth for URL-scheme sanitization on a link.
///
/// Scans `url`, `image`, `thumbnail`, and any `meta` key whose name
/// ends with `url` (case-insensitive), passing each through
/// [`sanitize_url`]. Strips [`BLOCKED_KEYS`] from `meta` during the
/// pass — called by `validate_config_with_options` and available for
/// any handler that constructs a Link before returning it.
pub fn sanitize_link_urls(link: &mut Link) {
    if !link.url.is_empty() {
        link.url = sanitize_url(&link.url);
    }
    if let Some(image) = &link.image {
        link.image = Some(sanitize_url(image));
    }
    if let Some(thumbnail) = &link.thumbnail {
        link.thumbnail = Some(sanitize_url(thumbnail));
    }
    if let Some(meta) = link.meta.as_mut() {
        // Strip blocked keys (defence in depth — validate_config already
        // filters these once, but sanitize_link_urls is also called
        // directly by handlers on fresh Links) and sanitize any *Url key.
        meta.retain(|k, _| !BLOCKED_KEYS.contains(&k.as_str()));
        for (k, v) in meta.iter_mut() {
            if META_URL_KEY_RE.is_match(k) {
                if let Value::String(s) = v {
                    *v = Value::String(sanitize_url(s));
                }
            }
        }
    }
}

/// Apply the tier-aware hooks allowlist rule.
fn tier_aware_hooks(
    provenance: &Tier,
    allowlist: Option<&Vec<String>>,
    string_hooks: &[String],
    link_key: &str,
) -> Option<Vec<String>> {
    if string_hooks.is_empty() {
        return None;
    }

    if matches!(provenance, Tier::Author) {
        return Some(string_hooks.to_vec());
    }

    if let Some(allowlist) = allowlist {
        let allowed: Vec<String> = string_hooks
            .iter()
            .filter(|h| {
                let ok = allowlist.contains(h);
                if !ok {
                    eprintln!(
                        "validateConfig: allLinks[\"{link_key}\"] — stripping hook \"{h}\" \
                         not in settings.hooks allowlist (tier: {provenance:?})"
                    );
                }
                ok
            })
            .cloned()
            .collect();
        if allowed.is_empty() {
            return None;
        }
        return Some(allowed);
    }

    eprintln!(
        "validateConfig: allLinks[\"{link_key}\"] — dropping {count} hook(s) on \
         {provenance:?}-tier link; declare settings.hooks to allow specific keys",
        count = string_hooks.len()
    );
    None
}

/// Extract an optional string field from a JSON object map.
fn string_field(map: &serde_json::Map<String, Value>, key: &str) -> Option<String> {
    match map.get(key) {
        Some(Value::String(s)) => Some(s.clone()),
        _ => None,
    }
}
