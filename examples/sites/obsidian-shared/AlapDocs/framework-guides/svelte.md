---
source: framework-guides/svelte.md
modified: '2026-04-23T16:23:56Z'
tags:
- framework_guides
title: Svelte
description: '**Framework Guides:** Vanilla DOM · Web Component · React · Vue · **This
  Page** · SolidJS · Astro · Alpine.js · Eleventy'
---
# Svelte

**[[framework-guides/README|Framework Guides]]:** [[framework-guides/vanilla-dom|Vanilla DOM]] · [[framework-guides/web-component|Web Component]] · [[framework-guides/react|React]] · [[framework-guides/vue|Vue]] · **This Page** · [[framework-guides/solid|SolidJS]] · [[framework-guides/astro|Astro]] · [[framework-guides/alpine|Alpine.js]] · [[framework-guides/eleventy|Eleventy]]

> Live version with interactive examples: https://alap.info/framework-guides/svelte

## Install

```bash
npm install alap svelte
```

## Setup

```svelte


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
| `anchorId` | `string` | — | Identifier forwarded to `onTriggerHover` / `onTriggerContext` event details |
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


<AlapProvider {config}>
  <p>Famous <AlapLink query=".bridge">bridges</AlapLink>.</p>
  <p>Or try <AlapLink query=".coffee + .sf">SF cafes</AlapLink>.</p>
</AlapProvider>
```
