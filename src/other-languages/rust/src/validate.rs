// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Regex validation (ReDoS guard).
//!
//! Rust's `regex` crate uses finite automata (no backtracking), so it is
//! inherently safe from ReDoS — like Go's `regexp` package.  We still
//! validate for consistency with other language ports and to reject
//! obviously broken patterns.

use regex::Regex;

use crate::types::RegexValidation;

/// Checks whether a regex pattern compiles successfully.
#[must_use]
pub fn validate_regex(pattern: &str) -> RegexValidation {
    match Regex::new(pattern) {
        Ok(_) => RegexValidation {
            safe: true,
            reason: None,
        },
        Err(e) => RegexValidation {
            safe: false,
            reason: Some(format!("Invalid regex: {e}")),
        },
    }
}
