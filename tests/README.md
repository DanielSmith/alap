# Tests

1,926 tests across 89 files, run via Vitest in 6 projects.

```bash
pnpm test                # all 6 projects
pnpm test:watch          # watch mode
pnpm test:packaging      # tarball/exports smoke (separate config)
pnpm test:scripts        # Python tooling under scripts/
pnpm test:all            # workspace-wide via Turborepo (also runs integrations + plugins)
```

## Vitest projects

The default `pnpm test` run uses `vite.config.ts`'s `test.projects`:

| Project | Files | Tests | Environment |
|---------|-------|-------|-------------|
| `core` | 44 | 869 | node |
| `ui` | 37 | 821 | happy-dom |
| `ui-solid` | 1 | 35 | happy-dom |
| `ui-qwik` | 1 | 16 | happy-dom |
| `storage` | 3 | 50 | node |
| `meta` | 3 | 135 | node |

Solid and Qwik live in their own projects so adapter-runtime quirks don't cross-pollute the main `ui` project.

## `core/` — 44 files / 869 tests

### Expression grammar (tier1–tier13)

| File | Tests | What |
|------|-------|------|
| tier1-operands | 6 | Item IDs, tags |
| tier2-commas | 6 | Comma-separated expressions |
| tier3-operators | 11 | AND, OR, WITHOUT |
| tier4-chained | 6 | Multi-operator chains |
| tier5-mixed | 8 | IDs + tags + operators |
| tier6-macros | 7 | `@macro` expansion, nesting |
| tier7-parens | 13 | Grouping, nesting, precedence |
| tier8-edges | 23 | Whitespace, empty, guardrails |
| tier9-resilience | 22 | Bad config, null links, circular macros |
| tier10-extended | 6 | DOM refs, unknown tokens |
| tier11-regex | 35 | `/key/opts`, fields, sort, age, limits |
| tier12-merge | 17 | `mergeConfigs()`, prototype-pollution guard |
| tier13-complex | 22 | Deep nesting, macros in parens, kitchen sink |

### Protocols (tier14–tier17, tier23–tier28)

| File | Tests | What |
|------|-------|------|
| tier14-protocol-tokenizer | 16 | `:protocol:args:` lexing |
| tier15-protocol-handlers | 27 | Handler registration + dispatch |
| tier17-protocol-composition | 15 | Multiple protocols in one expression |
| tier23-generate-protocols | 26 | Generate handlers vs. static atoms |
| tier24-web-protocol | 35 | `:web:` |
| tier25-atproto-protocol | 48 | `:atproto:` |
| tier26-json-protocol | 41 | `:json:` |
| tier27-obsidian-protocol | 87 | `:obsidian:core:` + `:obsidian:rest:` |
| tier27b-obsidian-inline-tags | 39 | Inline tag parsing |
| tier27c-obsidian-tag-aliases | 27 | Tag alias resolution |
| tier28-hn-protocol | 48 | `:hn:` |

### Refiners (tier18–tier22)

| File | Tests | What |
|------|-------|------|
| tier18-refiner-tokenizer | 11 | `*refiner:args*` lexing |
| tier19-refiner-pipeline | 23 | sort / reverse / limit / skip / shuffle / unique |
| tier20-refiner-inline | 10 | Inline placement and consumption |
| tier21-refiner-edges | 18 | Boundary cases |
| tier22-protocols-and-refiners | 21 | Refiners over protocol output |

### Security and lifecycle primitives

| File | Tests | What |
|------|-------|------|
| sanitize-url | 26 | URL scheme blocking |
| sanitize-by-tier | 28 | Per-tier sanitizer dispatch |
| validate-regex | 23 | ReDoS detection |
| validate-config | 41 | Schema, URL/regex sanitization |
| validate-config-auto | 8 | Engine auto-validate at construction |
| validate-config-hooks | 9 | `settings.hooks` allowlist |
| link-provenance | 13 | WeakMap stamps + tier predicates |
| deep-clone-data | 9 | Selective clone + cycle / depth guards |
| deep-freeze | 5 | Config immutability |
| register-protocol | 8 | Engine handler registry |
| guarded-fetch | 3 | Socket-level SSRF re-check |
| read-capped-json | 6 | Streaming response cap |
| abort-inflight-refcount | 5 | Refcounted fetch cancellation |
| engine-concurrency-timeout | 5 | Async lifecycle |
| engine-overlay | 6 | DOM overlay rendering |

## `ui/` — 37 files / 821 tests (plus `ui-solid` and `ui-qwik`)

Adapter behavior: ARIA, keyboard navigation, dismissal, rendering, the per-tier sanitizer at render time, and the progressive-fetch lifecycle.

| Subdirectory | Files | Tests | Project | What |
|--------------|-------|-------|---------|------|
| dom/ | 1 | 27 | ui | AlapUI (vanilla DOM) |
| web-component/ | 1 | 28 | ui | `<alap-link>` shadow DOM |
| react/ | 1 | 35 | ui | React adapter |
| vue/ | 1 | 35 | ui | Vue adapter |
| svelte/ | 1 | 33 | ui | Svelte adapter |
| solid/ | 1 | 35 | ui-solid | Solid adapter |
| qwik/ | 1 | 16 | ui-qwik | Qwik adapter |
| alpine/ | 1 | 21 | ui | Alpine.js adapter |
| astro/ | 1 | 9 | ui | Astro adapter |
| lens/ | 4 | 155 | ui | AlapLens DOM + element + tier-regression |
| lightbox/ | 4 | 172 | ui | AlapLightbox DOM + element + tier-regression |
| embed/ | 3 | 88 | ui | embed module + allowlist + consent |
| progressive/ | 8 | 37 | ui | Progressive-render lifecycle (DOM, lens/lightbox parity, dedup, interruption, mixed, refiners, placement) |
| shared/ | 11 | 181 | ui | buildMenuList (default + tier), placement, existing-url, coordinators, base-menu-dismiss, config-registry, overlay-placement, placeholder-descriptor |

## `storage/` — 3 files / 50 tests

Persistence layer.

| File | Tests | What |
|------|-------|------|
| indexeddb-store | 16 | Local persistence |
| remote-store | 16 | REST client |
| hybrid-store | 18 | Write-through local + remote |

`remote-store-integration.test.ts` (11 tests) needs a running Express server and is excluded from the default run. Run it via `pnpm vitest run tests/storage/remote-store-integration.test.ts`.

## `meta/` — 3 files / 135 tests

The metadata pipeline used by the lens/lightbox renderers.

| File | Tests | What |
|------|-------|------|
| html-scrape | 53 | HTML extraction strategies |
| meta-rules | 61 | Site-rules database |
| fetch-strategy | 21 | Fetch sequencing and caching |

## `packaging/` — 1 file

Tarball + exports smoke. Uses its own config (`vitest.packaging.ts`) and runs separately via `pnpm test:packaging`. Slow — 120 s timeout.

## `fixtures/`

Shared test data — `links.ts`, `extended-links.ts`, plus protocol-specific fixtures (`links-protocols.ts` and friends).

## Other test suites

Tests outside this directory:

| Location | Runner | Notes |
|----------|--------|-------|
| `integrations/astro-alap/` | vitest | 19 it/test calls |
| `integrations/eleventy-alap/` | vitest | 21 |
| `integrations/next-alap/` | vitest | 15 |
| `integrations/nuxt-alap/` | vitest | 17 |
| `plugins/mdx/` | vitest | 65 |
| `plugins/remark-alap/` | vitest | 20 |
| `plugins/rehype-alap/` | vitest | 29 |
| `plugins/tiptap-alap/` | vitest | 11 |
| `src/other-languages/python/` | pytest | 9 files |
| `src/other-languages/php/` | PHPUnit | 8 files |
| `src/other-languages/go/` | go test | 5 files |
| `src/other-languages/java/` | JUnit | 6 files |
| `src/other-languages/rust/` | cargo test | 6 files |
| `src/other-languages/ruby/` | minitest | 9 files |
| `examples/servers/smoke-test.sh` | bash | per-server runner |

Run them all together via `pnpm test:all` (Turborepo).
