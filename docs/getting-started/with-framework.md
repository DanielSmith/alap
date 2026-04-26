# Using Alap with a Framework

**[Getting Started](README.md):** [Installation](installation.md) · [Quick Start](quick-start.md) · [Configuration](configuration.md) · [Bare Minimum](bare-minimum.md) · **This Page**

Alap has native adapters for Vue, Svelte, React, SolidJS, Qwik, Alpine, and Astro. They all follow the same pattern: wrap your app in a Provider, drop in Link components, style with your framework's tools.

## Vue

```bash
npm install alap vue
```

```vue
<script setup>
import { AlapProvider, AlapLink } from 'alap/vue';

const config = {
  allLinks: {
    bluebottle:  { label: 'Blue Bottle Coffee', url: 'https://bluebottlecoffee.com', tags: ['coffee', 'sf'] },
    stumptown:   { label: 'Stumptown Coffee',   url: 'https://stumptowncoffee.com',  tags: ['coffee'] },
    golden_gate: { label: 'Golden Gate Bridge',  url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge', 'sf'] },
    brooklyn:    { label: 'Brooklyn Bridge',     url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',    tags: ['bridge', 'nyc'] },
  },
};
</script>

<template>
  <AlapProvider :config="config">
    <p>Find a <AlapLink query=".coffee">coffee spot</AlapLink>.</p>
    <p>Explore <AlapLink query=".bridge">bridges</AlapLink>.</p>
    <p>Everything in <AlapLink query=".sf">San Francisco</AlapLink>.</p>
  </AlapProvider>
</template>
```

The Provider gives all child AlapLinks access to the engine and config. The `query` prop is the same expression language as the web component's `query` attribute — tags, operators, macros all work.

## Svelte

```bash
npm install alap svelte
```

```svelte
<script>
  import { AlapProvider, AlapLink } from 'alap/svelte';

  const config = {
    allLinks: {
      bluebottle:  { label: 'Blue Bottle Coffee', url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
      golden_gate: { label: 'Golden Gate Bridge',  url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge'] },
    },
  };
</script>

<AlapProvider {config}>
  <p>Find a <AlapLink query=".coffee">coffee spot</AlapLink>.</p>
  <p>Explore <AlapLink query=".bridge">bridges</AlapLink>.</p>
</AlapProvider>
```

## React

```bash
npm install alap react react-dom
```

```tsx
import { AlapProvider, AlapLink } from 'alap/react';

const config = {
  allLinks: {
    bluebottle:  { label: 'Blue Bottle Coffee', url: 'https://bluebottlecoffee.com', tags: ['coffee'] },
    golden_gate: { label: 'Golden Gate Bridge',  url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge'] },
  },
};

function App() {
  return (
    <AlapProvider config={config}>
      <p>Find a <AlapLink query=".coffee">coffee spot</AlapLink>.</p>
      <p>Explore <AlapLink query=".bridge">bridges</AlapLink>.</p>
    </AlapProvider>
  );
}
```

## What the adapters give you

Every framework adapter provides:

- **`<AlapProvider>`** — wraps your component tree, provides engine + config via context
- **`<AlapLink>`** — renders a trigger, shows a menu on click, handles dismiss
- **`useAlap()`** — composable/hook for programmatic engine access
- **Cross-instance coordination** — only one menu open at a time, across all AlapLinks on the page (including any DOM or web component menus)

The menu rendering is framework-native: Vue renders with Vue, Svelte with Svelte. No shadow DOM, no portal hacks. Style the menu with your framework's CSS approach — scoped styles, Tailwind, CSS modules, whatever you're already using.

## Menu styling

Each adapter renders a plain `<ul>` (or `<ol>`) with `<a>` items. Style them directly:

```css
/* Works with all framework adapters */
.alapelem {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  padding: 0.25rem 0;
}

.alapListElem a {
  display: block;
  padding: 0.5rem 1rem;
  color: #333;
  text-decoration: none;
}

.alapListElem a:hover {
  background: #f0f7ff;
  color: #2563eb;
}
```

Or pass `menuClassName` and `menuStyle` props to individual AlapLinks for per-link customization.

## Rendering modes

Each `<AlapLink>` supports a `mode` prop:

| Mode | How the menu renders | When to use |
|------|---------------------|-------------|
| `'dom'` (default) | Framework-rendered `<div>` positioned with JS | Works everywhere |
| `'webcomponent'` | Delegates to `<alap-link>` custom element | Consistent shadow DOM styling |
| `'popover'` | Uses the Popover API (`popover="auto"`) | Modern browsers, native dismiss |

## Mixing adapters

You can use framework adapters and web components on the same page. The global coordinator ensures only one menu is open at a time, regardless of which adapter opened it:

```vue
<template>
  <AlapProvider :config="config">
    <!-- Framework adapter -->
    <AlapLink query=".coffee">coffee</AlapLink>

    <!-- Web component on the same page -->
    <alap-link query=".bridge">bridges</alap-link>
  </AlapProvider>
</template>
```

Click the web component, and the Vue menu closes. Click the Vue link, and the web component menu closes.

## Full adapter reference

Each framework has a detailed guide with all props, events, hooks, and SSR notes:

- [Vue](../framework-guides/vue.md)
- [Svelte](../framework-guides/svelte.md)
- [React](../framework-guides/react.md)
- [SolidJS](../framework-guides/solid.md)
- [Qwik](../framework-guides/qwik.md)
- [Alpine.js](../framework-guides/alpine.md)
- [Astro](../framework-guides/astro.md)

## Next

- [All together](all-together.md) — add lightbox, lens, and embed
- [Configuration](configuration.md) — the full config object
- [Expressions](../core-concepts/expressions.md) — the query language
