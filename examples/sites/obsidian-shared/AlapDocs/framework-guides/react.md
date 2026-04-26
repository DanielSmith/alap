---
source: framework-guides/react.md
modified: '2026-04-23T16:23:34Z'
tags:
- framework_guides
title: React
description: '**Framework Guides:** Vanilla DOM · Web Component · **This Page** ·
  Vue · Svelte · SolidJS · Astro · Alpine.js · Eleventy'
---
# React

**[[framework-guides/README|Framework Guides]]:** [[framework-guides/vanilla-dom|Vanilla DOM]] · [[framework-guides/web-component|Web Component]] · **This Page** · [[framework-guides/vue|Vue]] · [[framework-guides/svelte|Svelte]] · [[framework-guides/solid|SolidJS]] · [[framework-guides/astro|Astro]] · [[framework-guides/alpine|Alpine.js]] · [[framework-guides/eleventy|Eleventy]]

> Live version with interactive examples: https://alap.info/framework-guides/react

## Install

```bash
npm install alap react react-dom
```

## Setup

```tsx
import { AlapProvider, AlapLink, useAlap } from 'alap/react';
import config from './alap-config';

function App() {
  return (
    <AlapProvider config={config}>
      <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>
    </AlapProvider>
  );
}
```

## `<AlapProvider>`

Context provider. Wrap your app or section.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AlapConfig` | required | The link configuration |
| `menuTimeout` | `number` | from config | Auto-dismiss timeout override |
| `defaultMenuStyle` | `CSSProperties` | — | Default inline styles for all menus |
| `defaultMenuClassName` | `string` | — | Default CSS class for all menus |

## `<AlapLink>`

Renders a trigger that opens a menu on click.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | required | Expression to evaluate |
| `children` | `ReactNode` | required | Trigger content |
| `anchorId` | `string` | — | Identifier forwarded to `onTriggerHover` / `onTriggerContext` event details |
| `mode` | `'dom' \| 'webcomponent' \| 'popover'` | `'dom'` | Rendering mode |
| `className` | `string` | — | CSS class on trigger |
| `menuClassName` | `string` | — | CSS class on menu container |
| `menuStyle` | `CSSProperties` | — | Inline styles on menu |
| `listType` | `'ul' \| 'ol'` | from config | List element type |
| `maxVisibleItems` | `number` | from config | Scroll after N items |
| `onTriggerHover` | `(detail) => void` | — | Mouse enters trigger |
| `onTriggerContext` | `(detail) => void` | — | Right-click on trigger |
| `onItemHover` | `(detail) => void` | — | Mouse enters menu item |
| `onItemContext` | `(detail) => void` | — | Right-click/ArrowRight on item |
| `onItemContextDismiss` | `(detail) => void` | — | ArrowLeft on item |

## `useAlap()`

Hook for programmatic access within a provider.

| Method | Signature | Description |
|--------|-----------|-------------|
| `query()` | `(expression, anchorId?) => string[]` | Expression to item IDs |
| `resolve()` | `(expression, anchorId?) => Array<{ id } & AlapLink>` | Expression to link objects |
| `getLinks()` | `(ids) => Array<{ id } & AlapLink>` | IDs to link objects |

## Examples

**Hover preview:**

```tsx
function PreviewLink({ query, children }) {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <AlapLink
        query={query} link }) => setPreview(link)}
      >
        {children}
      </AlapLink>
      {preview && (
        <div className="preview-card">
          <img src={preview.thumbnail} alt="" />
          <p>{preview.description}</p>
        </div>
      )}
    </>
  );
}
```

**Programmatic query:**

```tsx
function CoffeeSection() {
  const { resolve } = useAlap();
  const coffeeCount = resolve('.coffee').length;

  return (
    <p>We know {coffeeCount} <AlapLink query=".coffee">coffee spots</AlapLink>.</p>
  );
}
```

**Multi-config:**

```tsx
function NewsPage() {
  return (
    <AlapProvider config={newsConfig}>
      <AlapLink query=".politics">politics</AlapLink>
    </AlapProvider>
  );
}

function DocsPage() {
  return (
    <AlapProvider config={docsConfig}>
      <AlapLink query=".api">API docs</AlapLink>
    </AlapProvider>
  );
}
```
