---
source: api-reference/security.md
modified: '2026-04-25T23:43:09Z'
tags:
- api_reference
title: Security
description: '**API Reference:** Engine · Types · Config Registry · Placement · Lightbox
  · Lens · Embeds · Coordinators · Storage · Events · **This Page** · Servers'
---
# Security

**[[api-reference/README|API Reference]]:** [[api-reference/engine|Engine]] · [[api-reference/types|Types]] · [[api-reference/config-registry|Config Registry]] · [[api-reference/placement|Placement]] · [[api-reference/lightbox|Lightbox]] · [[api-reference/lens|Lens]] · [[api-reference/embeds|Embeds]] · [[api-reference/coordinators|Coordinators]] · [[api-reference/storage|Storage]] · [[api-reference/events|Events]] · **This Page** · [[api-reference/servers|Servers]]

Alap's security model covers URL sanitization, regex validation, config validation, and parser resource limits.

> I'm not a security expert, and Alap hasn't had a third-party audit — it's a single-maintainer open source project. Please do your own due diligence before deploying, especially when wiring up protocols on servers with local network access. How you deploy this is your responsibility.

> Live version: https://alap.info/api-reference/security

## URL sanitization

All URLs from config (`url`, `image`, `thumbnail`) are sanitized before rendering into the DOM.

**Allowed schemes:** `http`, `https`, `mailto`, `tel`, relative URLs (no colon before first slash), empty string.

**Blocked schemes:** `javascript`, `data`, `vbscript`, `blob` (and case/whitespace variations).

Blocked URLs are replaced with `about:blank`. This applies in `buildMenuList` (DOM + Web Component) and in each framework adapter's `<a href>` and `<img src>` bindings.

```typescript
import { sanitizeUrl } from 'alap/core';

sanitizeUrl('https://example.com')      // → 'https://example.com'
sanitizeUrl('javascript:alert(1)')       // → 'about:blank'
sanitizeUrl('JAVASCRIPT:alert(1)')       // → 'about:blank' (case-insensitive)
sanitizeUrl('data:text/html,...')        // → 'about:blank'
```

## Regex validation (ReDoS protection)

User-defined search patterns from `config.searchPatterns` are validated before compilation. Patterns with known catastrophic constructs (nested quantifiers like `(a+)+`, `(a*)*`) are rejected.

```typescript
import { validateRegex } from 'alap/core';

validateRegex('(a+)+$')   // → { safe: false, reason: 'Nested quantifier detected...' }
validateRegex('bridge')    // → { safe: true }
```

Validation runs at config load time and again before `new RegExp()` as a second gate. Rejected patterns log a dev-mode warning and return empty results.

## Config validation

`validateConfig()` sanitizes untrusted configs (from remote APIs, JSON files, user input):

- Validates structure (`allLinks` must be an object, links must have `url` strings)
- Runs `sanitizeUrl()` on all URLs
- Runs `validateRegex()` on all search patterns
- Filters prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
- Strips unknown fields from link entries

Use it whenever loading configs from external sources:

```typescript
import { validateConfig } from 'alap/core';

const raw = await fetch('/api/config').then(r => r.json());
const config = validateConfig(raw);
```

## Trust model: How Alap handles data

Alap applies different levels of scrutiny based on where configuration data comes from. This ensures flexibility for developers while providing a high "defense floor" for untrusted input.

- **Local Configs (Trusted):** Configs defined in your source code or repository are treated as trusted parts of your application.
- **External Data (Sanitized):** Data from third-party APIs (like `:web:` or `:hn:`) or remote stores is treated with maximum caution. The engine automatically applies strict URL sanitization and resource caps to this data before it ever touches the DOM.
- **Stored Data (Validated):** Data from browser storage (localStorage) is re-validated on every load to ensure it hasn't been tampered with by other scripts.

## Secure integration checklist

For the best protection, the standard practices are:

- **Use `validateConfig()`** for any config loaded from a network or database.
- **Set `allowedOrigins`** for the `:web:` protocol to limit Alap to specific domains.
- **Apply a Content Security Policy (CSP)** on your host page. As a library, Alap does not ship or install a CSP for you.
- **Keep Alap current.** Security fixes and updated URL filters ship in patch releases.

## Parser resource limits


Alap classifies every config input by its source and applies the sanitization strictness matched to that source's trustworthiness.

| Tier | Source | Sanitization |
|------|--------|--------------|
| `author` | Checked-in developer code | Loose — permits `mailto:`, `tel:`, any scheme not explicitly dangerous |
| `protocol:*` | Returned from a generate handler (`:web:`, `:atproto:`, `:hn:`, ...) | Strict — `http`, `https`, `mailto` only |
| `storage:*` | Loaded from a storage adapter (`localStorage`, REST store, ...) | Strict |
| _(unstamped)_ | Missing provenance | Routed to the strict path — same as protocol/storage |

Pass `provenance` when loading a non-author config:

```typescript
const cfg = validateConfig(raw, { provenance: 'protocol:web' });
const cfg = validateConfig(raw, { provenance: 'storage:remote' });
```

The engine calls `validateConfig` internally for hand-written configs (author-tier by default), so ergonomic code stays ergonomic.

Per-tier enforcement spans URL sanitization, `cssClass` sanitization, `targetWindow` clamping, the metadata-key blocklist, and the hooks allowlist below.

## Hooks allowlist

`settings.hooks` serves two roles:

1. **Default** — applied to links that don't set their own `hooks`.
2. **Allowlist** — hooks on non-author-tier links are intersected against it. Hooks outside the allowlist are dropped with an operator-facing warning.

If `settings.hooks` is absent and a non-author-tier link arrives with hook keys, **all** are stripped. Author-tier links keep hooks verbatim — the developer wrote them.

## Config immutability

The config returned by `validateConfig` is frozen, and the input is deep-cloned on entry:

- Post-validation mutation of the returned object is a no-op (or throws, in strict mode). Handlers see the config the validator approved.
- The original input object is untouched; passing the same raw config to multiple engines is safe.
- Handler functions are kept out of the frozen config entirely. They pass separately via `new AlapEngine(config, { handlers })`, so the config itself stays pure data — serializable, auditable, freezable.

Reserved keys under `meta` are stripped at validate time (see `reservedMetaKeys` in `src/core/validateConfig.ts`) so caller-controlled data can't shadow internal tokens.

## Parser resource limits

The expression parser enforces hard limits to prevent denial-of-service:

| Limit | Value | What it prevents |
|-------|-------|------------------|
| Max parentheses depth | 32 | Stack overflow from deeply nested expressions |
| Max tokens | 1024 | Memory exhaustion from enormous expressions |
| Max macro expansions | 10 rounds | Infinite recursion from circular macro references |
| Max regex searches | 5 per expression | Regex storms from expressions with many `/pattern/` atoms |
| Max regex results | 100 per search | Memory exhaustion from broad patterns |

## Positive patterns

| Pattern | Where |
|---------|-------|
| `textContent` for labels (no `innerHTML` with user data) | `buildMenuList.ts` |
| No `eval()` or `Function()` anywhere | All of `src/` |
| `encodeURIComponent` in REST paths | `RemoteStore.ts` |
| Framework auto-escaping (JSX, Vue templates, Svelte) | All framework adapters |
| `rel="noopener noreferrer"` on every menu, lens, and lightbox anchor (all tiers) | `buildMenuList.ts` + framework adapters |
| Proper ARIA roles and keyboard navigation | All adapters |
| Event listener cleanup on destroy/unmount | All adapters |
| Zero runtime dependencies in core | `src/core/` |

## `:web:` protocol security

The `:web:` protocol fetches JSON from external APIs. Several layers protect against misuse:

### Credential isolation

By default, fetch requests are made with `credentials: 'omit'` — no cookies, HTTP auth, or TLS client certs are sent. This prevents accidental credential leakage to third-party APIs defined in someone else's config.

For intranet or subscription APIs where the user's session should authenticate the request, opt in per key:

```typescript
keys: {
  publicApi: { url: 'https://openlibrary.org/search.json' },           // credentials: omit (default)
  intranet:  { url: 'https://internal.corp/api', credentials: true },   // credentials: include
}
```

### Origin allowlist

Restrict which domains `:web:` can fetch from:

```typescript
protocols: {
  web: {
    allowedOrigins: ['https://openlibrary.org', 'https://api.github.com'],
    keys: { ... }
  }
}
```

If `allowedOrigins` is set, any URL whose origin is not in the list is rejected before the request is made. Omit or pass an empty array to allow all origins.

### Socket-level SSRF guard (DNS rebinding)

Server-side Node fetches — `:web:` (when `allowedOrigins` isn't set), `:json:`, `:hn:`, and `:atproto:` — re-resolve the hostname at socket-open time and re-check the resolved IP against the private-address CIDR blocklist. The purely syntactic hostname check runs before the socket connect, so it can't reflect what the OS resolver returns at connect time; the socket-level re-check moves the decision to the moment the connection is made.

Implemented via `undici.Agent`'s `connect.lookup` callback; requires Node 22+. If you've set `allowedOrigins` for `:web:`, the author-supplied allowlist serves as the guard and the default fetch path is used so a locally-configured dev host (e.g. `http://localhost:3000`) can still be reached. `:obsidian:rest:` keeps its dedicated `allowedHosts` gate — loopback is the intended destination there.

### Fetch timeout

All `:web:` fetches have a `WEB_FETCH_TIMEOUT_MS` timeout (default: 10 seconds) via `AbortController`. Stalled or slow APIs cannot hang the UI indefinitely.

### Response size guard

If the response includes a `Content-Length` header exceeding `MAX_WEB_RESPONSE_BYTES` (default: 1 MB), the response is rejected before parsing. This prevents memory pressure from oversized API responses.

### Output cap

Results are capped at `MAX_GENERATED_LINKS` (200) regardless of how many items the API returns.

### linkBase normalization

When `linkBase` is used to prepend a base URL to relative paths, slashes are normalized to prevent malformed URLs (no double slashes, no missing slashes).

## Known limitations

- **`alapelem` container ID is predictable.** The DOM adapter always uses `#alapelem`. Another element with that ID could interfere. This is part of the documented CSS API and won't change.
- **`cssClass` from config flows into DOM class names.** This is by design — config authors control CSS classes. It cannot cause XSS (class attributes are not executable), but allows visual manipulation.
- **Configs are treated as semi-trusted input.** The expression parser assumes the config structure is valid after `validateConfig()`. If you skip validation on remote configs, you accept the risk.

## Cross-language security parity

Alap's parser exists in seven languages. All share the same security baseline:

| Feature | TypeScript | Rust | Python | PHP | Go | Java | Ruby |
|---------|-----------|------|--------|-----|-----|------|------|
| URL sanitization | yes | yes | yes | yes | yes | yes | yes |
| Prototype pollution defense | yes | yes | yes (+ dunders) | yes | yes | yes | yes |
| Resource limits (depth/tokens) | yes | yes | yes | yes | yes | yes | yes |
| ReDoS detection | syntactic | N/A (safe engine) | syntactic | syntactic + `pcre.backtrack_limit` | N/A (RE2 engine) | syntactic | syntactic |
| `validateConfig` | yes | yes | yes | yes | yes | yes | yes |
| SSRF guard (syntactic) | yes | yes | yes | yes | yes | yes | yes |
| DNS-rebinding guard (socket-level) | yes | N/A | N/A | N/A | N/A | N/A | N/A |

The socket-level DNS-rebinding guard only applies where Alap itself opens sockets. That's the TypeScript library's built-in fetch protocols (`:web:`, `:json:`, `:hn:`, `:atproto:`). The other ports are parser-only — they don't ship HTTP-fetching protocols, so there's no library-level fetch path for the rebind guard to protect. Each port does export the syntactic `is_private_host(url)` helper for consumers who build their own fetch-based extensions; rebind defense in that case is the consumer's responsibility.

**Language-specific defenses:**

- **Python:** Blocks dunder keys (`__class__`, `__bases__`, `__mro__`, `__subclasses__`) in addition to JS prototype-pollution keys. Keeps configs passed downstream to templating engines (Jinja2) or logging formatters from carrying handles into Python internals.
- **PHP:** Rejects non-array input to `validateConfig()` — enforces `json_decode($json, true)` to prevent PHP Object Injection. Wraps regex execution with a temporary `pcre.backtrack_limit` (10,000) as a circuit breaker in case the syntactic ReDoS check misses an edge case.
- **Go:** Explicitly handles IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) in the SSRF guard via `net.IP.To4()` conversion before CIDR checking.
- **Rust/Go:** Regex engines are inherently safe from ReDoS (finite automata, no backtracking). Syntactic validation still checks for compilation errors.
- **Java:** SSRF guard uses `InetAddress` for resolution with loopback/link-local/site-local checks.

**Known limitation (TypeScript/Python):** The `REGEX_TIMEOUT_MS` constant is checked between loop iterations, not during a single `RegExp.exec()` call. JavaScript and Python have no built-in mechanism to interrupt a running regex. The syntactic `validateRegex()` check is the primary defense.

## CI/CD supply chain hardening

All GitHub Actions are pinned to full commit SHAs (not mutable version tags) to prevent supply chain attacks like the Trivy incident (March 2026). Dependabot is configured to submit PRs for SHA updates.

The security audit runs:
- TypeScript: `pnpm audit`, security test suites, dangerous pattern scan, lockfile integrity
- Rust: `cargo audit`, `validate_config` + `ssrf_guard` tests
- Python: `pytest` for `validate_config`, `validate_regex`, `ssrf_guard`
- PHP: `composer audit`, PHPUnit for `ValidateConfig`, `ValidateRegex`, `SsrfGuard`
- Go: `go test` for `ValidateConfig`, `IsPrivateHost`

## Recommendation

Always call `validateConfig()` on configs from external sources. For configs you control (hardcoded JSON, checked into your repo), validation is optional — the engine handles them safely.
