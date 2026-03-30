# React Design Editor

Alap config editor built with React 19, Zustand + Immer, and Tailwind CSS. Custom-styled UI with SVG icons.

I develop everything new to this editor first, and then port it to the others.

## Run

```bash
pnpm install
pnpm dev
```

## Features

- Create, edit, clone, delete link items and macros
- Tag-based filtering
- Drag-and-drop URLs (auto-fetches metadata) and JSON config files
- Live expression tester
- Import/export JSON configs via File System Access API

## Storage

Three modes, switchable in the UI:

- **Local** (default) — IndexedDB, no server needed
- **Remote** — all data on an Alap config server
- **Hybrid** — writes to both; local is primary, remote syncs in background

To use remote or hybrid mode, run any [Alap config server](../../examples/servers/) and point the editor to its host and port.

## Clean Up

```bash
rm -rf node_modules dist
```

## Stack

- [React 19](https://react.dev/) + TypeScript
- [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) (state)
- [Tailwind CSS 4](https://tailwindcss.com/) (styling)
- [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr) (SVG as components)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)
