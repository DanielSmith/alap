# Editors

**[Cookbook](README.md):** [Language Ports](language-ports.md) · **This Page** · [Markdown](markdown.md) · [Rich-Text](rich-text.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md)

Visual tools for building and managing Alap link configurations.

> Live version: https://docs.alap.info/cookbook/editors

## Overview

Alap editors let users create items, assign tags, write macros, test expressions, and preview menus — all without editing JSON by hand. They consume the v3 library just like any other project (importing from `alap`, `alap/react`, etc.), which validates the public API.  They are functional proofs of concept, and there is much more that could be done with them.

## The seven editors

| Editor | Framework | State | CSS | Directory |
|--------|-----------|-------|-----|-----------|
| React + Zustand | React | Zustand + Immer | TailwindCSS | `editors/react-design/` |
| React + shadcn/ui | React | Zustand + Immer | TailwindCSS + shadcn | `editors/react-shadcn/` |
| Vue + Pinia | Vue 3 | Pinia | TailwindCSS | `editors/vue-pinia/` |
| Svelte + Runes | Svelte 5 | Svelte runes | TailwindCSS | `editors/svelte-runes/` |
| SolidJS + Signals | SolidJS | Solid signals | TailwindCSS | `editors/solid-signals/` |
| Astro + Vanilla TS | Astro | Vanilla TypeScript | TailwindCSS | `editors/astro-vanilla/` |
| Alpine + Bootstrap | Alpine.js | Alpine stores | Bootstrap 5 | `editors/alpine-bootstrap/` |

The `react-design/` editor is the reference implementation. All others are ports that maintain framework-idiomatic patterns while preserving the same feature set.

## Features

- **Drag-and-drop** — drop a URL onto the editor to auto-extract metadata (title, description, image) via a serverless meta-grabber function
- **Live expression tester** — type an expression and see which items match in real time
- **Tag management** — add, remove, and filter by tags
- **Macro editor** — create and test macros
- **Menu preview** — see the actual rendered menu for any expression
- **Persistence** — IndexedDB (local), RemoteStore (server), or HybridStore (offline-resilient)
- **Shared preferences** — editor settings persisted alongside configs

## Persistence strategy

The editors use the same `ConfigStore` interface as the library:

| Strategy | When to use |
|----------|-------------|
| IndexedDB | Single user, local browser storage |
| RemoteStore | Shared configs via one of the 11 server examples |
| HybridStore | Offline-first with background sync to remote |

```typescript
import { createIndexedDBStore } from 'alap/storage';

const store = await createIndexedDBStore();
await store.save('my-library', config);
```

## Running an editor

```bash
cd editors/react-design
npm install
npm run dev
```

Drag-and-drop metadata extraction works automatically in dev mode — a built-in Vite plugin serves the `/api/meta` endpoint locally. No external services needed.

## Workflow

1. Build your link library in the editor — add items, assign tags, write macros
2. Test expressions in the live tester
3. Export the config as JSON
4. Import into your project and use with any adapter

The editors are tools for building configs. The configs are what ship with your site.
