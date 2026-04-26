# Advanced Protocol Demos

One page per adapter, every adapter covering the same capability matrix:

| Scenario | What it exercises |
|---|---|
| Progressive menu | Async fetch, "Loading…" placeholder, FLIP animation into final placement |
| Mixed static + async | Static tag `\|` slow protocol; provenance via `source_*` left border |
| Error / empty | `[data-alap-placeholder="error"]` / `"empty"` rendering |
| Lens | Progressive metadata card (via `<alap-lens>` web component) |
| Lightbox | Progressive fullscreen media (via `<alap-lightbox>` web component) |
| Placement compass rose | All 9 directions, collapsible `<details>` |
| In-flight dedup | Two triggers with the same token → one fetch |

## Adapter pages

- `dom/` — vanilla `.alap` anchors
- `web-component/` — `<alap-link>` custom element
- `react/` — `<AlapLink>` + `<AlapProvider>`
- `vue/` — Composition API, `provide`/`inject`
- `svelte/` — Svelte 5 runes
- `solid/` — signals, `createEffect`
- `qwik/` — stub page (needs `@builder.io/qwik` optimizer to run; the adapter is fully tested in `tests/ui/qwik/`)
- `alpine/` — `x-alap` directive (loads Alpine from esm.sh CDN)
- `astro/` — delegates to the web component; see `examples/sites/astro-integration/` for a real Astro build

## Personalization

Each adapter's page is keyed to its own ecosystem so the suite isn't 9 copies
of the same demo. The Algolia HN search targets the framework's own keywords
(React hooks, Vue composition API, Svelte runes, Solid, Qwik resumability,
Alpine.js, Astro islands, web components, vanilla JS) and the static `allLinks`
cover that ecosystem's canonical resources.

See `shared/ecosystems.ts` for the full personalization tables.

## Shared infrastructure

- `shared/mockProtocols.ts` — `:slow:delay:count:` and `:flaky:mode:delay:`
  for deterministic loading, error, and empty demos
- `shared/ecosystems.ts` — per-adapter static links + HN search alias
- `shared/buildConfig.ts` — wires mocks + `:hn:` + `:time:` into an `AlapConfig`
- `shared/styles.css` — layout, compass rose, placeholder states, provenance colors

## Running

From `examples/sites/`:

```bash
pnpm dev   # http://localhost:5173/advanced-protocol/
```
