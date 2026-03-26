# Astro Editor

Alap config editor built with Astro 5 and a React island. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — astro

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

## Architecture

- `Layout.astro` — outer shell (head, fonts, body)
- `<Editor client:only="react" />` — React island, hydrates client-side only
- React sub-components in `src/components/editor/`
- Zustand + Immer store (same pattern as React editor)
- `vite-plugin-svgr` for SVG imports

## Stack

- [Astro 5](https://astro.build/) + `@astrojs/react`
- [React 19](https://react.dev/) + TypeScript (island)
- [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) (state)
- [Tailwind CSS 4](https://tailwindcss.com/) (styling)
- [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr) (SVG as components)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Clean Up

```bash
rm -rf node_modules dist .astro
```
