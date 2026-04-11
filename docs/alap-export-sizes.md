# Alap Export Sizes & Packaging Notes

## Current Build Sizes (3.1-dev, 2026-04-11)

| Entry | ESM | gzip | CJS | gzip |
|---|---|---|---|---|
| `index` (full) | 101.79 KB | 22.76 KB | 84.49 KB | 20.30 KB |
| `core/index` | shared chunk | | 0.50 KB | 0.27 KB |
| `react/index` | 8.18 KB | 2.82 KB | 6.17 KB | 2.58 KB |
| `vue/index` | 11.95 KB | 3.48 KB | 8.78 KB | 3.05 KB |
| `svelte/index` | 13.42 KB | 3.76 KB | 10.11 KB | 3.52 KB |
| `solid/index` | 9.36 KB | 3.01 KB | 6.72 KB | 2.72 KB |
| `qwik/index` | 8.11 KB | 2.57 KB | 6.03 KB | 2.36 KB |
| `alpine/index` | 6.40 KB | 2.16 KB | 4.91 KB | 1.96 KB |
| `astro/index` | 0.22 KB | 0.15 KB | 0.26 KB | 0.18 KB |
| `storage/index` | 3.76 KB | 1.34 KB | 3.02 KB | 1.13 KB |
| IIFE (standalone) | 45.82 KB | 13.37 KB | | |

## Current Export Map

| Import path | What's in it |
|---|---|
| `alap` | Everything: engine, parser, AlapUI, web components (link/lightbox/lens), protocols (web/json/atproto), embed, renderer coordinator |
| `alap/core` | Engine, parser, mergeConfigs, validators, types only |
| `alap/react` | React components + hooks |
| `alap/vue` | Vue components + composables |
| `alap/svelte` | Svelte components |
| `alap/solid` | Solid components |
| `alap/qwik` | Qwik components |
| `alap/alpine` | Alpine plugin |
| `alap/astro` | Astro components |
| `alap/storage` | IndexedDB persistence |

## Missing Exports (needed for 3.1)

- `AlapLightbox` (DOM class) — only `AlapLightboxElement` (WC wrapper) is exported
- `AlapLens` (DOM class) — only `AlapLensElement` (WC wrapper) is exported
- CSS files (`lightbox.css`, `lens.css`) — no CSS exports in package.json at all
- alap-gather is the first external consumer and needs all three

## Slim vs Full — Working Thoughts

Hunch: two tiers.

**Slim** = core + menus + core protocols + web components (of menus)
- Engine, parser, expression grammar
- AlapUI (DOM menus)
- AlapLinkElement (menu web component)
- Built-in protocols (web, json) + protocol cache
- The minimum you need for "links with menus" on any page

**Full** = slim + renderers + embed + advanced protocols
- AlapLightbox + AlapLightboxElement
- AlapLens + AlapLensElement
- Embed module (iframe rendering, consent)
- Renderer coordinator
- atproto protocol
- Everything from slim, plus the rich viewing/collecting experience

### Open question: web components of what?

Web components in slim = just `<alap-link>` (the menu trigger).
Web components in full = `<alap-link>` + `<alap-lightbox>` + `<alap-lens>`.

The WC wrappers are thin — they just delegate to the DOM class. So the size question is really about the underlying renderer code (lightbox, lens, embed), not the WC shell.

### Coordinator

Slim needs the coordinator for cross-instance menu dismiss (DOM + WC). Currently a gap — AlapUI and `<alap-link>` don't have it yet (framework adapters do). Must land for 3.1 polish. Full build extends the same coordinator to lightbox/lens dismiss.

### Lazy loading

Currently only `loading="lazy"` on embed iframes (browser-level).

Future possibility: slim loads eagerly, full renderers (lightbox/lens/embed) lazy-load via dynamic import on first use. Not needed at 23KB gzipped, but the slim/full entry point split would make this straightforward later.

### Alternative: granular entry points

Instead of slim/full, could do `alap/lightbox`, `alap/lens`, `alap/embed` as separate entry points. More flexible but more build config to maintain. Tree-shaking handles most of this for bundled consumers anyway — the slim/full split mainly matters for CDN/IIFE users.
