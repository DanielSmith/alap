# Eleventy

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) · **This Page** | [All docs](../README.md)

## Install

```bash
npm install alap eleventy-alap
```

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
<script src="/alap.iife.js"></script>
<script src="/config.js"></script>
<script>
  Alap.defineAlapLink();
  Alap.registerConfig(config);
</script>
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

Interactive mode outputs `<alap-link>` web components, so styling works the same way — `--alap-*` custom properties and `::part()` selectors. See [Web Component](web-component.md) for the full CSS reference.

Static mode outputs plain HTML — style `.alap-menu` and `.alap-item` with regular CSS.

## Example

See [`examples/sites/eleventy/`](../../examples/sites/eleventy/) for a working example with both interactive and static modes.
