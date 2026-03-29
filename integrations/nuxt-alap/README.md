# nuxt-alap

Nuxt 3 integration for Alap — client plugin factory, Vue component re-exports, and optional Nuxt Content markdown support.

## Install

```bash
npm install nuxt-alap alap
```

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

<script setup>
import { AlapProvider, AlapLink } from 'nuxt-alap';
import config from '~/alap-config';
</script>
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

- [Vue adapter](../../src/ui/vue/) — the underlying component library
- [Eleventy integration](../eleventy-alap/) — another SSG integration pattern
- [Alap documentation](https://alap.info)

## License

Apache-2.0
