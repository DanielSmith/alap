# Svelte

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · **This Page** · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) · [Eleventy](eleventy.md) | [All docs](../README.md)

> Live version with interactive examples: https://alap.info/framework-guides/svelte

## Install

```bash
npm install alap svelte
```

## Setup

```svelte
<script>
  import { AlapProvider, AlapLink } from 'alap/svelte';
  import config from './alap-config';
</script>

<AlapProvider {config}>
  <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>
</AlapProvider>
```

## Components

Same Provider/Link/Hook pattern as React. Svelte-specific differences:

- Props passed as Svelte attributes (`config={config}`, `query=".coffee"`)
- Events via callback props (`onItemHover`, `onTriggerContext`)
- `useAlap()` returns a reactive object (Svelte 5 runes internally)

### `<AlapProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AlapConfig` | required | The link configuration |
| `menuTimeout` | `number` | from config | Auto-dismiss timeout override |

### `<AlapLink>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | required | Expression to evaluate |
| `anchorId` | `string` | — | Anchor ID for bare `@` macro |
| `mode` | `'dom' \| 'webcomponent' \| 'popover'` | `'dom'` | Rendering mode |
| `menuClassName` | `string` | — | CSS class on menu container |
| `listType` | `'ul' \| 'ol'` | from config | List element type |
| `maxVisibleItems` | `number` | from config | Scroll after N items |
| `onItemHover` | `(detail) => void` | — | Mouse enters menu item |
| `onItemContext` | `(detail) => void` | — | Right-click/ArrowRight on item |

### `useAlap()`

| Method | Signature | Description |
|--------|-----------|-------------|
| `query()` | `(expression, anchorId?) => string[]` | Expression to item IDs |
| `resolve()` | `(expression, anchorId?) => Array<{ id } & AlapLink>` | Expression to link objects |
| `getLinks()` | `(ids) => Array<{ id } & AlapLink>` | IDs to link objects |

## Example

```svelte
<script>
  import { AlapProvider, AlapLink } from 'alap/svelte';
  import config from './alap-config';

  function handleHover({ link }) {
    console.log('Hovering:', link.label);
  }
</script>

<AlapProvider {config}>
  <p>Famous <AlapLink query=".bridge" onItemHover={handleHover}>bridges</AlapLink>.</p>
  <p>Or try <AlapLink query=".coffee + .sf">SF cafes</AlapLink>.</p>
</AlapProvider>
```
