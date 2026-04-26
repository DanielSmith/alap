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

    /// Event hooks this item participates in, e.g. `["item-hover", "item-context"]`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hooks: Option<Vec<String>>,

    /// Permanent UUID. Survives renames; generated at creation time.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub guid: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none", rename = "createdAt")]
    pub created_at: Option<serde_json::Value>,

    /// Arbitrary metadata for protocol handlers and refiners.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, serde_json::Value>>,

    /// Provenance tier — where this link came from in the trust model.
    /// Excluded from JSON so untrusted input cannot pre-stamp a link as
    /// author-tier; stamps are set in-memory after the ValidateConfig
    /// whitelist pass. See the `link_provenance` module for the helper API.
    #[serde(skip)]
    pub provenance: Option<Tier>,
}

/// Provenance tier — where a link came from in the trust model.
///
/// Downstream sanitizers read this to apply strictness matched to the
/// source's trustworthiness.
///
/// Loosest to strictest:
///   - [`Tier::Author`]        — link came from the developer's hand-written config
///   - [`Tier::StorageLocal`]  — loaded from a local storage adapter
///   - [`Tier::StorageRemote`] — loaded from a remote config server
///   - [`Tier::Protocol`]      — returned by a protocol handler; carries
///                               the handler name
///                               (e.g. `Tier::Protocol("web".into())`)
///
/// TypeScript stores the stamp in a `WeakMap` keyed on runtime object
/// identity so an attacker-writable `.provenance` field on an incoming
/// link cannot pre-stamp itself for free. The Rust port uses a struct
/// field tagged `#[serde(skip)]` so it is excluded from JSON
/// round-trips; stamps are set in-memory after ValidateConfig's
/// whitelist pass, never from input.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Tier {
    Author,
    StorageLocal,
    StorageRemote,
    Protocol(String),
}

impl Tier {
    /// Structural validity check. Rejects `Tier::Protocol(String::new())`
    /// which represents a bare `protocol:` prefix — not a valid handler
    /// name. All other variants are always valid at the type level.
    #[must_use]
    pub fn is_valid(&self) -> bool {
        match self {
            Tier::Protocol(name) => !name.is_empty(),
            _ => true,
        }
    }
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
