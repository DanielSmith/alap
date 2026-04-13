# Security

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Config Registry](config-registry.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Storage](storage.md) · [Events](events.md) · **This Page** · [Servers](servers.md)

Alap's security model covers URL sanitization, regex validation, config validation, and parser resource limits. Although this considers some common attack vectors, it should not be taken as, or confused with, a professional third-party security audit. If you're deploying Alap in a high-trust environment, engage a security professional to review your specific integration.

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

These are already done right — no action needed:

| Pattern | Where |
|---------|-------|
| `textContent` for labels (no `innerHTML` with user data) | `buildMenuList.ts` |
| No `eval()` or `Function()` anywhere | All of `src/` |
| `encodeURIComponent` in REST paths | `RemoteStore.ts` |
| Framework auto-escaping (JSX, Vue templates, Svelte) | All framework adapters |
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

Alap's parser exists in five languages. All share the same security baseline:

| Feature | TypeScript | Rust | Python | PHP | Go |
|---------|-----------|------|--------|-----|-----|
| URL sanitization | yes | yes | yes | yes | yes |
| Prototype pollution defense | yes | yes | yes (+ dunders) | yes | yes |
| Resource limits (depth/tokens) | yes | yes | yes | yes | yes |
| ReDoS detection | syntactic | N/A (safe engine) | syntactic | syntactic + `pcre.backtrack_limit` | N/A (RE2 engine) |
| `validateConfig` | yes | yes | yes | yes | yes |
| SSRF guard | yes | yes | yes | yes | yes |

**Language-specific defenses:**

- **Python:** Blocks dunder keys (`__class__`, `__bases__`, `__mro__`, `__subclasses__`) in addition to JS prototype-pollution keys. Prevents downstream exploits if configs are passed to templating engines (Jinja2) or logging formatters.
- **PHP:** Rejects non-array input to `validateConfig()` — enforces `json_decode($json, true)` to prevent PHP Object Injection. Wraps regex execution with a temporary `pcre.backtrack_limit` (10,000) as a circuit breaker in case the syntactic ReDoS check misses an edge case.
- **Go:** Explicitly handles IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) in the SSRF guard via `net.IP.To4()` conversion before CIDR checking.
- **Rust/Go:** Regex engines are inherently safe from ReDoS (finite automata, no backtracking). Syntactic validation still checks for compilation errors.

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
