# Quick Start

**[Getting Started](README.md):** [Installation](installation.md) · **This Page** · [Configuration](configuration.md)

Build a working Alap link in 2 minutes.

> Live version with interactive examples: https://docs.alap.info/getting-started/quick-start

## The CDN path (no build tools)

One HTML file. No npm, no bundler, no framework.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    alap-link { color: blue; cursor: pointer; }
    alap-link::part(menu) { background: white; border: 1px solid #ccc; border-radius: 6px; }
    alap-link::part(link) { display: block; padding: 0.5rem 1rem; color: inherit; text-decoration: none; }
    alap-link::part(link):hover { background: #f0f0f0; }
  </style>
</head>
<body>

  <p>Check out some <alap-link query=".coffee">coffee shops</alap-link>.</p>

  <script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
  <script>
    Alap.defineAlapLink();
    Alap.registerConfig({
      allLinks: {
        bluebottle: { label: 'Blue Bottle',  url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
        devocion:   { label: 'Devocion',     url: 'https://devocion.com',          tags: ['coffee'] },
        stumptown:  { label: 'Stumptown',    url: 'https://stumptowncoffee.com',   tags: ['coffee'] },
      },
    });
  </script>

</body>
</html>
```

Click "coffee shops" and a menu appears with three links. That's it.

## What just happened

Three things, in order:

1. **`defineAlapLink()`** registers `<alap-link>` as a custom HTML element. The browser now knows what to do when it encounters that tag.

2. **`registerConfig()`** feeds your link library to the engine. Every `<alap-link>` on the page can now query against it.

3. **The `query` attribute** — `query=".coffee"` — tells this link to show all items tagged `coffee`. The engine resolves the query, the web component renders the menu.

## The npm path

If you're in a project with a bundler:

```bash
npm install alap
```

```typescript
import { defineAlapLink, registerConfig } from 'alap';

registerConfig({
  allLinks: {
    bluebottle: { label: 'Blue Bottle',  url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
    devocion:   { label: 'Devocion',     url: 'https://devocion.com',          tags: ['coffee'] },
    stumptown:  { label: 'Stumptown',    url: 'https://stumptowncoffee.com',   tags: ['coffee'] },
  },
});

defineAlapLink();
```

Same result, same `<alap-link>` tag in your HTML. TypeScript types are included.

## Growing from here

That first config had three links and one tag. Here's where it gets interesting.

**Add tags.** Give items multiple tags and combine them with operators:

```javascript
const config = {
  allLinks: {
    bluebottle: { label: 'Blue Bottle',     url: '...', tags: ['coffee', 'sf'] },
    devocion:   { label: 'Devocion',         url: '...', tags: ['coffee', 'nyc'] },
    brooklyn:   { label: 'Brooklyn Bridge',  url: '...', tags: ['bridge', 'nyc'] },
  },
};
```

```html
<alap-link query=".coffee + .sf">SF cafes</alap-link>
<alap-link query=".nyc">everything in NYC</alap-link>
<alap-link query=".nyc - .coffee">NYC, but not cafes</alap-link>
```

**Name specific items.** Use IDs when you want precision, not a dynamic set:

```html
<alap-link query="devocion, bluebottle">my favorites</alap-link>
```

**Add macros.** Name a query once, reuse it everywhere:

```javascript
macros: {
  favorites: { linkItems: 'devocion, bluebottle' },
}
```

```html
<alap-link query="@favorites">my favorites</alap-link>
```

**Use a framework.** If you're in React, Vue, Svelte, SolidJS, Astro, or Alpine, there's an adapter that feels native:

```jsx
import { AlapProvider, AlapLink } from 'alap/react';

<AlapProvider config={myConfig}>
  <AlapLink query=".coffee">cafes</AlapLink>
</AlapProvider>
```

See [Framework Guides](../framework-guides/) for your specific framework.

## The three pieces

Every Alap setup has the same three pieces, regardless of complexity:

1. **A config** — your link library (the data)
2. **A query** — what to show (the expression)
3. **A renderer** — how to show it (web component, DOM adapter, or framework adapter)

Start with the CDN script and a handful of links. Everything else — tags, operators, macros, framework adapters, storage, servers — layers on when you need it.

## Next steps

- [Configuration](configuration.md) — understand the config object
- [Expressions](../core-concepts/expressions.md) — the full query language
- [Framework Guides](../framework-guides/) — integrate with React, Vue, Svelte, etc.
