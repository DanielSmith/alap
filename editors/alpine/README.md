# Alpine.js Editor

Alap config editor built with Alpine.js and Tailwind CSS. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — alpine

## Run

```bash
pnpm install
pnpm dev
```

## Features

- Create, edit, clone, delete link items and macros
- Tag-based filtering with tag pill remove
- Multi-edit — open multiple items or macros simultaneously
- Drag-and-drop URLs (auto-fetches metadata), images, and JSON config files
- Live expression tester with tag cloud and search pattern cloud
- Import/export JSON configs via File System Access API
- Configurable Remote API URL in Settings
- Collapsible edit forms with advanced fields section
- Help dialog with expression grammar reference

## Storage

Three modes, switchable in the UI:

- **Local** (default) — IndexedDB, no server needed
- **Remote** — all data on an Alap config server
- **Hybrid** — writes to both; local is primary, remote syncs in background

Settings (storage mode, API URL) persist to `localStorage` under `dev.alap.editor.prefs` and are shared across all Alap editors on the same origin.

## Alpine.js Patterns

- HTML-first — most UI is in `index.html` with Alpine directives
- `Alpine.store('editor')` for global reactive state
- `Alpine.data()` for component-scoped behavior
- `x-html` for SVG icons via `?raw` imports
- `Alpine.effect()` for reactive store initialization
- TypeScript store in `src/store/editor.ts`

### Query Tester menu

Other editors use their framework's `AlapLink` component (React, Vue, Solid, Svelte) to render an interactive test menu. Alpine doesn't have a component abstraction, so the test menu is built directly in the HTML with Alpine directives:

- `x-data="{ menuOpen: false }"` for local toggle state
- `@click`, `@click.outside`, `@keydown.escape` for open/dismiss
- `x-show` with `x-transition` for the dropdown
- `x-for` over the store's `testLinks` to render menu items
- Styled with the shared `.alapelem` CSS

No web component import, no JS changes — just directives and the data already in the store.

## Stack

- [Alpine.js 3](https://alpinejs.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (styling)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Build

```bash
pnpm build    # 81 KB JS
```

## Clean Up

```bash
rm -rf node_modules dist
```
