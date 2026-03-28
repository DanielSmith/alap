# Alap + Eleventy

Demonstrates the `eleventy-alap` plugin with both static and interactive modes.

- **Static mode** — expressions resolved at build time, output is plain HTML lists (zero JS)
- **Interactive mode** — `<alap-link>` web components via the IIFE build

## Run

```bash
npm install
npm run dev
```

Opens at http://localhost:8080.

## How It Works

`eleventy.config.js` loads the plugin with an Alap config:

```js
import alapPlugin from 'eleventy-alap';
eleventyConfig.addPlugin(alapPlugin, { config });
```

Templates use Nunjucks shortcodes and filters:

```njk
{% alap ".coffee" %}              {# static list #}
{% alapLink ".bridge" %}bridges{% endalapLink %}  {# web component #}
{{ ".coffee" | alapCount }}       {# count filter #}
```
