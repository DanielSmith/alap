// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Provenance tier stamping — Rust port of src/core/linkProvenance.ts.
//!
//! Links carry a provenance tier (where they came from) so downstream
//! sanitizers can apply strictness matched to the source's
//! trustworthiness. See [`crate::types::Tier`] for tier semantics.
//!
//! The `Tier` enum is exhaustive — invalid tier strings cannot be
//! constructed at compile time, unlike the string-based tiers in
//! dynamic-language ports. The one edge case is `Tier::Protocol(String)`
//! with an empty string (a bare `protocol:` prefix); [`stamp`] rejects
//! that at runtime via [`Tier::is_valid`].

use crate::types::{Link, Tier};

/// Stamp `link` with its provenance tier. Returns `Err` on an
/// invalid tier (currently only `Tier::Protocol("")`).
pub fn stamp(link: &mut Link, tier: Tier) -> Result<(), String> {
    if !tier.is_valid() {
        return Err(format!("invalid provenance tier: {tier:?}"));
    }
    link.provenance = Some(tier);
    Ok(())
}

/// Stamp `link` with `tier`, panicking on invalid tier. Use when the
/// tier is statically known to be valid (e.g. one of the non-Protocol
/// variants, or a Protocol variant with a non-empty name).
pub fn must_stamp(link: &mut Link, tier: Tier) {
    stamp(link, tier).expect("must_stamp: invalid tier");
}

/// Return the link's provenance tier, or `None` if unstamped.
#[must_use]
pub fn get(link: &Link) -> Option<&Tier> {
    link.provenance.as_ref()
}

/// True if the link was hand-written in the developer's config.
#[must_use]
pub fn is_author_tier(link: &Link) -> bool {
    matches!(link.provenance, Some(Tier::Author))
}

/// True if the link was loaded from a storage adapter.
#[must_use]
pub fn is_storage_tier(link: &Link) -> bool {
    matches!(
        link.provenance,
        Some(Tier::StorageLocal) | Some(Tier::StorageRemote)
    )
}

/// True if the link was returned by a protocol handler.
#[must_use]
pub fn is_protocol_tier(link: &Link) -> bool {
    matches!(link.provenance, Some(Tier::Protocol(_)))
}

/// Copy the provenance stamp from `src` to `dest`. No-op if `src` is
/// unstamped.
pub fn clone_to(src: &Link, dest: &mut Link) {
    if let Some(tier) = src.provenance.clone() {
        dest.provenance = Some(tier);
    }
}
