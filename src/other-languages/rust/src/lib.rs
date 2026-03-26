// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Rust port of the Alap expression parser.
//!
//! This is the server-side subset of `alap/core` (TypeScript).  It covers
//! expression parsing, config merging, regex validation, and URL sanitization.
//!
//! # Grammar
//!
//! ```text
//! query   = segment (',' segment)*
//! segment = term (op term)* refiner*
//! op      = '+' | '|' | '-'
//! term    = '(' segment ')' | atom
//! atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
//! refiner = '*' name (':' arg)* '*'
//! ```

mod parser;
mod sanitize;
mod ssrf_guard;
pub mod types;
mod validate;
mod validate_config;

pub use parser::ExpressionParser;
pub use sanitize::sanitize_url;
pub use ssrf_guard::is_private_host;
pub use types::{Config, Link, LinkWithId, Macro, Protocol, ProtocolHandler, RegexValidation};
pub use validate::validate_regex;
pub use validate_config::validate_config;

use sanitize::sanitize_link;
use std::collections::HashMap;

/// Resolves an expression and returns matching links with sanitized URLs.
#[must_use]
pub fn resolve(config: &Config, expression: &str) -> Vec<LinkWithId> {
    let mut parser = ExpressionParser::new(config);
    let ids = parser.query(expression, "");
    ids.iter()
        .filter_map(|id| {
            config.all_links.get(id).map(|link| LinkWithId {
                id: id.clone(),
                link: sanitize_link(link),
            })
        })
        .collect()
}

/// Resolves an expression and returns a map of id → sanitized link.
#[must_use]
pub fn cherry_pick(config: &Config, expression: &str) -> HashMap<String, Link> {
    let mut parser = ExpressionParser::new(config);
    let ids = parser.query(expression, "");
    ids.iter()
        .filter_map(|id| {
            config
                .all_links
                .get(id)
                .map(|link| (id.clone(), sanitize_link(link)))
        })
        .collect()
}

/// Shallow-merges multiple configs. Later configs win on collision.
#[must_use]
pub fn merge_configs(configs: &[&Config]) -> Config {
    const BLOCKED: &[&str] = &["__proto__", "constructor", "prototype"];

    let mut merged = Config::default();

    for cfg in configs {
        for (k, v) in &cfg.settings {
            if !BLOCKED.contains(&k.as_str()) {
                merged.settings.insert(k.clone(), v.clone());
            }
        }
        for (k, v) in &cfg.macros {
            if !BLOCKED.contains(&k.as_str()) {
                merged.macros.insert(k.clone(), v.clone());
            }
        }
        for (k, v) in &cfg.all_links {
            if !BLOCKED.contains(&k.as_str()) {
                merged.all_links.insert(k.clone(), v.clone());
            }
        }
        for (k, v) in &cfg.search_patterns {
            if !BLOCKED.contains(&k.as_str()) {
                merged.search_patterns.insert(k.clone(), v.clone());
            }
        }
    }

    merged
}
