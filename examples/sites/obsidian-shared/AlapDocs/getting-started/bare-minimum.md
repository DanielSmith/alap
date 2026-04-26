---
source: getting-started/bare-minimum.md
modified: '2026-04-21T20:00:19Z'
tags:
- getting_started
title: Bare Minimum Setup
description: '**Getting Started:** Installation · Quick Start · Configuration · **This
  Page**'
---
# Bare Minimum Setup

**[[getting-started/README|Getting Started]]:** [[getting-started/installation|Installation]] · [[getting-started/quick-start|Quick Start]] · [[getting-started/configuration|Configuration]] · **This Page**

The simplest possible Alap: one script tag, a few links, done.

## CDN — zero build tools

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    alap-link { color: #2563eb; cursor: pointer; text-decoration: underline; }
    alap-link::part(menu) {
      background: white; border: 1px solid #ddd; border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 0.25rem 0;
    }
    alap-link::part(link) {
      display: block; padding: 0.5rem 1rem;
      color: #333; text-decoration: none;
    }
    alap-link::part(link):hover { background: #f0f7ff; color: #2563eb; }
  </style>
</head>
<body>

  <p>Find a great <alap-link query=".coffee">coffee spot</alap-link>.</p>
  <p>Explore famous <alap-link query=".bridge">bridges</alap-link>.</p>
  <p>Everything in <alap-link query=".nyc">New York</alap-link>.</p>

  
  

</body>
</html>
```

That's it. Click any link, get a menu. No npm, no build step, no framework.

Try it: <alap-link query=".coffee">Have some coffee</alap-link>

## npm — with a bundler

If you have a project with Vite, Webpack, or any bundler:

```bash
npm install alap
```

```typescript
import { defineAlapLink, registerConfig } from 'alap/slim';

defineAlapLink();

registerConfig({
  allLinks: {
    bluebottle:  { label: 'Blue Bottle Coffee', url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
    stumptown:   { label: 'Stumptown Coffee',   url: 'https://stumptowncoffee.com',  tags: ['coffee'] },
    golden_gate: { label: 'Golden Gate Bridge',  url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge'] },
  },
});
```

```html
<alap-link query=".coffee">coffee spots</alap-link>
```

Note the import from `alap/slim` — that's the lightweight entry point (8.8 KB gzipped) with just the engine, menus, and built-in protocols. No lightbox, lens, or embed code ships to your users.

## DOM mode (class-based triggers)

If you prefer regular `<a>` tags over a custom element:

```typescript
import { AlapUI } from 'alap/slim';

const ui = new AlapUI({
  allLinks: {
    bluebottle: { label: 'Blue Bottle', url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
    stumptown:  { label: 'Stumptown',   url: 'https://stumptowncoffee.com',  tags: ['coffee'] },
  },
});
```

```html
<a class="alap" data-alap-linkitems=".coffee">coffee spots</a>
```

AlapUI scans the page for `.alap` elements and binds click handlers. The menu appears in a shared `#alapelem` container.

## Slim vs Full — when to upgrade

Start with `alap/slim`. Move to the full `alap` import when you need:

| Feature | Slim | Full |
|---------|------|------|
| Menus (DOM + web component) | Yes | Yes |
| Expression engine (tags, operators, macros) | Yes | Yes |
| Web and JSON protocols | Yes | Yes |
| Cross-instance menu coordination | Yes | Yes |
| Lightbox renderer | — | Yes |
| Lens renderer | — | Yes |
| Embed (iframe rendering, consent) | — | Yes |
| AT Protocol (Bluesky feeds) | — | Yes |

Switching is a one-line import change — your config and HTML stay the same.

See the difference: <alap-lightbox query=".bridge">browse bridges in lightbox</alap-lightbox>

## Next

- [[getting-started/configuration|Configuration]] — the full config object
- [[getting-started/with-framework|Using with a framework]] — Vue, Svelte, React, etc.
- [[getting-started/all-together|All together]] — lightbox, lens, and beyond
