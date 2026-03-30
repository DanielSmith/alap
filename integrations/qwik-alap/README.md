# qwik-alap

Qwik City integration for [Alap](https://alap.info) — zero-config multi-target link menus.

A Vite plugin that auto-injects the web component registration and config loading into every page. No manual `<script>` tags needed.

## Install

```bash
npm install alap qwik-alap
```

## Setup

```ts
// vite.config.ts
import { qwikCity } from '@builder.io/qwik-city/vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { alapPlugin } from 'qwik-alap';

export default defineConfig({
  plugins: [
    qwikCity(),
    qwikVite(),
    alapPlugin({ config: './src/alap-config.ts' }),
  ],
});
```

Create your config file at `src/alap-config.ts`:

```typescript
import type { AlapConfig } from 'alap/core';

const config: AlapConfig = {
  allLinks: {
    golden:   { label: 'Golden Gate Bridge', url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge', tags: ['bridge', 'sf'] },
    brooklyn: { label: 'Brooklyn Bridge',    url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',   tags: ['bridge', 'nyc'] },
  },
  macros: {
    favorites: { linkItems: 'golden, brooklyn' },
  },
};

export default config;
```

## Usage

### Web Component

Use `<alap-link>` directly in any Qwik component — the plugin registers it globally:

```tsx
export default component$(() => {
  return (
    <p>Check out the <alap-link query=".bridge">bridges</alap-link>.</p>
  );
});
```

### Qwik Adapter

For deeper integration with Qwik's component model, resumability, and QRL event callbacks:

```tsx
import { AlapProvider, AlapLink } from 'alap/qwik';

export default component$(() => {
  return (
    <AlapProvider config={config}>
      <AlapLink query=".bridge">bridges</AlapLink>
    </AlapProvider>
  );
});
```

See the [Qwik adapter guide](../../docs/framework-guides/qwik.md) for the full API.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `string` | `'./src/alap-config.ts'` | Path to config file (must have a default export) |
| `configName` | `string` | — | Named config for multi-config setups |
| `validate` | `boolean` | `true` | Validate config at build time (warns, doesn't fail) |
| `injectStyles` | `boolean` | `false` | Inject minimal default stylesheet (light/dark mode) |

## Styling

Style the web component with `::part()` selectors:

```css
alap-link::part(menu) {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

alap-link::part(link):hover {
  background: #eff6ff;
  color: #2563eb;
}
```

Or pass `injectStyles: true` for sensible defaults with light/dark mode support.

See [Styling](../../docs/core-concepts/styling.md) for the full guide.

## See also

- [Qwik adapter guide](../../docs/framework-guides/qwik.md) — `AlapProvider`, `AlapLink`, QRL event callbacks
- [Web Component guide](../../docs/framework-guides/web-component.md) — `<alap-link>` in depth
- [Astro integration](../astro-alap/) — similar zero-config pattern for Astro
- [Next.js integration](../next-alap/) — similar pattern for Next.js App Router
