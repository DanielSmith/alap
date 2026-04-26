# Hacker News (`:hn:`)

**[Cookbook](README.md) › Hacker News**

The `:hn:` protocol turns Hacker News into a live link source — listings, user submissions, search, and single items — with zero auth and CORS-friendly defaults, so it runs in the browser or on a server.

This page focuses on the security model. For a working example and sub-mode walkthroughs, see [`examples/sites/hn/`](../../examples/sites/hn/).

> Alap is a single-maintainer open source project that hasn't been through a third-party audit. Please do your own due diligence — especially when wiring up protocols on servers with local network access.

---

## Defense floor

Every `:hn:` fetch passes through a shared helper (`fetchJson`) that applies a small, fixed set of protections. None are configurable — they're the floor, not a policy surface.

| Defense | Value / Source | Why it matters |
|---|---|---|
| **SSRF guard** | `assertSafeUrl` from `src/protocols/ssrf-guard.ts` — refuses loopback, RFC 1918, link-local (incl. `169.254.169.254` cloud-metadata), CGN, multicast, reserved ranges; IPv4 and IPv6 including IPv4-mapped | Server-side runners (SSG bake, SSR) use the operator's network. A misconfigured base URL must never reach internal services or cloud-metadata endpoints. |
| **Per-request timeout** | `WEB_FETCH_TIMEOUT_MS` = 10 000 ms, enforced via `AbortController` | Hung upstream can't stall page rendering indefinitely. |
| **Response size cap** | `MAX_WEB_RESPONSE_BYTES` = 1 MiB, checked against `Content-Length` | Pathologically large responses can't exhaust memory. |
| **Content-type check** | `application/json` only | An HTML error page or unexpected payload is refused, not parsed. |
| **`credentials: 'omit'`** | On every fetch | No cookies, no HTTP auth, no bearer tokens ever leave the caller. |
| **Rate-limit cap for explicit ids** | `HN_ITEMS_MAX` = 6 for `:hn:items:id1,id2,...:` | Firebase has no batch item endpoint, so each id is a separate round-trip. The cap keeps per-render fan-out bounded regardless of what a config author writes. |
| **Fan-out ceiling** | `MAX_GENERATED_LINKS` = 200 across all sub-modes | Upper bound on any handler's output. |

All failures — SSRF refusal, timeout, non-2xx, wrong content-type, oversize body, JSON parse error — return `null` from `fetchJson`, which the handler treats as an empty result. One bad call never crashes the page.

---

## What the SSRF guard actually blocks

The guard is **syntactic** — it inspects the hostname string, not DNS. It refuses URLs whose hostname is:

- **Loopback** — `127.0.0.0/8`, `::1`, `localhost`, `*.localhost`
- **RFC 1918 private** — `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-local** — `169.254.0.0/16` (includes AWS / GCP / Azure metadata at `169.254.169.254`)
- **IETF reserved** — `0.0.0.0/8`, `100.64.0.0/10` (CGN), documentation TEST-NETs, multicast, reserved
- **IPv6 private** — loopback, unique-local (`fc00::/7`), link-local (`fe80::/10`), and IPv4-mapped equivalents
- **Malformed URLs** — unparseable strings are rejected outright

It does **not** protect against DNS rebinding, where a public hostname resolves to a private IP at request time. That defense belongs at the network layer (a custom fetch agent that validates resolved IPs). For `:hn:`, the base URLs are hardcoded to well-known public hosts, so the operator risk is misconfiguration of those bases, not rebinding against third-party domains.

---

## Operator-visible warnings

Every `warn()` from the `:hn:` protocol starts with `:hn:` and is written for the config author, not the page visitor. The warning always names the URL and says what to fix.

| Message | Cause | Fix |
|---|---|---|
| `:hn: refusing unsafe URL (private/reserved host): <url>` | URL resolved to a blocked range | Fix the misconfigured base. If you need to hit a loopback service during development, route it through the `:web:` protocol with an explicit opt-in, not `:hn:`. |
| `:hn: HTTP 5xx ...` | Upstream error from Firebase / Algolia | Usually transient; retry or add a cache layer (`protocols.hn.cache`). |
| `:hn: unexpected content-type "..."` | Upstream returned non-JSON (often an HTML error page) | Upstream incident, or the URL is wrong. |
| `:hn: response too large (N bytes)` | `Content-Length` exceeded 1 MiB | Almost certainly wrong URL; HN endpoints don't return bodies this large. |
| `:hn: network error: timeout after 10000ms` | Upstream hung | Network issue or upstream outage. |
| `:hn: unknown command "X"` | Config typo | Available sub-modes: `top`, `new`, `best`, `ask`, `show`, `job`, `user`, `search`, `items`. |
| `:hn:items: ... capping at 6 ...` | Expression listed more than six explicit ids | Trim the list; large explicit menus are unwieldy UX anyway. |

---

## Configuration surface

`:hn:` has no security knobs. The only config is functional. Config is data only — the handler is passed at engine construction:

```js
// config (data)
protocols: {
  hn: {
    // Default for listing sub-modes when no named limit is given.
    defaults: { limit: 20 },
    // Named search presets for Algolia (multi-word queries can't go inline).
    searches: {
      ai_papers: 'artificial intelligence papers',
      rust_gamedev: 'rust game development',
    },
    // Optional: per-protocol resolution cache (milliseconds).
    cache: 60_000,
  },
},

// handler (behavior)
import { AlapEngine, hnHandler } from 'alap';
const engine = new AlapEngine(config, { handlers: { hn: hnHandler } });
```

Because base URLs, timeouts, size caps, and the SSRF guard are not surface-configurable, there's nothing for a config author to soften accidentally.

---

## See also

- [`examples/sites/hn/`](../../examples/sites/hn/) — end-to-end working example with every sub-mode
- [`src/protocols/hn/`](../../src/protocols/hn/) — handler, fetch helper, mapping primitives
- [`src/protocols/ssrf-guard.ts`](../../src/protocols/ssrf-guard.ts) — the shared guard, used by `:hn:`, `:web:`, `:json:`, `:obsidian:rest:`
- [Core Concepts — Protocols](../core-concepts/protocols.md) — the `:hn:` section in the protocol reference
