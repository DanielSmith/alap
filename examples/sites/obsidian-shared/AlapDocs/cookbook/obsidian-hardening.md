---
source: cookbook/obsidian-hardening.md
modified: '2026-04-25T23:48:57Z'
tags:
- cookbook
title: Obsidian — Hardening
description: '**Cookbook › Obsidian:** Overview · Get a Vault · Core Mode · REST Setup
  · **Hardening**'
---
# Obsidian — Hardening

**[[cookbook/README|Cookbook]] › Obsidian:** [[cookbook/obsidian-overview|Overview]] · [[cookbook/obsidian-vault|Get a Vault]] · [[cookbook/obsidian-core|Core Mode]] · [[cookbook/obsidian-rest-setup|REST Setup]] · **Hardening**

Server-side defenses for any Node server exposing Alap's `:obsidian:` protocol. The attack surface is the HTTP server you run, not the sub-mode — so this chapter applies equally to Core and REST.

> **A note on tone.** The guidance below reflects my understanding. I'm not a security expert — weigh this against your own threat model and consult specialists if the stakes warrant it. Alap's library safeguards are the floor; the server wrapper around them is the ceiling. I advise raising the ceiling to whatever is called for in your environment.

---

## Library-provided REST client safeguards

REST-specific. Skim if you're running Core only. These are on by default — you get them just by using `:obsidian:rest:`:

- **Host allowlist.** Only loopback addresses (`127.0.0.1`, `::1`, `localhost`) by default. Non-loopback hosts require explicit opt-in via `rest.allowedHosts`.
- **TLS bypass strictly loopback-gated.** Self-signed certificates accepted only on loopback. Off-loopback, verified TLS applies regardless of config flags.
- **API key redaction.** Every warning that mentions a URL, header, or response body runs through `redactKey()` first. Keys never appear in logs.
- **Per-request timeout.** `AbortController` with configurable `timeoutMs`. No hung requests.
- **Path traversal guard.** Every `/vault/{path}` GET is pre-validated — empty strings, NUL bytes, leading `/` or `\`, Windows drive prefixes, and any `..` segment are refused without issuing a request.
- **Per-note failure isolation.** A bad path or malformed body on one note drops that note; the rest of the batch continues.
- **Body truncation cap.** Each note reads up to 256 KiB (`OBSIDIAN_MAX_MATCH_BYTES`). Pathologically large notes can't exhaust memory.

These are safeguards on Alap's *outbound* call to the plugin. They don't help with the *inbound* side — requests arriving at your Node server from browsers. That's what the next section is for.

---

## The six defenses for your Node server

These apply to **both** Core and REST — the attack surface is the HTTP server you expose, not the sub-mode.

One scenario to think about is **drive-by localhost abuse**: you're running a server on `localhost:9178`; you browse to `evil.com`; `evil.com`'s JavaScript tries `fetch('http://localhost:9178/api/obsidian/query', { body: ... })` to exfiltrate your vault.

These defenses layer well; none is foolproof alone.

1. **Bind to `127.0.0.1` only, never `0.0.0.0`.** Keeps LAN peers out.

   ```js
   server.listen(PORT, '127.0.0.1');
   ```

2. **Strict origin allowlist.** `Access-Control-Allow-Origin` is an explicit list — never `*`, never reflected from the `Origin` header.

   ```js
   const ALLOWED_ORIGINS = new Set(['http://localhost:9178']);
   if (!ALLOWED_ORIGINS.has(req.headers.origin)) return deny(res);
   ```

3. **Host header validation (DNS rebinding defense).** Reject any request whose `Host` header isn't `localhost:PORT` or `127.0.0.1:PORT`. Short-TTL DNS can flip a public name to `127.0.0.1` after page load, which CORS alone wouldn't catch — the host-header check runs against the literal value the browser sent, so it doesn't depend on what name resolution returns.

   ```js
   const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
   if (!HOSTS.has(req.headers.host)) return deny(res);
   ```

4. **Per-query allowlist.** The server holds the list of allowed queries or query shapes. A browser cannot invent `:obsidian:core:search:secrets:` — only named endpoints the server registered are reachable. Turns "expression interpreter" into "named-endpoint dispatcher."

   ```js
   const ALLOWED_QUERIES = new Set([':obsidian:core:bridges:', ':obsidian:core::$small:']);
   if (!ALLOWED_QUERIES.has(query)) return deny(res);
   ```

5. **Capability / bootstrap token.** On startup, generate a random token; serve it from a same-origin-only endpoint; require it as `Authorization: Bearer <token>` on every query.

   ```js
   import { randomBytes } from 'node:crypto';
   const BOOTSTRAP_TOKEN = randomBytes(32).toString('hex');
   // GET /alap/bootstrap → returns token (only to same-origin callers)
   // Every /api/* request checks Authorization header
   ```

   Per-boot rotation bounds the blast radius: a leaked token dies on server restart. Open tabs see a single 401 and re-fetch.

6. **Shared secret** on top of the above — an extra pre-configured secret the page must also know, in addition to the bootstrap token. Belt-and-suspenders.

Layered together, each defense protects against a different failure mode. CORS (step 2) limits which origins the browser will let talk to the server. The host-header check (step 3) doesn't depend on DNS — it inspects the literal `Host` value. Same-origin storage (step 5) keeps the bootstrap token unreadable from other origins even if the earlier layers are circumvented.

---

## Additional hardening (not required; worth knowing)

- **Randomize the port.** Server picks an ephemeral port on boot, writes it to a file or prints it. A predictable port like `:9178` is easier to pre-target than one chosen at startup.
- **Audit log.** Append `origin + query + timestamp` to a local file for every query. Trivial to grep `evil.com` after the fact.
- **Rate limiting.** Cap queries/sec per origin.
- **Idle token expiration (optional).** Tokens dropped after a window of inactivity.
- **Redaction hooks.** `protocols.obsidian.redact: ['^secret_', '^.*_private$']` — filter matched frontmatter keys or filenames from output. Defense in depth for specific files you never want to surface.

---

## Auditing an existing install

When reviewing a project for `:obsidian:` exposure:

1. `grep -r "alap/protocols/obsidian"` — find the import sites.
2. Is the consumer a build-time tool (SSG) or a runtime server?
3. If runtime — which of the six defenses does it apply? Any missing?
4. Is `vaultPath` or the REST endpoint configured? Without it, the handler is inert.

---

## See also

- [[cookbook/obsidian-rest-setup|REST Setup]] — installing the Local REST API plugin and wiring it to Alap
- [[cookbook/obsidian-core|Core Mode]] — filesystem-only sub-mode
- [[api-reference/security|Security reference]] — full per-feature security model
- [[security/threat-model|Threat model]] — what the library does, doesn't do, and assumes from integrators
