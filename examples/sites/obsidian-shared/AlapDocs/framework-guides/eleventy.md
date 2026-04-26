---
source: framework-guides/eleventy.md
modified: '2026-04-15T15:42:57Z'
tags:
- framework_guides
title: Eleventy
description: '**Framework Guides:** Vanilla DOM · Web Component · React · Vue · Svelte
  · SolidJS · Astro · Alpine.js · **This Page**'
---
# Eleventy

**[[framework-guides/README|Framework Guides]]:** [[framework-guides/vanilla-dom|Vanilla DOM]] · [[framework-guides/web-component|Web Component]] · [[framework-guides/react|React]] · [[framework-guides/vue|Vue]] · [[framework-guides/svelte|Svelte]] · [[framework-guides/solid|SolidJS]] · [[framework-guides/astro|Astro]] · [[framework-guides/alpine|Alpine.js]] · **This Page**

## Install

```bash
npm install alap
```

> `eleventy-alap` is available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/eleventy-alap/`. To use it, clone the repo and reference it via pnpm workspace.

## Setup

```js
// eleventy.config.js
import alapPlugin from 'eleventy-alap';
import config from './alap-config.json' with { type: 'json' };

export default function(eleventyConfig) {
  eleventyConfig.addPlugin(alapPlugin, { config });
}
```

The plugin provides shortcodes and filters that work in Nunjucks, Liquid, and other Eleventy template languages.

## Interactive Mode

The `alapLink` paired shortcode outputs `<alap-link>` web components. Write it inline, the way you'd write a regular link:

```njk
<p>Check out some
  {% alapLink ".coffee" %}coffee spots{% endalapLink %}
  or famous
  {% alapLink ".bridge" %}bridges{% endalapLink %}.
</p>
```

Add the IIFE build and config to your page for client-side interactivity:

```html



```

### Expressions

The full expression language works — tags, intersections, unions, subtraction, macros:

```njk
<p>Only the
  {% alapLink ".nyc + .bridge" %}NYC bridges{% endalapLink %},
  or everything in
  {% alapLink ".nyc | .sf - .coffee" %}NYC and SF except coffee{% endalapLink %}.
</p>

<p>A macro:
  {% alapLink "@cars" %}favorite cars{% endalapLink %}.
</p>
```

## Filters

### `alapCount`

Returns the number of matching items for an expression:

```njk
<p>There are {{ ".coffee" | alapCount }} coffee spots
   and {{ ".bridge" | alapCount }} bridges in the config.</p>
```

### `alapResolve`

Returns the resolved link array for custom rendering:

```njk
{% set parks = ".park" | alapResolve %}
<div class="cards">
  {% for link in parks %}
    <a class="card" href="{{ link.url }}">{{ link.label }}</a>
  {% endfor %}
</div>
```

## Static Mode

The `alap` shortcode resolves expressions at build time and outputs plain HTML lists — zero client-side JavaScript:

```njk
{% alap ".coffee" %}
```

Outputs:

```html
<ul class="alap-menu">
  <li class="alap-item"><a href="https://..." target="fromAlap">Blue Bottle Coffee</a></li>
  <li class="alap-item"><a href="https://..." target="fromAlap">Stumptown Coffee</a></li>
</ul>
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `AlapConfig` | *required* | The Alap config object |
| `menuClass` | `string` | `'alap-menu'` | CSS class on the `<ul>`/`<ol>` wrapper (static mode) |
| `itemClass` | `string` | `'alap-item'` | CSS class on each `<li>` (static mode) |
| `listType` | `'ul' \| 'ol'` | from config or `'ul'` | List element type (static mode) |

## Styling

Interactive mode outputs `<alap-link>` web components, so styling works the same way — `--alap-*` custom properties and `::part()` selectors. See [[framework-guides/web-component|Web Component]] for the full CSS reference.

Static mode outputs plain HTML — style `.alap-menu` and `.alap-item` with regular CSS.

## Example

See [`examples/sites/eleventy/`](https://examples.alap.info/eleventy/) for a working example with both interactive and static modes.
