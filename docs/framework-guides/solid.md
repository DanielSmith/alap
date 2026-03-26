# SolidJS

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · **This Page** · [Astro](astro.md) · [Alpine.js](alpine.md) | [All docs](../README.md)

> Live version with interactive examples: https://alap.info/framework-guides/solid

## Install

```bash
npm install alap solid-js
```

## Setup

```tsx
import { AlapProvider, AlapLink } from 'alap/solid';
import config from './alap-config';

function App() {
  return (
    <AlapProvider config={config}>
      <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>
    </AlapProvider>
  );
}
```

## Components

Same Provider/Link/Hook pattern as React. SolidJS-specific differences:

- Fine-grained signals — only the accessed fields trigger re-render
- `useAlap()` returns signal-based accessors
- Uses `<Dynamic>` component internally for menu rendering

### `<AlapProvider>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AlapConfig` | required | The link configuration |
| `menuTimeout` | `number` | from config | Auto-dismiss timeout override |

### `<AlapLink>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | required | Expression to evaluate |
| `children` | `JSX.Element` | required | Trigger content |
| `anchorId` | `string` | — | Anchor ID for bare `@` macro |
| `mode` | `'dom' \| 'webcomponent' \| 'popover'` | `'dom'` | Rendering mode |
| `menuClassName` | `string` | — | CSS class on menu container |
| `listType` | `'ul' \| 'ol'` | from config | List element type |
| `maxVisibleItems` | `number` | from config | Scroll after N items |
| `onItemHover` | `(detail) => void` | — | Mouse enters menu item |
| `onItemContext` | `(detail) => void` | — | Right-click/ArrowRight on item |

### `useAlap()`

| Method | Signature | Description |
|--------|-----------|-------------|
| `query()` | `(expression, anchorId?) => string[]` | Expression to item IDs |
| `resolve()` | `(expression, anchorId?) => Array<{ id } & AlapLink>` | Expression to link objects |
| `getLinks()` | `(ids) => Array<{ id } & AlapLink>` | IDs to link objects |

## Example

```tsx
import { AlapProvider, AlapLink, useAlap } from 'alap/solid';
import config from './alap-config';

function CoffeeCount() {
  const { resolve } = useAlap();
  // Fine-grained: only re-renders when .coffee results change
  const count = () => resolve('.coffee').length;
  return <span>{count()} shops</span>;
}

function App() {
  return (
    <AlapProvider config={config}>
      <p>We know <CoffeeCount /> — <AlapLink query=".coffee">browse them</AlapLink>.</p>
    </AlapProvider>
  );
}
```
