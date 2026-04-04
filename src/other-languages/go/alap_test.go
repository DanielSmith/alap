// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0

package alap

import (
	"context"
	"sort"
	"strings"
	"testing"
)

var testConfig = &Config{
	Settings: map[string]any{"listType": "ul", "menuTimeout": float64(5000)},
	Macros: map[string]Macro{
		"cars":       {LinkItems: "vwbug, bmwe36"},
		"nycbridges": {LinkItems: ".nyc + .bridge"},
		"everything": {LinkItems: ".nyc | .sf"},
	},
	SearchPatterns: map[string]any{
		"bridges": "bridge",
		"germanCars": map[string]any{
			"pattern": "VW|BMW",
			"options": map[string]any{"fields": "l", "limit": float64(5)},
		},
	},
	AllLinks: map[string]Link{
		"vwbug":       {Label: "VW Bug", URL: "https://example.com/vwbug", Tags: []string{"car", "vw", "germany"}},
		"bmwe36":      {Label: "BMW E36", URL: "https://example.com/bmwe36", Tags: []string{"car", "bmw", "germany"}},
		"miata":       {Label: "Mazda Miata", URL: "https://example.com/miata", Tags: []string{"car", "mazda", "japan"}},
		"brooklyn":    {Label: "Brooklyn Bridge", URL: "https://example.com/brooklyn", Tags: []string{"nyc", "bridge", "landmark"}, Description: "Iconic suspension bridge"},
		"manhattan":   {Label: "Manhattan Bridge", URL: "https://example.com/manhattan", Tags: []string{"nyc", "bridge"}},
		"highline":    {Label: "The High Line", URL: "https://example.com/highline", Tags: []string{"nyc", "park", "landmark"}},
		"centralpark": {Label: "Central Park", URL: "https://example.com/centralpark", Tags: []string{"nyc", "park"}},
		"goldengate":  {Label: "Golden Gate", URL: "https://example.com/goldengate", Tags: []string{"sf", "bridge", "landmark"}},
		"dolores":     {Label: "Dolores Park", URL: "https://example.com/dolores", Tags: []string{"sf", "park"}},
		"towerbridge": {Label: "Tower Bridge", URL: "https://example.com/towerbridge", Tags: []string{"london", "bridge", "landmark"}},
		"aqus":        {Label: "Aqus Cafe", URL: "https://example.com/aqus", Tags: []string{"coffee", "sf"}},
		"bluebottle":  {Label: "Blue Bottle", URL: "https://example.com/bluebottle", Tags: []string{"coffee", "sf", "nyc"}},
		"acre":        {Label: "Acre Coffee", URL: "https://example.com/acre", Tags: []string{"coffee"}},
	},
}

func newParser() *ExpressionParser {
	return NewParser(context.Background(), testConfig)
}

func sorted(ids []string) []string {
	if ids == nil {
		return nil
	}
	s := make([]string, len(ids))
	copy(s, ids)
	sort.Strings(s)
	return s
}

func assertEq(t *testing.T, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Errorf("got %v, want %v", got, want)
		return
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("got %v, want %v", got, want)
			return
		}
	}
}

func assertContains(t *testing.T, ids []string, id string) {
	t.Helper()
	for _, v := range ids {
		if v == id {
			return
		}
	}
	t.Errorf("%v does not contain %q", ids, id)
}

func assertNotContains(t *testing.T, ids []string, id string) {
	t.Helper()
	for _, v := range ids {
		if v == id {
			t.Errorf("%v should not contain %q", ids, id)
			return
		}
	}
}

// --- Tier 1: Operands ---

func TestSingleItemID(t *testing.T) {
	assertEq(t, newParser().Query("vwbug", ""), []string{"vwbug"})
}

func TestSingleClass(t *testing.T) {
	result := sorted(newParser().Query(".car", ""))
	assertEq(t, result, []string{"bmwe36", "miata", "vwbug"})
}

func TestNonexistentItem(t *testing.T) {
	result := newParser().Query("doesnotexist", "")
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

func TestNonexistentClass(t *testing.T) {
	result := newParser().Query(".doesnotexist", "")
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

// --- Tier 2: Commas ---

func TestTwoItems(t *testing.T) {
	assertEq(t, newParser().Query("vwbug, bmwe36", ""), []string{"vwbug", "bmwe36"})
}

func TestThreeItems(t *testing.T) {
	assertEq(t, newParser().Query("vwbug, bmwe36, miata", ""), []string{"vwbug", "bmwe36", "miata"})
}

func TestDeduplication(t *testing.T) {
	assertEq(t, newParser().Query("vwbug, vwbug", ""), []string{"vwbug"})
}

// --- Tier 3: Operators ---

func TestIntersection(t *testing.T) {
	result := sorted(newParser().Query(".nyc + .bridge", ""))
	assertEq(t, result, []string{"brooklyn", "manhattan"})
}

func TestUnion(t *testing.T) {
	result := newParser().Query(".nyc | .sf", "")
	assertContains(t, result, "brooklyn")
	assertContains(t, result, "goldengate")
}

func TestSubtraction(t *testing.T) {
	result := newParser().Query(".nyc - .bridge", "")
	assertNotContains(t, result, "brooklyn")
	assertNotContains(t, result, "manhattan")
	assertContains(t, result, "highline")
	assertContains(t, result, "centralpark")
}

// --- Tier 4: Chained ---

func TestThreeWayIntersection(t *testing.T) {
	assertEq(t, newParser().Query(".nyc + .bridge + .landmark", ""), []string{"brooklyn"})
}

func TestUnionThenSubtract(t *testing.T) {
	result := newParser().Query(".nyc | .sf - .bridge", "")
	assertNotContains(t, result, "brooklyn")
	assertNotContains(t, result, "goldengate")
	assertContains(t, result, "highline")
}

// --- Tier 6: Macros ---

func TestNamedMacro(t *testing.T) {
	result := sorted(newParser().Query("@cars", ""))
	assertEq(t, result, []string{"bmwe36", "vwbug"})
}

func TestMacroWithOperators(t *testing.T) {
	result := sorted(newParser().Query("@nycbridges", ""))
	assertEq(t, result, []string{"brooklyn", "manhattan"})
}

func TestUnknownMacro(t *testing.T) {
	result := newParser().Query("@nonexistent", "")
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

func TestBareMacroWithAnchor(t *testing.T) {
	cfg := *testConfig
	macros := make(map[string]Macro)
	for k, v := range testConfig.Macros {
		macros[k] = v
	}
	macros["myanchor"] = Macro{LinkItems: "vwbug"}
	cfg.Macros = macros
	p := NewParser(context.Background(), &cfg)
	assertEq(t, p.Query("@", "myanchor"), []string{"vwbug"})
}

// --- Tier 7: Parentheses ---

func TestBasicGrouping(t *testing.T) {
	result := newParser().Query(".nyc | (.sf + .bridge)", "")
	assertContains(t, result, "highline")
	assertContains(t, result, "centralpark")
	assertContains(t, result, "goldengate")
}

func TestNestedParens(t *testing.T) {
	result := sorted(newParser().Query("((.nyc + .bridge) | (.sf + .bridge))", ""))
	assertEq(t, result, []string{"brooklyn", "goldengate", "manhattan"})
}

func TestParensWithSubtraction(t *testing.T) {
	result := newParser().Query("(.nyc | .sf) - .park", "")
	assertNotContains(t, result, "centralpark")
	assertNotContains(t, result, "dolores")
	assertContains(t, result, "brooklyn")
}

// --- Tier 8: Edge cases ---

func TestEmptyString(t *testing.T) {
	if result := newParser().Query("", ""); len(result) != 0 {
		t.Errorf("expected nil, got %v", result)
	}
}

func TestWhitespaceOnly(t *testing.T) {
	if result := newParser().Query("   ", ""); len(result) != 0 {
		t.Errorf("expected nil, got %v", result)
	}
}

func TestEmptyConfig(t *testing.T) {
	p := NewParser(context.Background(), &Config{AllLinks: map[string]Link{}})
	if result := p.Query(".car", ""); len(result) != 0 {
		t.Errorf("expected nil, got %v", result)
	}
}

func TestNoAllLinks(t *testing.T) {
	p := NewParser(context.Background(), &Config{})
	if result := p.Query("vwbug", ""); len(result) != 0 {
		t.Errorf("expected nil, got %v", result)
	}
}

// --- Convenience ---

func TestResolve(t *testing.T) {
	results := Resolve(context.Background(), testConfig, ".car + .germany")
	ids := make([]string, len(results))
	for i, r := range results {
		ids[i] = r.ID
	}
	assertEq(t, sorted(ids), []string{"bmwe36", "vwbug"})
}

func TestCherryPick(t *testing.T) {
	result := CherryPick(context.Background(), testConfig, "vwbug, miata")
	if _, ok := result["vwbug"]; !ok {
		t.Error("missing vwbug")
	}
	if _, ok := result["miata"]; !ok {
		t.Error("missing miata")
	}
	if _, ok := result["bmwe36"]; ok {
		t.Error("unexpected bmwe36")
	}
}

func TestMergeConfigs(t *testing.T) {
	c1 := &Config{AllLinks: map[string]Link{"a": {Label: "A", URL: "https://a.com"}}}
	c2 := &Config{AllLinks: map[string]Link{"b": {Label: "B", URL: "https://b.com"}}}
	merged := MergeConfigs(c1, c2)
	if _, ok := merged.AllLinks["a"]; !ok {
		t.Error("missing a")
	}
	if _, ok := merged.AllLinks["b"]; !ok {
		t.Error("missing b")
	}
}

func TestMergeConfigsLaterWins(t *testing.T) {
	c1 := &Config{AllLinks: map[string]Link{"a": {Label: "Old", URL: "https://old.com"}}}
	c2 := &Config{AllLinks: map[string]Link{"a": {Label: "New", URL: "https://new.com"}}}
	merged := MergeConfigs(c1, c2)
	if merged.AllLinks["a"].Label != "New" {
		t.Errorf("expected New, got %s", merged.AllLinks["a"].Label)
	}
}

// --- URL Sanitization ---

func TestSanitizeURLSafe(t *testing.T) {
	cases := []string{"https://example.com", "http://example.com", "/relative", ""}
	for _, url := range cases {
		if got := SanitizeURL(url); got != url {
			t.Errorf("SanitizeURL(%q) = %q, want %q", url, got, url)
		}
	}
}

func TestSanitizeURLJavascript(t *testing.T) {
	for _, url := range []string{"javascript:alert(1)", "JAVASCRIPT:alert(1)", "JavaScript:void(0)"} {
		if got := SanitizeURL(url); got != "about:blank" {
			t.Errorf("SanitizeURL(%q) = %q, want about:blank", url, got)
		}
	}
}

func TestSanitizeURLData(t *testing.T) {
	if got := SanitizeURL("data:text/html,<h1>Hi</h1>"); got != "about:blank" {
		t.Errorf("got %q, want about:blank", got)
	}
}

func TestSanitizeURLVbscript(t *testing.T) {
	if got := SanitizeURL("vbscript:MsgBox"); got != "about:blank" {
		t.Errorf("got %q, want about:blank", got)
	}
}

func TestSanitizeURLBlob(t *testing.T) {
	if got := SanitizeURL("blob:https://example.com/uuid"); got != "about:blank" {
		t.Errorf("got %q, want about:blank", got)
	}
}

func TestSanitizeURLControlChars(t *testing.T) {
	if got := SanitizeURL("java\nscript:alert(1)"); got != "about:blank" {
		t.Errorf("got %q, want about:blank", got)
	}
}

func TestSanitizeInResolve(t *testing.T) {
	cfg := &Config{
		AllLinks: map[string]Link{
			"bad":  {Label: "Evil", URL: "javascript:alert(1)", Tags: []string{"test"}},
			"good": {Label: "Good", URL: "https://example.com", Tags: []string{"test"}},
		},
	}
	results := Resolve(context.Background(), cfg,".test")
	urls := make(map[string]string)
	for _, r := range results {
		urls[r.ID] = r.URL
	}
	if urls["bad"] != "about:blank" {
		t.Errorf("bad URL = %q, want about:blank", urls["bad"])
	}
	if urls["good"] != "https://example.com" {
		t.Errorf("good URL = %q, want https://example.com", urls["good"])
	}
}

func TestSanitizeInCherryPick(t *testing.T) {
	cfg := &Config{
		AllLinks: map[string]Link{
			"bad": {Label: "Evil", URL: "javascript:alert(1)", Tags: []string{"test"}},
		},
	}
	result := CherryPick(context.Background(), cfg,".test")
	if result["bad"].URL != "about:blank" {
		t.Errorf("got %q, want about:blank", result["bad"].URL)
	}
}

// --- Protocol resolution ---

func protocolConfig() *Config {
	cfg := &Config{
		AllLinks: map[string]Link{
			"vwbug":    {Label: "VW Bug", URL: "https://example.com/vwbug", Tags: []string{"car", "germany"}},
			"bmwe36":   {Label: "BMW E36", URL: "https://example.com/bmwe36", Tags: []string{"car", "germany"}},
			"miata":    {Label: "Mazda Miata", URL: "https://example.com/miata", Tags: []string{"car", "japan"}},
			"brooklyn": {Label: "Brooklyn Bridge", URL: "https://example.com/brooklyn", Tags: []string{"nyc", "bridge"}},
		},
		Protocols: map[string]Protocol{
			"has-tag": {
				Handler: func(segments []string, link Link, id string) bool {
					if len(segments) == 0 {
						return false
					}
					for _, tag := range link.Tags {
						if tag == segments[0] {
							return true
						}
					}
					return false
				},
			},
			"panicker": {
				Handler: func(segments []string, link Link, id string) bool {
					panic("test panic")
				},
			},
		},
	}
	return cfg
}

func TestProtocolBasic(t *testing.T) {
	p := NewParser(context.Background(), protocolConfig())
	result := sorted(p.Query(":has-tag:germany:", ""))
	assertEq(t, result, []string{"bmwe36", "vwbug"})
}

func TestProtocolWithArgs(t *testing.T) {
	p := NewParser(context.Background(), protocolConfig())
	result := sorted(p.Query(":has-tag:car:", ""))
	// should match all cars
	assertEq(t, result, []string{"bmwe36", "miata", "vwbug"})
}

func TestProtocolUnknown(t *testing.T) {
	p := NewParser(context.Background(), protocolConfig())
	result := p.Query(":nonexistent:", "")
	if len(result) != 0 {
		t.Errorf("expected empty for unknown protocol, got %v", result)
	}
}

func TestProtocolNoProtocolsConfigured(t *testing.T) {
	cfg := &Config{
		AllLinks: map[string]Link{
			"a": {Label: "A", URL: "https://a.com"},
		},
	}
	p := NewParser(context.Background(), cfg)
	result := p.Query(":some-proto:", "")
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

func TestProtocolHandlerPanics(t *testing.T) {
	p := NewParser(context.Background(), protocolConfig())
	// Should recover from panic, return empty, not crash
	result := p.Query(":panicker:", "")
	if len(result) != 0 {
		t.Errorf("expected empty after panic, got %v", result)
	}
}

func TestProtocolComposedWithTag(t *testing.T) {
	p := NewParser(context.Background(), protocolConfig())
	// Intersection: protocol results AND .nyc tag
	result := p.Query(":has-tag:bridge: + .nyc", "")
	assertEq(t, result, []string{"brooklyn"})
}

// --- Refiner application ---

func TestRefinerSortByLabel(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:label*", "")
	// BMW E36, Mazda Miata, VW Bug — alphabetical by label
	assertEq(t, result, []string{"bmwe36", "miata", "vwbug"})
}

func TestRefinerSortDefaultField(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort*", "")
	// Default sort field is "label"
	assertEq(t, result, []string{"bmwe36", "miata", "vwbug"})
}

func TestRefinerLimit(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:label* *limit:2*", "")
	assertEq(t, result, []string{"bmwe36", "miata"})
}

func TestRefinerSkip(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:label* *skip:1*", "")
	assertEq(t, result, []string{"miata", "vwbug"})
}

func TestRefinerReverse(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:label* *reverse*", "")
	assertEq(t, result, []string{"vwbug", "miata", "bmwe36"})
}

func TestRefinerSortById(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:id*", "")
	assertEq(t, result, []string{"bmwe36", "miata", "vwbug"})
}

func TestRefinerUnknownSkipped(t *testing.T) {
	p := newParser()
	// Unknown refiner should be skipped without error, result unchanged
	result := p.Query(".car *sort:label* *bogus*", "")
	assertEq(t, result, []string{"bmwe36", "miata", "vwbug"})
}

func TestRefinerComposedWithOperators(t *testing.T) {
	p := newParser()
	result := p.Query(".car + .germany *sort:label*", "")
	assertEq(t, result, []string{"bmwe36", "vwbug"})
}

func TestRefinerLimitZero(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:label* *limit:0*", "")
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

func TestRefinerSkipAll(t *testing.T) {
	p := newParser()
	result := p.Query(".car *sort:label* *skip:100*", "")
	if len(result) != 0 {
		t.Errorf("expected empty, got %v", result)
	}
}

// --- Tokenizer: protocol and refiner ---

func TestTokenizeProtocol(t *testing.T) {
	tokens := tokenize(":time:7d:")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d: %v", len(tokens), tokens)
	}
	if tokens[0].typ != tokProtocol {
		t.Errorf("expected PROTOCOL token, got %d", tokens[0].typ)
	}
	if tokens[0].value != "time|7d" {
		t.Errorf("expected %q, got %q", "time|7d", tokens[0].value)
	}
}

func TestTokenizeProtocolMultipleArgs(t *testing.T) {
	tokens := tokenize(":proto:a:b:c:")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d: %v", len(tokens), tokens)
	}
	if tokens[0].value != "proto|a|b|c" {
		t.Errorf("expected %q, got %q", "proto|a|b|c", tokens[0].value)
	}
}

func TestTokenizeRefiner(t *testing.T) {
	tokens := tokenize("*sort:label*")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d: %v", len(tokens), tokens)
	}
	if tokens[0].typ != tokRefiner {
		t.Errorf("expected REFINER token, got %d", tokens[0].typ)
	}
	if tokens[0].value != "sort:label" {
		t.Errorf("expected %q, got %q", "sort:label", tokens[0].value)
	}
}

func TestTokenizeRefinerNoArg(t *testing.T) {
	tokens := tokenize("*reverse*")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].value != "reverse" {
		t.Errorf("expected %q, got %q", "reverse", tokens[0].value)
	}
}

// --- Hyphenated identifiers in protocols and refiners ---

func TestProtocolHyphenatedName(t *testing.T) {
	// Hyphens inside :protocol-name: delimiters are preserved
	tokens := tokenize(":my-proto:arg:")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].typ != tokProtocol {
		t.Errorf("expected PROTOCOL token")
	}
	if !strings.Contains(tokens[0].value, "my-proto") {
		t.Errorf("expected hyphenated protocol name, got %q", tokens[0].value)
	}
}

func TestRefinerHyphenatedName(t *testing.T) {
	// Hyphens inside *refiner-name* delimiters are preserved
	tokens := tokenize("*my-refiner:arg*")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].typ != tokRefiner {
		t.Errorf("expected REFINER token")
	}
	if tokens[0].value != "my-refiner:arg" {
		t.Errorf("expected %q, got %q", "my-refiner:arg", tokens[0].value)
	}
}

func TestProtocolHyphenatedArgs(t *testing.T) {
	tokens := tokenize(":has-tag:my-tag:")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].value != "has-tag|my-tag" {
		t.Errorf("expected %q, got %q", "has-tag|my-tag", tokens[0].value)
	}
}

// --- Edge cases ---

func TestProtocolEmptySegments(t *testing.T) {
	// Empty protocol expression :: should produce no tokens (empty content)
	tokens := tokenize("::")
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens for ::, got %d", len(tokens))
	}
}

func TestRefinerUnclosed(t *testing.T) {
	// Unclosed refiner *sort:label should still tokenize the content
	tokens := tokenize("*sort:label")
	if len(tokens) != 1 {
		t.Fatalf("expected 1 token, got %d", len(tokens))
	}
	if tokens[0].typ != tokRefiner {
		t.Errorf("expected REFINER token")
	}
	if tokens[0].value != "sort:label" {
		t.Errorf("expected %q, got %q", "sort:label", tokens[0].value)
	}
}

func TestMixedExpression(t *testing.T) {
	// Full expression with items, tags, protocol, operators, and refiners
	cfg := protocolConfig()
	p := NewParser(context.Background(), cfg)
	result := sorted(p.Query(":has-tag:car: + .germany *sort:label*", ""))
	assertEq(t, result, []string{"bmwe36", "vwbug"})
}

// ---------------------------------------------------------------------------
// ValidateConfig tests
// ---------------------------------------------------------------------------

func TestValidateConfigMinimal(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item1": map[string]any{"url": "https://example.com"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.AllLinks["item1"].URL != "https://example.com" {
		t.Errorf("expected url preserved")
	}
}

func TestValidateConfigPreservesSettingsMacros(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{"url": "https://a.com"},
		},
		"settings": map[string]any{"listType": "ul"},
		"macros": map[string]any{
			"faves": map[string]any{"linkItems": "a"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Settings["listType"] != "ul" {
		t.Error("settings not preserved")
	}
	if cfg.Macros["faves"].LinkItems != "a" {
		t.Error("macros not preserved")
	}
}

func TestValidateConfigNilInput(t *testing.T) {
	_, err := ValidateConfig(nil)
	if err == nil {
		t.Error("expected error for nil input")
	}
}

func TestValidateConfigMissingAllLinks(t *testing.T) {
	_, err := ValidateConfig(map[string]any{"settings": map[string]any{}})
	if err == nil {
		t.Error("expected error for missing allLinks")
	}
}

func TestValidateConfigAllLinksSlice(t *testing.T) {
	raw := map[string]any{
		"allLinks": []any{"a", "b"},
	}
	_, err := ValidateConfig(raw)
	if err == nil {
		t.Error("expected error for allLinks as slice")
	}
}

func TestValidateConfigSkipsMissingUrl(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"nourl": map[string]any{"label": "No URL"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := cfg.AllLinks["nourl"]; ok {
		t.Error("link without url should be skipped")
	}
}

func TestValidateConfigSkipsNonMapLinks(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"bad": "not a map",
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.AllLinks) != 0 {
		t.Error("non-map link should be skipped")
	}
}

func TestValidateConfigSanitizesJavascriptUrl(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"xss": map[string]any{"url": "javascript:alert(1)"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.AllLinks["xss"].URL != "about:blank" {
		t.Errorf("expected about:blank, got %q", cfg.AllLinks["xss"].URL)
	}
}

func TestValidateConfigSanitizesImageUrl(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"img": map[string]any{
				"url":   "https://safe.com",
				"image": "javascript:alert(1)",
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.AllLinks["img"].Image != "about:blank" {
		t.Errorf("expected about:blank for image, got %q", cfg.AllLinks["img"].Image)
	}
}

func TestValidateConfigLeavesSafeUrl(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"ok": map[string]any{"url": "https://example.com/path?q=1"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.AllLinks["ok"].URL != "https://example.com/path?q=1" {
		t.Error("safe URL should be unchanged")
	}
}

func TestValidateConfigFiltersNonStringTags(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{
				"url":  "https://a.com",
				"tags": []any{"good", 42, "also_good"},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	tags := cfg.AllLinks["item"].Tags
	if len(tags) != 2 || tags[0] != "good" || tags[1] != "also_good" {
		t.Errorf("expected [good also_good], got %v", tags)
	}
}

func TestValidateConfigSkipsHyphenatedIds(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"my-item": map[string]any{"url": "https://a.com"},
			"ok_item": map[string]any{"url": "https://b.com"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := cfg.AllLinks["my-item"]; ok {
		t.Error("hyphenated ID should be skipped")
	}
	if _, ok := cfg.AllLinks["ok_item"]; !ok {
		t.Error("underscore ID should be kept")
	}
}

func TestValidateConfigSkipsHyphenatedMacros(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"a": map[string]any{"url": "https://a.com"},
		},
		"macros": map[string]any{
			"my-macro": map[string]any{"linkItems": "a"},
			"ok_macro": map[string]any{"linkItems": "a"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := cfg.Macros["my-macro"]; ok {
		t.Error("hyphenated macro should be skipped")
	}
	if _, ok := cfg.Macros["ok_macro"]; !ok {
		t.Error("underscore macro should be kept")
	}
}

func TestValidateConfigStripsHyphenatedTags(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{
				"url":  "https://a.com",
				"tags": []any{"good", "bad-tag", "fine"},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	tags := cfg.AllLinks["item"].Tags
	for _, tag := range tags {
		if strings.Contains(tag, "-") {
			t.Errorf("hyphenated tag %q should be stripped", tag)
		}
	}
	if len(tags) != 2 {
		t.Errorf("expected 2 tags, got %d", len(tags))
	}
}

func TestValidateConfigAllowsHyphensInNonExpressionFields(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{
				"url":      "https://my-site.com/path",
				"label":    "My-Label",
				"cssClass": "my-class",
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	link := cfg.AllLinks["item"]
	if link.URL != "https://my-site.com/path" {
		t.Error("hyphens in URL should be allowed")
	}
	if link.Label != "My-Label" {
		t.Error("hyphens in label should be allowed")
	}
	if link.CSSClass != "my-class" {
		t.Error("hyphens in cssClass should be allowed")
	}
}

func TestValidateConfigDropsProtoKeys(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"__proto__": map[string]any{"url": "https://evil.com"},
			"safe":      map[string]any{"url": "https://safe.com"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := cfg.AllLinks["__proto__"]; ok {
		t.Error("__proto__ key should be dropped")
	}
	if _, ok := cfg.AllLinks["safe"]; !ok {
		t.Error("safe key should be kept")
	}
}

func TestValidateConfigPreservesHooksAndGuid(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{
				"url":   "https://example.com",
				"hooks": []any{"item_hover", "item_context"},
				"guid":  "550e8400-e29b-41d4-a716-446655440000",
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	link := cfg.AllLinks["item"]
	if link.GUID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Errorf("guid = %q, want UUID", link.GUID)
	}
	if len(link.Hooks) != 2 || link.Hooks[0] != "item_hover" || link.Hooks[1] != "item_context" {
		t.Errorf("hooks = %v, want [item_hover item_context]", link.Hooks)
	}
}

func TestValidateConfigFiltersNonStringHooks(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{
				"url":   "https://example.com",
				"hooks": []any{"item_hover", 42, true, "item_context"},
			},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	link := cfg.AllLinks["item"]
	if len(link.Hooks) != 2 || link.Hooks[0] != "item_hover" || link.Hooks[1] != "item_context" {
		t.Errorf("hooks = %v, want [item_hover item_context]", link.Hooks)
	}
}

func TestValidateConfigHooksNilWhenAbsent(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{"url": "https://example.com"},
		},
	}
	cfg, err := ValidateConfig(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	link := cfg.AllLinks["item"]
	if link.Hooks != nil {
		t.Errorf("hooks should be nil when absent, got %v", link.Hooks)
	}
	if link.GUID != "" {
		t.Errorf("guid should be empty when absent, got %q", link.GUID)
	}
}

func TestValidateConfigDoesNotMutateInput(t *testing.T) {
	raw := map[string]any{
		"allLinks": map[string]any{
			"item": map[string]any{"url": "javascript:alert(1)"},
		},
	}
	_, _ = ValidateConfig(raw)
	// Original should still have the dangerous URL
	innerLinks := raw["allLinks"].(map[string]any)
	innerItem := innerLinks["item"].(map[string]any)
	if innerItem["url"] != "javascript:alert(1)" {
		t.Error("input was mutated")
	}
}

// ---------------------------------------------------------------------------
// IsPrivateHost tests
// ---------------------------------------------------------------------------

func TestIsPrivateHost(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want bool
	}{
		{"public IP", "http://8.8.8.8/path", false},
		{"public domain", "https://example.com", false},
		{"localhost", "http://localhost/", true},
		{"localhost with port", "http://localhost:3000/", true},
		{"subdomain localhost", "http://api.localhost/", true},
		{"loopback 127", "http://127.0.0.1/", true},
		{"private 10", "http://10.0.0.1/", true},
		{"private 172.16", "http://172.16.0.1/", true},
		{"private 192.168", "http://192.168.1.1/", true},
		{"link-local 169.254", "http://169.254.169.254/latest/", true},
		{"IPv6 loopback", "http://[::1]/", true},
		{"malformed URL", "not a url", true},
		{"IPv4-mapped loopback", "http://[::ffff:127.0.0.1]/", true},
		{"IPv4-mapped private", "http://[::ffff:10.0.0.1]/", true},
		{"zero address", "http://0.0.0.0/", true},
		{"zero address with port", "http://0.0.0.0:8080/", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsPrivateHost(tt.url)
			if got != tt.want {
				t.Errorf("IsPrivateHost(%q) = %v, want %v", tt.url, got, tt.want)
			}
		})
	}
}
