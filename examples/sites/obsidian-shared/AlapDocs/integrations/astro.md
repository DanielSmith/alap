---
source: integrations/astro.md
modified: '2026-04-15T15:42:57Z'
tags:
- integrations
title: astro-alap
description: Astro integration for Alap — zero-config multi-target link menus.
---
# astro-alap

Astro integration for [Alap](https://github.com/DanielSmith/alap) — zero-config multi-target link menus.

One install, one line in your Astro config, and `<alap-link>` works on every page. No per-page imports, no setup components, no boilerplate.

## Install

Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/astro-alap/`.

<details>
<summary>Install from the monorepo</summary>

```bash
git clone https://github.com/DanielSmith/alap.git
cd alap
pnpm install
pnpm build
cd integrations/astro-alap
pnpm build
```

Then add it to your project as a local dependency in your `package.json`:

```json
"astro-alap": "file:../path-to-alap/integrations/astro-alap"
```

For markdown support, `remark-alap` is also available as a workspace package.

</details>

## Setup

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { alapIntegration } from 'astro-alap';

export default defineConfig({
  integrations: [
    alapIntegration({
      config: './src/alap-config.ts',
    }),
  ],
});
```

Create your config file:

```ts
// src/alap-config.ts
export default {
  settings: { listType: 'ul', menuTimeout: 5000 },
  macros: {
    favorites: { linkItems: '.coffee, .bridge' },
  },
  allLinks: {
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf'],
    },
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
    },
  },
};
```

## Usage

### In `.astro` files

```html
<p>Check out these <alap-link query=".coffee">cafes</alap-link>.</p>
```

### In markdown (requires `markdown: true`)

```md
Check out these [cafes](alap:.coffee).

The [best bridges](alap:@favorites) are worth visiting.
```

### In MDX

```mdx
Visit the <alap-link query=".bridge">bridges</alap-link>.
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `string` | `'./src/alap-config.ts'` | Path to config file (must have a default export) |
| `markdown` | `boolean` | `false` | Auto-register remark-alap for `.md`/`.mdx` support |
| `configName` | `string` | `undefined` | Named config (for multi-config sites) |
| `validate` | `boolean` | `true` | Validate config at build time (warns, doesn't fail) |
| `injectStyles` | `boolean` | `false` | Inject default light/dark CSS for menus |

## Default Styles

Enable with `injectStyles: true`. Provides sensible defaults for the web component's `::part()` selectors — light and dark mode, spacing, hover states. Override with your own CSS:

```css
/* Your overrides take precedence */
alap-link::part(menu) {
  background: #f0f9ff;
  border-radius: 12px;
}
```

## Multiple Configs

For sites with separate link libraries per section:

```js
export default defineConfig({
  integrations: [
    alapIntegration({ config: './src/blog-links.ts', configName: 'blog' }),
    alapIntegration({ config: './src/docs-links.ts', configName: 'docs' }),
  ],
});
```

Then reference by name:

```html
<alap-link query=".tutorial" config="docs">tutorials</alap-link>
<alap-link query=".recipe" config="blog">recipes</alap-link>
```

## What It Does

The integration uses Astro's `injectScript` hook to add a small setup script to every page:

1. Registers the `<alap-link>` web component via `defineAlapLink()`
2. Loads and registers your config via `registerConfig()`
3. Optionally validates the config via `validateConfig()`
4. Optionally injects default styles
5. Optionally registers `remark-alap` for markdown transforms

No runtime overhead beyond what the Alap library itself adds. The setup script runs once per page load.

## License

Apache-2.0
