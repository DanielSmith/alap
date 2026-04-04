# Getting Started — Developers

This guide covers install, framework setup, configuration, storage, and integrations.

For the concepts, expression grammar, and editors, see [START-Creators.md](START-Creators.md).

---

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
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
```

See [Installation](docs/getting-started/installation.md) for full details.

---

## Quick Start

The fastest way to see Alap work — no framework, no bundler:

```html
<script type="module">
  import { registerConfig, defineAlapLink } from 'alap';

  defineAlapLink();
  registerConfig({
    allLinks: {
      golden:   { label: 'Golden Gate Bridge', url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge', 'sf'] },
      brooklyn: { label: 'Brooklyn Bridge',    url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',   tags: ['bridge', 'nyc'] },
      highline: { label: 'The High Line',      url: 'https://en.wikipedia.org/wiki/High_Line',         tags: ['nyc', 'park'] },
    },
  });
</script>

<p>Check out the <alap-link query=".bridge">bridges</alap-link>.</p>
<p>Or explore <alap-link query=".nyc">NYC spots</alap-link>.</p>
```

Click a link, get a menu. Keyboard navigation, ARIA roles, and auto-dismiss are built in.

See [examples/sites/basic/](examples/sites/basic/) for a runnable version.

---

## Framework Setup

### Web Component (no framework)

```html
<script type="module">
  import { registerConfig, defineAlapLink } from 'alap';

  defineAlapLink();
  registerConfig(config);
</script>

<alap-link query=".bridge">bridges</alap-link>
```

### DOM Mode (Vanilla JS)

For projects that don't use web components. Alap manages the menu container, events, and positioning.

```html
<script type="module">
  import { AlapUI } from 'alap';
  const ui = new AlapUI(config);
</script>

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
<script setup>
import { AlapProvider, AlapLink } from 'alap/vue';
</script>

<template>
  <AlapProvider :config="config">
    <AlapLink query=".bridge">bridges</AlapLink>
    <AlapLink query=".nyc | .sf">cities</AlapLink>
  </AlapProvider>
</template>
```

### Svelte

```svelte
<script>
  import { AlapProvider, AlapLink } from 'alap/svelte';
</script>

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
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
<script type="module">
  import { alapPlugin } from 'alap/alpine';
  document.addEventListener('alpine:init', () => Alpine.plugin(alapPlugin(config)));
</script>

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

  protocols: {
    time: { filter: timeHandler },                // :time:30d: — filter by recency
    loc:  { filter: locHandler },                 // :loc:40.7,-74.0:5mi: — filter by proximity
    web:  { generate: webHandler, keys: {/*…*/} },// :web:books:photography: — fetch from any JSON API
    atproto: { generate: atprotoHandler },        // :atproto:feed:with-alap: — live Bluesky data
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
.restaurant + :loc:here:1mi:      restaurants within a mile
:web:books:photography:limit=5:   books from an external JSON API
:atproto:feed:with-alap:          live posts from a Bluesky feed
```

Refiners shape and order the result set:

```
.coffee *sort:label* *limit:5*    top 5 alphabetically
.restaurant *shuffle* *limit:3*   3 random picks
(.nyc *limit:3*) | (.sf *limit:3*)   3 from each city
```

See [Protocols](docs/core-concepts/protocols.md) and [Refiners](docs/core-concepts/refiners.md).

See [Configuration](docs/getting-started/configuration.md) for full details.

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

To use remote storage, run any [Alap config server](examples/servers/). See [Servers](docs/api-reference/servers.md).

---

## Integrations

### Markdown (remark-alap)

Transform `[text](alap:query)` links in markdown into `<alap-link>` web components:

```bash
npm install remark-alap
```

```md
Check out the [best bridges](alap:@nycBridges) in the city.
Here are some [great cafes](alap:.coffee) nearby.
```

Works with Astro, Next.js, Nuxt, or any remark pipeline. See [remark-alap](plugins/remark-alap/) (`plugins/remark-alap/`) and the [remark-alap example](examples/sites/markdown/) (`examples/sites/markdown/`, `examples/sites/mdx/`).

### HTML / CMS Content (rehype-alap)

Transform `<a href="alap:query">` links from headless CMSs into `<alap-link>` web components:

```bash
npm install rehype-alap
```

For content from Contentful, Sanity, Strapi, WordPress API, Ghost. See [rehype-alap](plugins/rehype-alap/) (`plugins/rehype-alap/`) and the [rehype-alap example](examples/sites/cms-content/) (`examples/sites/cms-content/`).

### Tiptap (Rich Text)

Insert `<alap-link>` as an inline node in Tiptap editors:

```bash
npm install @alap/tiptap
```

See [tiptap-alap](plugins/tiptap-alap/) (`plugins/tiptap-alap/`) and the [tiptap-alap example](examples/sites/tiptap/) (`examples/sites/tiptap/`).

### Astro Integration

Zero-config setup — one line in your Astro config:

```bash
npm install astro-alap
```

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

Static or interactive link menus for Eleventy sites:

```bash
npm install eleventy-alap
```

See [eleventy-alap](integrations/eleventy-alap/) (`integrations/eleventy-alap/`) and the [eleventy-alap example](examples/sites/eleventy/) (`examples/sites/eleventy/`).

### Next.js Integration

`'use client'` component re-exports + layout component for the App Router:

```bash
npm install next-alap
```

See [next-alap](integrations/next-alap/) (`integrations/next-alap/`) and the [next-alap example](examples/sites/next/) (`examples/sites/next/`).

### Nuxt Integration

Client plugin factory + Vue component re-exports + Nuxt Content markdown:

```bash
npm install nuxt-alap
```

See [nuxt-alap](integrations/nuxt-alap/) (`integrations/nuxt-alap/`).

### Qwik City Integration

Vite plugin for Qwik City projects:

```bash
npm install qwik-alap
```

See [qwik-alap](integrations/qwik-alap/) (`integrations/qwik-alap/`).

### VitePress Integration

Vite plugin for VitePress documentation sites:

```bash
npm install vitepress-alap
```

See [vitepress-alap](integrations/vitepress-alap/) (`integrations/vitepress-alap/`).

### WordPress Plugin

`[alap]` shortcode for WordPress. SQLite containers — no MySQL needed:

See [wordpress-alap](plugins/wordpress/) (`plugins/wordpress/`) and the [WordPress demo](plugins/wordpress/demo/) (`plugins/wordpress/demo/`).

<!-- Docusaurus integration temporarily removed pending upstream dependency fix.
     Use remark-alap directly with Docusaurus in the meantime. -->

---

## Development

```bash
pnpm install
pnpm test         # 992 tests across 45 files
pnpm typecheck
pnpm build
```

## Further Reading

| Doc | What |
|-----|------|
| [Getting Started](docs/getting-started/) | Installation, quick start, configuration |
| [Core Concepts](docs/core-concepts/) | Expressions, macros, search patterns, refiners, styling |
| [Framework Guides](docs/framework-guides/) | 9 adapters (React, Vue, Svelte, Qwik, Astro, Alpine, Solid, Web Component, Vanilla DOM) + integrations (Eleventy, Next.js, Nuxt, Hugo, WordPress, htmx, and more) |
| [API Reference](docs/api-reference/) | Engine, types, events, storage, servers, security |
| [Cookbooks](docs/cookbook/) | Accessibility, editors, existing URLs, images, markdown, language ports |
| [FAQ](docs/FAQ.md) | Common questions |
