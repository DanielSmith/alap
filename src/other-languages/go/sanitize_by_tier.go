// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap

// Tier-aware sanitizers — Go port of src/core/sanitizeByTier.ts.
//
// Consumers (renderers, anything that takes a validated link and
// forwards it into a rendered surface) read provenance off each link
// and apply the appropriate rule: strict on anything that crossed a
// trust boundary (storage adapter, protocol handler, unstamped), loose
// on author-tier links the developer hand-wrote.
//
// Fail-closed policy: a link with no provenance stamp is treated as
// untrusted. ValidateConfig stamps every link it returns, so the only
// way an unstamped link ends up here is if it bypassed validation —
// a code path that should not exist in normal use.

// SanitizeURLByTier applies the URL sanitizer matched to the link's
// provenance tier.
//
// Author-tier gets SanitizeURL (permits tel:, mailto:, and any custom
// developer-intended scheme that is not explicitly dangerous).
// Everything else — including unstamped — gets SanitizeURLStrict
// (http / https / mailto only).
func SanitizeURLByTier(url string, link *Link) string {
	if IsAuthorTier(link) {
		return SanitizeURL(url)
	}
	return SanitizeURLStrict(url)
}

// SanitizeCSSClassByTier keeps cssClass for author-tier, drops it
// (returns "") for everything else.
//
// Attacker-controlled class names can target CSS selectors that
// exfiltrate data via `content: attr(...)`, trigger layout-driven
// side channels, or overlay visible UI to mislead the user. There is
// no narrow allowlist that beats "do not let untrusted input pick a
// class at all."
func SanitizeCSSClassByTier(cssClass string, link *Link) string {
	if IsAuthorTier(link) {
		return cssClass
	}
	return ""
}

// SanitizeTargetWindowByTier passes targetWindow through for
// author-tier (including empty string), clamps to "_blank" for
// everything else.
//
// Even when a non-author link did not specify its own target, we still
// clamp to "_blank" rather than let it inherit the author's named-
// window default (e.g. "fromAlap"). Letting a storage- or
// protocol-tier link ride into an author-reserved window would let it
// overwrite whatever the author had open there.
func SanitizeTargetWindowByTier(targetWindow string, link *Link) string {
	if IsAuthorTier(link) {
		return targetWindow
	}
	return "_blank"
}
