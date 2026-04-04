# Qwik

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) · [Eleventy](eleventy.md) · **This Page** | [All docs](../README.md)

## Why Qwik + Alap

Qwik's defining feature is **resumability** — zero JavaScript executes until the user interacts. Alap already serializes query state into HTML attributes, so the engine, parser, and placement logic are only downloaded when someone actually clicks a link. Put 500 Alap menus on a page and the browser won't execute a single line of Alap's expression parser until the first hover.

## Install

```bash
npm install alap @builder.io/qwik
```

## Setup

```tsx
import { component$ } from '@builder.io/qwik';
import { AlapProvider, AlapLink } from 'alap/qwik';
import config from './alap-config';

export default component$(() => {
  return (
    <AlapProvider config={config}>
      <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>
    </AlapProvider>
  );
});
```

## Components

Same Provider/Link/Hook pattern as the other adapters, adapted for Qwik's resumable architecture:

- All components use `component$()` — Qwik's lazy-loadable component boundary
- Event handlers use `$()` closures — handler code downloads on demand, not at page load
- `useVisibleTask$` for browser-only effects (dismissal, placement, focus management)
- `noSerialize` wraps the AlapEngine — it only runs client-side, never serialized to HTML

### `<AlapProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AlapConfig` | required | The link configuration |
| `menuTimeout` | `number` | from config | Auto-dismiss timeout override |
| `defaultMenuClassName` | `string` | — | Default CSS class for all menus |

Children go inside the provider via Qwik's `<Slot />`:

```tsx
<AlapProvider config={config}>
  {/* AlapLink components here */}
</AlapProvider>
```

### `<AlapLink>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | required | Expression to evaluate |
| `anchorId` | `string` | — | Anchor ID for bare `@` macro |
| `mode` | `'dom' \| 'popover'` | `'dom'` | Rendering mode |
| `class` | `string` | — | CSS class on trigger |
| `menuClassName` | `string` | — | CSS class on menu container |
| `listType` | `'ul' \| 'ol'` | from config | List element type |
| `maxVisibleItems` | `number` | from config | Scroll after N items |
| `placement` | `string` | — | Placement string: compass + strategy, e.g. `"SE"`, `"SE, clamp"` |
| `gap` | `number` | 4 | Pixel gap between trigger and menu |
| `padding` | `number` | 8 | Minimum distance from viewport edges |
| `onTriggerHover$` | `QRL<(detail) => void>` | — | Mouse enters trigger |
| `onTriggerContext$` | `QRL<(detail) => void>` | — | Right-click trigger |
| `onItemHover$` | `QRL<(detail) => void>` | — | Mouse enters menu item |
| `onItemContext$` | `QRL<(detail) => void>` | — | Right-click/ArrowRight on item |

Trigger content goes inside via `<Slot />`:

```tsx
<AlapLink query=".coffee">cafes</AlapLink>
```

### `useAlap()`

| Method | Signature | Description |
|--------|-----------|-------------|
| `query` | `(expression, anchorId?) => string[]` | Expression to item IDs |
| `resolve` | `(expression, anchorId?) => Array<{ id } & AlapLink>` | Expression to full link objects |
| `getLinks` | `(ids) => Array<{ id } & AlapLink>` | IDs to full link objects |

Must be called inside an `<AlapProvider>`.

## Event hooks

Qwik callbacks use the `$` suffix convention — they're QRL (Qwik Resource Locator) functions that serialize across the lazy-loading boundary:

```tsx
<AlapLink
  query=".coffee"
  onItemHover$={$((detail) => {
    console.log('Hovering:', detail.link.label);
  })}
>
  cafes
</AlapLink>
```

## Qwik City Integration

For Qwik City projects, the `qwik-alap` integration auto-injects web component registration and config loading into every page:

```bash
npm install qwik-alap
```

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

Then use `<alap-link>` web components anywhere — no import needed:

```html
<alap-link query=".coffee">cafes</alap-link>
```

### Integration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config` | `string` | `'./src/alap-config.ts'` | Path to config file |
| `configName` | `string` | — | Named config for multi-config setups |
| `validate` | `boolean` | `true` | Validate config at build time |
| `injectStyles` | `boolean` | `false` | Inject default light/dark stylesheet |

## Adapter vs. Integration

| | Adapter (`alap/qwik`) | Integration (`qwik-alap`) |
|---|---|---|
| **What** | Framework-native components | Vite plugin for Qwik City |
| **When** | Full control, framework tree | Zero-config, web components |
| **Rendering** | Qwik components | `<alap-link>` custom elements |
| **Setup** | Manual Provider + config | One line in vite.config.ts |

Use the adapter when you want Qwik-native components in your component tree. Use the integration when you want automatic setup with the web component.

## See also

- [Web Component](web-component.md) — `<alap-link>` (used by the integration)
- [Styling](../core-concepts/styling.md) — CSS for menu appearance
- [Placement](../cookbook/placement.md) — compass-based positioning guide
