// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap

import (
	"fmt"
	"log"
	"regexp"
	"strings"
)

// ValidateOptions controls optional parameters to ValidateConfig.
type ValidateOptions struct {
	// Provenance is the tier to stamp each validated link with. When
	// the zero value (""), defaults to TierAuthor.
	Provenance Tier
}

// blockedKeys is the shared set of keys stripped at every map level
// during validation (link body, meta, settings, macros, searchPatterns,
// protocols).
//
// JS prototype-pollution set (__proto__, constructor, prototype) +
// Python-port dunders (__class__, __bases__, __mro__, __subclasses__)
// retained for cross-port parity. Go has no prototype chain so the
// first three are harmless here; keeping them keeps the blocklist
// identical across ports so auditors don't need a per-language cheat
// sheet.
var blockedKeys = map[string]bool{
	"__proto__":      true,
	"constructor":    true,
	"prototype":      true,
	"__class__":      true,
	"__bases__":      true,
	"__mro__":        true,
	"__subclasses__": true,
}

var metaURLKeyRe = regexp.MustCompile(`(?i)url$`)

// allowedLinkFields is the whitelist of keys accepted on a raw link map.
// Unknown fields are silently dropped. The Provenance field is
// deliberately NOT in the whitelist so stamps cannot be injected from
// input — it's set in-memory after the whitelist pass.
var allowedLinkFields = map[string]bool{
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
	"meta":         true,
}

// SanitizeLinkUrls returns a copy of link with URL-bearing fields
// passed through SanitizeURL: URL, Image, Thumbnail, and any meta key
// whose name ends with "url" (case-insensitive). Strips blockedKeys
// from meta during the pass.
//
// Single source of truth for URL-scheme sanitization on a link —
// called by ValidateConfig and available for any handler that
// constructs a Link before returning it.
func SanitizeLinkUrls(link Link) Link {
	if link.URL != "" {
		link.URL = SanitizeURL(link.URL)
	}
	if link.Image != "" {
		link.Image = SanitizeURL(link.Image)
	}
	if link.Thumbnail != "" {
		link.Thumbnail = SanitizeURL(link.Thumbnail)
	}
	if link.Meta != nil {
		safeMeta := make(map[string]any, len(link.Meta))
		for k, v := range link.Meta {
			if blockedKeys[k] {
				continue
			}
			if s, ok := v.(string); ok && metaURLKeyRe.MatchString(k) {
				safeMeta[k] = SanitizeURL(s)
			} else {
				safeMeta[k] = v
			}
		}
		link.Meta = safeMeta
	}
	return link
}

// ValidateConfig validates and sanitizes a raw JSON-decoded config
// map, returning a newly allocated *Config or an error.
//
// Pass a ValidateOptions with Provenance set to stamp links with a
// non-author tier:
//
//	cfg, err := ValidateConfig(raw, ValidateOptions{Provenance: TierStorageRemote})
//
// The variadic parameter is provided so existing callers that pass
// only raw continue to work (defaulting to author tier).
func ValidateConfig(raw map[string]any, opts ...ValidateOptions) (*Config, error) {
	if raw == nil {
		return nil, fmt.Errorf("config is nil")
	}

	var o ValidateOptions
	if len(opts) > 0 {
		o = opts[0]
	}
	if o.Provenance == "" {
		o.Provenance = TierAuthor
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

	// --- Hooks allowlist from settings (pulled up front) ---
	var hookAllowlist map[string]bool
	if settingsRaw, ok := raw["settings"]; ok {
		if settingsMap, ok := settingsRaw.(map[string]any); ok {
			if hooksRaw, ok := settingsMap["hooks"]; ok {
				if hooksSlice, ok := hooksRaw.([]any); ok {
					hookAllowlist = map[string]bool{}
					for _, h := range hooksSlice {
						if hs, ok := h.(string); ok {
							hookAllowlist[hs] = true
						}
					}
				}
			}
		}
	}

	// --- Settings ---
	if settingsRaw, ok := raw["settings"]; ok {
		if settingsMap, ok := settingsRaw.(map[string]any); ok {
			for k, v := range settingsMap {
				if !blockedKeys[k] {
					cfg.Settings[k] = v
				}
			}
		}
	}

	// --- Macros ---
	if macrosRaw, ok := raw["macros"]; ok {
		if macrosMap, ok := macrosRaw.(map[string]any); ok {
			for name, v := range macrosMap {
				if blockedKeys[name] {
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
		if blockedKeys[id] {
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

		// Shape via whitelist — unknown fields are silently dropped
		// (logged once per field).
		for field := range linkMap {
			if !allowedLinkFields[field] {
				log.Printf("ValidateConfig: dropping unknown field %q from link %q", field, id)
			}
		}

		link := Link{URL: urlStr}
		if s, ok := linkMap["label"].(string); ok {
			link.Label = s
		}
		if s, ok := linkMap["cssClass"].(string); ok {
			link.CSSClass = s
		}
		if s, ok := linkMap["image"].(string); ok {
			link.Image = s
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
		if ca, ok := linkMap["createdAt"]; ok {
			link.CreatedAt = ca
		}

		// Tags — strings only, reject hyphens.
		if tagsRaw, ok := linkMap["tags"]; ok {
			if tagsSlice, ok := tagsRaw.([]any); ok {
				for _, t := range tagsSlice {
					tagStr, ok := t.(string)
					if !ok {
						continue
					}
					if strings.Contains(tagStr, "-") {
						log.Printf("ValidateConfig: skipping tag with hyphen %q in link %q", tagStr, id)
						continue
					}
					link.Tags = append(link.Tags, tagStr)
				}
			}
		}

		// Hooks — tier-aware allowlist enforcement.
		if hooksRaw, ok := linkMap["hooks"]; ok {
			if hooksSlice, ok := hooksRaw.([]any); ok {
				stringHooks := make([]string, 0, len(hooksSlice))
				for _, h := range hooksSlice {
					if hs, ok := h.(string); ok {
						stringHooks = append(stringHooks, hs)
					}
				}

				switch {
				case o.Provenance == TierAuthor:
					if len(stringHooks) > 0 {
						link.Hooks = stringHooks
					}
				case hookAllowlist != nil:
					allowed := make([]string, 0, len(stringHooks))
					for _, h := range stringHooks {
						if hookAllowlist[h] {
							allowed = append(allowed, h)
						} else {
							log.Printf("ValidateConfig: allLinks[%q] — stripping hook %q not in settings.hooks allowlist (tier: %s)", id, h, o.Provenance)
						}
					}
					if len(allowed) > 0 {
						link.Hooks = allowed
					}
				case len(stringHooks) > 0:
					log.Printf("ValidateConfig: allLinks[%q] — dropping %d hook(s) on %s-tier link; declare settings.hooks to allow specific keys", id, len(stringHooks), o.Provenance)
				}
			}
		}

		// Meta — copy with BLOCKED_KEYS filter. SanitizeLinkUrls below
		// runs a second pass that also strips blocked keys and sanitises
		// *Url fields; this first pass ensures link.Meta is a fresh map.
		if metaRaw, ok := linkMap["meta"]; ok {
			if metaMap, ok := metaRaw.(map[string]any); ok {
				safeMeta := make(map[string]any, len(metaMap))
				for k, val := range metaMap {
					if blockedKeys[k] {
						continue
					}
					safeMeta[k] = val
				}
				link.Meta = safeMeta
			}
		}

		// Single source of truth for URL-field sanitization.
		link = SanitizeLinkUrls(link)

		// Stamp provenance AFTER the whitelist pass — since link was
		// built from a fixed set of known fields, the input cannot
		// pre-stamp itself via a forged Provenance value.
		MustStampProvenance(&link, o.Provenance)

		cfg.AllLinks[id] = link
	}

	// --- SearchPatterns ---
	if spRaw, ok := raw["searchPatterns"]; ok {
		if spMap, ok := spRaw.(map[string]any); ok {
			for k, v := range spMap {
				if blockedKeys[k] {
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
