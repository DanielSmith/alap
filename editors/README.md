# Editors

Visual tools for building and managing Alap link configurations — create items, assign tags, write macros, test expressions, and preview menus without editing JSON by hand.

The v3 editors evolved from React and Vue proof-of-concept editors built for v2. `react-design/` is the reference implementation; the other seven are ports adapted to each framework's idioms.

## Implementations

| Editor | Framework | CSS/Components | State Management |
|--------|-----------|----------------|------------------|
| [react-design/](react-design/) | React 19 | Tailwind + CSS vars | Zustand + Immer |
| [react/](react/) | React 19 | Tailwind | Zustand + Immer |
| [react-shadcn/](react-shadcn/) | React 19 | shadcn/ui + Radix | Zustand + Immer |
| [vue/](vue/) | Vue 3 | PrimeVue 4.5 + Aura | Pinia |
| [svelte/](svelte/) | Svelte 5 | CSS Variables (`--alap-*`) | Runes store |
| [solid/](solid/) | SolidJS | Vanilla Extract | Signals store |
| [alpine/](alpine/) | Alpine.js | Bootstrap 5 (CDN) | Alpine.store() |
| [astro/](astro/) | Astro | Hand-written CSS | Vanilla TS pub/sub |

## Quick Start

```bash
cd editors/react-design   # or any editor
pnpm install
pnpm dev
```

## Features (all editors)

- Create, edit, clone, delete link items and macros
- Multi-edit — open multiple items or macros simultaneously
- Drag-and-drop URLs (auto-fetches metadata), images, and JSON config files
- Live expression tester with tag cloud and search pattern cloud
- Import/export JSON configs via File System Access API
- Collapsible edit forms with advanced fields
- Help dialog with expression grammar reference
- Tag pill remove, tag auto-population from metadata

## Storage

Three modes, switchable in the UI:

- **Local** (default) — IndexedDB via `alap/storage`, no server needed
- **Remote** — all data on an Alap config server
- **Hybrid** — writes to both; local is primary, remote syncs in background

To use Remote or Hybrid mode, run any [Alap config server](../examples/servers/) and configure the API URL in the editor's Settings.

## Shared Utilities

| File | Purpose |
|------|---------|
| [shared/file-io.ts](shared/file-io.ts) | File System Access API + fallback |
| [shared/meta-grabber-plugin.ts](shared/meta-grabber-plugin.ts) | Vite dev server plugin for URL metadata extraction |
| [shared/prefs.ts](shared/prefs.ts) | Shared preferences (`dev.alap.editor.prefs`) — storageMode and apiUrl persist across sessions and editors |
