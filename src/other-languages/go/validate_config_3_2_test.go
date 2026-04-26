// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap

import (
	"reflect"
	"testing"
)

// minimalConfig is a helper for 3.2 tests.
func minimalConfigRaw() map[string]any {
	return map[string]any{
		"allLinks": map[string]any{
			"alpha": map[string]any{
				"url":   "https://example.com/alpha",
				"label": "Alpha",
			},
		},
	}
}

// --- Provenance stamping ---

func TestValidateConfigDefaultsToAuthor(t *testing.T) {
	cfg, err := ValidateConfig(minimalConfigRaw())
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	link := cfg.AllLinks["alpha"]
	if !IsAuthorTier(&link) {
		t.Errorf("expected author tier, got %q", link.Provenance)
	}
}

func TestValidateConfigStampsStorageLocal(t *testing.T) {
	cfg, err := ValidateConfig(minimalConfigRaw(), ValidateOptions{Provenance: TierStorageLocal})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	link := cfg.AllLinks["alpha"]
	if GetProvenance(&link) != TierStorageLocal {
		t.Errorf("expected storage:local, got %q", link.Provenance)
	}
}

func TestValidateConfigStampsStorageRemote(t *testing.T) {
	cfg, err := ValidateConfig(minimalConfigRaw(), ValidateOptions{Provenance: TierStorageRemote})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	link := cfg.AllLinks["alpha"]
	if GetProvenance(&link) != TierStorageRemote {
		t.Errorf("expected storage:remote, got %q", link.Provenance)
	}
}

func TestValidateConfigStampsProtocol(t *testing.T) {
	cfg, err := ValidateConfig(minimalConfigRaw(), ValidateOptions{Provenance: Tier("protocol:web")})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	link := cfg.AllLinks["alpha"]
	if !IsProtocolTier(&link) {
		t.Errorf("expected protocol tier, got %q", link.Provenance)
	}
}

// --- Hooks allowlist ---

func TestHooksAuthorKeepsAllVerbatim(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":   "/a",
				"hooks": []any{"hover", "click", "anything"},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	got := cfg.AllLinks["a"].Hooks
	want := []string{"hover", "click", "anything"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestHooksNonAuthorWithoutAllowlistStripsAll(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":   "/a",
				"hooks": []any{"hover", "click"},
			},
		},
	}
	cfg, err := ValidateConfig(raw, ValidateOptions{Provenance: TierStorageRemote})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	if got := cfg.AllLinks["a"].Hooks; got != nil {
		t.Errorf("expected nil hooks, got %v", got)
	}
}

func TestHooksNonAuthorIntersectsAllowlist(t *testing.T) {
	raw := map[string]any{
		"settings": map[string]any{
			"hooks": []any{"hover"},
		},
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":   "/a",
				"hooks": []any{"hover", "attacker_chosen"},
			},
		},
	}
	cfg, err := ValidateConfig(raw, ValidateOptions{Provenance: Tier("protocol:web")})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	got := cfg.AllLinks["a"].Hooks
	want := []string{"hover"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}

func TestHooksNonAuthorFullyStrippedWhenNoneMatch(t *testing.T) {
	raw := map[string]any{
		"settings": map[string]any{
			"hooks": []any{"approved_hook"},
		},
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":   "/a",
				"hooks": []any{"evil", "worse"},
			},
		},
	}
	cfg, err := ValidateConfig(raw, ValidateOptions{Provenance: TierStorageRemote})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	if got := cfg.AllLinks["a"].Hooks; got != nil {
		t.Errorf("expected nil hooks, got %v", got)
	}
}

// --- Meta URL sanitization ---

func TestMetaUrlKeySanitized(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url": "/a",
				"meta": map[string]any{
					"iconUrl": "javascript:alert(1)",
				},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	got := cfg.AllLinks["a"].Meta["iconUrl"]
	if got != "about:blank" {
		t.Errorf("expected iconUrl == about:blank, got %q", got)
	}
}

func TestMetaUrlCaseInsensitiveMatch(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url": "/a",
				"meta": map[string]any{
					"ImageURL":  "javascript:alert(1)",
					"AvatarUrl": "data:text/html,x",
				},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	meta := cfg.AllLinks["a"].Meta
	if meta["ImageURL"] != "about:blank" {
		t.Errorf("ImageURL not sanitized: %q", meta["ImageURL"])
	}
	if meta["AvatarUrl"] != "about:blank" {
		t.Errorf("AvatarUrl not sanitized: %q", meta["AvatarUrl"])
	}
}

func TestMetaNonUrlKeyUntouched(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url": "/a",
				"meta": map[string]any{
					"author": "Someone",
					"rank":   1,
					"body":   "plain text",
				},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	meta := cfg.AllLinks["a"].Meta
	if meta["author"] != "Someone" {
		t.Errorf("author changed: %v", meta["author"])
	}
	if meta["rank"] != 1 {
		t.Errorf("rank changed: %v", meta["rank"])
	}
}

func TestMetaBlockedKeysRecursed(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url": "/a",
				"meta": map[string]any{
					"__proto__": map[string]any{"bad": true},
					"__class__": map[string]any{"bad": true},
					"legit":     "ok",
				},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	meta := cfg.AllLinks["a"].Meta
	if _, has := meta["__proto__"]; has {
		t.Errorf("__proto__ should be stripped from meta")
	}
	if _, has := meta["__class__"]; has {
		t.Errorf("__class__ should be stripped from meta")
	}
	if meta["legit"] != "ok" {
		t.Errorf("legit key not preserved: %v", meta["legit"])
	}
}

// --- Thumbnail sanitization ---

func TestThumbnailSanitized(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":       "/a",
				"thumbnail": "javascript:alert(1)",
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	if got := cfg.AllLinks["a"].Thumbnail; got != "about:blank" {
		t.Errorf("thumbnail not sanitized: %q", got)
	}
}

func TestThumbnailValidUrlPreserved(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":       "/a",
				"thumbnail": "https://example.com/thumb.jpg",
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	if got := cfg.AllLinks["a"].Thumbnail; got != "https://example.com/thumb.jpg" {
		t.Errorf("thumbnail not preserved: %q", got)
	}
}

// --- SanitizeLinkUrls helper ---

func TestSanitizeLinkUrlsDirectURL(t *testing.T) {
	out := SanitizeLinkUrls(Link{URL: "javascript:alert(1)"})
	if out.URL != "about:blank" {
		t.Errorf("URL not sanitized: %q", out.URL)
	}
}

func TestSanitizeLinkUrlsDirectImage(t *testing.T) {
	out := SanitizeLinkUrls(Link{URL: "/a", Image: "data:text/html,x"})
	if out.Image != "about:blank" {
		t.Errorf("Image not sanitized: %q", out.Image)
	}
}

func TestSanitizeLinkUrlsDirectThumbnail(t *testing.T) {
	out := SanitizeLinkUrls(Link{URL: "/a", Thumbnail: "vbscript:bad"})
	if out.Thumbnail != "about:blank" {
		t.Errorf("Thumbnail not sanitized: %q", out.Thumbnail)
	}
}

func TestSanitizeLinkUrlsDirectMetaURL(t *testing.T) {
	out := SanitizeLinkUrls(Link{
		URL:  "/a",
		Meta: map[string]any{"coverUrl": "javascript:bad"},
	})
	if out.Meta["coverUrl"] != "about:blank" {
		t.Errorf("meta.coverUrl not sanitized: %v", out.Meta["coverUrl"])
	}
}

func TestSanitizeLinkUrlsDirectStripsBlockedMetaKeys(t *testing.T) {
	out := SanitizeLinkUrls(Link{
		URL:  "/a",
		Meta: map[string]any{"__proto__": map[string]any{"x": 1}, "ok": "keep"},
	})
	if _, has := out.Meta["__proto__"]; has {
		t.Errorf("__proto__ should be stripped from meta")
	}
	if out.Meta["ok"] != "keep" {
		t.Errorf("legit meta key dropped: %v", out.Meta["ok"])
	}
}

// --- Input not-pre-stampable ---

func TestProvenanceCannotBePresetByRawInput(t *testing.T) {
	// Input tries to pre-stamp via a "Provenance" key, which is not in
	// the allowlist. ValidateConfig drops it; StampProvenance assigns
	// the caller-supplied tier.
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{
				"url":        "https://x.com",
				"Provenance": "author", // attacker attempt
			},
		},
	}
	cfg, err := ValidateConfig(raw, ValidateOptions{Provenance: TierStorageRemote})
	if err != nil {
		t.Fatalf("ValidateConfig error: %v", err)
	}
	link := cfg.AllLinks["a"]
	if GetProvenance(&link) != TierStorageRemote {
		t.Errorf("preset attempt should not override provenance, got %q", link.Provenance)
	}
}
