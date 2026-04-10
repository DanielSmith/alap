# Changelog

All notable changes to Alap will be documented in this file.

## [3.1.0-dev] — 2026-04-09

### Shared code refactoring: lightbox + lens (2026-04-09)

- Extracted 5 shared modules from lightbox and lens (DOM + WC = 4 consumer files) into `src/ui/shared/`:
  - `overlayKeyboard.ts` — Escape/Arrow key dispatch for overlay components
  - `overlayTransition.ts` — fadeIn/fadeOut with reflow trick and transitionend cleanup
  - `imageZoom.ts` — full-viewport image zoom overlay with click/Escape dismiss
  - `setNavigator.ts` — counter display + filterable popup list for set navigation
  - `overlayPlacement.ts` — compass-direction → flexbox alignment maps for viewport placement
- CSS transition helpers (`cssTransition.ts`) evaluated and intentionally kept inline — lightbox and lens transition logic differs enough to not benefit from extraction
- All shared modules support both `document.body` (DOM) and `ShadowRoot` (WC) via `Node`-typed container parameters
- Set navigator factory accepts configurable CSS class names, `::part()` attributes, hover hint style (`'swap'` vs `'crossfade'`), and shadow DOM `activeElement` callback

### Lightbox placement parity (2026-04-09)

- `AlapLightbox` (DOM) now accepts `placement` option and `setPlacement()` method for viewport positioning
- `AlapLightboxElement` (WC) now accepts `placement` attribute — same compass directions as lens (N/NE/E/SE/S/SW/W/NW/C)
- Both use shared `OVERLAY_ALIGN`/`OVERLAY_JUSTIFY` maps from `overlayPlacement.ts`
- Previously placement was lens-only; now all overlay components support it

### Lens web component (2026-04-09)

- New `<alap-lens>` custom element (`src/ui-lens/AlapLensElement.ts`)
  - Shadow DOM with fully tokenized CSS (~50 custom properties, `--alap-lens-*`)
  - `::part()` on all meaningful elements for full layout rearrangement via CSS `order`
  - Parts: overlay, panel, close-x, image-wrap, image, title-row, label, credit, tags, description, meta, actions, visit, close-btn, nav, nav-prev, nav-next, counter-wrap, counter, setnav, setnav-filter, zoom-overlay
  - Attribute-driven configuration: `query`, `config`, `placement`, `transition`, `copyable`, `panel-close-button`, `visit-label`, `close-label`, `tag-switch-tooltip`
  - Full feature parity with DOM lens: set navigator, image zoom, clickable tags, tag switch tooltip, photographer credits, copy-to-clipboard, fade/resize/none transitions
  - Portrait image detection: `object-fit: contain` when `naturalHeight > naturalWidth`
  - Implements `CoordinatedRenderer` interface
- 52 new tests (`tests/ui/lens/alap-lens-element.test.ts`): registration, shadow DOM, ARIA, overlay lifecycle, dismissal, content rendering, meta fields, navigation, `::part()` exposure, attribute options, cleanup, security
- New example site (`examples/sites/lens-wc/`) with basic usage and WC-specific demos
- `defineAlapLens()` helper exported from `src/index.ts`

### Cross-component naming consistency (2026-04-09)

- Aligned internal CSS class names, `::part()` names, and CSS custom properties across menu, lightbox, and lens
- **Lightbox:** `card` → `panel`, `title` → `label`, `title-row` → `label-row`
  - CSS classes: `alap-lightbox-card` → `alap-lightbox-panel`, `alap-lightbox-title` → `alap-lightbox-label`, `alap-lightbox-title-row` → `alap-lightbox-label-row`
  - WC parts: `card` → `panel`, `title` → `label`, `title-row` → `label-row`
  - CSS custom properties: `--alap-lightbox-title-*` → `--alap-lightbox-label-*`
- **Lens:** `thumb-wrap` → `image-wrap`, `thumbnail` (class) → `image`
  - CSS classes: `alap-lens-thumb-wrap` → `alap-lens-image-wrap`, `alap-lens-thumbnail` → `alap-lens-image`
  - WC parts: `thumb-wrap` → `image-wrap`, `thumbnail` → `image`
  - CSS custom properties: `--alap-lens-thumb-*` → `--alap-lens-image-*`
- Config fields (`label`, `image`, `thumbnail`) unchanged — this only affects internal DOM/CSS naming
- All tests, examples, and documentation updated

### Lens example data: Pokemon + NASA APOD (2026-04-09)

- Added 4 Pokemon items (Charizard, Eevee, Snorlax, Gengar) with full stats, types, abilities from PokeAPI
- Added 5 NASA APOD items (NGC 1232, NGC 1398, Seahorse Nebula, Geminids, Comet 12P) with credits and HD URLs
- Pokemon artwork served locally from `shared/img/pokemon/` (GitHub raw content rate-limits)
- New macros: `gen1`, `apod`; updated `everything` to include `.pokemon, .nasa`
- New lens example sections: Pokemon (by type), NASA APOD (by category)

### Known issue: meta overflow (2026-04-09)

- Items with many meta fields (15+) push Visit button and nav controls below the viewport
- Confirmed with full Pokemon stats vs trimmed "charizard_lite" (2 fields fits perfectly)
- Planned fix: drawer slide toggle on title row to reclaim vertical space

## [3.1.0-dev] — 2026-04-08

### Lens: clickable tags and tag drill-down (2026-04-08)

- Tag chips in the lens are now interactive — click any tag to resolve `.tagname` and swap the entire item set
- Active tag highlighted with blue tint (`.active` class) across all items in the drilled set
- "switching to .tagname" tooltip shown on the counter for configurable duration (default 3s, blue, `0` to disable)
- Counter text transitions smoothly between states (500ms ease-in-out, `--alap-lens-counter-transition`)
- Tag hover: brighter color with 0.5s fade in/out transition
- New CSS custom properties: `--alap-lens-tag-tooltip-color`, `--alap-lens-tag-tooltip-size`, `--alap-lens-tag-tooltip-weight`, `--alap-lens-counter-transition`

### Lens: photographer credits (2026-04-08)

- Photo credit displayed on the title row (same line as the label, pushed right)
- Reads `meta.photoCredit` (text) and `meta.photoCreditUrl` (clickable link)
- Same pattern as the lightbox credit — no wasted vertical space
- New CSS classes: `.alap-lens-title-row`, `.alap-lens-credit`

### Lens: UI refinements (2026-04-08)

- Actions Close button is now opt-in via `panelCloseButton: false` (default). X button, click-outside, and Escape still work.
- Copy-to-clipboard button moved to the tags row (right side, `margin-left: auto`), appears on panel hover
- New option: `tagSwitchTooltip` (ms) — controls duration of "switching to .tag" counter tooltip, `0` to disable

### Lens: expanded example config (2026-04-08)

- Grew lens example from 8 items to 37 items across 16 cities worldwide
- All city items use shared images from `shared/img/` with photographer credits
- New HTML sections: By City (16 city links), Expressions (intersection, subtraction, union), Coffee
- Added `@everything` macro spanning all tags

### Lens: documentation (2026-04-08)

- New cookbook page: `docs/cookbook/lens.md` — options, clickable tags, set navigator, image zoom, transitions, CSS custom properties, meta auto-detection, CoordinatedRenderer usage
- Added to docs index and cookbook README

### Lightbox set navigator (2026-04-08)

- Counter indicator (e.g. "1 / 5") now doubles as a navigation menu trigger
  - Hover over counter → text swaps to "menu..." as a hint
  - Click counter → popup menu opens showing all items in the current set
  - Current item highlighted with `.active` class
  - Click any item → lightbox jumps directly to that item
  - Escape dismisses the popup without closing the lightbox
- Type-to-filter: typing while the menu is open auto-focuses a filter input
  - Greedy regex matching against item labels
  - Clear button to reset the filter
  - Filter is fixed below the list so it stays in a consistent position
- Keyboard navigation in the set navigator
  - Arrow Up/Down moves highlight through visible items
  - Enter jumps to the highlighted item (or the sole visible item if only one match)
  - Escape closes the menu
- All set navigator CSS values tokenized with custom properties (`--alap-lightbox-setnav-*`)

### Lightbox image zoom (2026-04-08)

- Click any lightbox image thumbnail to open a full-size zoom popup
  - Image displayed at natural size, capped at 95vw x 95vh
  - No border — floating image with deep shadow for depth
  - Cursor changes to `zoom-in` on thumbnail, `zoom-out` on zoomed image
- Dismiss by clicking anywhere or pressing Escape
- Proper Escape stacking: first Escape closes zoom, second closes lightbox
- Fade in/out transition (0.2s)

### Lightbox and lens fade transitions (2026-04-08)

- Overlay fade in on open (opacity 0 → 1 via CSS transition)
- Overlay fade out on close with `transitionend` listener
- Graceful fallback: checks `transitionDuration` — removes immediately if no transitions (e.g. JSDOM tests)
- Applied to both `AlapLightbox` and `AlapLens` DOM renderers

### Shared config registry (2026-04-08)

- Extracted config registry from `AlapLinkElement.ts` into `src/ui/shared/configRegistry.ts`
- All web components (`<alap-link>`, `<alap-lightbox>`) share one registry via `registerConfig()`, `getEngine()`, `getConfig()`
- Re-exported from `src/ui/shared/index.ts` and `src/index.ts`

### Lightbox web component (2026-04-08)

- New `<alap-lightbox>` custom element (`src/ui-lightbox/AlapLightboxElement.ts`)
  - Shadow DOM with tokenized CSS (~40 custom properties)
  - `::part()` on all meaningful elements for full layout rearrangement via CSS `order`
  - Parts: overlay, close-x, card, image-wrap, image, body, title-row, title, credit, description, visit, close-btn, counter, nav-prev, nav-next
  - Fade in/out transitions, `justClosed` flag to prevent close-then-reopen race
  - Implements `CoordinatedRenderer` interface
- New example page (`examples/sites/lightbox-wc/`) with basic usage, `::part()` theming, and layout rearrangement demos

### Expanded lightbox example config (2026-04-08)

- Grew link library from 10 to 37 items across 14 cities worldwide
- Cities: NYC, SF, Portland, Chicago, Detroit, LA, London, Paris, Berlin, Seattle, Tokyo, Seoul, Melbourne, Shanghai, Mumbai
- Categories: bridges, parks, landmarks, coffee, sci-fi TV, games
- 30 Unsplash-sourced images with photographer credits
- All images resized to max 1200px for reasonable file sizes
- New HTML sections: Sci-fi, Games, Parks, Everything (full collection), per-city landmark links

## [3.0.0] — 2026-04-07

### AlapLens: tests and transitions (2026-04-07)

- 71 tests for AlapLens across 12 describe blocks: trigger setup, overlay lifecycle, dismissal, top zone rendering, meta field type detection, meta field filtering, display hint overrides, meta key formatting, actions zone, custom options, navigation, copy to clipboard, expression resolution, destroy
- New test fixture (`tests/fixtures/lens-links.ts`) with 11 items exercising every meta data shape: numbers, booleans, strings, string arrays, URL arrays, display hints, internal keys, null/empty values, URL-less items
- Navigation transition option: `transition: 'fade' | 'resize' | 'none'`
  - `fade` (default): lightbox-style opacity crossfade, no reflow
  - `resize`: TTT-style animated height via `scrollHeight` measurement + `requestAnimationFrame`
  - `none`: instant swap
- 9 transition-specific tests (fade class toggling, async content swap, transition blocking, resize height locking, none mode synchronous behavior)
- New CSS tokens: `--alap-lens-resize-transition`, panel height transition, `.alap-lens-panel-fading` content opacity rules

### RendererCoordinator: cross-renderer transitions (2026-04-07)

- New `RendererCoordinator` class (`src/ui/shared/rendererCoordinator.ts`) orchestrates transitions between AlapUI, AlapLightbox, and AlapLens
  - `register()` / `unregister()` — renderers opt in
  - `transitionTo(target, payload)` — snapshot current state, push stack, close current, open target
  - `back()` — pop stack, restore previous renderer with original links and index
  - `closeAll()` — close everything, clear stack
  - Capture-phase Escape key intercept via `bindKeyboard()` — walks the stack backward
  - View Transitions API integration: wraps close→open in `startViewTransition()` when available, instant swap fallback
  - `prefers-reduced-motion` respected automatically
- New `CoordinatedRenderer` interface (`src/ui/shared/coordinatedRenderer.ts`) — minimal contract: `rendererType`, `isOpen`, `openWith(payload)`, `close()`
- All three renderers now implement `CoordinatedRenderer`:
  - `AlapUI`: new public `close()` (returns trigger), `openWith(payload)`, `isOpen` getter
  - `AlapLightbox`: new `openWith(payload)`, `isOpen` getter, `close()` now returns trigger
  - `AlapLens`: new `openWith(payload)`, `isOpen` getter, `close()` now returns trigger
- New CSS for View Transitions (`src/ui/shared/rendererTransitions.css`): shared-element morphing for content + thumbnail, forward/back keyframe animations, reduced-motion override
- 34 new tests: 17 coordinator unit tests with mock renderers, 17 integration tests with real renderers including a full menu→lens→back→menu round-trip
- Exported from `src/index.ts`: `RendererCoordinator`, `CoordinatedRenderer`, `OpenPayload`, `RendererType`, renderer type constants

## [3.0.0] — 2026-04-06

### Fresh-checkout walkthrough fixes (2026-04-06)

- Fixed `pnpm dev` — now serves from `examples/sites/` with explicit `--config vite.config.ts` so aliases resolve correctly
- Moved examples gallery (`index.html`, `styles.css`) from `examples/` to `examples/sites/` so CSS paths (`/shared/styles.css`) resolve without breakage
- Updated gallery links from `./sites/<name>/` to `./<name>/`
- Added copy-to-clipboard buttons for standalone server commands in the examples gallery (Eleventy, Astro, Hugo, VitePress)
- Fixed Solid examples rendering blank — expanded `vite-plugin-solid` include to cover `examples/sites/solid/` and `examples/sites/ui-sandbox/solid/`
- Fixed Laravel Dockerfile — added `mkdir -p bootstrap/cache` and `.gitkeep` so artisan runs on fresh checkout
- Fixed Java Spring Boot demo page — title/heading said "flask-sqlite" instead of "java-spring"
- Added Java Spring Boot Dockerfile build feedback — echo after JAR build, comment about JRE image download delay
- Added FastAPI build command to README Docker section (was missing from the 10-server list)
- Added `podman images | grep alap-` to README for listing built servers
- Added `podman run`, `podman stop`, `podman rm` examples to README as separate commands
- Added override warnings note to START-Dev.md Development section
- New `scripts/clean-all.sh` — removes all `node_modules`, `dist`, `dist-tgz`, `.turbo` dirs, prunes pnpm store, removes only `alap-*` Podman containers/images. Dry run by default, `--force` to execute
- Updated examples/sites/README.md — documented that Eleventy, Astro, Hugo, and VitePress need their own servers with copy-pasteable commands
- Updated README: date to April 2026, test count to 992, examples link to `examples/sites/`

## [3.0.0] — 2026-04-05

### Turborepo build orchestration (2026-04-05)

- Added Turborepo for cached, parallel, dependency-aware builds across all workspace packages
- New `turbo.json` defines task pipeline: `build`, `test`, `typecheck`, `dev`, `start`
- Root library builds first (`//#build`), then workspace packages build in parallel
- Second build with no changes hits full cache (~600ms vs ~45s)
- New scripts: `build:all`, `test:all`, `typecheck:all` run tasks across entire workspace
- New scripts: `pack:lib` produces pre-built tarball for Docker, `docker:express`, `docker:bun`, `docker:hono`
- Fixed tiptap example: CSS `@import '/shared/...'` absolute paths changed to relative `'../shared/...'`

### Docker: pre-built tarball for Node servers (2026-04-05)

- Node server Dockerfiles (Express, Hono, Bun) rewritten as single-stage builds
- Library is now pre-built outside Docker via `pnpm run pack:lib` — Dockerfiles just COPY the tarball
- Eliminates the duplicated Stage 1 that rebuilt the entire library from source inside each container
- Server container builds drop from minutes to seconds

### Java Spring Boot server example (2026-04-05)

- New `examples/servers/java-spring/` — Spring Boot 3.4 + SQLite config server
- Uses the existing Java 21 expression parser from `src/other-languages/java/alap/`
- Full 7-endpoint REST API: list, load, save, delete, search, cherry-pick, query
- Idiomatic Spring Boot: `@RestController`, `@Service`/`@Repository` layers, `JdbcTemplate`, `CommandLineRunner` seeder, records for DTOs
- Multi-stage Dockerfile with Maven cache mounts for fast rebuilds
- Package: `info.alap.server`

### Docker: all 10 servers verified (2026-04-05)

- All 10 server examples build and run: Express, Bun, Hono, Flask, Django, FastAPI+Postgres, Laravel, Axum (Rust), Gin (Go), Spring Boot (Java)
- Fixed SQLite readonly errors in Express, Hono, Axum, Gin Dockerfiles (`chown -R` on /app before dropping to non-root user)
- Fixed Go server: `alap.Resolve()` and `alap.CherryPick()` updated for new `context.Context` parameter
- Go Dockerfile restructured: dependency manifests copied first, cache mounts for Go module and build caches
- Added `examples/servers/.dockerignore` to exclude workspace symlinks from Python/Go build contexts

### Packaging smoke test (2026-04-05)

- New `pnpm test:packaging` — 17 tests verifying the published tarball works outside the workspace
- Tests: package contents, ESM/CJS imports, IIFE build, type declarations, AlapEngine functional tests
- Separate from `pnpm test` (runs in ~17s, packs and installs the library in a temp directory)

### Language port parity (2026-04-04)

- Added `hooks` and `guid` fields to Rust `Link` struct and `validate_config` whitelist/extraction
- Added `hooks` and `guid` fields to Go `Link` struct and `ValidateConfig` whitelist/extraction
- Both ports now match PHP, Python, and Java on all 13 `AlapLink` fields
- 7 new tests: 4 Rust (`preserves_hooks_and_guid`, `filters_non_string_hooks`, `hooks_none_when_not_provided`, `hooks_none_when_empty_array`) and 3 Go (`TestValidateConfigPreservesHooksAndGuid`, `TestValidateConfigFiltersNonStringHooks`, `TestValidateConfigHooksNilWhenAbsent`)

### Examples quality pass (2026-04-04)

- Tailwind example: menu CSS now uses actual Tailwind design tokens (amber-50, green-50, slate-800, indigo-50) instead of the default blue palette — each per-anchor theme is visually distinct
- Placement example: added missing `.strategy-table` CSS using `var()` custom properties
- External data example: removed broken `:echo:` protocol section (generate protocols require pre-resolution; the demo was non-functional)
- Examples build: entry discovery now goes two levels deep, fixing missing ui-sandbox and placement subdirectories
- Solid plugin `include` expanded to cover `ui-sandbox/solid/` (was rendering blank)

### Live Alap menus in docs (2026-04-04)

- Added interactive "Try it" blocks with `<alap-link>` to 5 doc pages: Getting Started overview, Core Concepts overview, Expressions, Macros, Search Patterns
- Uses web component directly in markdown — degrades to plain text on GitHub, becomes interactive on docs.alap.info
- VitePress wiring already in place: IIFE bundle, docs-config.js, custom element compiler option, dark-mode menu CSS

## [3.0.0-beta.4] — 2026-04-02

### Fix: Menu dismiss across all adapters (2026-04-01)

- Vue, Svelte, Solid, and Alpine adapters now close the previous menu when a new one opens
- Added `MenuCoordinator` (subscribe/notifyOpen pattern) to Vue, Svelte, and Solid, matching the existing React implementation
- Alpine uses a module-level singleton coordinator (no provider to scope to)
- DOM adapter (`AlapUI`): click-outside dismiss now uses `document` instead of `document.body` — clicks in the page margin outside the content area now correctly close the menu
- Affected files: `src/ui/vue/`, `src/ui/svelte/`, `src/ui/solid/`, `src/ui/alpine/`, `src/ui/dom/AlapUI.ts`

### Client-side metadata extraction for editors (2026-04-01)

- Ported TTT's metadata extraction pipeline to Alap editors as a self-contained client-side module
- Multi-strategy support: html_scrape, oEmbed (YouTube, Vimeo, Spotify, TikTok, Twitter/X), JSON API (Reddit)
- IndexedDB stores for site rules (seeded with 9 domains) and metadata snapshots (checksum dedup)
- Replaces ad-hoc `fetch('/api/meta')` + inline tag normalization in all 8 editors
- 135 tests ported from TTT covering meta-rules, fetch-strategy, and html-scrape
- New files in `editors/shared/meta/`: meta-rules, fetch-strategy, html-scrape, seed-rules, meta-store, meta-client

### Protocol source indicators (2026-04-01)

- `:web:` and `:atproto:` handlers now auto-tag every link with `cssClass` (`source_web`, `source_atproto`) and `meta.source`
- Enables visual provenance in mixed-source menus (colored left borders, tooltips via hooks)
- Static `allLinks` items carry no source class — clean default
- Documented in `docs/core-concepts/protocols.md`

### Examples site consolidation (2026-04-01)

- Self-contained examples site at `examples/sites/` with own `vite.config.ts` and `package.json`
- Single multi-entry Vite build: shared chunks, one copy of Alap/frameworks across all examples
- Shared CSS base at `shared/styles.css` (dark blue theme) and `shared/styles-wc.css` (WC custom properties)
- Gallery index at `index.html` with named window navigation (`alapDemo` / `alapDemoExample`)
- All examples updated to consistent blue theme
- Advanced CSS examples (DOM + WC) remapped from slate to blue palette
- CDN and htmx: self-contained static files copied post-build (IIFE scripts, HTML fragments)
- CMS content (rehype), markdown (remark), tiptap examples now included in the build
- htmx: removed cars tab, rethemed to blue
- next.js: rethemed to blue
- cms-content: rethemed to blue with dark panels
- Local images in `shared/img/` replace Wikipedia hotlinks
- GitHub repos and JSONPlaceholder added as fallback `:web:` APIs
- Web staging at `web/examples.alap.info/` — builds from repo source, copies dist for Cloudflare
- 84 files, 2.3MB production build

### Lightbox Renderer (2026-03-31)

- Alternate renderer in `src/ui-lightbox/` — presents resolved links as a fullscreen lightbox/carousel instead of a dropdown menu
- Same config, same expression engine — renderer is a code-level swap (`AlapLightbox` instead of `AlapUI`)
- Photo credit support via `meta.photoCredit` and `meta.photoCreditUrl`
- CSS custom property `--alap-lightbox-transition` controls fade duration
- Example at `examples/sites/lightbox/` with side-by-side lightbox and menu renderers using identical config (an easter egg)

### Hugo Example Improvements (2026-03-31)

- Reworked coffee data: distinct regional groups (SF, NYC, Portland, Seattle, Sonoma) with no single-item menus
- Renamed Food section to Coffee
- Fixed Hugo shortcode escape syntax across all content pages
- Added expressions reference section to Coffee page

## [3.0.0-beta.3] — 2026-03-30

### Published to Five Package Registries (2026-03-30)

First public release of Alap v3 across all target ecosystems.

| Registry | Package | Version |
|----------|---------|---------|
| npm | `alap` | 3.0.0-beta.3 |
| crates.io | `alap` | 0.1.0 |
| PyPI | `alap-python` | 0.1.1 |
| Go modules | `github.com/DanielSmith/alap-go` | v0.1.0 |
| Packagist | `danielsmith/alap` | dev-main |

**npm provenance:** Published with Sigstore OIDC provenance — green badge on npmjs.com linking to exact source commit, build workflow, and transparency log entry.

### CI/CD Workflows (2026-03-30)

- `.github/workflows/ci.yml` — build, test, typecheck on every push to `main` and PR
- `.github/workflows/release.yml` — tag-triggered npm publish with provenance + GitHub Release
- `prepublishOnly` script added as safety net (build + test before any publish)
- All GitHub Actions pinned to commit SHAs

### Cryptographic Provenance Protection (2026-03-30)

- GPG key (ed25519, expires 2029) — all commits signed, "Verified" badge on GitHub
- `docs/provenance/PROVENANCE.txt` — SHA256 hash commitment of private authorship proof file
- `docs/provenance/PROVENANCE.txt.ots` — OpenTimestamps blockchain anchor
- `docs/provenance/GPG-PUBLIC-KEY.asc` — public key for independent signature verification

### Rust Crate Rename (2026-03-30)

- Renamed crate from `alap_core` to `alap` in `Cargo.toml` and all test imports
- Updated `examples/servers/axum-sqlite/Cargo.toml` dependency reference
- Fixed Go version in security audit workflow (1.22 → 1.25)

### VitePress Integration (2026-03-30)

`vitepress-alap` — Vite plugin for VitePress documentation sites. Registers `<alap-link>` as a Vue custom element so the template compiler passes it through.

- `alapPlugin()` — tells Vue that `<alap-link>` is a custom element (not a component)
- Option A (IIFE + public scripts) works now; Option B (bundled config injection) planned for next beta
- VitePress example site at `examples/sites/vitepress/` with tags, operators, macros, direct IDs
- Dark mode CSS theme matching the docs site
- Added to all integration lists: README, docs, FAQ, framework guides, installation, START-Dev

### AT Protocol Integration (2026-03-29)

`:atproto:` — a new generate protocol handler for fetching data from the AT Protocol network (Bluesky). Profiles, author feeds, people search, post thread resolution, and authenticated post search — all mapped to AlapLink objects and composable with static allLinks data in the same expression grammar.

**Protocol handler (`src/protocols/atproto.ts`):**
- `atprotoHandler` — generate handler with 5 commands: `profile`, `feed`, `people`, `thread`, `search`
- `parseAtUri()` — parse `at://` URIs into typed components (authority, collection, rkey)
- `atUriToDestinations()` — generate Option of Choice links for any AT URI (bsky.app, pdsls.dev, raw JSON)
- Named search aliases via `searches` config — multi-word queries that can't appear directly in expressions
- Auth plumbing: optional `accessJwt` in protocol config for post search (read-only, never stored)
- Safety: timeout, response size limits, content-type validation, hardcoded origin (mirrors `:web:`)
- CORS-aware: unauthenticated requests → `public.api.bsky.app`, authenticated → `bsky.social` PDS

**Example (`examples/sites/bluesky-atproto/`, port 9170):**
- Static allLinks: 50+ entries across 19 accounts (orgs, news, tech, individuals) with Option of Choice per profile/post
- Dynamic `:atproto:` protocol: live profiles, author feeds, people search, post search
- Composition demos: static tags blended with live API results in one expression
- Optional app password login with 2FA email code flow
- Session persistence via opt-in "Remember me" checkbox (sessionStorage)
- Custom search input with sanitized user queries
- Collapsible source blocks showing actual anchor tags, full config.ts loaded at runtime
- Second page (`combined.html`): three sources in one expression — static allLinks + `:web:` (Open Library) + `:atproto:` (Bluesky), shared login session

**Exports added to public API:**
- `atprotoHandler`, `parseAtUri`, `atUriToDestinations` (functions)
- `AtUri` (type)

**Tests (`tests/core/tier25-atproto-protocol.test.ts`):**
- 48 tests covering AT URI parsing, destination generation, all 5 commands, search alias resolution, auth/no-auth paths, error handling, and security (credentials omission, origin routing, content-type/size rejection, XSS in display names, token leakage, domain allowlisting, abort timeout)

### Nuxt Integration (2026-03-28)

`nuxt-alap` — Nuxt 3 integration. Client plugin factory, Vue component re-exports, and Nuxt Content markdown support.

**Package (`nuxt-alap`) — `integrations/nuxt-alap/`:**
- `createAlapPlugin()` — factory for a Nuxt client plugin (`.client.ts` pattern). Registers config and web component via dynamic import (SSR-safe).
- `AlapProvider`, `AlapLink`, `useAlap` re-exported from `alap/vue`
- `withAlap()` — Nuxt config wrapper that adds `remark-alap` to Nuxt Content's markdown pipeline
- 17 tests covering exports, plugin factory, config wrapper, immutability, and security

### htmx Example (2026-03-28)

Zero-framework example showing Alap with htmx — HTML fragments swap in via `hx-get`, and `<alap-link>` web components self-initialize after every swap. No build step, no bundler, no hydration.

**Example (`examples/sites/htmx/`, port 9220):**
- Tabbed page with 4 content fragments fetched via htmx
- Fragments contain `<alap-link>` with tag queries, macros, intersections, and subtractions
- Web component auto-registers via the custom element registry — no re-init needed
- Static files only — served by Python's built-in HTTP server
- Demonstrates Alap working in the "HTML over the wire" paradigm

### Next.js Integration (2026-03-28)

`next-alap` — Next.js App Router integration. Pre-wrapped `'use client'` components, a layout helper, and an optional MDX config wrapper. No webpack — Vite only.

**Package (`next-alap`) — `integrations/next-alap/`:**
- `AlapProvider`, `AlapLink`, `useAlap` re-exported with `'use client'` directive — server components import directly, no boundary errors
- `AlapLayout` — drop-in layout component for `app/layout.tsx`. Wraps `AlapProvider` and optionally registers `<alap-link>` web component for MDX content
- `withAlap()` — Next.js config wrapper for MDX integration (disables `mdxRs` so remark plugins work)
- Dynamic `import('alap')` in `AlapLayout` avoids `HTMLElement` crash during SSR
- 15 tests covering exports, config wrapper behavior, immutability, and security (no webpack, no eval, no header injection)

**Example (`examples/sites/next/`, port 9210):**
- Simulated App Router with three pages: React adapter, `useAlap()` hook, web component mode
- Shows the layout pattern, programmatic queries, and mixed React + web component usage

### rehype-alap Plugin and CMS Content Example (2026-03-28)

Rehype plugin for transforming HTML from headless CMSs into Alap web components. Companion to `remark-alap` (which handles Markdown).

**Plugin (`rehype-alap`) — `plugins/rehype-alap/`:**
- Transforms `<a href="alap:.coffee">` → `<alap-link query=".coffee">` in HTML AST
- Designed for content from headless CMSs (Contentful, Sanity, Strapi, WordPress REST API, Ghost) where authors use WYSIWYG editors
- AST-based transformation via `unist-util-visit` on hast (HTML AST) — structurally prevents injection
- Preserves children, class, id, data attributes from original anchors
- Options: `tagName`, `queryAttr`, `className` (same pattern as remark-alap)
- Idempotent — running twice produces same output as once
- 29 tests covering transforms, edge cases, attribute handling, and security

**Interactive example (`examples/sites/cms-content/`):**
- Three-panel live editor: raw CMS HTML → transformed HTML → working Alap preview
- rehype runs in the browser (pure JS) — transforms on every keystroke (debounced)
- `rehype-sanitize` in the pipeline strips dangerous elements from user input
- Pre-filled with realistic CMS blog content demonstrating tag queries, macros, and direct items
- Config panel shows the link library for reference

### Qwik Adapter and Qwik City Integration (2026-03-28)

Framework adapter for Qwik — the resumability-first framework. Alap's query state is already serialized into HTML attributes, so the engine, parser, and placement logic are only downloaded when the user actually interacts with a link. Zero JS until click.

**Adapter (`alap/qwik`) — `src/ui/qwik/`:**
- `AlapProvider` — context provider using `component$()`, `useContextProvider`, and `noSerialize` for the engine (non-serializable by design — only needed client-side)
- `AlapLink` — component with `$()` lazy boundaries on all event handlers. Click/hover/keyboard handlers download on demand, not at page load.
- `useAlap()` — hook returning `query()`, `resolve()`, `getLinks()` from context
- Full feature parity with other adapters: compass placement, popover mode, keyboard nav, auto-dismiss timer, click-outside/escape dismissal, scroll-away detection, event hooks
- `useVisibleTask$` for browser-only effects (no SSR side effects)
- Props follow Qwik convention: `onTriggerHover$`, `onItemContext$` (QRL callbacks)

**Integration (`qwik-alap`) — `integrations/qwik-alap/`:**
- Vite plugin for Qwik City projects
- `transformIndexHtml` hook injects web component registration and config loading
- Options: `config`, `configName`, `validate`, `injectStyles` (same shape as `astro-alap`)
- Optional default stylesheet with light/dark mode
- Build-time config validation via dynamic `import('alap/core')`

**Build:**
- `tsconfig.qwik.json` — separate TypeScript config with `jsxImportSource: @builder.io/qwik` (same pattern as `tsconfig.solid.json`)
- Added to `vite.config.ts` — entry, alias, external
- Added to `package.json` — `./qwik` export, `@builder.io/qwik` peer dependency (optional)

### pnpm Workspace Migration (2026-03-28)

All internal consumers of Alap now reference it via `workspace:*` instead of ad-hoc `file:` or `link:` relative paths. Every editor, integration, plugin, example, and server resolves `alap` through `node_modules` — exactly as an end user would after `pnpm add alap`.

**Created:**
- `pnpm-workspace.yaml` — 21 workspace projects (root + 20 consumers)

**Updated (15 package.json files):**
- 8 editors: `"alap": "file:../../"` → `"alap": "workspace:*"`
- 2 integrations: devDep `"alap": "link:../../"` / `"file:../../"` → `"alap": "workspace:*"`
- 1 plugin (mdx): devDep → `"workspace:*"`
- 2 example sites (eleventy, tiptap): `"alap": "file:../../.."` → `"workspace:*"`, cross-references too
- 3 example servers: `"alap": "file:../../.."` → `"workspace:*"`

**Verification script — `scripts/smoke-examples.sh` (new):**
- Builds all 16 Vite-based examples against `dist/` with no source aliases
- Creates a temporary vite config without alap aliases — examples must resolve from `node_modules`
- Catches import issues that dev mode (Vite aliases → source) would mask

### WordPress Plugin — SQLite (2026-03-28)

Both WordPress container options now use SQLite via the WP Performance Team's SQLite Database Integration plugin. No MySQL or MariaDB — single container each.

**Option B (fresh install) — `plugins/wordpress/`:**
- Rewritten `Dockerfile` — downloads SQLite plugin at build time, installs to `/usr/src/wordpress/` (WordPress entrypoint copies to `wp-content/` at start)
- Rewritten `docker-compose.yml` — single service, port 8080, no `db` service
- Rewritten `run.sh` — asks about persistence (`[y/N]`), ephemeral by default
- New `docker-compose.persist.yml` — volume override for persistence opt-in
- New `seed/wp-config.php` — SQLite-aware config with `DB_DIR`, `DB_FILE` defines

**Option A (instant demo) — `plugins/wordpress/demo/`:**
- `Dockerfile` — pre-seeded SQLite database, instant boot
- `docker-compose.yml` — single service, port 8090
- `run.sh` — "Alap demo running at http://localhost:8090", admin demo/demo
- `seed/wp-config.php` — demo-specific config (locked down, demo salts)
- `seed/.ht.sqlite` — pre-seeded database (pending manual generation)

**Docs:**
- Rewritten `plugins/wordpress/README.md` — covers both options, SQLite explanation, database inspection, seed regeneration steps

### New Constants (2026-03-28)

Added shared constants to reduce hardwired values across adapters:

- `DEFAULT_MENU_Z_INDEX` (10) — z-index for menu containers
- `MENU_CONTAINER_CLASS` (`'alapelem'`) — CSS class for menu containers
- `MENU_ITEM_CLASS` (`'alapListElem'`) — CSS class for menu list items
- `DEFAULT_LINK_TARGET` (`'fromAlap'`) — default target for menu item anchors

Used by the new Qwik adapter. Available for other adapters to adopt incrementally.

### Compass-Based Menu Placement Engine (2026-03-26)

Menus now use a proper placement engine instead of ad-hoc flip logic. Preferred position with smart fallback, no page scroll, full viewport containment. Replaces the previous `viewportAdjust` flip behavior.

**Core — `src/ui/shared/placement.ts` (new):**
- Pure geometry module — takes rects and viewport, returns coordinates. Zero DOM access.
- 9 compass placements: `N`, `NE`, `E`, `SE` (default), `S`, `SW`, `W`, `NW`, `C` (center)
- Smart fallback: tries opposite side first, then adjacent positions, then best-fit with clamping
- Height/width clamping with scroll when menu can't fit
- `computePlacement()` exported for framework adapters and custom use
- `FALLBACK_ORDER` map exported for transparency and testing

**New config settings** (all optional, backward-compatible):
- `placement` — preferred position, default `'SE'`
- `placementGap` — pixel gap between trigger and menu edge, default `4`
- `viewportPadding` — minimum distance from viewport edges, default `8`
- `viewportAdjust: false` still disables all placement logic

**DOM adapter (`AlapUI`):**
- Off-screen measurement technique — renders menu with `visibility: hidden; position: fixed` to get natural size without causing scroll. Eliminates the `window.scrollTo(0, scrollY)` hack.
- `overflow-x: clip` on the menu container — prevents horizontal page scroll without creating a scroll context (unlike `overflow: hidden` which can create unwanted scrollbars on the other axis)
- Per-trigger override via `data-alap-placement` attribute
- Image triggers use a synthetic 0x0 rect at click coordinates — same placement engine, same fallback
- Scroll tracking re-runs `computePlacement()` on each scroll event (pure math, fast)

**Web component (`<alap-link>`):**
- Same placement engine, results converted to host-relative offsets
- `placement` attribute for per-element override (added to observed attributes)
- Reads `--alap-gap` CSS variable for gap (with config fallback)

**Tests (27 new):**
- `tests/ui/shared/placement.test.ts` — all 9 placements, fallback near each viewport edge, clamping (height/width/both), edge cases (zero-size trigger, menu larger than viewport), FALLBACK_ORDER completeness

**Example:**
- `examples/sites/placement/` (port 9170) — compass rose grids for DOM and web component, viewport fallback demo, center/popover-style placement, inline text placement

**Docs:**
- `docs/getting-started/configuration.md` — new placement settings table with compass diagram
- `docs/api-reference/types.md` — `Placement` type, all 9 positions documented
- `docs/framework-guides/vanilla-dom.md` — positioning section rewritten around compass model
- `docs/framework-guides/web-component.md` — `placement` attribute, positioning section added
- `docs/cookbook/placement.md` (new) — full guide: 9 positions, fallback behavior, Alap config vs. raw CSS boundary
- `docs/cookbook/accessibility.md` — viewport containment section
- `docs/cookbook/images-and-media.md` — image trigger placement behavior
- `docs/FAQ.md` — mode comparison updated

### Generate Protocols and External Data (2026-03-24)

Protocols can now fetch external data from APIs — not just filter local links. The new **generate** handler type brings in non-Alap data and transforms it into links that compose with everything the expression language already has.

**Core:**
- `AlapProtocol` now supports two handler types: `filter` (predicate over existing links) and `generate` (async, returns new links from external sources)
- `AlapEngine.resolveAsync()` — pre-resolves generate protocols, then evaluates synchronously. The parser never goes async.
- `AlapEngine.preResolve()` — batch pre-resolve for UI adapters. Call once at init, menus open instantly from cache.
- `AlapEngine.clearCache()` — invalidate cached generate results
- `AlapUI.getEngine()` — access the underlying engine for `preResolve()` calls
- `ProtocolCache` — in-memory TTL cache for generate results. Per-key or per-protocol TTL override; `cache: 0` disables.
- Temp ID lifecycle: generated links are injected before parsing, cleaned up after `resolveAsync()`, or persist after `preResolve()` for UI use
- Backward compatibility: `handler` property still works as a filter (deprecated in favor of `filter`)

**Built-in `:web:` protocol:**
- Generic generate handler — config maps keys to API endpoints, handler does the rest
- `searches` — predefined search aliases so expressions stay clean (`architecture` instead of `q=urban+frank+gehry`)
- `map` — declarative field mapping from API response to AlapLink fields, with dot-path support (`author_name.0`)
- `linkBase` — URL prefix for APIs that return relative paths (e.g. Open Library's `/works/OL12345W`)
- Automatic response drilling — finds arrays in `docs`, `items`, `results`, or top-level
- Named args in expressions override search defaults: `:web:books:photography:limit=5:`

**Types:**
- `GenerateHandler` — `(segments: string[], config: AlapConfig) => Promise<AlapLink[]>`
- `WebKeyConfig` — `url`, `linkBase`, `searches`, `map`, `cache`
- `AlapProtocol` — added `filter?`, `generate?`, `cache?`, `keys?`

**Tests (37 new):**
- `tier23-generate-protocols` (22 tests) — basic generate, temp ID lifecycle, composition with filters/tags/macros, scoping with parenthesized refiners, error handling, result cap, caching, backward compat
- `tier24-web-protocol` (15 tests) — field mapping, dot paths, `linkBase`, search aliases, named arg overrides, response shapes, URL building, error handling

**Example:**
- `examples/sites/external-data/` (port 9160) — live demo with Open Library API: local-only, external-only, mixed local+external, scoped refiners in parenthesized groups

**Docs:**
- `docs/core-concepts/protocols.md` — rewritten handler contract (filter vs generate), external data section with Open Library example, search aliases, field mapping, `linkBase`, caching, mixed-mode examples with scoping
- `docs/api-reference/types.md` — `AlapProtocol`, `GenerateHandler`, `WebKeyConfig`
- `docs/api-reference/engine.md` — `resolveAsync()`, `clearCache()`

### Cross-Language Security Parity (2026-03-25)

Security hardening ported to all four language parsers (Rust, Python, PHP, Go), bringing them to parity with the TypeScript implementation. Motivated by the Trivy supply chain attack (March 2026).

**`validateConfig` — all four languages (new):**
- Validates config structure (allLinks required, must be object/map not array)
- Filters prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
- Python: also blocks dunder keys (`__class__`, `__bases__`, `__mro__`, `__subclasses__`) — prevents downstream exploits via Jinja2/logging formatters
- PHP: rejects non-array (object) input — enforces `json_decode($json, true)` to prevent PHP Object Injection
- Rejects hyphens in item IDs, macro names, tag names, search pattern keys
- Sanitizes all URLs (url, image) via existing sanitizeUrl
- Validates regex patterns via existing validateRegex
- Whitelists link fields; returns sanitized copy (never mutates input)
- Rust: `validate_config.rs` (new file); Python: added to `expression_parser.py`; PHP: added to `ExpressionParser.php`; Go: added to `alap.go`

**PHP ReDoS validation (new):**
- Full nested quantifier detection ported from TypeScript/Python — character-by-character scan detecting `(a+)+`, `(a*)*b`, `(\w+\w+)+`, etc.
- `pcre.backtrack_limit` circuit breaker (10,000) wraps regex execution as defense in depth — if the syntactic check misses an edge case, the server doesn't hang
- `PCRE_BACKTRACK_LIMIT` added as class constant alongside other resource limits

**SSRF guard — all four languages (new):**
- Blocks requests to private/reserved IP ranges, localhost, IPv4-mapped IPv6
- Rust: `ssrf_guard.rs` (manual URL parsing, bit-shift CIDR math, zero new deps); also blocks hex/octal/integer IP obfuscation (`0x7f.0.0.1`, `0177.0.0.1`, `2130706433`)
- Python: `ssrf_guard.py` (stdlib `urllib.parse` + `ipaddress` module)
- PHP: `isPrivateHost()` added to ExpressionParser (`parse_url` + `filter_var` + CIDR table)
- Go: `IsPrivateHost()` added to `alap.go` (`net/url` + `net.IPNet.Contains()`); handles Go's IPv4-mapped IPv6 quirk via `ip.To4()` conversion

**CI/CD supply chain hardening:**
- SHA-pinned all GitHub Actions (no mutable version tags) — prevents Trivy-style tag-repointing attacks
- Added `.github/dependabot.yml` for automated SHA update PRs (github-actions ecosystem, weekly)
- Added SHA-pinning enforcement to `scripts/security-audit.sh` — fails if any workflow uses mutable tags
- Extended `security-audit.yml` with parallel CI jobs for Rust, Python, PHP, Go (all SHA-pinned)
- Extended `scripts/security-audit.sh` with cross-language security test runner (Section 7)

**Tests (150+ new across four languages):**
- Rust: 23 validateConfig + 18 SSRF guard (including hex/octal/integer IP tests) = 41
- Python: 26 validateConfig + 9 validateRegex + 16 SSRF guard = 51
- PHP: 21 validateConfig + 8 validateRegex + 16 SSRF guard = 45
- Go: 17 validateConfig + 16 SSRF guard = 33

**TypeScript:**
- Added parenthesized union intersection test: `.nyc + (.coffee | .park)` (tier7-parens)

**Docs:**
- `docs/api-reference/security.md` — added cross-language security matrix, language-specific defenses, CI/CD SHA-pinning policy, known limitations (TS/Python regex circuit breaker gap)
- `docs/security-parity-plan-2026-03-25.md` — full plan document with threat model, implementation details, and future considerations (release publishing, provenance)

### Security Hardening (2026-03-25)

Comprehensive security audit and hardening of the `:web:` protocol and build tooling.

**`:web:` protocol hardening:**
- Fetch timeout — 10-second `AbortController` timeout via `WEB_FETCH_TIMEOUT_MS` constant
- Origin allowlist — `allowedOrigins` on protocol config restricts which domains `:web:` can reach
- Response size guard — rejects responses exceeding `MAX_WEB_RESPONSE_BYTES` (1 MB) via `Content-Length` check
- Content-type validation — rejects non-JSON responses before parsing (catches HTML error pages, captive portals, binary blobs)
- Credential isolation — `credentials: 'omit'` by default; per-key `credentials: true` opt-in for intranet/subscription APIs
- linkBase normalization — ensures clean URL joins (no double or missing slashes)
- SSRF guard utility — `src/protocols/ssrf-guard.ts` blocks private/reserved IP ranges for future server-side use

**Automated security tooling:**
- `scripts/security-audit.sh` — 5-step local audit: dependency scan, security tests, dangerous pattern scan, lockfile integrity, production dep count
- `.github/workflows/security-audit.yml` — CI workflow: push, PR, weekly schedule, manual dispatch
- Dangerous pattern scanner covers `eval`, `new Function`, `dangerouslySetInnerHTML`, `document.write`, `child_process`, `insertAdjacentHTML`, with `innerHTML` flagged for manual review

**Types:**
- `AlapProtocol` — added `allowedOrigins?: string[]`
- `WebKeyConfig` — added `credentials?: boolean`

**Tests (20 new, 750 total):**
- `tier24-web-protocol` — now 35 tests: added credentials (3), allowedOrigins (4), timeout (2), content-type validation (5), response size guard (3), linkBase normalization (3)

**Docs:**
- `docs/security-audit-2026-03-24.md` — comprehensive audit document: supply chain, code patterns, trust model, `:web:` protocol analysis, hardening status, privacy considerations
- `docs/api-reference/security.md` — new `:web:` protocol security section
- `docs/api-reference/types.md` — added `allowedOrigins`, `credentials`, and 3 new constants
- `docs/core-concepts/protocols.md` — updated config examples with security options

**Infrastructure:**
- `alap.info` domain configured on Cloudflare Pages with DNSSEC
- Docusaurus integration temporarily removed pending upstream `serialize-javascript` vulnerability
- Astro integration example updated to patched Astro 5.15.9+

### Server Changes (2026-03-20)

- **Added `axum-sqlite`** — Rust + Axum + rusqlite server, uses the native Rust expression parser
- **Replaced `express-mongodb` with `hono-sqlite`** — Hono is lightweight and modern; removes the 250MB MongoDB container pull and docker-compose overhead
- **Replaced `django-mysql` with `django-sqlite`** — removes the 226MB MySQL container pull and docker-compose overhead; Django's ORM makes the switch transparent
- 9 servers total: Express, Hono, Bun, Flask, Django, FastAPI, Laravel, Gin, Axum — only `fastapi-postgres` requires docker-compose
- Fixed Dockerfile build contexts — all servers that import from `shared/` now build from `servers/` as context
- Added `podman-test.sh` — verbose from-scratch build/run/health-check for all 9 servers
- Added container prerequisites note (macOS: `podman machine start` / Docker Desktop)
- Updated all references across docs, READMEs, smoke-test.sh, openapi.yaml, security plan, status, plan, known-limitations, explainers

### Docs Sync Pass (2026-03-19)

- Updated `docs/plan.md`, `docs/status.md`, `docs/core.md`, `docs/architecture.md`, `docs/editors.md`, `docs/ui.md`, `docs/FAQ.md`, `docs/tests-confidence.md` to reflect current project state
- Added Other Language Ports section to plan, status, and tests-confidence (Python 39 + PHP 35 + Go 35 + Rust 35 = 144 tests)
- Fixed stale test counts (core: 134→251, smoke: 8→10 assertions, servers: 7→8)
- Fixed broken API reference links in cookbooks (pointed to old monolithic `api.md`, now point to split `api-*.md` files)
- Updated `docs/future/beta-checklist.md` — added API Reference section, gin-sqlite, other-language READMEs, split advanced-css examples, removed stale editor entries
- Updated `docs/future/distribution.md` — added Python/PyPI, PHP/Packagist, Go/pkg.go.dev, Rust/crates.io publish flows, versioning strategy, repo strategy
- Updated `examples/servers/smoke-test.sh` references from 7→8 servers
- Updated explainer `servers-and-storage.md` — 7→8 servers, removed stale 501 caveat
- Added `editors/README.md` — top-level index of all 8 editor implementations
- Added `src/other-languages/rust/target/` to `.gitignore`
- Updated `src/other-languages/README.md` to include Rust
- Cookbook fixes: broken pipe in table cell, stale bridge example, clarified link health checking as custom endpoint, expanded multi-language recipe, updated query tester description, added macros to editor overview

### Servers: Full Expression Resolution in All 8 Servers + Go Server (2026-03-19)

All servers now fully support cherry-pick and query endpoints — no more 501 stubs. Added Go + Gin server as the 8th implementation.

**Expression parser ports** (`src/other-languages/`):
- **Python** — full recursive descent parser with macro expansion, parenthesized grouping, regex search, config merging
- **PHP** — same feature set, standalone class with `Alap\ExpressionParser` namespace
- **Go** — single-file `alap.go` package, compiled language option with strong typing

**New server: Gin + SQLite** (`examples/servers/gin-sqlite/`):
- Go + Gin framework with pure-Go SQLite driver (`modernc.org/sqlite`, no CGO)
- All 7 endpoints fully functional using the native Go expression parser
- Self-contained: no external database, single binary

**URL sanitization — all 8 servers:**
- Cherry-pick and query responses now sanitize URLs to block `javascript:`, `data:`, `vbscript:`, and `blob:` schemes
- Applied consistently across all servers (Express, MongoDB, Bun, Flask, FastAPI, Django, Laravel, Gin)

**Test suites:**
- Python: 39 pytest tests (operands, commas, operators, chaining, macros, parentheses, edge cases, URL sanitization)
- PHP: 35 PHPUnit tests (same coverage)
- Go: 35 `go test` tests (same coverage)
- Smoke test expanded from 8 to 10 assertions (added cherry-pick and query)

**Language idiom pass:**
- **Python** — proper package structure with `__init__.py` exporting public API (`from alap import ExpressionParser`); relative imports in canonical copy with flat-import fallback for vendored `shared/` copies
- **Go parser** — concurrency safety documented on `ExpressionParser`; `strconv.Atoi` instead of `fmt.Sscanf`; pre-compiled age regex
- **Go server** — all `json.Unmarshal`, `rows.Scan`, `db.Exec` errors checked; `http.Status*` constants; `deleteConfig` returns 204 (consistent with other servers)
- **Dockerfile** — fixed build context (Go server needs repo root for parser dependency); documented build commands

**Docs:**
- New [`docs/other-languages.md`](docs/other-languages.md) — installation, usage, grammar reference for Python/PHP/Go
- Removed all 501 references from server docs, OpenAPI spec, status, and cookbooks
- Updated server matrix — all 8 servers show "Yes" for cherry-pick/query
- `uv` mentioned as recommended alternative to `pip` across all Python docs and server READMEs

### Rust Expression Parser (2026-03-19)

New native Rust port of the Alap expression parser (`src/other-languages/rust/`).

- `alap-core` crate — recursive descent parser, URL sanitizer, regex validator, config merger
- Rust edition 2024, minimal dependencies (`serde`, `regex`, `serde_json`)
- 35 tests across 8 tiers (same coverage as Python, PHP, and Go)
- Rust's `regex` crate is inherently ReDoS-safe (finite automata, no backtracking)
- Idiomatic Rust: `&mut self` on `query()` enforces single-thread safety at compile time; `Option<T>` for optional fields; zero `unsafe`
- Updated [`docs/other-languages.md`](docs/other-languages.md) with Rust installation, usage, and comparison table

### Web Component: New `::part()` Exports — `list` and `image` (2026-03-18)

The `<alap-link>` web component now exposes five CSS parts (up from three):

| Part | Element | Purpose |
|------|---------|---------|
| `menu` | `<div>` | Menu container (existing) |
| **`list`** | `<ul>` / `<ol>` | **New** — list padding, gap, scrollbar styling |
| `item` | `<li>` | Each list item (existing) |
| `link` | `<a>` | Each link anchor (existing) |
| **`image`** | `<img>` | **New** — image sizing, border-radius, aspect ratio |

Example — stacked pill layout via `::part()`:
```css
alap-link::part(list) { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.25rem; }
alap-link::part(link) { background: #2a50b8; border-radius: 6px; }
alap-link::part(link):hover { background: #3360d0; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
```

### Editor: Revealing Interface Polish (2026-03-18)

- Scrollbar fade — hidden by default, appears on hover (`.scroll-fade` CSS class)
- `scrollbar-gutter: stable` — prevents layout shift when scrollbar appears/disappears
- Alap test menu links styled as stacked pills with hover highlight
- Test menu capped at 5 visible items with fading scrollbar
- Edit card borders fade from dark to bright on hover (1s transition)
- Edit field labels brightened to bold gold accent (matching v2 editor)
- Query tester menu can now overflow its panel to render over the edit forms below
- Google Font `@import` moved before `@import "tailwindcss"` (fixes PostCSS ordering warning)

All changes propagated to all 7 editor ports (react, react-shadcn, vue, svelte, solid, astro, alpine) using each framework's idiomatic patterns:
- React/Astro: `useState`/`useEffect`, `useMemo` deps, `className` template literals
- React-shadcn: Same React hooks + Radix Sheet (drawer handles its own scroll)
- Vue: `ref()`, `watch()`, `computed()`, `:class` array syntax, `style:` bindings
- Svelte: `$state`, `$effect`, `class:name` directives, `style:property` bindings
- Solid: `createSignal`, `createEffect`, `classList`, function-based reactive styles
- Alpine: `Alpine.effect()`, store property, `:style`/`:class` string expressions in `index.html`; `x-cloak` + inline `body { background }` to eliminate FOUC

**Svelte editor: a11y cleanup for zero-warning compile.** Svelte uniquely bakes a11y linting into the compiler (other frameworks rely on optional ESLint plugins). These changes are good practice but not functionally required:
- Clickable `<div>` cards → added `role="button" tabindex="0"` + `onkeydown` handlers
- `<label>` elements → added `for`/`id` pairing with scoped IDs (e.g. `{itemId}-url`)
- Dialog overlays → added `tabindex="-1"` to `role="dialog"` elements
- Clickable `<img>` thumbnails → wrapped in `<button>` elements
- Intentional `autofocus` → suppressed with `<!-- svelte-ignore a11y_autofocus -->`

**Adapter bugfix (Solid, Svelte):** `AlapProvider` now calls `engine.updateConfig()` when the config prop changes. Previously the engine was created once and never updated, so query results in the editor were stale.

**All editors:** inline `<style>body { background: #1a2f8a; }</style>` in `<head>` eliminates white flash on load.

### Advanced CSS Examples — DOM mode (2026-03-17)

New `examples/sites/advanced-css-dom/` — mirrors the web component CSS gallery using DOM mode (`AlapUI`). Same 6-page structure (overview, shapes, shadows, typography, motion, themes). Demonstrates that every visual effect achievable via CSS custom properties on `<alap-link>` is equally achievable with plain light-DOM CSS on `.alapelem` / `.alap_${anchorId}`. Overview page includes a side-by-side setup comparison and popover mode code example.

`examples/sites/advanced-css/` renamed to `examples/sites/advanced-css-wc/` for clarity.

### Editor Redesign (`editors/react-design/`) — complete

Reference editor implementation with progressive disclosure UX, propagated to all 7 editors (2026-03-16):

- **Tabbed left panel** — Items and Macros tabs with subtle palette shift between modes
- **Multi-edit** — click multiple items/macros to open parallel edit forms in center panel
- **Config drawer** — slide-in panel for Load, Save, Save As, New, Delete, Storage mode, Settings
- **Load panel** — center modal with browsable config list, Replace/Merge toggle, search filter
- **Settings dialog** — center modal for all config settings (list type, timeout, max items, viewport adjust, existing URL)
- **Query tester** — slides down from top of center panel, pushes edit forms down (not overlay)
- **Save button state machine** — Save Item → Saving... → Saved → Update Item (disabled until edited)
- **Confirm dialog** — themed modal for destructive actions (replaces browser `confirm()`)
- **Revealing interface** — hover icons fade in over 500ms, advanced fields behind `<details>`, panels slide on demand
- **`useEscapeStack` hook** — global Escape handler respects stacking order (Settings → Load → Drawer → Tester)
- **SVG icons as React components** — `vite-plugin-svgr` with `currentColor`, no inline SVG or CSS filter hacks
- **CSS custom properties** — all colors, shadows, transitions, and tints as `--alap-*` variables
- **No inline style ternaries** — all state-dependent styles computed as `useMemo` or `const` before JSX
- **No inline mouse handlers** — all hover behavior via CSS classes
- **Deep blue palette** — saturated blues with amber accent, DM Sans + JetBrains Mono fonts
- **Collapsible edit forms** — click header to toggle expanded/collapsed, collapsed shows ID + label summary with ellipsis
- **Tag pill remove** — `×` on each tag pill, dim when idle, red background on hover, removes tag without opening edit form
- **Help dialog** — `?` icon in toolbar, sections for Getting Started, Items, Macros, Expression Grammar, Query Tester, Config, Keyboard
- **Image previews** — thumbnail and image fields show inline previews, click for full-size lightbox overlay
- **Description field** — editable in advanced fields section
- **Meta-grabber enhancements** — extracts `og:site_name`, `og:type`, `og:locale`, `article:tag`, `article:section`, `canonical URL`, `twitter:image` fallback, `<meta name="keywords">`
- **Tag auto-population** — dragged URLs get tags from all metadata sources (hostname, site name, type, section, keywords, article tags, locale), comma-split, deduplicated, spaces replaced with underscores
- **Alap menu styling** — `.alapelem` CSS for editor context (positioned, themed)
- **Framework menu positioning fix** — React adapter now defaults to `position: absolute` (issue documented for all adapters)
- **Remote API URL field** — configurable server endpoint in Settings dialog, used by Remote and Hybrid storage modes
- Design spec in `docs/future/editor-design-notes.md`

### Editor Preferences (`editors/shared/prefs.ts`)

- New shared module for cross-editor, cross-session persistence via `localStorage`
- Namespace: `dev.alap.editor.prefs` (reverse DNS, room for future keys)
- Persists `storageMode` and `apiUrl` — change in one editor, pick up in another
- Defensive parsing with typed defaults — gracefully handles missing/corrupt data
- All 8 editors seed initial state from prefs and persist on every change

### Editor Ports — all 7 complete (2026-03-16)

All editors ported from `react-design` reference implementation:
- **react** — direct copy with own title
- **react-shadcn** — shadcn/ui + Radix primitives (Sheet, Dialog, Tabs, Collapsible, Select, Tooltip, Badge, Button, Input), TooltipProvider wrapper, 29 KB CSS + 413 KB JS
- **vue** — Vue 3 + Composition API + Pinia, `storeToRefs()`, `vite-svg-loader`
- **svelte** — Svelte 5 runes (`$state`, `$derived`, `$effect`), Icon.svelte wrapper
- **solid** — SolidJS signals (`createSignal`, `createMemo`), Icon.tsx wrapper
- **alpine** — Alpine.js, HTML-first, `Alpine.store()`, `x-html` for SVG icons
- **astro** — Astro 5 + React island, Layout.astro shell, `client:only="react"`

### Code Quality

- `REM_PER_MENU_ITEM` constant replaces magic number `2.25` across `buildMenuList` and all 4 framework adapters
- Web component default styles now use CSS custom properties (`--alap-bg`, `--alap-border`, `--alap-text`, `--alap-hover-bg`, `--alap-hover-text`, etc.) instead of hardcoded colors — themeable without `::part()`
- README split: friendly landing page in `README.md`, detailed setup in `GETTING-STARTED.md`
- `docs/FAQ.md` — history (1990s Xanadu → 2012 MultiLinks → v3), framework compatibility table, security posture, SEO philosophy, Angular/Lit/Preact/Qwik guidance

### Astro Integration Package (`astro-alap`)

- New package in `integrations/astro-alap/` — zero-config Astro integration for Alap
- Auto-injects web component registration and config loading on every page via `injectScript`
- `markdown: true` option auto-registers `remark-alap` for `.md`/`.mdx` support
- `configName` option for multi-config sites (blog, docs, marketing)
- `validate: true` (default) runs `validateConfig()` at build time with console warnings
- `injectStyles: true` injects default light/dark CSS theme for `::part()` selectors
- 19 tests covering all options, edge cases, and combinations
- Publish pending — will ship as `astro-alap` on npm alongside `alap@3`

### Docusaurus Plugin (`docusaurus-alap`)

- New package in `integrations/docusaurus-alap/` — Docusaurus plugin for Alap
- Generates a client module per plugin instance — runs on every page via `getClientModules()`
- Webpack alias resolves config file imports at build time
- Multiple instances for multi-config sites (e.g. separate docs/blog link libraries)
- `remarkPluginConfig()` helper for adding remark-alap to `beforeDefaultRemarkPlugins`
- Optional default styles injection (light/dark mode via `::part()`)
- Build-time config validation for JSON files (warns, doesn't fail)
- 21 tests covering structure, client generation, named configs, styles, validation, and edge cases
- Publish on hold — upstream transitive dependency vulnerability (`serialize-javascript` via `@docusaurus/core`). Package moved out of tree until resolved. Use `remark-alap` directly with Docusaurus in the meantime.

### Eleventy Plugin (`eleventy-alap`)

- New package in `integrations/eleventy-alap/` — Eleventy plugin for Alap
- Static shortcode `{% alap ".expression" %}` resolves at build time, outputs plain HTML lists (zero JS)
- Interactive shortcode `{% alapLink ".expression" %}text{% endalapLink %}` outputs `<alap-link>` web components
- `alapResolve` filter returns resolved link array for custom template rendering
- `alapCount` filter returns match count
- Configurable `menuClass`, `itemClass`, `listType`
- URL sanitization and HTML escaping on all output
- 21 tests covering static rendering, interactive mode, filters, security, and edge cases
- Publish pending — will ship as `eleventy-alap` on npm alongside `alap@3`

### IIFE / CDN Build

- `dist/alap.iife.js` — self-contained bundle for `<script>` tag usage, sets `window.Alap`
- 27 KB (8.2 KB gzipped) — includes web component, DOM adapter, engine, validateConfig, mergeConfigs
- Separate Vite config (`vite.config.iife.ts`) with esbuild minification, added to `pnpm build` pipeline
- Entry point: `src/iife.ts` — slim surface, no framework adapters or storage layer
- CDN URL (after publish): `https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js`
- Unlocks: WordPress, static sites, CodePen/JSFiddle, legacy CMS, GitHub Pages, zero-build demos
- New `examples/sites/cdn/` — zero-build demo with platform recipes (WordPress, Drupal, Joomla, Squarespace, Shopify, Hugo/Jekyll, CodePen)

### Web Component: Extended CSS Custom Properties

7 new CSS custom properties on `<alap-link>`, bringing the total from 13 to 20:

- `--alap-border-width` — borderless menus (`0`) or thicker borders (default: `1px`)
- `--alap-corner-shape` — corner geometry: `round`, `squircle`, `scoop`, `notch`, `bevel`, `straight`. Progressive enhancement — ignored by browsers without `corner-shape` support.
- `--alap-max-width` — cap menu width for long labels (default: `none`)
- `--alap-z-index` — stacking order, fix menus behind sticky headers (default: `10`)
- `--alap-gap` — space between trigger and menu (default: `0.5rem`)
- `--alap-font` — font family for menu text (default: `inherit`)
- `--alap-focus-ring` — keyboard focus outline color (default: `#2563eb`)

**Accessibility fix:** Focus indicator now uses `:focus-visible` instead of `:focus`. Keyboard users see a visible focus ring; mouse clicks do not show the outline. Previously `outline: none` on `:focus` removed the indicator for all users.

New `examples/sites/advanced-css-wc/` — showcases all 20 custom properties plus consumer-side techniques:
- Corner shape gallery (all 6 shapes side by side: round, squircle, scoop, notch, bevel, straight)
- Snipped corners — whole-menu bevel with asymmetric cut (brutalist aesthetic)
- Sale tag — `corner-shape: round bevel bevel round` for a price-tag shape on the menu
- Per-item styling via `cssClass` — one item styled differently using the DOM adapter (with note on web component limitations and future `::part()` forwarding plan)
- Dark theme, borderless floating, monospace/terminal styles
- Z-index fix for sticky headers, custom gap
- Animated transitions (fade+slide, fade+scale) via `::part(menu)` opt-in
- Auto dark mode with `@media (prefers-color-scheme: dark)` — section background, text, and menu all switch together with browser detection badge
- Live `corner-shape` feature detection banner
- Full property reference table (20 properties)

### validateConfig Strictness

- `validateConfig()` now builds `AlapLink` objects explicitly field-by-field instead of spreading raw input and casting
- Unknown/extra fields on link entries are stripped instead of silently passed through
- Proper TypeScript typing — no `as unknown as` casts, each field validated and assigned individually
- More secure: untrusted input can no longer inject unexpected fields into validated configs

### Viewport Collision Detection

- Menus now automatically flip above the trigger when they would overflow the viewport bottom
- Menus shift left when they would overflow the right edge
- Works in DOM mode (`AlapUI`) and web component mode (`AlapLinkElement`)
- Controlled by `settings.viewportAdjust` (default `true`, set `false` to disable)

### Security Hardening

- **SEC-1/SEC-2 (High/Medium):** URL sanitization — `sanitizeUrl()` blocks `javascript:`, `data:`, `vbscript:`, `blob:` schemes in all `<a href>` and `<img src>` across all 8 adapters and `buildMenuList`
- **SEC-3 (Medium):** Regex validation — `validateRegex()` rejects patterns with nested quantifiers (ReDoS) before `new RegExp()` in ExpressionParser
- **SEC-4 (Low–Medium):** Config schema validation — `validateConfig()` validates shape, sanitizes URLs, rejects dangerous regex patterns, and filters prototype-pollution keys on configs loaded from `RemoteStore`
- **SEC-5 (Low):** Prototype pollution guard — `mergeConfigs()` uses `safeMerge()` to skip `__proto__`, `constructor`, `prototype` keys
- **SEC-6/SEC-7 (Low):** Documented predictable `alapelem` ID and `cssClass` trust boundary in `known-limitations.md`
- New files: `sanitizeUrl.ts`, `validateRegex.ts`, `validateConfig.ts` (all in `src/core/`)
- New test files: `sanitize-url.test.ts` (26 tests), `validate-regex.test.ts` (17 tests), `validate-config.test.ts` (22 tests)
- Security test coverage added to `build-menu-list.test.ts` (4 tests) and `tier12-merge.test.ts` (5 tests)
- Full security plan: `docs/securityplan.md`
- Total tests: 474 → 543 (69 new security tests, zero regressions)
- Excluded `remote-store-integration.test.ts` from default test run (requires running server)

### Editor Security Hardening

- **ESEC-1 (Medium):** SSRF prevention — `isPrivateHost()` blocks RFC 1918, localhost, link-local, and IPv6 private addresses in both meta-grabber implementations
- **ESEC-2 (Medium):** Config validation on import — `validateConfig()` applied to all JSON file open and drag-and-drop paths across all 7 editors
- **ESEC-3 (Medium):** `javascript:` URL injection — covered by three layers: `validateConfig` on import, `https://` filter on drop handlers, render-time `sanitizeUrl` in core
- **ESEC-4 (Medium):** Single-quote escaping added to all `escHtml()` functions in Astro editor (edit-panel, item-list, query-tester)
- **ESEC-5 (Low):** `Object.assign(item, updates)` replaced with spread in React, React-shadcn, Vue, and Astro stores
- **ESEC-7 (Low):** Subresource Integrity hashes added to all Bootstrap CDN tags in Alpine editor
- **ESEC-8 (Low):** HTTPS production note added to all 6 `DEFAULT_API_URL` declarations
- Full editor security plan: `docs/securityplan-editors.md`

### Cookbooks

- `docs/cookbooks/cookbook-designer.md` — Visual design, theming, CSS hooks, positioning, Tailwind, dark mode, image items, animations, accessibility
- `docs/cookbooks/cookbook-editor.md` — Link library management, tag taxonomy, macros, query testing, config management, library health

### Known Limitations & Tests Confidence

- `docs/known-limitations.md` — expression engine, adapters, storage, servers, build constraints
- `docs/tests-confidence.md` — plain English coverage: what's guaranteed, what's not tested, server caveats

### Example READMEs

- Every example now has a standalone README: 13 sites + 7 servers (20 total)
- Each covers: what it demonstrates, how to run (standalone + from root), key files, what to try
- Server READMEs include local, Docker, and Podman instructions
- Index READMEs for `examples/sites/` and `examples/servers/` with matrix tables
- Top-level `examples/README.md` with disk space and resource usage warnings

### Complex Expression Tests (Tier 13)

- 22 stress tests in `tests/core/tier13-complex.test.ts`
- Three+ levels of nested parentheses, macros inside parens, regex inside parens
- Kitchen sink: macros + regex + parens + operators + commas + item IDs in single expressions
- Four levels deep, redundant nesting, empty parens
- Documents macro comma expansion behavior: commas in macro values split at query level even inside parentheses
- Total tests: 474 across 27 files

### Docs Sync Pass

- `docs/status.md` — canonical status matrix: adapters, editors, servers, examples, tests, plugins, build
- Fixed `docs/tests.md`: 395→474 tests, 22→27 files, added Tier 12/13, shared UI tests, integration tests
- Fixed `docs/adapters.md`: "five adapters"→"eight adapters", added Astro/Alpine/SolidJS to table
- Fixed `docs/architecture.md`: Astro/Alpine/SolidJS status "Planned"→"Done" with test counts
- Fixed `README.md`: 3→7 editors, 438→452 tests
- Fixed `docs/plan.md`: test counts synced to 474

### NPM Distribution Hardening

- Entrypoint environments table in `docs/installation.md` — what runs in browser vs Node vs SSR
- Peer dep error messages documented — what consumers see when a dep is missing
- `scripts/smoke-entrypoints.sh` — 14 assertions verifying all subpath exports from an npm-packed tarball
- Updated Astro peer dep range to `^4 || ^5 || ^6`

### Examples Golden Path

- Examples index reorganized into Start Here (Basic → React → Web Component), Theming, Framework Adapters, Advanced
- "Start Here" examples highlighted and numbered for new users

### Existing URL Preservation

- Anchors with an existing `href` now include the original URL as a menu item instead of silently discarding it
- Default behavior: prepend the original URL as the first menu item (progressive enhancement — link still works without JS)
- Global config: `settings.existingUrl: 'prepend' | 'append' | 'ignore'`
- Per-anchor override: `data-alap-existing="prepend|append|ignore"`
- Works in both DOM mode (`AlapUI`) and web component mode (`<alap-link href="...">`)
- 14 new tests in `tests/ui/shared/existing-url.test.ts`
- Demo: `examples/sites/basic/` — "Existing URL" section shows all three modes

### OpenAPI Spec

- `docs/openapi.yaml` — canonical OpenAPI 3.1 spec for the Alap Config REST API
- Describes all 7 endpoints: list, get, save, delete, search, cherry-pick, query
- Full request/response schemas matching TypeScript types (`AlapConfig`, `AlapLink`, `AlapMacro`, `AlapSettings`, `AlapSearchPattern`)
- Documents search query parameters (`tag`, `q`, `regex`, `fields`, `config`, `limit`)
- Notes 501 behavior for cherry-pick/query on Python/PHP servers
- Validates clean with Redocly (`@redocly/cli lint`)

### Diagnostic Logger

- `src/core/logger.ts` — dev-mode `warn()` function, dead-code-eliminated in production builds
- 12 warning sites across `ExpressionParser`, `AlapUI`, `AlapLinkElement`:
  unknown macros, unknown item IDs, missing search patterns, invalid regex, regex timeout/cap,
  token/depth limits, no elements for selector, missing config registration
- Exported from `alap/core` for consumer use

### Build Isolation

- Replaced `vite-plugin-dts` with two isolated `tsc --emitDeclarationOnly` passes
- Eliminates React/Solid JSX type cross-contamination during declaration generation
- Each adapter's `.d.ts` files generated in a separate process with its own tsconfig

### Example Serve Scripts

- Each of the 13 examples in `examples/sites/` now has a `serve.sh` for standalone serving
- Unique ports (9000–9120) so all examples can run concurrently
- Back link to "All Examples" index works correctly in standalone mode

### Server Smoke Tests

- `examples/servers/smoke-test.sh` — one-command contract tests for all 7 servers
- 8 assertions per server: GET list, PUT, GET, list check, search, 404, DELETE, 404-after-delete
- Supports Docker and Podman (auto-detects, or `DOCKER=podman ./smoke-test.sh all`)
- `./smoke-test.sh <name>` for one server, `./smoke-test.sh all` for all 7

### Server Fixes

- **Laravel:** added `Database\Seeders\` to composer.json autoload, `composer dump-autoload` in Dockerfile, `.env` copy from `.env.example`, port 8000→3000, removed `/api/` route prefix
- **Django:** fixed healthcheck credentials (`alap_user`→`root`), remapped MySQL container to host port 3307 to avoid local MySQL conflict
- **FastAPI:** `seed.py` now creates the `configs` table before inserting (was only created in server's `on_startup`)
- **Examples index:** removed dead `sites/astro/` link, pointed Astro Integration to standalone port 9010

### Fixes

- Fix `examples/sites/regex-search/main.ts` — was passing config as `{ config, selector }` options bag instead of positional `(config)` argument to `AlapUI`, causing no event handlers to be registered

### Tiptap Plugin

- `plugins/tiptap-alap/` — Tiptap/ProseMirror Node extension (`@alap/tiptap`) for rich-text editors
- Registers `<alap-link>` as an inline ProseMirror node with `query` attribute
- `parseHTML` reads existing `<alap-link>` elements; `renderHTML` serializes back to `<alap-link query="...">`
- Three editor commands: `setAlapLink` (wrap selection or insert), `updateAlapLink` (change query), `unsetAlapLink` (unwrap to plain text)
- `HTMLAttributes` option for custom classes/data attributes on rendered nodes
- Keyboard shortcut: `Mod-Shift-A` to insert a new Alap link
- 11 tests (schema, parse/render, commands, options, round-trip), ESM output with TypeScript declarations

### Removed

- Removed `examples/sites/astro/` — redundant plain HTML file; `examples/sites/astro-integration/` is the real Astro example

### remark-alap Plugin

- `plugins/remark-alap/` — Remark plugin that transforms `[text](alap:query)` links into `<alap-link query="query">text</alap-link>` web components
- Supports macros (`alap:@coffee`), item IDs (`alap:golden`), tags (`alap:.bridge`), comma-separated lists (`alap:a,b,c`)
- Options: `tagName`, `queryAttr`, `className`
- Extracts plain text from formatted link content (bold, italic, code)
- For expressions with spaces/operators, use macros — markdown parsers break on spaces in the URL portion
- 20 tests, ESM output with TypeScript declarations
- New `examples/sites/markdown/` — two-column demo: rendered output with live `<alap-link>` menus alongside raw markdown source

### React + shadcn/ui Editor

- `editors/react-shadcn/` — shadcn/ui + Radix primitives, Zustand+Immer, vite-plugin-svgr
- 9 shadcn/ui components: Button, Input, Badge, Select, Dialog, Sheet, Tabs, Collapsible, Tooltip
- Sheet for config drawer, Dialog for modals, Collapsible for edit form sections
- Full feature parity with all other editors: file I/O, drag-and-drop, meta-grabber, live query tester, storage mode switch, shared preferences
- Build output: 29 KB CSS + 413 KB JS

### Examples Reorganization

- Moved all 13 demo examples into `examples/sites/` subdirectory
- `examples/servers/` unchanged
- `examples/plugins/` added (placeholder for future plugin examples)
- Updated all relative paths in source files and all doc references

### SolidJS + Vanilla Extract Editor

- `editors/solid/` — SolidJS adapter with Vanilla Extract (zero-runtime CSS-in-TS)
- SolidJS signals store (no Zustand/Immer — native `createSignal` + `createRoot` singleton)
- Vanilla Extract `.css.ts` files: theme tokens, layout, all component styles — generates static CSS at build time
- 7 components: Toolbar, ItemList, EditPanel, QueryTester, SettingsPanel, MacroEditor, StatusBar
- All shared features: file I/O, drag-and-drop (configs/URLs/images), meta-grabber, live query tester, storage mode switch
- Build output: 6.83 KB CSS + 74 KB JS (includes SolidJS + Alap core)

### Svelte + CSS Variables Editor

- `editors/svelte/` — Svelte 5 adapter with native CSS Variables (`--alap-*` custom properties)
- Svelte 5 runes store (`$state`, `$derived`, `$effect`) — no external state library
- All styling via CSS custom properties defined on `:root`, consumed in scoped `<style>` blocks
- 7 components: Toolbar, ItemList, EditPanel, QueryTester, SettingsPanel, MacroEditor, StatusBar
- All shared features: file I/O, drag-and-drop (configs/URLs/images), meta-grabber, live query tester, storage mode switch
- Build output: 16.31 KB CSS + 96 KB JS (includes Svelte runtime + Alap core)

### README

- Full README with project description, install table, quick start for all 8 adapters, expression grammar, configuration example, docs/servers/editors tables, development commands

### Roadmap Update

- `docs/future.md` — removed JSDoc section, added detailed Tiptap extension (`@alap/tiptap`) section with ProseMirror Node extension concept, bumped Tiptap priority to Medium

### Editor File I/O & Enhanced Drag-and-Drop

All three editors (React, Vue, Astro) now support:
- **File System Access API** — `showSaveFilePicker`/`showOpenFilePicker` on Chrome/Edge with save-in-place; falls back to `<a download>` + `<input type="file">` on Firefox/Safari
- **Drag-and-drop config files** — drop a `.json` file to load an entire AlapConfig
- **Drag-and-drop images** — drop an image file (base64 data URL) or image URL onto a selected item to set its `thumbnail`
- **Meta-grabber** — server-side URL metadata extraction (title, description, og:image); replaces Netlify serverless function dependency. Astro uses an API route; React/Vue use a Vite dev server plugin (`editors/shared/meta-grabber-plugin.ts`)
- **Shared utilities** — `editors/shared/file-io.ts` (File System Access API + fallback) and `editors/shared/meta-grabber-plugin.ts` (Vite plugin) used by all editors

### Per-Item Metadata & Config-Driven Hooks

- **`AlapLink` type** — three new optional fields:
  - `guid` — permanent UUID (`crypto.randomUUID()`), survives item renames, for identity/tracking across sync
  - `hooks` — string array declaring which events this item participates in (e.g. `["item-hover", "item-context"]`)
  - `thumbnail` — preview image URL for hover/context actions (not rendered in menu — passed in event detail)
- **`AlapSettings.hooks`** — global default hooks for all items. Per-link `hooks` overrides when present.
- **Config stays pure JSON** — no functions in config. Hooks are string declarations; Alap renders them as `data-alap-hooks` attributes; the app's own event listeners decide behavior.

### Data Attributes on Menu Items

`buildMenuList()` now renders per-item data attributes on `<a>` elements:
- `data-alap-hooks="item-hover item-context"` — resolved hooks (per-link or global fallback)
- `data-alap-guid="a1b2c3d4-..."` — permanent identity
- `data-alap-thumbnail="https://..."` — preview image URL

### ArrowRight / ArrowLeft Keyboard Navigation

- `ArrowRight` on a focused menu item fires `item-context` (same event as right-click, with `KeyboardEvent`)
- `ArrowLeft` fires `item-context-dismiss` to tear down whatever the right-arrow action opened
- Only fires when the item has `item-context` in its resolved `data-alap-hooks`
- New `ItemContextDismissDetail` type and `onItemContextDismiss` callback across all adapters
- `ItemContextDetail.event` is now `MouseEvent | KeyboardEvent` (was `MouseEvent` only)
- Shared `handleMenuKeyboard()` accepts optional `MenuKeyboardOptions` — backwards compatible

### DOM Adapter Fixes

- **Trigger click handling:** `AlapUI.onTriggerClick` now uses `event.currentTarget` instead of `event.target`. Fixes div/span triggers where clicking a child element (image, text node) would miss the `data-alap-linkitems` attribute.
- **Menu positioning:** Anchor/div triggers now position the menu below the trigger (`rect.bottom`) instead of overlapping it (`rect.top`). Image triggers still use click coordinates.

### Hooks & Media Example

New `examples/sites/hooks-and-media/` demonstrating:
- Image as trigger — click a photo to open a menu (positioned at click coordinates)
- Div as trigger — styled cards with child elements work as Alap triggers
- Image menu items — `image` field renders photos instead of text labels
- Hover preview panel — `onItemHover` reads `thumbnail` + `description` to populate a fixed preview
- Context popup — right-click (or ArrowRight) opens a detail card with image, description, direct link
- Live event log showing all hook events as they fire

### RemoteStore Integration Test

- 11 tests in `tests/storage/remote-store-integration.test.ts`
- Spawns the Express+SQLite server, runs full `RemoteStore` lifecycle against it
- Covers: save/load round-trip, loadEntry with metadata, list, update/overwrite, remove, idempotent remove, URL encoding (spaces, special characters)
- Test configs use timestamp-prefixed names to avoid colliding with seed data

### Astro Integration Example

New `examples/sites/astro-integration/` — a real Astro project with a local integration that auto-injects Alap's web component and config into every page:
- `integrations/alap.mjs` — 15-line Astro integration using `injectScript`
- 3 `.astro` pages (home, bridges, food) with shared layout and `::part()` theming
- Zero per-page boilerplate — just use `<alap-link query="...">` anywhere
- Replaces the earlier `examples/sites/astro/` plain HTML demo with a real Astro project

### Shared Images

- `examples/img/` — shared photo assets for examples (Golden Gate, Brooklyn Bridge, chain links, SF Victorians)

---

## [3.0.0-beta.1] — 2026-03-13

Complete TypeScript rewrite. Everything is new.

### Core Engine (`alap/core`)

- **Expression parser** — full grammar: item IDs, `.tag` queries, `@macro` expansion, operators (`+` AND, `|` OR, `-` WITHOUT), `,` separator, parenthesized grouping
- **Regex search** — `/key/opts` syntax as a first-class expression atom. Field codes (`l` label, `u` url, `t` tags, `d` description, `k` id, `a` all), sorting (`alpha`/`newest`/`oldest`), age filter (`7d`/`24h`/`2w`), limit. Security guardrails: max 5 regex queries per expression, max 100 results, 20ms timeout per pattern
- **`mergeConfigs()`** — pure function for composing multiple `AlapConfig` objects. Shallow merge; later configs win on key collision. Operates on settings, macros, allLinks, searchPatterns
- **`AlapEngine`** — stateful wrapper: `resolve()`, `updateConfig()`, config accessors
- **`ExpressionParser`** — standalone stateless parser, used by the engine
- **Types** — `AlapConfig`, `AlapLink`, `AlapMacro`, `AlapSettings`, `AlapSearchPattern`, `AlapSearchOptions`

### UI Adapters (8 adapters)

- **DOM** (`alap`) — `AlapUI` class, CSS selector binding, shared `#alapelem` container, `DismissTimer`, keyboard nav
- **Web Component** (`alap`) — `<alap-link>` custom element, Shadow DOM, `::part()` theming, config registry (`registerConfig`/`updateRegisteredConfig`)
- **React** (`alap/react`) — `<AlapProvider>`, `<AlapLink>`, `useAlap()` hook. Three modes: `dom`, `webcomponent`, `popover`
- **Vue** (`alap/vue`) — `<AlapProvider>`, `<AlapLink>`, `useAlap()` composable. SFC-only (no `h()` render functions). Same three modes
- **Svelte** (`alap/svelte`) — `<AlapProvider>`, `<AlapLink>`, `useAlap()`. Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Astro** (`alap/astro`) — `<AlapLink>` and `<AlapSetup>` components, thin wrappers around the web component
- **Alpine.js** (`alap/alpine`) — `alapPlugin` function, `x-alap` directive. No build step required
- **SolidJS** (`alap/solid`) — `<AlapProvider>`, `<AlapLink>`, `useAlap()`. Fine-grained signals, `Dynamic` component

### Event Hooks

All adapters support optional event hooks for hover and right-click on triggers and menu items:

- `trigger-hover` — mouse enters the trigger element
- `trigger-context` — right-click on the trigger
- `item-hover` — mouse enters a menu item
- `item-context` — right-click on a menu item (or ArrowRight via keyboard)
- `item-context-dismiss` — ArrowLeft to dismiss a context action

Framework adapters (React, Vue, Svelte, Solid) expose these as callback props / emits. DOM, Web Component, and Alpine dispatch `alap:trigger-hover`, `alap:trigger-context`, `alap:item-hover`, `alap:item-context` custom events. Web Component events use `composed: true` to cross Shadow DOM boundaries.

All hooks are optional — zero overhead when not used. Hover uses `mouseenter` (not `mouseover`). Context events pass the raw `MouseEvent` or `KeyboardEvent` for `preventDefault()`.

### Shared UI Utilities

- `buildMenuList()` — pure DOM builder, scroll support via `maxVisibleItems`, data attribute rendering for hooks/guid/thumbnail
- `handleMenuKeyboard()` — stateless keyboard nav (ArrowDown/Up, ArrowRight/Left, Home/End, Escape, Tab)
- `DismissTimer` — auto-dismiss on mouseleave with configurable timeout

### Storage Layer (`alap/storage`)

- **`IndexedDBStore`** — local persistence with `idb` wrapper
- **`RemoteStore`** — REST client (`GET/PUT/DELETE /configs/:name`, `GET /configs`)
- **`HybridStore`** — write-through local+remote, read from IndexedDB first, background refresh, graceful offline degradation

### Build

- Vite library mode — ESM + CJS dual output for all 9 entry points
- TypeScript declarations (`.d.ts`) generated for all exports
- Tree-shakeable: importing `alap/core` does not pull in React, Vue, etc.
- Optional peer dependencies: `react`, `vue`, `svelte`, `solid-js`, `alpinejs`, `astro`, `idb`

### Tests

- 438 tests across 25 files, 4 vitest projects (`core`, `ui`, `ui-solid`, `storage`)
- Core: 146 tests (12 tiers — operands through merge)
- DOM: 22, Web Component: 24, React: 35, Vue: 35, Svelte: 33, Astro: 9, Alpine: 21, Solid: 35
- Shared UI: 20 (buildMenuList data attributes, guid, thumbnail, hooks, globalHooks)
- Storage: 58 (IndexedDB 13, Remote 16, Hybrid 18, RemoteStore integration 11)

### Documentation

- `docs/architecture.md` — layered design, export table, project structure, multi-config architecture
- `docs/core.md` — types, constants, grammar, tokenizer, expression parser, regex search, hardening
- `docs/ui.md` — all 8 adapters, shared utilities, accessibility, event hooks, examples
- `docs/installation.md` — subpath exports, per-framework install instructions
- `docs/search.md` — multi-config search & composition deep dive
- `docs/tests.md` — test inventory and vitest configuration
- `docs/adapters.md` — adapter comparison and status
- `docs/distribution.md` — npm vs CDN build strategy

### Examples

13 examples in `examples/sites/`:
- `basic/`, `styling/`, `tailwind/`, `web-component/`, `react/`, `vue/`, `svelte/`, `astro-integration/`, `alpine/`, `solid/`, `regex-search/`, `hooks-and-media/`, `markdown/`

### Server Examples

- `examples/servers/express-sqlite/` — Node + Express + SQLite, 7 endpoints (CRUD + search + cherry-pick + query), interactive demo page, Dockerfile
- `examples/servers/laravel-sqlite/` — PHP + Laravel 12 + SQLite, same 7 endpoints with PHP expression resolver, interactive demo page, Dockerfile
- `examples/servers/bun-sqlite/` — Bun + SQLite, zero npm dependencies, same 7 endpoints using `bun:sqlite` and `Bun.serve()`, interactive demo page, Dockerfile
- `examples/servers/express-mongodb/` — Node + Express + MongoDB, same 7 endpoints, `docker-compose.yml` with MongoDB 7, interactive demo page, Dockerfile
- `examples/servers/flask-sqlite/` — Python + Flask + SQLite, same 7 endpoints (cherry-pick/query return 501), interactive demo page, Dockerfile
- `examples/servers/django-mysql/` — Python + Django + MySQL, same 7 endpoints, `JSONField` for native MySQL JSON, `docker-compose.yml` with MySQL 8, interactive demo page, Dockerfile
- `examples/servers/fastapi-postgres/` — Python + FastAPI + PostgreSQL, same 7 endpoints, `JSONB` column, `psycopg` v3, `docker-compose.yml` with PostgreSQL 16, interactive demo page, Dockerfile

### Editors

- `editors/react/` — Tailwind, Zustand+Immer, DOM mode, drag-and-drop URL extraction, live query tester
- `editors/react-shadcn/` — shadcn/ui + Radix primitives, Zustand+Immer, 29 KB CSS + 413 KB JS
- `editors/vue/` — PrimeVue 4.5 + Aura theme, Pinia, Popover mode, drag-and-drop, DataTable/Toast/Splitter
- `editors/astro/` — Web component islands, zero-framework, hand-written CSS, vanilla TS pub/sub store, File System Access API (save-in-place on Chrome/Edge, fallback on Firefox/Safari), drag-and-drop configs/URLs/images, server-side meta-grabber API route, `<alap-link>` live query preview
- `editors/solid/` — SolidJS + Vanilla Extract (zero-runtime CSS-in-TS), SolidJS signals store (`createSignal` + `createRoot` singleton), type-safe theme tokens, 7 components, 6.83 KB CSS + 74 KB JS
- `editors/alpine/` — Alpine.js + Bootstrap 5, `Alpine.store()` reactive store, Bootstrap CSS/icons from CDN, modals via `data-bs-toggle`, `x-alap` directive for live query preview, single HTML file + TS store, 81 KB JS
