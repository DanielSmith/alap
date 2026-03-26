# React + shadcn/ui Editor

Alap config editor built with React 19, shadcn/ui (Radix UI primitives), Zustand + Immer, and Tailwind CSS. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — react-shadcn

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
- Collapsible edit forms (Radix Collapsible) with advanced fields section
- Config drawer via Radix Sheet (slides from left)
- Dialogs via Radix Dialog (Settings, Load, Help, Confirm)
- Tooltips on toolbar buttons

## Storage

Three modes, switchable in the UI:

- **Local** (default) — IndexedDB, no server needed
- **Remote** — all data on an Alap config server
- **Hybrid** — writes to both; local is primary, remote syncs in background

Settings (storage mode, API URL) persist to `localStorage` under `dev.alap.editor.prefs` and are shared across all Alap editors on the same origin.

## shadcn/ui Components

Custom shadcn/ui components in `src/components/ui/`, styled with Alap's CSS custom properties:

- Button, Input, Badge, Select, Dialog, Sheet, Tabs, Collapsible, Tooltip

All components use `class-variance-authority` for variants and `tailwind-merge` for class composition.

## Stack

- [React 19](https://react.dev/) + TypeScript
- [Radix UI](https://www.radix-ui.com/) primitives (Dialog, Select, Tabs, Collapsible, Tooltip)
- [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) (state)
- [Tailwind CSS 4](https://tailwindcss.com/) + [class-variance-authority](https://cva.style/) + [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr) (SVG as components)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Build

```bash
pnpm build    # 29 KB CSS + 413 KB JS
```

## Clean Up

```bash
rm -rf node_modules dist
```
