# Installation

**[Getting Started](README.md):** **This Page** · [Quick Start](quick-start.md) · [Configuration](configuration.md) | [All docs](../README.md)

Alap is a single package with **zero required dependencies**. Framework adapters are included but only activate when you import them — bring your own framework.

> Live version with interactive examples: https://alap.info/getting-started/installation

## npm

```bash
npm install alap
```

## What you get

| Import path | What it gives you | Peer dependencies |
|---|---|---|
| `alap` | Engine + DOM adapter + Web Component | None |
| `alap/core` | Engine + parser only (no DOM) | None |
| `alap/react` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` | `react`, `react-dom` |
| `alap/vue` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` | `vue` |
| `alap/svelte` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` | `svelte` |
| `alap/solid` | `AlapProvider`, `AlapLink`, `useAlap()` | `solid-js` |
| `alap/astro` | `AlapLink.astro`, `AlapSetup.astro` | `astro` |
| `alap/alpine` | `alapPlugin`, `x-alap` directive | `alpinejs` |
| `alap/storage` | IndexedDB + Remote + Hybrid persistence | `idb` (optional) |

Your bundler tree-shakes everything you don't import.

## CDN (no build step)

No npm, no bundler. Load the IIFE build from a CDN or local file:

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
```

**What's on `window.Alap`:**

| Export | What |
|--------|------|
| `defineAlapLink()` | Register the `<alap-link>` custom element |
| `registerConfig(config, name?)` | Feed a config to the web component registry |
| `updateRegisteredConfig(config, name?)` | Update a previously registered config |
| `AlapLinkElement` | The custom element class |
| `AlapUI` | DOM adapter — `new AlapUI(config, selector)` |
| `AlapEngine` | Programmatic engine — `new AlapEngine(config)` |
| `validateConfig(raw)` | Sanitize untrusted configs |
| `mergeConfigs(...configs)` | Compose multiple configs into one |

**Size:** ~27 KB (8.2 KB gzipped)

Works with static HTML, WordPress, Drupal, Shopify, GitHub Pages, Hugo, Jekyll, CodePen — anywhere you can add a `<script>` tag.

## Peer dependencies

Install only the ones for your framework:

```bash
npm install react react-dom    # for alap/react
npm install vue                # for alap/vue
npm install svelte             # for alap/svelte
npm install solid-js           # for alap/solid
npm install idb                # for alap/storage (IndexedDB only)
```

All peer dependencies are optional. If you import an adapter without its framework, you get a clear error telling you what to install.

## Environment compatibility

| Import | Browser | Node.js | Notes |
|--------|---------|---------|-------|
| `alap/core` | Yes | Yes | Pure logic, zero DOM references |
| `alap` | Yes | No | Web component uses `HTMLElement`, `customElements` |
| `alap/react` | Yes | SSR* | Needs React DOM |
| `alap/vue` | Yes | SSR* | Needs Vue runtime |
| `alap/svelte` | Yes | SSR* | Needs Svelte runtime |
| `alap/solid` | Yes | SSR* | Needs SolidJS runtime |
| `alap/alpine` | Yes | No | Needs `document` |
| `alap/astro` | Yes | Yes | Thin wrapper |
| `alap/storage` | Yes | Partial** | IndexedDB needs browser; RemoteStore works anywhere |

\* Framework adapters work in SSR contexts (Next.js, Nuxt, SvelteKit) where the framework provides its own server-side DOM abstraction.

\** `createRemoteStore()` works in Node.js (uses `fetch`). `createIndexedDBStore()` requires a browser.

## For contributors

```bash
git clone <repo>
cd alap
pnpm install    # installs everything needed for development
pnpm test       # runs all tests across core, UI, and storage
```
