# Next.js App Router Pattern

Demonstrates the `next-alap` integration pattern — `AlapLayout` in the root layout, `AlapLink` in pages, plus web component mode for MDX content.

**Port:** 9210

## What it shows

A simulated Next.js App Router app with three "pages":

1. **Home** — React adapter components (`AlapLink`) with tag queries, macros, and direct items
2. **Bridges** — `useAlap()` hook for programmatic access alongside `AlapLink` components
3. **Web Component** — `<alap-link>` web components, demonstrating how MDX/Markdown content works in Next.js (web component hydrates independently of React)

## The pattern

In a real Next.js App Router project:

```tsx
// app/layout.tsx
import { AlapLayout } from 'next-alap';
import config from './alap-config';

export default function RootLayout({ children }) {
  return (
    <html><body>
      <AlapLayout config={config}>{children}</AlapLayout>
    </body></html>
  );
}

// app/page.tsx — no 'use client' needed
import { AlapLink } from 'next-alap';

export default function Page() {
  return <p>Visit <AlapLink query=".coffee">cafes</AlapLink>.</p>;
}
```

The key: importing from `next-alap` instead of `alap/react` means `'use client'` is already handled. Server components can import `AlapLink` directly.

## Running

```bash
./serve.sh
# → http://localhost:9210
```

Or from the repo root:
```bash
pnpm dev
# → http://localhost:5173/sites/next/
```

## Note

This example uses plain React + Vite to simulate the App Router pattern. It's not a real Next.js app (that would require `next dev`). The integration, layout component, and component API are identical — only the routing is simulated.

## See also

- [next-alap integration](../../../integrations/next-alap/) — the full package
- [React example](../react/) — the underlying React adapter
- [Web Component example](../web-component/) — `<alap-link>` in depth
