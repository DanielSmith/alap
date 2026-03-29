# Tests

794 tests across 41 files, run via Vitest in 5 projects.

```bash
pnpm test          # run all tests
pnpm test:core     # core engine only
pnpm test:ui       # adapter tests (happy-dom)
```

## Structure

### `core/` — 452 tests

Expression parser, operators, macros, parentheses, regex search, and security.

| File | Tests | What |
|------|-------|------|
| tier1-operands | 6 | Item IDs, tags, bare @ |
| tier2-commas | 6 | Comma-separated expressions |
| tier3-operators | 11 | AND, OR, WITHOUT |
| tier4-chained | 6 | Multi-operator chains |
| tier5-mixed | 8 | IDs + tags + operators |
| tier6-macros | 9 | @macro expansion, bare @, nested |
| tier7-parens | 12 | Grouping, nesting, precedence |
| tier8-edges | 20 | Whitespace, empty, guardrails |
| tier9-resilience | 22 | Bad config, null links, circular macros |
| tier10-extended | 6 | DOM refs, unknown tokens |
| tier11-regex | 35 | /key/opts, fields, sort, age, limits |
| tier12-merge | 17 | mergeConfigs(), prototype pollution guard |
| tier13-complex | 22 | Deep nesting, macros in parens, kitchen sink |
| sanitize-url | 26 | URL scheme blocking (javascript:, data:, etc.) |
| validate-regex | 23 | ReDoS detection, nested quantifier rejection |
| validate-config | 22 | Config schema, URL sanitization, pattern validation |

### `ui/` — 295 tests

Adapter behavior: ARIA, keyboard nav, dismissal, rendering modes.

| Directory | Adapter | Tests | Project |
|-----------|---------|-------|---------|
| dom/ | AlapUI (vanilla DOM) | 22 | ui |
| web-component/ | `<alap-link>` (Shadow DOM) | 24 | ui |
| react/ | React adapter | 35 | ui |
| vue/ | Vue adapter | 35 | ui |
| svelte/ | Svelte adapter | 33 | ui |
| solid/ | SolidJS adapter | 35 | ui-solid |
| qwik/ | Qwik adapter (engine + exports) | 16 | ui-qwik |
| alpine/ | Alpine.js adapter | 21 | ui |
| astro/ | Astro adapter | 9 | ui |
| shared/ | buildMenuList + placement + existingUrl | 65 | ui |

### `storage/` — 47 tests

Persistence layer: IndexedDB, REST client, write-through hybrid.

| File | Tests | What |
|------|-------|------|
| indexeddb-store | 13 | Local persistence |
| remote-store | 16 | REST client |
| hybrid-store | 18 | Write-through local+remote |

`remote-store-integration.test.ts` (11 tests) requires a running Express server and is excluded from the default run.

### `fixtures/`

Shared test data — `links.ts` (14 items) and `extended-links.ts` (additional items for tier 10+ tests).

## Other Test Suites

Tests outside this directory:

| Location | Tests | Runner |
|----------|-------|--------|
| `integrations/astro-alap/` | 19 | vitest |
| `integrations/eleventy-alap/` | 21 | vitest |
| `integrations/next-alap/` | 15 | vitest |
| `integrations/nuxt-alap/` | 17 | vitest |
| ~~`integrations/docusaurus-alap/`~~ | 21 | vitest | *temporarily removed — upstream dep vuln* |
| `plugins/remark-alap/` | 20 | vitest |
| `plugins/rehype-alap/` | 29 | vitest |
| `plugins/tiptap-alap/` | 11 | vitest |
| `src/other-languages/python/` | 39 | pytest |
| `src/other-languages/php/` | 35 | PHPUnit |
| `src/other-languages/go/` | 35 | go test |
| `src/other-languages/rust/` | 35 | cargo test |
| `examples/servers/smoke-test.sh` | 10/server | bash |
