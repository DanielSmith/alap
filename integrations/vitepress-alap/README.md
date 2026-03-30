# vitepress-alap

VitePress integration for [Alap](https://alap.info) — use `<alap-link>` web components directly in your markdown documentation.

## Install

```bash
npm install alap vitepress-alap
```

## Setup

### Option A: IIFE + public config (simplest)

Copy `alap.iife.js` into `docs/public/`. Create a config script in `docs/public/docs-config.js`. Add both to VitePress head, and add the plugin:

```js
// docs/.vitepress/config.mjs
import { defineConfig } from 'vitepress';
import { alapPlugin } from 'vitepress-alap';

export default defineConfig({
  head: [
    ['script', { src: '/alap.iife.js' }],
    ['script', { src: '/docs-config.js' }],
  ],
  vite: {
    plugins: [alapPlugin()],
  },
});
```

The plugin registers `<alap-link>` as a custom element so Vue's template compiler passes it through. The IIFE and config scripts handle registration.

### Option B: Bundled config (auto-inject)

```js
// docs/.vitepress/config.mjs
import { defineConfig } from 'vitepress';
import { alapPlugin } from 'vitepress-alap';

export default defineConfig({
  vite: {
    plugins: [
      alapPlugin({ config: './alap-config.ts' }),
    ],
  },
});
```

The plugin injects the web component registration and config loading automatically. No `<script>` tags in `head` needed.

## Usage

Use `<alap-link>` anywhere in your markdown:

```md
Check out these <alap-link query=".coffee">cafes</alap-link>.

The <alap-link query=".nyc + .bridge">NYC bridges</alap-link> are worth visiting.

Browse the <alap-link query="@favorites">favorites</alap-link>.
```

The links render as clickable text. On click, a menu appears with the matching items from your config.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `string` | — | Path to config file (auto-injected). Omit to use IIFE + public scripts. |
| `configName` | `string` | — | Named config for multi-config setups |
| `validate` | `boolean` | `true` | Validate config at build time (warns, doesn't fail) |

## What the plugin does

1. Registers `<alap-link>` as a custom element in Vue's template compiler — without this, Vue treats it as an unknown component and drops it
2. Optionally injects the Alap setup script (web component registration + config loading)

That's it. The web component handles everything else — menus, keyboard nav, ARIA, positioning, dismiss behavior.

## See also

- [Web Component guide](../../docs/framework-guides/web-component.md) — `<alap-link>` in depth
- [Astro integration](../astro-alap/) — similar pattern for Astro/Starlight
- [Qwik City integration](../qwik-alap/) — similar pattern for Qwik
