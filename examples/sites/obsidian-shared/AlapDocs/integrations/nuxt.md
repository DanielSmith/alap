---
source: integrations/nuxt.md
modified: '2026-04-15T15:42:57Z'
tags:
- integrations
title: nuxt-alap
description: Nuxt 3 integration for Alap — client plugin factory, Vue component re-exports,
  and optional Nuxt Content markdown support.
---
# nuxt-alap

Nuxt 3 integration for Alap — client plugin factory, Vue component re-exports, and optional Nuxt Content markdown support.

## Install

Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/nuxt-alap/`.

<details>
<summary>Install from the monorepo</summary>

```bash
git clone https://github.com/DanielSmith/alap.git
cd alap
pnpm install
pnpm build
cd integrations/nuxt-alap
pnpm build
```

Then add it to your project as a local dependency in your `package.json`:

```json
"nuxt-alap": "file:../path-to-alap/integrations/nuxt-alap"
```

</details>

## Quick start

### 1. Create the client plugin

```ts
// plugins/alap.client.ts
import { createAlapPlugin } from 'nuxt-alap';
import config from '~/alap-config';

export default createAlapPlugin({ config });
```

The `.client.ts` suffix ensures it only runs in the browser (no SSR `HTMLElement` errors).

### 2. Use in pages

```vue
<!-- pages/index.vue -->
<template>
  <AlapProvider :config="config">
    <p>Visit <AlapLink query=".coffee">cafes</AlapLink>.</p>
  </AlapProvider>
</template>


```

## What it provides

### `createAlapPlugin(options)`

Factory for a Nuxt client plugin. Registers the Alap config and web component.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `AlapConfig` | required | Link configuration |
| `configName` | `string` | — | Named config for multi-config setups |
| `webComponent` | `boolean` | `true` | Also register `<alap-link>` for Nuxt Content |

### Component re-exports

Convenience imports from `alap/vue`:

| Export | What |
|--------|------|
| `AlapProvider` | Vue provider component |
| `AlapLink` | Menu trigger component |
| `useAlap()` | Composable for programmatic access |

### `withAlap()` config wrapper

For Nuxt Content markdown support:

```ts
// nuxt.config.ts
import { withAlap } from 'nuxt-alap';

export default defineNuxtConfig(withAlap({
  modules: ['@nuxt/content'],
}, { markdown: true }));
```

Adds `remark-alap` to the Nuxt Content markdown pipeline so `[text](alap:query)` in `.md` files becomes `<alap-link>`.

## Web component in Nuxt Content

When `webComponent: true` (default), the client plugin registers `<alap-link>`. This means Nuxt Content markdown files can use the `alap:` link syntax, and the web components self-initialize client-side.

## Security

- **Client-only execution** — `createAlapPlugin` checks for `window` and uses dynamic `import('alap')` to avoid `HTMLElement` during SSR
- **No webpack plugins** — pure config manipulation, no build hooks
- **No eval or code generation** — `withAlap()` only merges config objects
- **Same security guarantees as `alap/vue`** — URL sanitization, config validation, parser limits

## See also

- [[framework-guides/vue|Vue adapter]] — the underlying component library (source: `src/ui/vue/`)
- [[integrations/eleventy|Eleventy integration]] — another SSG integration pattern

## License

Apache-2.0
