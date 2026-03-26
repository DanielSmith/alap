// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Configuration types for the Alap expression parser.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Signature for protocol handler predicates.
///
/// Arguments: `(args, link, item_id)` — returns `true` if the link matches.
pub type ProtocolHandler = fn(&[String], &Link, &str) -> bool;

/// A named protocol that filters links via a predicate.
#[derive(Clone)]
pub struct Protocol {
    pub handler: ProtocolHandler,
}

impl std::fmt::Debug for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Protocol")
            .field("handler", &"fn(&[String], &Link, &str) -> bool")
            .finish()
    }
}

/// Root Alap configuration object.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub settings: HashMap<String, serde_json::Value>,

    #[serde(default)]
    pub macros: HashMap<String, Macro>,

    #[serde(default, rename = "allLinks")]
    pub all_links: HashMap<String, Link>,

    #[serde(default, rename = "searchPatterns")]
    pub search_patterns: HashMap<String, serde_json::Value>,

    /// Protocol handlers, keyed by protocol name.
    /// Not serializable — must be set programmatically.
    #[serde(skip)]
    pub protocols: Option<HashMap<String, Protocol>>,
}

/// A named reusable expression.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Macro {
    #[serde(default, rename = "linkItems")]
    pub link_items: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config: Option<serde_json::Value>,
}

/// A single link entry in `allLinks`.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Link {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    #[serde(default)]
    pub url: String,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,

    #[serde(default, skip_serializing_if = "Option::is_none", rename = "cssClass")]
    pub css_class: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none", rename = "altText")]
    pub alt_text: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none", rename = "targetWindow")]
    pub target_window: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none", rename = "createdAt")]
    pub created_at: Option<serde_json::Value>,

    /// Arbitrary metadata for protocol handlers and refiners.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, serde_json::Value>>,
}

/// A [`Link`] with its ID attached.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkWithId {
    pub id: String,

    #[serde(flatten)]
    pub link: Link,
}

/// Result of [`validate_regex`](crate::validate_regex).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegexValidation {
    pub safe: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

// ---- Internal token types (not public) ----

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Token {
    ItemId(String),
    Class(String),
    DomRef(String),
    Regex(String),
    Protocol(String),
    Refiner(String),
    Plus,
    Pipe,
    Minus,
    Comma,
    LParen,
    RParen,
}
