// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap

import "testing"

// --- SanitizeURL (loose) ---

func TestSanitizeURLLoose(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"https passes", "https://example.com", "https://example.com"},
		{"http passes", "http://example.com", "http://example.com"},
		{"mailto passes", "mailto:a@b.com", "mailto:a@b.com"},
		{"tel passes", "tel:+15551234", "tel:+15551234"},
		{"relative passes", "/foo/bar", "/foo/bar"},
		{"empty passes", "", ""},
		{"javascript blocked", "javascript:alert(1)", "about:blank"},
		{"JAVASCRIPT blocked", "JAVASCRIPT:alert(1)", "about:blank"},
		{"JavaScript blocked", "JavaScript:alert(1)", "about:blank"},
		{"data blocked", "data:text/html,x", "about:blank"},
		{"vbscript blocked", "vbscript:alert(1)", "about:blank"},
		{"blob blocked", "blob:https://example.com/abc", "about:blank"},
		{"newline disguise blocked", "java\nscript:alert(1)", "about:blank"},
		{"tab disguise blocked", "java\tscript:alert(1)", "about:blank"},
		{"null disguise blocked", "java\x00script:alert(1)", "about:blank"},
		{"whitespace before colon blocked", "javascript :alert(1)", "about:blank"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SanitizeURL(tt.in); got != tt.want {
				t.Errorf("SanitizeURL(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

// --- SanitizeURLStrict (http / https / mailto only) ---

func TestSanitizeURLStrict(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"https passes", "https://example.com", "https://example.com"},
		{"http passes", "http://example.com", "http://example.com"},
		{"mailto passes", "mailto:a@b.com", "mailto:a@b.com"},
		{"relative passes", "/foo", "/foo"},
		{"empty passes", "", ""},
		{"tel blocked", "tel:+15551234", "about:blank"},
		{"ftp blocked", "ftp://example.com", "about:blank"},
		{"custom scheme blocked", "obsidian://open?vault=foo", "about:blank"},
		{"javascript still blocked", "javascript:alert(1)", "about:blank"},
		{"data still blocked", "data:text/html,x", "about:blank"},
		{"control char still blocked", "java\nscript:alert(1)", "about:blank"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SanitizeURLStrict(tt.in); got != tt.want {
				t.Errorf("SanitizeURLStrict(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

// --- SanitizeURLWithSchemes (configurable allowlist) ---

func TestSanitizeURLWithSchemes(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		schemes []string
		want    string
	}{
		{"default allows http", "http://example.com", nil, "http://example.com"},
		{"default allows https", "https://example.com", nil, "https://example.com"},
		{"default blocks mailto", "mailto:a@b.com", nil, "about:blank"},
		{"custom allowlist permits obsidian",
			"obsidian://open?vault=foo",
			[]string{"http", "https", "obsidian"},
			"obsidian://open?vault=foo",
		},
		{"custom allowlist blocks unlisted",
			"ftp://example.com",
			[]string{"http", "https"},
			"about:blank",
		},
		{"relative passes regardless", "/foo", []string{"http"}, "/foo"},
		{"dangerous blocked even if in allowlist",
			"javascript:alert(1)",
			[]string{"javascript"},
			"about:blank",
		},
		{"empty allowlist rejects scheme-bearing",
			"http://example.com",
			[]string{},
			"about:blank",
		},
		{"empty allowlist passes relative", "/foo", []string{}, "/foo"},
		{"case-insensitive scheme match",
			"HTTPS://example.com",
			[]string{"https"},
			"HTTPS://example.com",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SanitizeURLWithSchemes(tt.in, tt.schemes); got != tt.want {
				t.Errorf("SanitizeURLWithSchemes(%q, %v) = %q, want %q",
					tt.in, tt.schemes, got, tt.want)
			}
		})
	}
}
