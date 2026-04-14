# next-alap

Next.js integration for Alap — `'use client'` component re-exports, a layout component, and an optional MDX config wrapper for the App Router.

## Install

Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `integrations/next-alap/`.

<details>
<summary>Install from the monorepo</summary>

```bash
git clone https://github.com/DanielSmith/alap.git
cd alap
pnpm install
pnpm build
cd integrations/next-alap
pnpm build
```

Then add it to your project as a local dependency in your `package.json`:

```json
"next-alap": "file:../path-to-alap/integrations/next-alap"
```

</details>

## Quick start

```tsx
// app/layout.tsx
import { AlapLayout } from 'next-alap';
import config from './alap-config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AlapLayout config={config}>{children}</AlapLayout>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx — no 'use client' needed
import { AlapLink } from 'next-alap';

export default function Page() {
  return (
    <p>
      Check out these <AlapLink query=".coffee">cafes</AlapLink> and
      famous <AlapLink query=".bridge">bridges</AlapLink>.
    </p>
  );
}
```

## What it provides

### Client component re-exports

Importing from `next-alap` instead of `alap/react` means `'use client'` is already applied. Server components can use `AlapLink` directly without boundary errors.

| Export | What |
|--------|------|
| `AlapProvider` | React context provider (from `alap/react`, with `'use client'`) |
| `AlapLink` | Menu trigger component (from `alap/react`, with `'use client'`) |
| `useAlap()` | Hook for programmatic access (from `alap/react`, with `'use client'`) |
| `AlapLayout` | Layout component — wraps `AlapProvider` + optional web component registration |

### `AlapLayout`

Drop-in layout component for `app/layout.tsx`. Wraps `AlapProvider` and optionally registers the `<alap-link>` web component so MDX content also works.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `AlapConfig` | required | Link configuration |
| `configName` | `string` | — | Named config for multi-config setups |
| `children` | `ReactNode` | required | Layout children |
| `webComponent` | `boolean` | `true` | Also register `<alap-link>` for MDX/Markdown |
| `menuTimeout` | `number` | from config | Auto-dismiss override |
| `defaultMenuClassName` | `string` | — | Default CSS class for all menus |

### `withAlap()` config wrapper

Optional Next.js config wrapper for MDX integration:

```js
// next.config.mjs
import { withAlap } from 'next-alap/config';

export default withAlap({
  // your Next.js config
}, {
  markdown: true,  // disables mdxRs so remark plugins work
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `markdown` | `boolean` | `false` | Disable Rust MDX compiler for remark plugin support |

## MDX support

Two paths:

1. **`remark-alap`** — add to your MDX remark plugins. Authors write `[text](alap:query)` in MDX files.
2. **`@alap/mdx`** — React provider + remark transform for MDX content.

Both produce `<alap-link>` web components that `AlapLayout` registers automatically (when `webComponent` is true).

## Security

- **No eval or dynamic code generation** — `withAlap()` only sets config flags. The components are pure React re-exports.
- **Dynamic import for web component** — `AlapLayout` uses `import('alap')` inside `useEffect` to avoid `HTMLElement` reference during SSR. The import only runs in the browser.


## Vite only

This integration does not support webpack. Next.js has supported Vite as a bundler since v15, and it's the recommended path forward. If you're on webpack, use `alap/react` directly — it works fine, you just need to add `'use client'` yourself.

## See also

- [React adapter](../framework-guides/react.md) — the underlying component library (source: `src/ui/react/`)
- [Next.js example](https://examples.alap.info/next/) — interactive demo
- [Alap documentation](https://alap.info)

## License

Apache-2.0
