# Threat model

> **A note on scope.** I'm not a security expert. Alap hasn't been
> through a third-party audit — it's an open source project from a
> single maintainer. Please do your own due diligence before
> deploying, especially when configuring protocols that fetch
> external data or talk to local services. I'm not responsible for
> how you deploy this.

A short note on how Alap thinks about inputs and where the library's
responsibilities end. Meant as orientation for integrators deciding
what they might want to do on top of the defaults — not a completeness
guarantee or a promise that Alap handles every case.

## Where inputs come from

Alap tags config inputs by origin and adjusts how strict it is about
them.

- **Author.** Config the developer wrote and checked in. Treated
  leniently — the developer already owns the page, so the library
  doesn't add much by second-guessing them here.
- **Protocol.** Links returned from a generate handler (`:web:`,
  `:atproto:`, `:hn:`, custom). Sanitized more strictly, since they
  travel over the network.
- **Storage.** Config loaded from a storage adapter (localStorage, a
  REST store). Same strictness as protocol.
- **Unstamped.** When provenance wasn't passed to `validateConfig`,
  the library errs on the strict side. Safer default than guessing.

## What the library does

- Sanitizes URLs before they reach anchor or image tags.
- Keeps user-sourced text out of `innerHTML`.
- Applies parser resource limits (depth, tokens, macros, regex output
  size).
- Runs outbound fetches through an SSRF guard; caps response size and
  duration.
- Freezes the validated config and keeps handler functions in a
  separate registry.
- Emits warnings via `warn()` whenever it tightens or drops something,
  so operators can see what the library saw.

A fuller per-feature breakdown lives in
[api-reference/security.md](../api-reference/security.md).

## What the library doesn't do

- **Content Security Policy.** Alap doesn't install one. Apply it on
  the host page.
- **Destination reputation.** Alap checks URL *schemes*; it doesn't
  decide whether a given destination is trustworthy.
- **Transport security.** HTTPS is on the host page to configure.
- **Storage integrity.** If config lives in a store, that store's
  authentication and integrity are separate concerns.
- **Browser guarantees.** Alap relies on the user agent for
  same-origin policy, `rel="noopener noreferrer"`, CSP enforcement,
  and URL-scheme parsing. Older or unusual browsers yield a
  correspondingly weaker floor.

## What an integrator typically adds

- Pass `provenance` to `validateConfig` when loading from somewhere
  other than source code.
- Set `settings.hooks` to the hook keys the app actually uses, so
  hooks from non-author sources are intersected against that list.
- Set `allowedOrigins` on `:web:` to the hosts the app actually wants
  to fetch from.
- Keep Alap current. Security fixes go out in patch releases, noted
  in the changelog.

---

Layered defense, not a guarantee. Alap plus CSP, HTTPS, a patched
browser, and a reviewed config is the expected posture; any single
layer by itself is a floor, not a ceiling.
