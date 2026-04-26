---
source: start-dev.md
modified: '2026-04-23T01:26:15Z'
title: Getting Started — Developers
description: This guide covers install, framework setup, configuration, storage, and
  integrations.
---
# Getting Started — Developers

This guide covers install, framework setup, configuration, storage, and integrations.

For the concepts, expression grammar, and editors, see [[start-creators|For Creators]].

## Install

```bash
npm install alap
```

Import only what you need — unused adapters are tree-shaken:

| Import | What you get |
|--------|-------------|
| `alap` | Core + DOM adapter + Web Component |
| `alap/core` | Engine, parser, types — no DOM |
| `alap/react` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` |
| `alap/vue` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` |
| `alap/svelte` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` |
| `alap/astro` | `<AlapLink>`, `<AlapSetup>` |
| `alap/alpine` | `alapPlugin` — `x-alap` directive |
| `alap/solid` | `<AlapProvider>`, `<AlapLink>`, `useAlap()` |
| `alap/storage` | IndexedDB, REST client, hybrid store |

**No bundler?** Use the CDN:

```html

```

See [[getting-started/installation|Installation]] for full details.

---

## Quick Start

The fastest way to see Alap work — no framework, no bundler:

```html


<p>Check out the <alap-link query=".bridge">bridges</alap-link>.</p>
<p>Or explore <alap-link query=".nyc">NYC spots</alap-link>.</p>
```

Click a link, get a menu. Keyboard navigation, ARIA roles, and auto-dismiss are built in.

See [examples/sites/basic/](examples/sites/basic/) for a runnable version.

---

## Framework Setup

### Web Component (no framework)

```html


<alap-link query=".bridge">bridges</alap-link>
```

### DOM Mode (Vanilla JS)

For projects that don't use web components. Alap manages the menu container, events, and positioning.

```html


<a class="alap" data-alap-linkitems=".bridge">bridges</a>
```

### Popover Mode (Modern Browsers)

Framework adapters support the HTML Popover API — the browser handles dismiss, focus restoration, and stacking.

```tsx
<AlapLink query=".bridge" mode="popover">bridges</AlapLink>
```

Requires Chrome 114+, Firefox 125+, Safari 17+.

### React

```tsx
import { AlapProvider, AlapLink } from 'alap/react';

function App() {
  return (
    <AlapProvider config={config}>
      <AlapLink query=".bridge">bridges</AlapLink>
      <AlapLink query=".nyc | .sf">cities</AlapLink>
    </AlapProvider>
  );
}
```

### Vue

```vue


<template>
  <AlapProvider :config="config">
    <AlapLink query=".bridge">bridges</AlapLink>
    <AlapLink query=".nyc | .sf">cities</AlapLink>
  </AlapProvider>
</template>
```

### Svelte

```svelte


<AlapProvider {config}>
  <AlapLink query=".bridge">bridges</AlapLink>
  <AlapLink query=".nyc | .sf">cities</AlapLink>
</AlapProvider>
```

### Astro

```astro
---
import AlapSetup from 'alap/astro/AlapSetup.astro';
import AlapLink from 'alap/astro/AlapLink.astro';
---

<AlapSetup config={config} />
<AlapLink query=".bridge">bridges</AlapLink>
```

Or use `astro-alap` for zero-config setup — see [Integrations](#integrations).

### Alpine.js

```html



<span x-data x-alap="'.bridge'">bridges</span>
```

### SolidJS

```tsx
import { AlapProvider, AlapLink } from 'alap/solid';

function App() {
  return (
    <AlapProvider config={config}>
      <AlapLink query=".bridge">bridges</AlapLink>
    </AlapProvider>
  );
}
```

---

## Configuration

```typescript
const config = {
  settings: {
    listType: 'ul',            // 'ul' or 'ol'
    menuTimeout: 5000,         // auto-dismiss on mouseleave (ms)
    maxVisibleItems: 10,       // scroll after this many items (0 = no limit)
    viewportAdjust: true,      // flip menu to stay on-screen (default: true)
    existingUrl: 'prepend',    // 'prepend', 'append', or 'ignore' existing href
    hooks: ['item-hover'],     // global default hooks for all items
  },

  macros: {
    favorites: { linkItems: 'golden, brooklyn, .coffee' },
    nycBridges: { linkItems: '.nyc + .bridge' },
  },

  // Config holds protocol *data* (keys, cache TTLs, search presets).
  // The handler functions themselves are passed at engine construction —
  // see the `new AlapEngine(config, { handlers })` line below.
  protocols: {
    time: {},                            // :time:30d: — filter by recency (no data)
    location: {},                        // :location:radius:40.7,-74.0:5mi: (no data)
    web:  { keys: {/*…*/} },             // :web:books:photography: — JSON API data
    atproto: { cache: 5 },               // :atproto:feed:with-alap: — Bluesky data
  },

  searchPatterns: {
    wiki: { pattern: 'wikipedia\\.org', options: { fields: 'u' } },
    recent: { pattern: '.', options: { age: '7d', sort: 'newest' } },
  },

  allLinks: {
    golden: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['bridge', 'sf', 'landmark'],
      description: 'Iconic suspension bridge spanning the Golden Gate strait',
      thumbnail: '/img/golden-gate.jpg',
      cssClass: 'highlight',
      targetWindow: '_blank',
      hooks: ['item-hover', 'item-context'],
    },
    // ...
  },
};

// Wire the handlers at engine construction (or `registerConfig(config, { handlers })`
// for the web-component / framework-adapter path).
import { AlapEngine, timeHandler, locationHandler, webHandler, atprotoHandler } from 'alap';

const engine = new AlapEngine(config, {
  handlers: {
    time: { filter: timeHandler },
    location: { filter: locationHandler },
    web: webHandler,         // bare-function shorthand for `{ generate: webHandler }`
    atproto: atprotoHandler,
  },
});
```

### Link Fields

| Field | Type | Purpose |
|-------|------|---------|
| `label` | string | Display text (required unless `image` is set) |
| `url` | string | Destination URL |
| `tags` | string[] | Tags for expression matching |
| `image` | string | Image URL — renders photo instead of text |
| `altText` | string | Alt text for image items |
| `description` | string | For hover previews and search |
| `thumbnail` | string | Preview image (metadata, not rendered in menu) |
| `cssClass` | string | Custom CSS class on the `<li>` |
| `targetWindow` | string | Link target (`_blank`, `_self`, etc.) |
| `guid` | string | Permanent UUID for tracking |
| `hooks` | string[] | Event hooks this item participates in |
| `createdAt` | string/number | For regex search age/sort filters |
| `meta` | object | Arbitrary key-value data for protocol handlers (e.g. `timestamp`, `location`, `price`) |

### Protocols and Refiners

Protocols filter or generate links based on dynamic dimensions — time, location, external APIs:

```
.coffee + :time:30d:              coffee added this month
.restaurant + :location:radius:40.7,-74.0:1mi:    restaurants within a mile
:web:books:photography:limit=5:   books from an external JSON API
:atproto:feed:with-alap:          live posts from a Bluesky feed
```

Refiners shape and order the result set:

```
.coffee *sort:label* *limit:5*    top 5 alphabetically
.restaurant *shuffle* *limit:3*   3 random picks
(.nyc *limit:3*) | (.sf *limit:3*)   3 from each city
```

See [[core-concepts/protocols|Protocols]] and [[core-concepts/refiners|Refiners]].

See [[getting-started/configuration|Configuration]] for full details.

---

## Storage

Persist configs across sessions or share across devices:

```typescript
import { createIndexedDBStore, createRemoteStore, createHybridStore } from 'alap/storage';

// Local only
const local = await createIndexedDBStore();

// Remote only
const remote = createRemoteStore({ baseUrl: 'https://api.example.com' });

// Hybrid: write-through to both, read local first, sync from remote
const store = createHybridStore({ local, remote });

await store.save('my-config', config);
const loaded = await store.load('my-config');
```

To use remote storage, run any [Alap config server](examples/servers/). See [[api-reference/servers|Servers]].

---

## Integrations

### Markdown (remark-alap)

Transform `[text](alap:query)` links in markdown into `<alap-link>` web components.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `plugins/remark-alap/`. See [[plugins/remark-alap|full setup instructions]].

```md
Check out the [best bridges](alap:@nycBridges) in the city.
Here are some [great cafes](alap:.coffee) nearby.
```

Works with Astro, Next.js, Nuxt, or any remark pipeline. See [remark-alap](plugins/remark-alap/) (`plugins/remark-alap/`) and the [remark-alap example](examples/sites/markdown/) (`examples/sites/markdown/`, `examples/sites/mdx/`).

### HTML / CMS Content (rehype-alap)

Transform `<a href="alap:query">` links from headless CMSs into `<alap-link>` web components.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `plugins/rehype-alap/`. See [[plugins/rehype-alap|full setup instructions]].

For content from Contentful, Sanity, Strapi, WordPress API, Ghost. See [rehype-alap](plugins/rehype-alap/) (`plugins/rehype-alap/`) and the [rehype-alap example](examples/sites/cms-content/) (`examples/sites/cms-content/`).

### Tiptap (Rich Text)

Insert `<alap-link>` as an inline node in Tiptap editors.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `plugins/tiptap-alap/`. See [[plugins/tiptap-alap|full setup instructions]].

See [tiptap-alap](plugins/tiptap-alap/) (`plugins/tiptap-alap/`) and the [tiptap-alap example](examples/sites/tiptap/) (`examples/sites/tiptap/`).

### Astro Integration

Zero-config setup — one line in your Astro config.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/astro-alap/`. See [[integrations/astro|full setup instructions]].

```js
// astro.config.mjs
import { alapIntegration } from 'astro-alap';

export default defineConfig({
  integrations: [
    alapIntegration({ config: './src/alap-config.ts', markdown: true }),
  ],
});
```

See [astro-alap](integrations/astro-alap/) (`integrations/astro-alap/`) and the [astro-alap example](examples/sites/astro-integration/) (`examples/sites/astro-integration/`).

### Eleventy Plugin

Static or interactive link menus for Eleventy sites.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/eleventy-alap/`. See [[integrations/eleventy|full setup instructions]].

See [eleventy-alap](integrations/eleventy-alap/) (`integrations/eleventy-alap/`) and the [eleventy-alap example](examples/sites/eleventy/) (`examples/sites/eleventy/`).

### Next.js Integration

`'use client'` component re-exports + layout component for the App Router.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/next-alap/`. See [[integrations/next|full setup instructions]].

See [next-alap](integrations/next-alap/) (`integrations/next-alap/`) and the [next-alap example](examples/sites/next/) (`examples/sites/next/`).

### Nuxt Integration

Client plugin factory + Vue component re-exports + Nuxt Content markdown.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/nuxt-alap/`. See [[integrations/nuxt|full setup instructions]].

See [nuxt-alap](integrations/nuxt-alap/) (`integrations/nuxt-alap/`).

### Qwik City Integration

Vite plugin for Qwik City projects.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/qwik-alap/`. See [[integrations/qwik-city|full setup instructions]].

See [qwik-alap](integrations/qwik-alap/) (`integrations/qwik-alap/`).

### VitePress Integration

Vite plugin for VitePress documentation sites.

> Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/vitepress-alap/`. See [[integrations/vitepress|full setup instructions]].

See [vitepress-alap](integrations/vitepress-alap/) (`integrations/vitepress-alap/`).

### WordPress Plugin

`[alap]` shortcode for WordPress. SQLite containers — no MySQL needed:

See [wordpress-alap](plugins/wordpress/) (`plugins/wordpress/`) and the [WordPress demo](plugins/wordpress/demo/) (`plugins/wordpress/demo/`).

<!-- Docusaurus integration temporarily removed pending upstream dependency fix.
     Use remark-alap directly with Docusaurus in the meantime. -->

---

## Development

This is a pnpm workspace with [Turborepo](https://turborepo.dev) for build orchestration.

```bash
pnpm install          # install all workspace packages
                      # (override warnings from editors are expected — see note below)

# Root library
pnpm build            # ESM + CJS + IIFE + type declarations
pnpm test             # 992 tests across 45 files
pnpm typecheck

# Entire workspace (via Turborepo)
pnpm build:all        # root library first, then all packages in parallel
pnpm test:all         # tests across all workspace packages
pnpm typecheck:all    # type-check everything
```

> **Override warnings during install:** pnpm warns that `pnpm.overrides` in editor
> `package.json` files "will not take effect" in workspace mode. This is expected —
> the root workspace overrides handle it. The editor-level overrides exist so each
> editor can also be installed standalone with patched dependencies.

```bash
# Filtered builds
pnpm turbo run build --filter=alap-editor-react...   # one editor + its deps
pnpm turbo run build --filter=./integrations/*        # all integrations
```

## Further Reading

| Doc | What |
|-----|------|
| [Getting Started](getting-started/) | Installation, quick start, configuration |
| [Core Concepts](core-concepts/) | Expressions, macros, search patterns, refiners, styling |
| [Framework Guides](framework-guides/) | 9 adapters (React, Vue, Svelte, Qwik, Astro, Alpine, Solid, Web Component, Vanilla DOM) + integrations (Eleventy, Next.js, Nuxt, Hugo, WordPress, htmx, and more) |
| [API Reference](api-reference/) | Engine, types, events, storage, servers, security |
| [Cookbooks](cookbook/) | Accessibility, editors, existing URLs, images, markdown, language ports |
| [[FAQ]] | Common questions |
