# Changelog

All notable changes to Alap. Per-release narratives live in
[docs/release-notes/](docs/release-notes/) when they exist.

### Documentation fixes (2026-04-26)

- `docs/cookbook/obsidian-overview.md`: prerequisite Node 18+ → Node 22+, matching `package.json` engines and the 3.2 DNS-rebinding guard requirement.
- ~33 cross-doc URLs rewritten from `https://alap.info/<section>/<page>` (the splash site, which doesn't host docs) to `https://docs.alap.info/<section>/<page>`.

## [3.2.0] — 2026-04-21

Security-focused release. Versions 3.0 and 3.1 are unsupported as of
this release — the security work isn't practically backportable. Alap
is a single-maintainer open source project that hasn't been through a
third-party audit; please do your own due diligence. See
[SECURITY.md](SECURITY.md), [docs/security/threat-model.md](docs/security/threat-model.md),
and [docs/release-notes/3_2_0.md](docs/release-notes/3_2_0.md) for the
full picture.

- **Tiered trust model.** Config sources are stamped with provenance (`author`, `protocol:*`, `storage:*`); sanitizers apply tier-appropriate strictness, and unstamped inputs route to the strict path.
- **Frozen, data-only config.** `validateConfig` deep-freezes configs and deep-clones on ingest. Handler functions move out of the config object into a runtime registry passed to `new AlapEngine(config, { handlers })`. One-line migration in `docs/migration-3_2-handlers-out-of-config.md`.
- **SSRF guard against DNS rebinding.** Server-side protocols (`:web:`, `:json:`, `:hn:`, `:atproto:`) route through a new `guardedFetch` helper that re-runs the CIDR blocklist at socket-open time via `undici.Agent`'s `connect.lookup` callback. **Minimum Node bumped from 20 → 22** for this API.
- **Bare `@` aliasing removed.** `@` now requires an explicit name (`@macroname`); the `anchorId` parameter on engine query methods is a no-op and marked `@deprecated` (it still flows through to `onTriggerHover` / `onTriggerContext` event details).
- **Hooks allowlist, link hardening, fetch refcounting.** `settings.hooks` doubles as an allowlist intersected against non-author-tier links. Menu anchors carry `rel="noopener noreferrer"` across every renderer. `AlapEngine` refcounts fetch subscribers per in-flight token so cross-renderer dismissals don't abort still-needed fetches.
- **`:hn:` defense-floor pass.** New `assertSafeUrl` SSRF helper, top-of-file JSDoc enumerating every protection (timeouts, size caps, item caps, content-type checks, `credentials: 'omit'`), and a dedicated cookbook page so operators can see the protections inherited from the library.
- **Obsidian cookbook split.** `obsidian-plugin-security.md` (273 lines, mixed concerns) split into `obsidian-rest-setup.md` (plugin install, certs, keys, server config) and `obsidian-hardening.md` (six-defense checklist, layered-but-not-guaranteed framing).
- **`all-together` example.** New end-to-end example demonstrating menu + lens + lightbox on one page, sharing one config, coordinating cross-dismissal via `RendererCoordinator`.
- **URL sanitization fix (2026-04-20).** Closed an XSS path where protocol-injected URLs could bypass the strict-tier sanitizer; `sanitizeLinkUrls` now applied uniformly across renderers.

## [3.1.0] — 2026-04-15

- **Ruby language port** — full parser in `src/other-languages/ruby/`, 90 tests, 193 assertions; new Sinatra + SQLite server. Server count 10 → 11; language port count 5 → 6.
- **PHP grammar fix** — removed hyphen-in-identifier support that deviated from the canonical grammar; `-` is now correctly the WITHOUT operator everywhere.
- **Accessibility overhaul** — DOM-mode triggers respond to Space/Enter; focus-on-open is keyboard-only; guarded focus-on-close prevents viewport scroll on broadcast dismissals; off-screen menu measurement eliminates placement flicker; image triggers fall back to image center on keyboard activation; new `preventFocusScroll` setting.
- **Lens (`<alap-lens>` web component, drawer, clickable tags, photographer credits)** — full WC parity with shadow DOM, ~50 CSS custom properties, `::part()` on every meaningful element. Tag chips drill down via `.tagname`. Scrollable details drawer with ArrowUp/ArrowDown toggle, hidden until hover. Lens example expanded to 37 items across 16 cities.
- **Lightbox set navigator + image zoom** — counter "1 / 5" doubles as a hover-triggered nav menu with type-to-filter and keyboard navigation; full-viewport zoom on thumbnail click with stacked-Escape dismiss. `<alap-lightbox>` web component shipped.
- **Embed module (`src/ui-embed/`)** — iframe embedding with per-domain consent (YouTube, Vimeo, Spotify, CodePen, CodeSandbox); Permissions Policy via `allow`, lazy loading, `youtube-nocookie.com` rewrite. 84 tests.
- **Cross-renderer naming consistency** — internal CSS class names, `::part()` names, and CSS custom properties aligned across menu, lightbox, and lens.
- **Numeric URL coercion** — `:web:` and `:json:` handlers now coerce numeric `url` fields to strings so REST APIs returning integer IDs (JSONPlaceholder, etc.) don't silently drop items.

## [3.0.0] — 2026-04-07

The v3 release.

- **Renderer coordination** — `RendererCoordinator` orchestrates transitions between menu, lightbox, and lens; `CoordinatedRenderer` interface defines the minimal contract; View Transitions API integration with `prefers-reduced-motion` respected.
- **Lens transitions** — `transition: 'fade' | 'resize' | 'none'` for navigation between items, with TTT-style animated height for `resize`. 71 lens tests across 12 describe blocks.
- **Turborepo build orchestration** — cached, parallel, dependency-aware builds across the workspace; second build with no changes hits full cache.
- **Java Spring Boot server** — 10th server example, idiomatic Spring Boot 3.4 + SQLite; multi-stage Dockerfile with Maven cache mounts.
- **Docker: all 10 servers verified** — Express, Bun, Hono, Flask, Django, FastAPI+Postgres, Laravel, Axum (Rust), Gin (Go), Spring Boot (Java); SQLite readonly fixes; pre-built library tarball pattern eliminates per-container rebuilds.
- **Language port parity** — Rust and Go now match PHP/Python/Java on all 13 `AlapLink` fields (added `hooks`, `guid`).
- **Packaging smoke test** — `pnpm test:packaging` verifies the published tarball works outside the workspace; 17 tests run in ~17s.
- **Examples gallery + walkthrough** — fresh-checkout walkthrough fixes; gallery moved to `examples/sites/` with consistent paths; `pnpm dev` serves examples directly.

## [3.0.0-beta.4] — 2026-04-02

- **Menu dismiss across all adapters** — `MenuCoordinator` (subscribe/notifyOpen) added to Vue, Svelte, and Solid; module-level singleton for Alpine. DOM adapter click-outside now binds to `document` so margin clicks dismiss correctly.
- **Client-side metadata extraction** — TTT's metadata pipeline ported to editors as a self-contained client-side module; multi-strategy (HTML scrape, oEmbed, JSON API), IndexedDB-backed site rules and snapshot dedup. 135 tests.
- **Lightbox renderer** — `src/ui-lightbox/` ships an alternate renderer presenting resolved links as a fullscreen lightbox/carousel. Same config, same engine, code-level swap.
- **Protocol source indicators** — `:web:` and `:atproto:` auto-tag every link with `cssClass` (`source_web`, `source_atproto`) and `meta.source` for visual provenance.
- **Examples consolidation** — self-contained site at `examples/sites/` with shared chunks via single Vite build; consistent dark-blue theme; web staging at `web/examples.alap.info/`.

## [3.0.0-beta.3] — 2026-03-30

First public release.

- **Published to 5 registries** — `alap` on npm (with Sigstore provenance), `alap` on crates.io, `alap-python` on PyPI, `github.com/DanielSmith/alap-go` on Go modules, `danielsmith/alap` on Packagist.
- **CI/CD** — GitHub Actions for build/test/typecheck on push/PR; tag-triggered npm publish with provenance; all actions pinned to commit SHAs.
- **Cryptographic provenance** — GPG-signed commits (ed25519, expires 2029); SHA256 hash commitment of an authorship proof file; OpenTimestamps blockchain anchor.
- **AT Protocol (`:atproto:`)** — generate handler with 5 commands (`profile`, `feed`, `people`, `thread`, `search`); AT URI parsing and "Option of Choice" destination generation; optional app-password auth for post search.
- **Integrations: VitePress, htmx, Next.js, Nuxt** — all shipped this beta with their own example sites and tests.
- **rehype-alap plugin + CMS content example** — transforms HTML from headless CMSs.

## [3.0.0-beta.1] — 2026-03-13

Initial public-facing 3.0 beta. Earlier 3.0 betas (beta.1 → beta.3)
covered the parser rewrite, expression grammar implementation,
framework adapters, and base storage layer. Detailed history is in
`git log`.
