# Vue

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · [Web Component](web-component.md) · [React](react.md) · **This Page** · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) · [Eleventy](eleventy.md) | [All docs](../README.md)

> Live version with interactive examples: https://alap.info/framework-guides/vue

## Install

```bash
npm install alap vue
```

## Setup

```vue
<script setup>
import { AlapProvider, AlapLink } from 'alap/vue';
import config from './alap-config';
</script>

<template>
  <AlapProvider :config="config">
    <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>
  </AlapProvider>
</template>
```

## Components

Same Provider/Link/Hook pattern as React. Vue-specific differences:

- Props passed as Vue attributes (`:config`, `:query`)
- Events emitted as `@trigger-hover`, `@item-hover`, `@item-context`, etc.
- `useAlap()` is a composable (call in `<script setup>`)

### `<AlapProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AlapConfig` | required | The link configuration |
| `menuTimeout` | `number` | from config | Auto-dismiss timeout override |
| `defaultMenuStyle` | `object` | — | Default inline styles for all menus |
| `defaultMenuClassName` | `string` | — | Default CSS class for all menus |

### `<AlapLink>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | required | Expression to evaluate |
| `anchorId` | `string` | — | Anchor ID for bare `@` macro |
| `mode` | `'dom' \| 'webcomponent' \| 'popover'` | `'dom'` | Rendering mode |
| `menuClassName` | `string` | — | CSS class on menu container |
| `listType` | `'ul' \| 'ol'` | from config | List element type |
| `maxVisibleItems` | `number` | from config | Scroll after N items |

Events: `@trigger-hover`, `@trigger-context`, `@item-hover`, `@item-context`, `@item-context-dismiss`

### `useAlap()`

| Method | Signature | Description |
|--------|-----------|-------------|
| `query()` | `(expression, anchorId?) => string[]` | Expression to item IDs |
| `resolve()` | `(expression, anchorId?) => Array<{ id } & AlapLink>` | Expression to link objects |
| `getLinks()` | `(ids) => Array<{ id } & AlapLink>` | IDs to link objects |

## Example

```vue
<script setup>
import { AlapProvider, AlapLink, useAlap } from 'alap/vue';
import config from './alap-config';

const { resolve } = useAlap();

function handleHover({ link }) {
  console.log('Hovering:', link.label, link.thumbnail);
}
</script>

<template>
  <AlapProvider :config="config">
    <p>Check out <AlapLink query=".coffee" @item-hover="handleHover">cafes</AlapLink>.</p>
    <p>Or explore <AlapLink query=".nyc + .bridge">NYC bridges</AlapLink>.</p>
  </AlapProvider>
</template>
```
