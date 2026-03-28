# Alpine.js

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · **This Page** · [Eleventy](eleventy.md) | [All docs](../README.md)

> Live version with interactive examples: https://alap.info/framework-guides/alpine

## Install

```bash
npm install alap alpinejs
```

## Setup

Alpine uses a **directive** (`x-alap`) instead of the Provider/Link pattern.

```html
<script type="module">
  import Alpine from 'alpinejs';
  import { alapPlugin } from 'alap/alpine';

  Alpine.plugin(alapPlugin);
  Alpine.start();
</script>
```

## `x-alap` directive

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | Yes | Expression to evaluate |
| `config` | `AlapConfig` | Yes | The link configuration |
| `listType` | `string` | No | `'ul'` or `'ol'` |
| `menuTimeout` | `number` | No | Auto-dismiss timeout |
| `maxVisibleItems` | `number` | No | Scroll limit |

## Example

```html
<script type="module">
  import Alpine from 'alpinejs';
  import { alapPlugin } from 'alap/alpine';
  import config from './config.js';

  Alpine.plugin(alapPlugin);
  Alpine.start();
</script>

<div x-data="{ config: config }">
  <p>Visit some <a x-alap="{ query: '.coffee', config: config }">cafes</a>
     or <a x-alap="{ query: '.nyc + .bridge', config: config }">NYC bridges</a>.</p>
</div>
```

No build step required — works with a `<script type="module">` tag.

## Styling

The Alpine adapter renders menus in the DOM (no Shadow DOM), so standard CSS applies. See [Vanilla DOM](vanilla-dom.md) for the selector reference (`#alapelem`, `.alapListElem`, etc.).
