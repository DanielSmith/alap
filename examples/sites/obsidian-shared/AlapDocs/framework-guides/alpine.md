---
source: framework-guides/alpine.md
modified: '2026-04-15T15:42:57Z'
tags:
- framework_guides
title: Alpine.js
description: '**Framework Guides:** Vanilla DOM · Web Component · React · Vue · Svelte
  · SolidJS · Astro · **This Page** · Eleventy'
---
# Alpine.js

**[[framework-guides/README|Framework Guides]]:** [[framework-guides/vanilla-dom|Vanilla DOM]] · [[framework-guides/web-component|Web Component]] · [[framework-guides/react|React]] · [[framework-guides/vue|Vue]] · [[framework-guides/svelte|Svelte]] · [[framework-guides/solid|SolidJS]] · [[framework-guides/astro|Astro]] · **This Page** · [[framework-guides/eleventy|Eleventy]]

> Live version with interactive examples: https://alap.info/framework-guides/alpine

## Install

```bash
npm install alap alpinejs
```

## Setup

Alpine uses a **directive** (`x-alap`) instead of the Provider/Link pattern.

```html

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


<div x-data="{ config: config }">
  <p>Visit some <a x-alap="{ query: '.coffee', config: config }">cafes</a>
     or <a x-alap="{ query: '.nyc + .bridge', config: config }">NYC bridges</a>.</p>
</div>
```

No build step required — works with a `<script type="module">` tag.

## Styling

The Alpine adapter renders menus in the DOM (no Shadow DOM), so standard CSS applies. See [[framework-guides/vanilla-dom|Vanilla DOM]] for the selector reference (`#alapelem`, `.alapListElem`, etc.).
