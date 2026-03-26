# React Editor

Alap config editor built with React 19, Zustand + Immer, and Tailwind CSS. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — react

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

To use remote or hybrid mode, run any [Alap config server](../../examples/servers/) and set the API URL in Settings.

## Stack

- [React 19](https://react.dev/) + TypeScript
- [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) (state)
- [Tailwind CSS 4](https://tailwindcss.com/) (styling)
- [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr) (SVG as components)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Clean Up

```bash
rm -rf node_modules dist
```
