# eleventy-alap

Eleventy plugin for [Alap](https://github.com/DanielSmith/alap) — multi-target link menus for static sites.

Two modes: **static** (zero JS, plain HTML lists) or **interactive** (`<alap-link>` web components).

## Install

```bash
npm install alap eleventy-alap
```

## Setup

```js
// .eleventy.js (or eleventy.config.js)
import alapPlugin from 'eleventy-alap';
import config from './alap-config.json' with { type: 'json' };

export default function(eleventyConfig) {
  eleventyConfig.addPlugin(alapPlugin, { config });
}
```

## Static Mode (Zero JS)

Resolve expressions at build time. The output is a plain `<ul>` — no JavaScript on the page.

```njk
{% alap ".nyc + .bridge" %}
```

Outputs:

```html
<ul class="alap-menu">
  <li class="alap-item"><a href="https://..." target="fromAlap">Brooklyn Bridge</a></li>
  <li class="alap-item"><a href="https://..." target="fromAlap">Manhattan Bridge</a></li>
</ul>
```

Works with tags, macros, operators, and any Alap expression:

```njk
{% alap "@favorites" %}
{% alap ".coffee | .bridge" %}
{% alap ".nyc + .landmark - .tourist" %}
```

## Interactive Mode (Web Component)

Output `<alap-link>` web components for client-side menus with click-to-open behavior:

```njk
{% alapLink ".coffee" %}cafes{% endalapLink %}
```

Outputs:

```html
<alap-link query=".coffee">cafes</alap-link>
```

You'll need to include the Alap web component script on the page for interactive mode.

## Filters

### `alapResolve`

Returns the resolved link array for custom rendering:

```njk
{% set bridges = ".nyc + .bridge" | alapResolve %}
{% for link in bridges %}
  <a href="{{ link.url }}">{{ link.label }}</a>
{% endfor %}
```

### `alapCount`

Returns the number of matching items:

```njk
{{ ".coffee" | alapCount }} cafes nearby
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `AlapConfig` | *required* | The Alap config object |
| `menuClass` | `string` | `'alap-menu'` | CSS class on the `<ul>`/`<ol>` wrapper |
| `itemClass` | `string` | `'alap-item'` | CSS class on each `<li>` |
| `listType` | `'ul' \| 'ol'` | from config or `'ul'` | List element type |

## Styling

Static mode outputs plain HTML — style it with your existing CSS:

```css
.alap-menu {
  list-style: none;
  padding: 0;
}

.alap-item a {
  display: block;
  padding: 4px 0;
  color: inherit;
  text-decoration: underline;
}
```

## Security

- All URLs are sanitized via `sanitizeUrl()` — `javascript:`, `data:`, `vbscript:` schemes are blocked
- All labels and URLs are HTML-escaped in static output
- Expression attributes are escaped in interactive output

## License

Apache-2.0
