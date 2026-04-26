// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap

import (
	"fmt"
	"strings"
)

// Tier represents the provenance tier of a link — where it came from
// in the trust model. Downstream sanitizers read this to apply strictness
// matched to the source's trustworthiness.
//
// Tiers, loosest to strictest:
//   - TierAuthor         — link came from the developer's hand-written config
//   - TierStorageLocal   — loaded from a local storage adapter
//   - TierStorageRemote  — loaded from a remote config server
//   - "protocol:<name>"  — returned by a protocol handler (any string with
//                          the "protocol:" prefix is valid)
//
// TypeScript stores the stamp in a WeakMap keyed on runtime object
// identity so an attacker-writable field on an incoming link cannot
// pre-stamp itself for free. The Go port uses a struct field
// (Link.Provenance) tagged `json:"-"` so it is excluded from JSON
// round-trips; stamps are set in-memory after ValidateConfig's
// whitelist pass, never from input.
type Tier string

const (
	TierAuthor        Tier = "author"
	TierStorageLocal  Tier = "storage:local"
	TierStorageRemote Tier = "storage:remote"
)

// TierProtocolPrefix is the prefix for protocol-tier values. Full tier
// strings look like "protocol:web" or "protocol:atproto".
const TierProtocolPrefix = "protocol:"

// StampProvenance sets the provenance tier on a link. Returns an error
// when tier is not one of the valid forms.
func StampProvenance(link *Link, tier Tier) error {
	if !isValidTier(tier) {
		return fmt.Errorf(
			"invalid provenance tier %q. Must be one of %q, %q, %q, or \"protocol:<name>\"",
			tier, TierAuthor, TierStorageLocal, TierStorageRemote,
		)
	}
	link.Provenance = tier
	return nil
}

// MustStampProvenance panics on invalid tier. Use when the tier is
// statically known to be valid (e.g. from one of the TierXxx constants).
func MustStampProvenance(link *Link, tier Tier) {
	if err := StampProvenance(link, tier); err != nil {
		panic(err)
	}
}

// GetProvenance returns the link's provenance tier, or the empty Tier
// ("") if the link is unstamped.
func GetProvenance(link *Link) Tier {
	return link.Provenance
}

// IsAuthorTier reports whether the link was hand-written in the
// developer's config.
func IsAuthorTier(link *Link) bool {
	return link.Provenance == TierAuthor
}

// IsStorageTier reports whether the link was loaded from a storage adapter.
func IsStorageTier(link *Link) bool {
	return link.Provenance == TierStorageLocal || link.Provenance == TierStorageRemote
}

// IsProtocolTier reports whether the link was returned by a protocol handler.
func IsProtocolTier(link *Link) bool {
	return strings.HasPrefix(string(link.Provenance), TierProtocolPrefix)
}

// CloneProvenance copies the provenance stamp from src to dest. No-op
// if src is unstamped.
func CloneProvenance(src, dest *Link) {
	if src.Provenance != "" {
		dest.Provenance = src.Provenance
	}
}

func isValidTier(tier Tier) bool {
	switch tier {
	case TierAuthor, TierStorageLocal, TierStorageRemote:
		return true
	}
	s := string(tier)
	return strings.HasPrefix(s, TierProtocolPrefix) && len(s) > len(TierProtocolPrefix)
}
