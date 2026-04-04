// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

// Package alap provides a Go port of the Alap expression parser.
//
// This is the server-side subset of alap/core (TypeScript). It covers
// expression parsing, config merging, regex validation, and URL sanitization.
//
// Grammar:
//
//	query   = segment (',' segment)*
//	segment = term (op term)* refiner*
//	op      = '+' | '|' | '-'
//	term    = '(' segment ')' | atom
//	atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
//	refiner = '*' name (':' arg)* '*'
package alap

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// Limits (mirrors src/constants.ts)
const (
	MaxDepth           = 32
	MaxTokens          = 1024
	MaxMacroExpansions = 10
	MaxRegexQueries    = 5
	MaxSearchResults   = 100
	RegexTimeoutMS     = 20
	MaxRefiners        = 10
)

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

// Protocol is a named protocol handler that filters links by a predicate.
// The handler receives the argument segments, the link, and its ID.
// It returns true if the link matches.
type Protocol struct {
	Handler func(segments []string, link Link, id string) bool
}

// Config is the root Alap configuration object.
type Config struct {
	Settings       map[string]any        `json:"settings,omitempty"`
	Macros         map[string]Macro      `json:"macros,omitempty"`
	AllLinks       map[string]Link       `json:"allLinks"`
	SearchPatterns map[string]any        `json:"searchPatterns,omitempty"`
	Protocols      map[string]Protocol   `json:"-"`
}

// Macro is a named reusable expression.
type Macro struct {
	LinkItems string         `json:"linkItems"`
	Config    map[string]any `json:"config,omitempty"`
}

// Link is a single link entry in allLinks.
type Link struct {
	Label        string         `json:"label,omitempty"`
	URL          string         `json:"url"`
	Tags         []string       `json:"tags,omitempty"`
	CSSClass     string         `json:"cssClass,omitempty"`
	Image        string         `json:"image,omitempty"`
	AltText      string         `json:"altText,omitempty"`
	TargetWindow string         `json:"targetWindow,omitempty"`
	Description  string         `json:"description,omitempty"`
	Thumbnail    string         `json:"thumbnail,omitempty"`
	Hooks        []string       `json:"hooks,omitempty"`
	GUID         string         `json:"guid,omitempty"`
	CreatedAt    any            `json:"createdAt,omitempty"`
	Meta         map[string]any `json:"meta,omitempty"`
}

// LinkWithID is a Link with its ID attached.
type LinkWithID struct {
	ID string `json:"id"`
	Link
}

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type tokenType int

const (
	tokItemID tokenType = iota
	tokClass
	tokMacro
	tokDomRef
	tokRegex
	tokProtocol
	tokRefiner
	tokPlus
	tokPipe
	tokMinus
	tokComma
	tokLParen
	tokRParen
)

type token struct {
	typ   tokenType
	value string
}

// ---------------------------------------------------------------------------
// Expression Parser
// ---------------------------------------------------------------------------

// ExpressionParser resolves Alap expressions against a Config.
//
// An ExpressionParser is NOT safe for concurrent use. Create a new parser
// per goroutine, or protect access with a mutex.
type ExpressionParser struct {
	ctx        context.Context
	config     *Config
	depth      int
	regexCount int
}

// NewParser creates an ExpressionParser for the given config.
// The context is checked at loop boundaries to support timeout/cancellation.
func NewParser(ctx context.Context, config *Config) *ExpressionParser {
	return &ExpressionParser{ctx: ctx, config: config}
}

// Query parses an expression and returns matching item IDs (deduplicated).
func (p *ExpressionParser) Query(expression string, anchorID string) []string {
	if p.ctx.Err() != nil {
		return nil
	}
	expr := strings.TrimSpace(expression)
	if expr == "" {
		return nil
	}
	if p.config.AllLinks == nil {
		return nil
	}

	expanded := p.expandMacros(expr, anchorID)
	if expanded == "" {
		return nil
	}

	tokens := tokenize(expanded)
	if len(tokens) == 0 {
		return nil
	}
	if len(tokens) > MaxTokens {
		return nil
	}

	p.depth = 0
	p.regexCount = 0
	pos := 0
	ids := p.parseQuery(tokens, &pos)
	return dedupe(ids)
}

// SearchByClass returns all item IDs carrying the given tag.
func (p *ExpressionParser) SearchByClass(className string) []string {
	if p.config.AllLinks == nil {
		return nil
	}
	var result []string
	for id, link := range p.config.AllLinks {
		if p.ctx.Err() != nil {
			return result
		}
		for _, tag := range link.Tags {
			if tag == className {
				result = append(result, id)
				break
			}
		}
	}
	return result
}

// SearchByRegex searches allLinks using a named pattern from config.SearchPatterns.
func (p *ExpressionParser) SearchByRegex(patternKey string, fieldOpts string) []string {
	p.regexCount++
	if p.regexCount > MaxRegexQueries {
		return nil
	}

	if p.config.SearchPatterns == nil {
		return nil
	}
	entry, ok := p.config.SearchPatterns[patternKey]
	if !ok {
		return nil
	}

	var patternStr string
	var opts map[string]any

	switch v := entry.(type) {
	case string:
		patternStr = v
	case map[string]any:
		if ps, ok := v["pattern"].(string); ok {
			patternStr = ps
		}
		if o, ok := v["options"].(map[string]any); ok {
			opts = o
		}
	default:
		return nil
	}

	check := ValidateRegex(patternStr)
	if !check.Safe {
		return nil
	}

	re, err := regexp.Compile("(?i)" + patternStr)
	if err != nil {
		return nil
	}

	fo := fieldOpts
	if fo == "" {
		if opts != nil {
			if f, ok := opts["fields"].(string); ok {
				fo = f
			}
		}
		if fo == "" {
			fo = "a"
		}
	}
	fields := parseFieldCodes(fo)

	limit := MaxSearchResults
	if opts != nil {
		if l, ok := opts["limit"].(float64); ok && int(l) < limit {
			limit = int(l)
		}
	}

	var maxAge float64
	if opts != nil {
		if a, ok := opts["age"].(string); ok {
			maxAge = parseAge(a)
		}
	}
	nowMS := float64(time.Now().UnixMilli())
	start := time.Now()

	type result struct {
		id        string
		createdAt float64
	}
	var results []result

	for id, link := range p.config.AllLinks {
		if p.ctx.Err() != nil || time.Since(start).Milliseconds() > RegexTimeoutMS {
			break
		}
		if maxAge > 0 {
			ts := toTimestamp(link.CreatedAt)
			if ts == 0 || (nowMS-ts) > maxAge {
				continue
			}
		}
		if matchesFields(re, id, &link, fields) {
			ts := toTimestamp(link.CreatedAt)
			results = append(results, result{id, ts})
			if len(results) >= MaxSearchResults {
				break
			}
		}
	}

	// Sort
	if opts != nil {
		if sortOpt, ok := opts["sort"].(string); ok {
			switch sortOpt {
			case "alpha":
				sortBy(results, func(a, b result) bool { return a.id < b.id })
			case "newest":
				sortBy(results, func(a, b result) bool { return a.createdAt > b.createdAt })
			case "oldest":
				sortBy(results, func(a, b result) bool { return a.createdAt < b.createdAt })
			}
		}
	}

	if len(results) > limit {
		results = results[:limit]
	}
	ids := make([]string, len(results))
	for i, r := range results {
		ids[i] = r.id
	}
	return ids
}

// ---------------------------------------------------------------------------
// Macro expansion
// ---------------------------------------------------------------------------

var macroRe = regexp.MustCompile(`@(\w*)`)

func (p *ExpressionParser) expandMacros(expr string, anchorID string) string {
	result := expr
	for round := 0; round < MaxMacroExpansions; round++ {
		if !strings.Contains(result, "@") {
			break
		}
		before := result
		result = macroRe.ReplaceAllStringFunc(result, func(match string) string {
			name := match[1:] // strip @
			if name == "" {
				name = anchorID
			}
			if name == "" || p.config.Macros == nil {
				return ""
			}
			macro, ok := p.config.Macros[name]
			if !ok || macro.LinkItems == "" {
				return ""
			}
			return macro.LinkItems
		})
		if result == before {
			break
		}
	}
	return result
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

func tokenize(expr string) []token {
	var tokens []token
	runes := []rune(expr)
	n := len(runes)
	i := 0

	for i < n {
		ch := runes[i]

		if unicode.IsSpace(ch) {
			i++
			continue
		}

		switch ch {
		case '+':
			tokens = append(tokens, token{tokPlus, "+"})
			i++
			continue
		case '|':
			tokens = append(tokens, token{tokPipe, "|"})
			i++
			continue
		case '-':
			tokens = append(tokens, token{tokMinus, "-"})
			i++
			continue
		case ',':
			tokens = append(tokens, token{tokComma, ","})
			i++
			continue
		case '(':
			tokens = append(tokens, token{tokLParen, "("})
			i++
			continue
		case ')':
			tokens = append(tokens, token{tokRParen, ")"})
			i++
			continue
		}

		// Class: .word
		if ch == '.' {
			i++
			var word strings.Builder
			for i < n && isWordChar(runes[i]) {
				word.WriteRune(runes[i])
				i++
			}
			if word.Len() > 0 {
				tokens = append(tokens, token{tokClass, word.String()})
			}
			continue
		}

		// DOM ref: #word
		if ch == '#' {
			i++
			var word strings.Builder
			for i < n && isWordChar(runes[i]) {
				word.WriteRune(runes[i])
				i++
			}
			if word.Len() > 0 {
				tokens = append(tokens, token{tokDomRef, word.String()})
			}
			continue
		}

		// Regex: /patternKey/options
		if ch == '/' {
			i++ // skip opening /
			var key strings.Builder
			for i < n && runes[i] != '/' {
				key.WriteRune(runes[i])
				i++
			}
			var opts strings.Builder
			if i < n && runes[i] == '/' {
				i++ // skip closing /
				for i < n && strings.ContainsRune("lutdka", runes[i]) {
					opts.WriteRune(runes[i])
					i++
				}
			}
			if key.Len() > 0 {
				val := key.String()
				if opts.Len() > 0 {
					val = val + "|" + opts.String()
				}
				tokens = append(tokens, token{tokRegex, val})
			}
			continue
		}

		// Protocol: :name:arg1:arg2:
		if ch == ':' {
			i++ // skip opening :
			var segments strings.Builder
			for i < n && runes[i] != ':' {
				segments.WriteRune(runes[i])
				i++
			}
			// Collect remaining segments
			for i < n && runes[i] == ':' {
				i++ // skip :
				if i >= n || unicode.IsSpace(runes[i]) || strings.ContainsRune("+|,()*/", runes[i]) {
					break // trailing : ends the protocol
				}
				segments.WriteRune('|')
				for i < n && runes[i] != ':' {
					segments.WriteRune(runes[i])
					i++
				}
			}
			if segments.Len() > 0 {
				tokens = append(tokens, token{tokProtocol, segments.String()})
			}
			continue
		}

		// Refiner: *name* or *name:arg*
		if ch == '*' {
			i++ // skip opening *
			var content strings.Builder
			for i < n && runes[i] != '*' {
				content.WriteRune(runes[i])
				i++
			}
			if i < n && runes[i] == '*' {
				i++ // skip closing *
			}
			if content.Len() > 0 {
				tokens = append(tokens, token{tokRefiner, content.String()})
			}
			continue
		}

		// Bare word: item ID
		if isWordChar(ch) {
			var word strings.Builder
			for i < n && isWordChar(runes[i]) {
				word.WriteRune(runes[i])
				i++
			}
			tokens = append(tokens, token{tokItemID, word.String()})
			continue
		}

		// Unknown — skip
		i++
	}

	return tokens
}

func isWordChar(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_'
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

func (p *ExpressionParser) parseQuery(tokens []token, pos *int) []string {
	result := p.parseSegment(tokens, pos)

	for *pos < len(tokens) && tokens[*pos].typ == tokComma {
		if p.ctx.Err() != nil {
			return result
		}
		*pos++ // skip comma
		if *pos >= len(tokens) {
			break
		}
		next := p.parseSegment(tokens, pos)
		result = append(result, next...)
	}

	return result
}

func (p *ExpressionParser) parseSegment(tokens []token, pos *int) []string {
	if *pos >= len(tokens) {
		return nil
	}

	startPos := *pos
	result := p.parseTerm(tokens, pos)
	hasInitialTerm := *pos > startPos

	for *pos < len(tokens) {
		tok := tokens[*pos]
		if tok.typ != tokPlus && tok.typ != tokPipe && tok.typ != tokMinus {
			break
		}

		op := tok.typ
		*pos++ // skip operator

		if *pos >= len(tokens) {
			break
		}

		right := p.parseTerm(tokens, pos)

		if !hasInitialTerm {
			result = right
			hasInitialTerm = true
		} else {
			switch op {
			case tokPlus:
				rightSet := toSet(right)
				result = filter(result, func(id string) bool { return rightSet[id] })
			case tokPipe:
				seen := toSet(result)
				for _, id := range right {
					if !seen[id] {
						result = append(result, id)
						seen[id] = true
					}
				}
			case tokMinus:
				rightSet := toSet(right)
				result = filter(result, func(id string) bool { return !rightSet[id] })
			}
		}
	}

	// Collect trailing refiners
	var refiners []token
	for *pos < len(tokens) && tokens[*pos].typ == tokRefiner {
		if len(refiners) >= MaxRefiners {
			log.Printf("[alap] Refiner limit exceeded (max %d per segment). Skipping remaining refiners.", MaxRefiners)
			*pos++
			continue
		}
		refiners = append(refiners, tokens[*pos])
		*pos++
	}

	if len(refiners) > 0 {
		result = p.applyRefiners(result, refiners)
	}

	return result
}

func (p *ExpressionParser) parseTerm(tokens []token, pos *int) []string {
	if *pos >= len(tokens) {
		return nil
	}

	if tokens[*pos].typ == tokLParen {
		p.depth++
		if p.depth > MaxDepth {
			*pos = len(tokens)
			return nil
		}
		*pos++ // skip (
		inner := p.parseSegment(tokens, pos)
		if *pos < len(tokens) && tokens[*pos].typ == tokRParen {
			*pos++ // skip )
		}
		p.depth--
		return inner
	}

	return p.parseAtom(tokens, pos)
}

func (p *ExpressionParser) parseAtom(tokens []token, pos *int) []string {
	if *pos >= len(tokens) {
		return nil
	}

	tok := tokens[*pos]

	switch tok.typ {
	case tokItemID:
		*pos++
		if _, ok := p.config.AllLinks[tok.value]; ok {
			return []string{tok.value}
		}
		return nil

	case tokClass:
		*pos++
		return p.SearchByClass(tok.value)

	case tokRegex:
		*pos++
		parts := strings.SplitN(tok.value, "|", 2)
		patternKey := parts[0]
		fieldOpts := ""
		if len(parts) > 1 {
			fieldOpts = parts[1]
		}
		return p.SearchByRegex(patternKey, fieldOpts)

	case tokProtocol:
		*pos++
		return p.resolveProtocol(tok.value)

	case tokDomRef:
		*pos++
		return nil // reserved

	default:
		return nil // don't consume
	}
}

// ---------------------------------------------------------------------------
// Protocol resolution
// ---------------------------------------------------------------------------

// resolveProtocol looks up a protocol handler in config and filters all links.
func (p *ExpressionParser) resolveProtocol(value string) []string {
	segments := strings.Split(value, "|")
	protocolName := segments[0]
	args := segments[1:]

	if p.config.Protocols == nil {
		log.Printf("[alap] Protocol %q not found in config.Protocols", protocolName)
		return nil
	}
	protocol, ok := p.config.Protocols[protocolName]
	if !ok || protocol.Handler == nil {
		log.Printf("[alap] Protocol %q not found in config.Protocols", protocolName)
		return nil
	}

	allLinks := p.config.AllLinks
	if allLinks == nil {
		return nil
	}

	var result []string
	for id, link := range allLinks {
		if p.ctx.Err() != nil {
			return result
		}
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[alap] Protocol %q handler panicked for item %q: %v — skipping", protocolName, id, r)
				}
			}()
			if protocol.Handler(args, link, id) {
				result = append(result, id)
			}
		}()
	}
	return result
}

// ---------------------------------------------------------------------------
// Refiner pipeline
// ---------------------------------------------------------------------------

// refinerStep is a parsed refiner: name and arguments.
type refinerStep struct {
	name string
	args []string
}

// parseRefinerStep splits a refiner value like "sort:label" into name and args.
func parseRefinerStep(value string) refinerStep {
	parts := strings.Split(value, ":")
	return refinerStep{name: parts[0], args: parts[1:]}
}

// applyRefiners resolves IDs to link structs, applies each refiner, and returns refined IDs.
func (p *ExpressionParser) applyRefiners(ids []string, refiners []token) []string {
	if len(refiners) == 0 {
		return ids
	}

	// Resolve IDs to LinkWithID structs
	var links []LinkWithID
	for _, id := range ids {
		if link, ok := p.config.AllLinks[id]; ok {
			links = append(links, LinkWithID{ID: id, Link: link})
		}
	}

	for _, tok := range refiners {
		step := parseRefinerStep(tok.value)
		switch step.name {
		case "sort":
			field := "label"
			if len(step.args) > 0 && step.args[0] != "" {
				field = step.args[0]
			}
			sort.SliceStable(links, func(i, j int) bool {
				return linkFieldValue(links[i], field) < linkFieldValue(links[j], field)
			})
		case "reverse":
			for i, j := 0, len(links)-1; i < j; i, j = i+1, j-1 {
				links[i], links[j] = links[j], links[i]
			}
		case "limit":
			if len(step.args) > 0 {
				n, err := strconv.Atoi(step.args[0])
				if err == nil && n >= 0 && n < len(links) {
					links = links[:n]
				}
			}
		case "skip":
			if len(step.args) > 0 {
				n, err := strconv.Atoi(step.args[0])
				if err == nil && n > 0 && n < len(links) {
					links = links[n:]
				} else if err == nil && n >= len(links) {
					links = nil
				}
			}
		case "shuffle":
			rand.Shuffle(len(links), func(i, j int) {
				links[i], links[j] = links[j], links[i]
			})
		case "unique":
			field := "url"
			if len(step.args) > 0 && step.args[0] != "" {
				field = step.args[0]
			}
			seen := make(map[string]bool)
			var deduped []LinkWithID
			for _, l := range links {
				val := linkFieldValue(l, field)
				if !seen[val] {
					seen[val] = true
					deduped = append(deduped, l)
				}
			}
			links = deduped
		default:
			log.Printf("[alap] Unknown refiner %q — skipping", step.name)
		}
	}

	result := make([]string, len(links))
	for i, l := range links {
		result[i] = l.ID
	}
	return result
}

// linkFieldValue extracts a string value from a LinkWithID by field name.
func linkFieldValue(l LinkWithID, field string) string {
	switch field {
	case "id":
		return l.ID
	case "label":
		return l.Label
	case "url":
		return l.URL
	case "description":
		return l.Description
	case "cssClass":
		return l.CSSClass
	case "image":
		return l.Image
	case "altText":
		return l.AltText
	case "targetWindow":
		return l.TargetWindow
	case "thumbnail":
		return l.Thumbnail
	default:
		return fmt.Sprintf("%v", l.Label) // fallback to label
	}
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

func parseFieldCodes(codes string) map[string]bool {
	fields := make(map[string]bool)
	for _, ch := range codes {
		switch ch {
		case 'l':
			fields["label"] = true
		case 'u':
			fields["url"] = true
		case 't':
			fields["tags"] = true
		case 'd':
			fields["description"] = true
		case 'k':
			fields["id"] = true
		case 'a':
			fields["label"] = true
			fields["url"] = true
			fields["tags"] = true
			fields["description"] = true
			fields["id"] = true
		}
	}
	if len(fields) == 0 {
		fields["label"] = true
		fields["url"] = true
		fields["tags"] = true
		fields["description"] = true
		fields["id"] = true
	}
	return fields
}

func matchesFields(re *regexp.Regexp, id string, link *Link, fields map[string]bool) bool {
	if fields["id"] && re.MatchString(id) {
		return true
	}
	if fields["label"] && link.Label != "" && re.MatchString(link.Label) {
		return true
	}
	if fields["url"] && link.URL != "" && re.MatchString(link.URL) {
		return true
	}
	if fields["description"] && link.Description != "" && re.MatchString(link.Description) {
		return true
	}
	if fields["tags"] {
		for _, tag := range link.Tags {
			if re.MatchString(tag) {
				return true
			}
		}
	}
	return false
}

var ageRe = regexp.MustCompile(`(?i)^(\d+)\s*([dhwm])$`)

func parseAge(age string) float64 {
	m := ageRe.FindStringSubmatch(age)
	if m == nil {
		return 0
	}
	n, err := strconv.Atoi(m[1])
	if err != nil {
		return 0
	}
	switch strings.ToLower(m[2]) {
	case "h":
		return float64(n) * 3600000
	case "d":
		return float64(n) * 86400000
	case "w":
		return float64(n) * 604800000
	case "m":
		return float64(n) * 2592000000
	}
	return 0
}

func toTimestamp(value any) float64 {
	if value == nil {
		return 0
	}
	switch v := value.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case string:
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			t, err = time.Parse("2006-01-02T15:04:05Z", v)
			if err != nil {
				return 0
			}
		}
		return float64(t.UnixMilli())
	}
	return 0
}

// ---------------------------------------------------------------------------
// URL Sanitization
// ---------------------------------------------------------------------------

var (
	controlCharRe   = regexp.MustCompile(`[\x00-\x1f\x7f]`)
	dangerousScheme = regexp.MustCompile(`(?i)^(javascript|data|vbscript|blob)\s*:`)
)

// SanitizeURL returns the URL unchanged if safe, or "about:blank" if dangerous.
func SanitizeURL(url string) string {
	if url == "" {
		return url
	}
	normalized := strings.TrimSpace(controlCharRe.ReplaceAllString(url, ""))
	if dangerousScheme.MatchString(normalized) {
		return "about:blank"
	}
	return url
}

func sanitizeLink(link Link) Link {
	if link.URL != "" {
		safe := SanitizeURL(link.URL)
		if safe != link.URL {
			link.URL = safe
		}
	}
	return link
}

// ---------------------------------------------------------------------------
// Regex Validation (ReDoS guard)
// ---------------------------------------------------------------------------

// RegexValidation is the result of ValidateRegex.
type RegexValidation struct {
	Safe   bool   `json:"safe"`
	Reason string `json:"reason,omitempty"`
}

// ValidateRegex checks a regex pattern for ReDoS vulnerabilities.
func ValidateRegex(pattern string) RegexValidation {
	// Go's regexp2 doesn't have backtracking, so Go's stdlib regexp
	// is inherently safe from ReDoS. But we validate for consistency
	// with other language ports and to reject obviously broken patterns.
	_, err := regexp.Compile(pattern)
	if err != nil {
		return RegexValidation{Safe: false, Reason: "Invalid regex: " + err.Error()}
	}
	return RegexValidation{Safe: true}
}

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

// Resolve resolves an expression against a config and returns matching links
// with sanitized URLs.
func Resolve(ctx context.Context, config *Config, expression string) []LinkWithID {
	parser := NewParser(ctx, config)
	ids := parser.Query(expression, "")
	var results []LinkWithID
	for _, id := range ids {
		if link, ok := config.AllLinks[id]; ok {
			sanitized := sanitizeLink(link)
			results = append(results, LinkWithID{ID: id, Link: sanitized})
		}
	}
	return results
}

// CherryPick resolves an expression and returns a map of id → sanitized link.
func CherryPick(ctx context.Context, config *Config, expression string) map[string]Link {
	parser := NewParser(ctx, config)
	ids := parser.Query(expression, "")
	result := make(map[string]Link)
	for _, id := range ids {
		if link, ok := config.AllLinks[id]; ok {
			result[id] = sanitizeLink(link)
		}
	}
	return result
}

// MergeConfigs shallow-merges multiple configs. Later configs win on collision.
func MergeConfigs(configs ...*Config) *Config {
	blocked := map[string]bool{"__proto__": true, "constructor": true, "prototype": true}

	merged := &Config{
		Settings:       make(map[string]any),
		Macros:         make(map[string]Macro),
		AllLinks:       make(map[string]Link),
		SearchPatterns: make(map[string]any),
	}

	for _, cfg := range configs {
		if cfg == nil {
			continue
		}
		for k, v := range cfg.Settings {
			if !blocked[k] {
				merged.Settings[k] = v
			}
		}
		for k, v := range cfg.Macros {
			if !blocked[k] {
				merged.Macros[k] = v
			}
		}
		for k, v := range cfg.AllLinks {
			if !blocked[k] {
				merged.AllLinks[k] = v
			}
		}
		for k, v := range cfg.SearchPatterns {
			if !blocked[k] {
				merged.SearchPatterns[k] = v
			}
		}
	}

	return merged
}

// ---------------------------------------------------------------------------
// ValidateConfig
// ---------------------------------------------------------------------------

// ValidateConfig validates and sanitizes a raw JSON-decoded config map,
// returning a newly allocated *Config or an error.
func ValidateConfig(raw map[string]any) (*Config, error) {
	if raw == nil {
		return nil, fmt.Errorf("config is nil")
	}

	blocked := map[string]bool{
		"__proto__":   true,
		"constructor": true,
		"prototype":   true,
	}

	allowedLinkFields := map[string]bool{
		"url":          true,
		"label":        true,
		"tags":         true,
		"cssClass":     true,
		"image":        true,
		"altText":      true,
		"targetWindow": true,
		"description":  true,
		"thumbnail":    true,
		"hooks":        true,
		"guid":         true,
		"createdAt":    true,
	}

	// allLinks must exist and be a map
	allLinksRaw, ok := raw["allLinks"]
	if !ok {
		return nil, fmt.Errorf("config missing required field: allLinks")
	}
	allLinksMap, ok := allLinksRaw.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("allLinks must be an object, not an array or primitive")
	}

	cfg := &Config{
		Settings:       make(map[string]any),
		Macros:         make(map[string]Macro),
		AllLinks:       make(map[string]Link),
		SearchPatterns: make(map[string]any),
	}

	// --- Settings ---
	if settingsRaw, ok := raw["settings"]; ok {
		if settingsMap, ok := settingsRaw.(map[string]any); ok {
			for k, v := range settingsMap {
				if !blocked[k] {
					cfg.Settings[k] = v
				}
			}
		}
	}

	// --- Macros ---
	if macrosRaw, ok := raw["macros"]; ok {
		if macrosMap, ok := macrosRaw.(map[string]any); ok {
			for name, v := range macrosMap {
				if blocked[name] {
					log.Printf("ValidateConfig: skipping blocked macro name %q", name)
					continue
				}
				if strings.Contains(name, "-") {
					log.Printf("ValidateConfig: skipping macro name with hyphen %q", name)
					continue
				}
				macroMap, ok := v.(map[string]any)
				if !ok {
					continue
				}
				m := Macro{}
				if li, ok := macroMap["linkItems"]; ok {
					if s, ok := li.(string); ok {
						m.LinkItems = s
					}
				}
				if c, ok := macroMap["config"]; ok {
					if cm, ok := c.(map[string]any); ok {
						m.Config = cm
					}
				}
				cfg.Macros[name] = m
			}
		}
	}

	// --- AllLinks ---
	for id, v := range allLinksMap {
		if blocked[id] {
			log.Printf("ValidateConfig: skipping blocked link ID %q", id)
			continue
		}
		if strings.Contains(id, "-") {
			log.Printf("ValidateConfig: skipping link ID with hyphen %q", id)
			continue
		}

		linkMap, ok := v.(map[string]any)
		if !ok {
			continue
		}

		// url is required and must be a string
		urlVal, hasURL := linkMap["url"]
		urlStr, urlIsString := urlVal.(string)
		if !hasURL || !urlIsString {
			log.Printf("ValidateConfig: skipping allLinks[%q] — missing or invalid url", id)
			continue
		}

		// Filter to allowed fields only
		link := Link{}
		for field := range linkMap {
			if !allowedLinkFields[field] {
				log.Printf("ValidateConfig: dropping unknown field %q from link %q", field, id)
			}
		}

		link.URL = SanitizeURL(urlStr)
		if s, ok := linkMap["label"].(string); ok {
			link.Label = s
		}
		if s, ok := linkMap["cssClass"].(string); ok {
			link.CSSClass = s
		}
		if s, ok := linkMap["image"].(string); ok {
			link.Image = SanitizeURL(s)
		}
		if s, ok := linkMap["altText"].(string); ok {
			link.AltText = s
		}
		if s, ok := linkMap["targetWindow"].(string); ok {
			link.TargetWindow = s
		}
		if s, ok := linkMap["description"].(string); ok {
			link.Description = s
		}
		if s, ok := linkMap["thumbnail"].(string); ok {
			link.Thumbnail = s
		}
		if s, ok := linkMap["guid"].(string); ok {
			link.GUID = s
		}
		if hooksRaw, ok := linkMap["hooks"]; ok {
			if hooksSlice, ok := hooksRaw.([]any); ok {
				for _, h := range hooksSlice {
					if hookStr, ok := h.(string); ok {
						link.Hooks = append(link.Hooks, hookStr)
					}
				}
			}
		}
		if ca, ok := linkMap["createdAt"]; ok {
			link.CreatedAt = ca
		}

		// Tags: validate each tag for hyphens
		if tagsRaw, ok := linkMap["tags"]; ok {
			if tagsSlice, ok := tagsRaw.([]any); ok {
				for _, t := range tagsSlice {
					if tagStr, ok := t.(string); ok {
						if strings.Contains(tagStr, "-") {
							log.Printf("ValidateConfig: skipping tag with hyphen %q in link %q", tagStr, id)
							continue
						}
						link.Tags = append(link.Tags, tagStr)
					}
				}
			}
		}

		cfg.AllLinks[id] = link
	}

	// --- SearchPatterns ---
	if spRaw, ok := raw["searchPatterns"]; ok {
		if spMap, ok := spRaw.(map[string]any); ok {
			for k, v := range spMap {
				if blocked[k] {
					log.Printf("ValidateConfig: skipping blocked search pattern key %q", k)
					continue
				}
				if strings.Contains(k, "-") {
					log.Printf("ValidateConfig: skipping search pattern key with hyphen %q", k)
					continue
				}
				if patStr, ok := v.(string); ok {
					result := ValidateRegex(patStr)
					if !result.Safe {
						log.Printf("ValidateConfig: skipping unsafe regex pattern %q: %s", k, result.Reason)
						continue
					}
				}
				cfg.SearchPatterns[k] = v
			}
		}
	}

	return cfg, nil
}

// ---------------------------------------------------------------------------
// SSRF guard — port of src/protocols/ssrf-guard.ts
// ---------------------------------------------------------------------------

// privateCIDRs holds parsed CIDR ranges for private/reserved IPv4 addresses.
var privateCIDRs []*net.IPNet

// privateIPv6CIDRs holds parsed CIDR ranges for private/reserved IPv6 addresses.
var privateIPv6CIDRs []*net.IPNet

func init() {
	ipv4Ranges := []string{
		"127.0.0.0/8",     // Loopback
		"10.0.0.0/8",      // RFC 1918
		"172.16.0.0/12",   // RFC 1918
		"192.168.0.0/16",  // RFC 1918
		"169.254.0.0/16",  // Link-local / cloud metadata
		"0.0.0.0/8",       // "This" network
		"100.64.0.0/10",   // Shared address space (CGN)
		"192.0.0.0/24",    // IETF protocol assignments
		"192.0.2.0/24",    // Documentation (TEST-NET-1)
		"198.51.100.0/24", // Documentation (TEST-NET-2)
		"203.0.113.0/24",  // Documentation (TEST-NET-3)
		"224.0.0.0/4",     // Multicast
		"240.0.0.0/4",     // Reserved
	}
	for _, cidr := range ipv4Ranges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			log.Fatalf("IsPrivateHost init: bad CIDR %q: %v", cidr, err)
		}
		privateCIDRs = append(privateCIDRs, network)
	}

	ipv6Ranges := []string{
		"::1/128",   // Loopback
		"fe80::/10", // Link-local
		"fc00::/7",  // Unique local address (ULA)
	}
	for _, cidr := range ipv6Ranges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			log.Fatalf("IsPrivateHost init: bad CIDR %q: %v", cidr, err)
		}
		privateIPv6CIDRs = append(privateIPv6CIDRs, network)
	}
}

// IsPrivateHost checks whether a URL's hostname is a private or reserved
// address. Malformed URLs return true (fail closed). This is a syntactic
// check — it does not resolve DNS.
func IsPrivateHost(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return true // fail closed
	}

	hostname := parsed.Hostname() // strips port and IPv6 brackets

	if hostname == "" {
		return true
	}

	// localhost variants
	if hostname == "localhost" || strings.HasSuffix(hostname, ".localhost") {
		return true
	}

	ip := net.ParseIP(hostname)
	if ip == nil {
		// Not an IP literal — could be a regular hostname. Not private.
		return false
	}

	// Go quirk: ParseIP("::ffff:127.0.0.1") returns a 16-byte slice.
	// To4() extracts the mapped IPv4 so it matches our IPv4 CIDR ranges.
	if v4 := ip.To4(); v4 != nil {
		for _, cidr := range privateCIDRs {
			if cidr.Contains(v4) {
				return true
			}
		}
		return false
	}

	// Pure IPv6
	for _, cidr := range privateIPv6CIDRs {
		if cidr.Contains(ip) {
			return true
		}
	}

	return false
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func dedupe(ids []string) []string {
	if len(ids) == 0 {
		return nil
	}
	seen := make(map[string]bool, len(ids))
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			result = append(result, id)
		}
	}
	return result
}

func toSet(ids []string) map[string]bool {
	s := make(map[string]bool, len(ids))
	for _, id := range ids {
		s[id] = true
	}
	return s
}

func filter(ids []string, keep func(string) bool) []string {
	var result []string
	for _, id := range ids {
		if keep(id) {
			result = append(result, id)
		}
	}
	return result
}

// sortBy is a stable merge sort for small result sets.
// O(n log n) guaranteed — no quicksort pivot degeneracy.
// Stable: preserves original order of equal elements.
func sortBy[T any](s []T, less func(a, b T) bool) {
	if len(s) <= 1 {
		return
	}
	mid := len(s) / 2
	sortBy(s[:mid], less)
	sortBy(s[mid:], less)

	buf := make([]T, len(s))
	copy(buf, s)
	i, j, k := 0, mid, 0
	for i < mid && j < len(s) {
		if less(buf[i], buf[j]) {
			s[k] = buf[i]
			i++
		} else {
			s[k] = buf[j]
			j++
		}
		k++
	}
	for i < mid {
		s[k] = buf[i]
		i++
		k++
	}
	for j < len(s) {
		s[k] = buf[j]
		j++
		k++
	}
}
