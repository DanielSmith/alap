// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap

import "testing"

// stampedLink is a test helper that builds a Link stamped with tier.
// Uses MustStampProvenance since tests pass known-valid tiers.
func stampedLink(tier Tier) *Link {
	link := &Link{URL: "/a"}
	MustStampProvenance(link, tier)
	return link
}

// --- SanitizeURLByTier ---

func TestSanitizeURLByTierAuthor(t *testing.T) {
	link := stampedLink(TierAuthor)
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"keeps https", "https://example.com", "https://example.com"},
		{"keeps http", "http://example.com", "http://example.com"},
		{"keeps tel", "tel:+15551234", "tel:+15551234"},
		{"keeps mailto", "mailto:a@b.com", "mailto:a@b.com"},
		{"keeps custom scheme", "obsidian://open?vault=foo", "obsidian://open?vault=foo"},
		{"still blocks javascript", "javascript:alert(1)", "about:blank"},
		{"still blocks data", "data:text/html,x", "about:blank"},
		{"keeps relative", "/foo/bar", "/foo/bar"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SanitizeURLByTier(tt.in, link); got != tt.want {
				t.Errorf("SanitizeURLByTier(%q, author) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestSanitizeURLByTierStorage(t *testing.T) {
	tests := []struct {
		name string
		tier Tier
		in   string
		want string
	}{
		{"storage:remote keeps https", TierStorageRemote, "https://example.com", "https://example.com"},
		{"storage:remote keeps mailto", TierStorageRemote, "mailto:a@b.com", "mailto:a@b.com"},
		{"storage:remote rejects tel", TierStorageRemote, "tel:+15551234", "about:blank"},
		{"storage:remote rejects custom scheme", TierStorageRemote, "obsidian://open", "about:blank"},
		{"storage:local rejects tel", TierStorageLocal, "tel:+15551234", "about:blank"},
		{"storage:remote blocks javascript", TierStorageRemote, "javascript:alert(1)", "about:blank"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			link := stampedLink(tt.tier)
			if got := SanitizeURLByTier(tt.in, link); got != tt.want {
				t.Errorf("SanitizeURLByTier(%q, %s) = %q, want %q", tt.in, tt.tier, got, tt.want)
			}
		})
	}
}

func TestSanitizeURLByTierProtocol(t *testing.T) {
	tests := []struct {
		name string
		tier Tier
		in   string
		want string
	}{
		{"protocol:web keeps https", Tier("protocol:web"), "https://example.com", "https://example.com"},
		{"protocol:web rejects tel", Tier("protocol:web"), "tel:+15551234", "about:blank"},
		{"protocol:atproto rejects custom", Tier("protocol:atproto"), "obsidian://open", "about:blank"},
		{"protocol:web blocks javascript", Tier("protocol:web"), "javascript:alert(1)", "about:blank"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			link := stampedLink(tt.tier)
			if got := SanitizeURLByTier(tt.in, link); got != tt.want {
				t.Errorf("SanitizeURLByTier(%q, %s) = %q, want %q", tt.in, tt.tier, got, tt.want)
			}
		})
	}
}

func TestSanitizeURLByTierUnstamped(t *testing.T) {
	// Fail-closed: no stamp → treated as non-author → strict.
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"unstamped rejects tel", "tel:+15551234", "about:blank"},
		{"unstamped keeps https", "https://example.com", "https://example.com"},
		{"unstamped blocks javascript", "javascript:alert(1)", "about:blank"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			link := &Link{URL: "/a"}
			if got := SanitizeURLByTier(tt.in, link); got != tt.want {
				t.Errorf("SanitizeURLByTier(%q, unstamped) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

// --- SanitizeCSSClassByTier ---

func TestSanitizeCSSClassByTier(t *testing.T) {
	tests := []struct {
		name     string
		tier     Tier // empty for unstamped
		cssClass string
		want     string
	}{
		{"author keeps class", TierAuthor, "my-class", "my-class"},
		{"author keeps multi-word", TierAuthor, "primary special", "primary special"},
		{"author empty stays empty", TierAuthor, "", ""},
		{"storage:remote drops class", TierStorageRemote, "my-class", ""},
		{"storage:local drops class", TierStorageLocal, "my-class", ""},
		{"protocol drops class", Tier("protocol:web"), "my-class", ""},
		{"protocol empty stays empty", Tier("protocol:web"), "", ""},
		{"unstamped drops class", Tier(""), "my-class", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			link := &Link{URL: "/a"}
			if tt.tier != "" {
				MustStampProvenance(link, tt.tier)
			}
			if got := SanitizeCSSClassByTier(tt.cssClass, link); got != tt.want {
				t.Errorf("SanitizeCSSClassByTier(%q, %s) = %q, want %q", tt.cssClass, tt.tier, got, tt.want)
			}
		})
	}
}

// --- SanitizeTargetWindowByTier ---

func TestSanitizeTargetWindowByTier(t *testing.T) {
	tests := []struct {
		name         string
		tier         Tier // empty for unstamped
		targetWindow string
		want         string
	}{
		{"author keeps _self", TierAuthor, "_self", "_self"},
		{"author keeps _blank", TierAuthor, "_blank", "_blank"},
		{"author keeps named window", TierAuthor, "fromAlap", "fromAlap"},
		{"author empty stays empty", TierAuthor, "", ""},
		{"storage:remote clamps _self to _blank", TierStorageRemote, "_self", "_blank"},
		{"storage:remote clamps named to _blank", TierStorageRemote, "fromAlap", "_blank"},
		{"storage:remote clamps empty to _blank", TierStorageRemote, "", "_blank"},
		{"storage:local clamps _parent", TierStorageLocal, "_parent", "_blank"},
		{"protocol clamps named", Tier("protocol:web"), "fromAlap", "_blank"},
		{"unstamped clamps _self", Tier(""), "_self", "_blank"},
		{"unstamped empty clamps to _blank", Tier(""), "", "_blank"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			link := &Link{URL: "/a"}
			if tt.tier != "" {
				MustStampProvenance(link, tt.tier)
			}
			if got := SanitizeTargetWindowByTier(tt.targetWindow, link); got != tt.want {
				t.Errorf("SanitizeTargetWindowByTier(%q, %s) = %q, want %q",
					tt.targetWindow, tt.tier, got, tt.want)
			}
		})
	}
}
