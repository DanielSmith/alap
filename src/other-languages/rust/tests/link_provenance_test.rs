// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! Tests for `link_provenance` — tier stamping + predicates + clone_to.

use alap::link_provenance::{
    clone_to, get, is_author_tier, is_protocol_tier, is_storage_tier, must_stamp, stamp,
};
use alap::{Link, Tier};

fn fresh_link() -> Link {
    Link {
        url: "/a".into(),
        ..Default::default()
    }
}

// ---- Stamp + get ----

#[test]
fn stamp_author_then_read() {
    let mut link = fresh_link();
    stamp(&mut link, Tier::Author).unwrap();
    assert_eq!(get(&link), Some(&Tier::Author));
}

#[test]
fn stamp_storage_local() {
    let mut link = fresh_link();
    stamp(&mut link, Tier::StorageLocal).unwrap();
    assert_eq!(get(&link), Some(&Tier::StorageLocal));
}

#[test]
fn stamp_storage_remote() {
    let mut link = fresh_link();
    stamp(&mut link, Tier::StorageRemote).unwrap();
    assert_eq!(get(&link), Some(&Tier::StorageRemote));
}

#[test]
fn stamp_protocol() {
    let mut link = fresh_link();
    stamp(&mut link, Tier::Protocol("web".into())).unwrap();
    assert_eq!(get(&link), Some(&Tier::Protocol("web".into())));
}

#[test]
fn unstamped_returns_none() {
    let link = fresh_link();
    assert_eq!(get(&link), None);
}

#[test]
fn stamp_overwrites_existing() {
    let mut link = fresh_link();
    stamp(&mut link, Tier::Author).unwrap();
    stamp(&mut link, Tier::Protocol("web".into())).unwrap();
    assert_eq!(get(&link), Some(&Tier::Protocol("web".into())));
}

// ---- Invalid tier rejection ----

#[test]
fn stamp_rejects_bare_protocol_prefix() {
    let mut link = fresh_link();
    let result = stamp(&mut link, Tier::Protocol(String::new()));
    assert!(result.is_err(), "expected error, got Ok");
    assert!(link.provenance.is_none(), "link should not be stamped");
}

#[test]
fn tier_is_valid_accepts_singletons() {
    assert!(Tier::Author.is_valid());
    assert!(Tier::StorageLocal.is_valid());
    assert!(Tier::StorageRemote.is_valid());
}

#[test]
fn tier_is_valid_accepts_named_protocol() {
    assert!(Tier::Protocol("web".into()).is_valid());
    assert!(Tier::Protocol("custom_handler_42".into()).is_valid());
}

#[test]
fn tier_is_valid_rejects_empty_protocol() {
    assert!(!Tier::Protocol(String::new()).is_valid());
}

#[test]
#[should_panic(expected = "invalid tier")]
fn must_stamp_panics_on_invalid_tier() {
    let mut link = fresh_link();
    must_stamp(&mut link, Tier::Protocol(String::new()));
}

// ---- Tier predicates ----

#[test]
fn predicates_author() {
    let mut link = fresh_link();
    must_stamp(&mut link, Tier::Author);
    assert!(is_author_tier(&link));
    assert!(!is_storage_tier(&link));
    assert!(!is_protocol_tier(&link));
}

#[test]
fn predicates_storage_local() {
    let mut link = fresh_link();
    must_stamp(&mut link, Tier::StorageLocal);
    assert!(!is_author_tier(&link));
    assert!(is_storage_tier(&link));
    assert!(!is_protocol_tier(&link));
}

#[test]
fn predicates_storage_remote() {
    let mut link = fresh_link();
    must_stamp(&mut link, Tier::StorageRemote);
    assert!(is_storage_tier(&link));
}

#[test]
fn predicates_protocol() {
    let mut link = fresh_link();
    must_stamp(&mut link, Tier::Protocol("web".into()));
    assert!(!is_author_tier(&link));
    assert!(!is_storage_tier(&link));
    assert!(is_protocol_tier(&link));
}

#[test]
fn predicates_unstamped_all_false() {
    let link = fresh_link();
    assert!(!is_author_tier(&link));
    assert!(!is_storage_tier(&link));
    assert!(!is_protocol_tier(&link));
}

// ---- clone_to ----

#[test]
fn clone_to_copies_stamp() {
    let mut src = fresh_link();
    must_stamp(&mut src, Tier::Protocol("web".into()));
    let mut dest = Link {
        url: "/b".into(),
        ..Default::default()
    };
    clone_to(&src, &mut dest);
    assert_eq!(get(&dest), Some(&Tier::Protocol("web".into())));
}

#[test]
fn clone_to_no_op_when_src_unstamped() {
    let src = fresh_link();
    let mut dest = Link {
        url: "/b".into(),
        ..Default::default()
    };
    clone_to(&src, &mut dest);
    assert!(dest.provenance.is_none());
}

#[test]
fn clone_to_overwrites_existing_dest() {
    let mut src = fresh_link();
    must_stamp(&mut src, Tier::StorageRemote);
    let mut dest = Link {
        url: "/b".into(),
        ..Default::default()
    };
    must_stamp(&mut dest, Tier::Author);
    clone_to(&src, &mut dest);
    assert_eq!(get(&dest), Some(&Tier::StorageRemote));
}

// ---- JSON excludes provenance ----

#[test]
fn provenance_not_in_json_round_trip() {
    // A stamped link serialized to JSON and back should NOT carry the stamp
    // through the wire — callers can't leak a stamp to untrusted consumers
    // and attackers can't pre-stamp via crafted JSON.
    let mut link = fresh_link();
    must_stamp(&mut link, Tier::Author);

    let json = serde_json::to_string(&link).expect("serialize");
    assert!(
        !json.contains("provenance"),
        "JSON output should not contain 'provenance' field: {json}"
    );
    assert!(
        !json.contains("Author"),
        "JSON output should not contain tier value: {json}"
    );

    let round_tripped: Link = serde_json::from_str(&json).expect("deserialize");
    assert_eq!(round_tripped.provenance, None, "round-trip should lose stamp");
}
