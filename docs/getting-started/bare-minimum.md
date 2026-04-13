# Bare Minimum Setup

**[Getting Started](README.md):** [Installation](installation.md) · [Quick Start](quick-start.md) · [Configuration](configuration.md) · **This Page**

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

  <script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
  <script>
    Alap.defineAlapLink();
    Alap.registerConfig({
      allLinks: {
        bluebottle:  { label: 'Blue Bottle Coffee', url: 'https://bluebottlecoffee.com',              tags: ['coffee', 'sf'] },
        stumptown:   { label: 'Stumptown Coffee',   url: 'https://stumptowncoffee.com',               tags: ['coffee'] },
        devocion:    { label: 'Devoción',            url: 'https://devocion.com',                      tags: ['coffee', 'nyc'] },
        golden_gate: { label: 'Golden Gate Bridge',  url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge', 'sf', 'landmark'] },
        brooklyn:    { label: 'Brooklyn Bridge',     url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',    tags: ['bridge', 'nyc', 'landmark'] },
        highline:    { label: 'The High Line',       url: 'https://www.thehighline.org',               tags: ['park', 'nyc'] },
      },
    });
  </script>

</body>
</html>
```

That's it. Click any link, get a menu. No npm, no build step, no framework.

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

## Next

- [Configuration](configuration.md) — the full config object
- [Using with a framework](with-framework.md) — Vue, Svelte, React, etc.
- [Full experience](full-experience.md) — lightbox, lens, and beyond
