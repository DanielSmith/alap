# @alap/mdx

MDX integration for [Alap](https://alap.info) — transforms `[text](alap:query)` links in MDX content into React `<AlapLink>` components.

Unlike [remark-alap](../remark-alap/) (which emits `<alap-link>` web component HTML), this plugin emits JSX that resolves through React's `AlapProvider` context. Use this when your MDX content renders inside a React component tree.

For a working site, see the [MDX example](../../examples/sites/mdx/) (`examples/sites/mdx/`).

## Install

```bash
npm install alap @alap/mdx
```

## Exports

| Import | What you get |
|--------|-------------|
| `@alap/mdx` | Everything: remark plugin, provider, component map, `AlapLink` re-export |
| `@alap/mdx/remark` | `remarkAlapMDX` remark plugin only |
| `@alap/mdx/provider` | `AlapMDXProvider` and `alapComponents` only |

## MDX Syntax

Write standard Markdown links with the `alap:` protocol:

```md
Check out these [coffee spots](alap:.coffee).
The [best bridges](alap:@nycBridges) are worth visiting.
A specific item: [Golden Gate](alap:golden).
```

The remark plugin transforms these into `<AlapLink query=".coffee">coffee spots</AlapLink>` JSX elements during compilation.

For expressions with spaces or operators (`.nyc + .food`, `.a | .b`), use macros — Markdown parsers break on spaces in the URL portion.

## Setup

### Next.js (App Router)

```tsx
// mdx-components.tsx
import { alapComponents } from '@alap/mdx';

export function useMDXComponents(components) {
  return { ...components, ...alapComponents };
}
```

```tsx
// app/layout.tsx
import { AlapMDXProvider } from '@alap/mdx';
import config from './alap-config';

export default function Layout({ children }) {
  return <AlapMDXProvider config={config}>{children}</AlapMDXProvider>;
}
```

Add the remark plugin to your MDX config:

```js
// next.config.mjs
import createMDX from '@next/mdx';
import { remarkAlapMDX } from '@alap/mdx';

const withMDX = createMDX({ options: { remarkPlugins: [remarkAlapMDX] } });
export default withMDX(nextConfig);
```

### With @mdx-js/react (Docusaurus, custom setups)

```tsx
import { AlapMDXProvider, alapComponents } from '@alap/mdx';
import { MDXProvider } from '@mdx-js/react';

<MDXProvider components={alapComponents}>
  <AlapMDXProvider config={config}>{children}</AlapMDXProvider>
</MDXProvider>
```

### Direct import in MDX

If you prefer explicit imports over provider-based component mapping:

```mdx
import { AlapLink } from '@alap/mdx';

Here are some <AlapLink query=".coffee">cafes</AlapLink>.
```

`AlapProvider` must still be an ancestor in the React tree.

## Remark Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `componentName` | `string` | `'AlapLink'` | JSX component name to emit |
| `queryProp` | `string` | `'query'` | Prop name for the query expression |
| `className` | `string` | — | CSS class added to every emitted component |

## Provider Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `AlapConfig` | Alap configuration (required) |
| `children` | `ReactNode` | Content to wrap |
| `menuTimeout` | `number` | Override `settings.menuTimeout` |
| `defaultMenuStyle` | `CSSProperties` | Default inline styles for menus |
| `defaultMenuClassName` | `string` | Default CSS class for menus |

## How it differs from remark-alap

| | `remark-alap` | `@alap/mdx` |
|---|---|---|
| **Output** | `<alap-link>` web component HTML | `<AlapLink>` React JSX |
| **Resolution** | Web component registers config globally | React context via `AlapProvider` |
| **Use when** | Astro, Eleventy, any HTML pipeline | Next.js, Remix, Docusaurus, any React MDX setup |
| **Peer deps** | `alap` | `alap`, `react`, optionally `@mdx-js/react` |

Both transform the same `[text](alap:query)` syntax. Choose based on your rendering environment.

## See also

- [remark-alap](../remark-alap/) — web component output for non-React pipelines
- [rehype-alap](../rehype-alap/) — transform `<a href="alap:query">` from headless CMSs
- [Markdown cookbook](../../docs/cookbook/markdown.md) — patterns for Alap in content pipelines
- [React adapter guide](../../docs/framework-guides/react.md) — `AlapProvider`, `AlapLink`, `useAlap()`
