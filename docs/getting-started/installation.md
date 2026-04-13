# Installation

**[Getting Started](README.md):** **This Page** · [Quick Start](quick-start.md) · [Configuration](configuration.md)

Alap is a single package with **zero required dependencies**. Framework adapters are included but only activate when you import them — bring your own framework.

> Live version with interactive examples: https://alap.info/getting-started/installation

## npm

```bash
npm install alap
```

## What you get

| Import path | What it gives you | Peer dependencies |
|---|---|---|
| `alap` | Everything: engine, menus, lightbox, lens, embed, all protocols, coordinators | None |
| `alap/slim` | Engine + menus (DOM + WC) + web/json protocols + coordinator | None |
| `alap/core` | Engine + parser only (no DOM) | None |
| `alap/react` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` | `react`, `react-dom` |
| `alap/vue` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` | `vue` |
| `alap/svelte` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` | `svelte` |
| `alap/solid` | `AlapProvider`, `AlapLink`, `useAlap()` | `solid-js` |
| `alap/astro` | `AlapLink.astro`, `AlapSetup.astro` | `astro` |
| `alap/alpine` | `alapPlugin`, `x-alap` directive | `alpinejs` |
| `alap/qwik` | `AlapProvider`, `AlapLink`, `useAlap()` | `@builder.io/qwik` |
| `alap/storage` | IndexedDB + Remote + Hybrid persistence | `idb` (optional) |

CSS files for renderers are imported separately:

| Import path | What it styles |
|---|---|
| `alap/lightbox.css` | Lightbox overlay, image zoom, set navigation |
| `alap/lens.css` | Lens panel, tags, metadata layout |
| `alap/embed.css` | Embed iframes, consent prompt |
| `alap/transitions.css` | Shared renderer transition animations |

Your bundler tree-shakes everything you don't import. Start with `alap/slim` for the lightest footprint and upgrade to `alap` when you need renderers.

## CDN (no build step)

No npm, no bundler. Load the IIFE build from a CDN or local file:

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
```

For renderer CSS, add stylesheet links:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/alap@3/dist/lightbox.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/alap@3/dist/lens.css">
```

**What's on `window.Alap`:**

| Export | What |
|--------|------|
| `defineAlapLink()` | Register the `<alap-link>` custom element |
| `defineAlapLightbox()` | Register the `<alap-lightbox>` custom element |
| `defineAlapLens()` | Register the `<alap-lens>` custom element |
| `registerConfig(config, name?)` | Feed a config to the web component registry |
| `updateRegisteredConfig(config, name?)` | Update a previously registered config |
| `AlapLinkElement` | Menu web component class |
| `AlapLightboxElement` | Lightbox web component class |
| `AlapLensElement` | Lens web component class |
| `AlapUI` | DOM menu adapter — `new AlapUI(config)` |
| `AlapLightbox` | DOM lightbox — `new AlapLightbox(config)` |
| `AlapLens` | DOM lens — `new AlapLens(config)` |
| `AlapEngine` | Programmatic engine — `new AlapEngine(config)` |
| `RendererCoordinator` | Orchestrate transitions between renderers |
| `getInstanceCoordinator()` | Cross-instance menu dismiss coordinator |
| `validateConfig(raw)` | Sanitize untrusted configs |
| `mergeConfigs(...configs)` | Compose multiple configs into one |
| `webHandler`, `jsonHandler`, `atprotoHandler` | Built-in protocol handlers |
| `ProtocolCache` | Cache for protocol results |
| `createEmbed`, `grantConsent`, `revokeConsent` | Embed iframe rendering + consent |

**Size:** 142 KB (35.5 KB gzipped) — the full build with all renderers, protocols, and coordinators.

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
| `alap/slim` | Yes | No | Menus use DOM APIs |
| `alap` | Yes | No | Renderers and web components use DOM APIs |
| `alap/react` | Yes | SSR* | Needs React DOM |
| `alap/vue` | Yes | SSR* | Needs Vue runtime |
| `alap/svelte` | Yes | SSR* | Needs Svelte runtime |
| `alap/solid` | Yes | SSR* | Needs SolidJS runtime |
| `alap/alpine` | Yes | No | Needs `document` |
| `alap/qwik` | Yes | SSR* | Needs Qwik runtime |
| `alap/astro` | Yes | Yes | Thin wrapper |
| `alap/storage` | Yes | Partial** | IndexedDB needs browser; RemoteStore works anywhere |

\* Framework adapters work in SSR contexts (Next.js, Nuxt, SvelteKit) where the framework provides its own server-side DOM abstraction.

\** `createRemoteStore()` works in Node.js (uses `fetch`). `createIndexedDBStore()` requires a browser.

## Plugins & Integrations

Separate packages for specific platforms and content pipelines:

| Package | What | Install |
|---------|------|---------|
| `remark-alap` | Markdown → `<alap-link>` | `npm install remark-alap` |
| `rehype-alap` | HTML/CMS content → `<alap-link>` | `npm install rehype-alap` |
| `@alap/mdx` | MDX with React provider | `npm install @alap/mdx` |
| `@alap/tiptap` | Tiptap/ProseMirror extension | `npm install @alap/tiptap` |
| `astro-alap` | Astro integration (zero-config) | `npm install astro-alap` |
| `eleventy-alap` | Eleventy plugin (shortcodes + filters) | `npm install eleventy-alap` |
| `qwik-alap` | Qwik City integration (Vite plugin) | `npm install qwik-alap` |
| `next-alap` | Next.js App Router (`'use client'` + layout) | `npm install next-alap` |
| `nuxt-alap` | Nuxt 3 (client plugin + Nuxt Content) | `npm install nuxt-alap` |
| `vitepress-alap` | VitePress (Vite plugin + custom element) | `npm install vitepress-alap` |

For WordPress, see the [WordPress plugin](../../plugins/wordpress/) (no npm — PHP plugin with Docker containers).
For Hugo, see the [Hugo integration](../../integrations/hugo-alap/) (shortcodes + web component).

## For contributors

```bash
git clone <repo>
cd alap
pnpm install    # installs everything needed for development
pnpm test       # runs all tests across core, UI, and storage
```
