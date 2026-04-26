/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Sanitize a URL to prevent XSS via dangerous URI schemes.
 *
 * Allows: http, https, mailto, tel, relative URLs, empty string.
 * Blocks: javascript, data, vbscript, blob (and case/whitespace variations).
 *
 * Returns the URL unchanged if safe, or 'about:blank' if dangerous.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;

  // Strip ASCII control characters and whitespace that could disguise a scheme.
  // e.g., "java\nscript:" or "java\tscript:"
  const normalized = url.replace(/[\x00-\x1f\x7f]/g, '').trim();

  // Check for dangerous schemes (case-insensitive)
  if (/^(javascript|data|vbscript|blob)\s*:/i.test(normalized)) {
    return 'about:blank';
  }

  return url;
}

/** Strict-tier baseline schemes — always honored regardless of `extraSchemes`. */
const STRICT_BASE_SCHEMES = ['http', 'https', 'mailto'] as const;

/**
 * Library-enforced ceiling on what `extraSchemes` can ever widen the
 * strict allowlist to include. A protocol handler can request any
 * subset of these schemes via `link.allowedSchemes`; anything else is
 * silently dropped before the union with the baseline.
 *
 * Why a ceiling: even a careless handler that proxies `allowedSchemes`
 * from a remote response can't widen sanitization to arbitrary
 * schemes. The library — not the handler — decides what URI schemes
 * can ever survive sanitization at the strict tier. Adding a new
 * scheme requires a deliberate library change with a security review.
 *
 * Today the only Alap-shipped protocol that needs a non-baseline
 * scheme is `:obsidian:`, so the ceiling holds exactly that. Adding
 * speculative entries (`vscode`, `slack`, `discord`, etc.) would
 * pre-bless attack surface for use cases that don't exist — several
 * of those scheme families have known dangerous URI handlers (e.g.
 * `vscode://vscode.git/clone?url=...` will clone an attacker repo).
 * Add new entries here only when a shipped protocol legitimately
 * needs them, and only after auditing the scheme's OS-level handler
 * surface for arbitrary command/file/network exposure.
 */
const SCHEME_CEILING: ReadonlySet<string> = new Set([
  'obsidian',  // Obsidian app — emitted by the :obsidian: protocol only
]);

/**
 * Strict URL sanitizer — `http`/`https`/`mailto` only, plus relative URLs,
 * with optional widening via `extraSchemes`.
 *
 * Use for links whose origin we haven't verified as author-tier: protocol
 * handler results, storage-loaded configs, etc. (see sanitizeByTier.ts).
 * Blocks `tel:`, `ftp:`, `blob:`, `data:`, `javascript:`, custom schemes,
 * and anything else that isn't in the resulting allowlist.
 *
 * `extraSchemes` is unioned on top of the baseline after intersection
 * with the library-enforced {@link SCHEME_CEILING} — it never narrows
 * the baseline, never widens past the ceiling. A trusted protocol
 * handler can request additional schemes (e.g. `obsidian`) via
 * `link.allowedSchemes`, stamped through `injectLinks`, to surface URIs
 * the strict baseline would otherwise reject.
 */
export function sanitizeUrlStrict(url: string, extraSchemes?: readonly string[]): string {
  if (!extraSchemes || extraSchemes.length === 0) {
    return sanitizeUrlWithSchemes(url, [...STRICT_BASE_SCHEMES]);
  }
  // Intersect with ceiling: handlers can request only schemes the
  // library has pre-blessed. Unknown/disallowed schemes are dropped
  // silently — careless or malicious widening is structurally impossible.
  const allowedExtras = extraSchemes.filter((s) => SCHEME_CEILING.has(s.toLowerCase()));
  return sanitizeUrlWithSchemes(url, [...STRICT_BASE_SCHEMES, ...allowedExtras]);
}

/**
 * Sanitize a URL with configurable allowed schemes.
 *
 * First applies the standard dangerous-scheme blocklist via sanitizeUrl().
 * Then, if allowedSchemes is provided, verifies the URL's scheme is in the list.
 * Relative URLs (no scheme) always pass through.
 *
 * Default allowedSchemes: ['http', 'https']
 */
export function sanitizeUrlWithSchemes(url: string, allowedSchemes?: string[]): string {
  const base = sanitizeUrl(url);
  if (base === 'about:blank') return base;
  if (!base) return base;

  const schemes = allowedSchemes ?? ['http', 'https'];

  // Check for a scheme in the URL
  const schemeMatch = base.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (!schemes.includes(scheme)) return 'about:blank';
  }

  // Relative URLs pass through (no scheme to check)
  return base;
}
