# SolidJS Editor

Alap config editor built with SolidJS and Tailwind CSS. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — solid

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

## SolidJS Patterns

- `createSignal` for reactive state, `createMemo` for derived values
- `createRoot` singleton store (no external state library)
- `<Show>` and `<For>` for conditional and list rendering
- `Icon.tsx` wrapper with `?raw` SVG imports
- `createEffect` for side effects (store initialization)

## Stack

- [SolidJS 1.9](https://www.solidjs.com/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (styling)
- [vite-plugin-solid](https://github.com/solidjs/vite-plugin-solid)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Build

```bash
pnpm build    # 6.83 KB CSS + 74 KB JS
```

## Clean Up

```bash
rm -rf node_modules dist
```
