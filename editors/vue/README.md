# Vue Editor

Alap config editor built with Vue 3 (Composition API), Pinia, and Tailwind CSS. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — vue

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

## Vue Patterns

- `<script setup lang="ts">` single-file components
- `storeToRefs()` for reactive store access
- `computed()` for derived state
- `watch()` for side effects (store initialization)
- `vite-svg-loader` for SVG imports as Vue components

## Stack

- [Vue 3.5](https://vuejs.org/) + TypeScript (Composition API)
- [Pinia 3](https://pinia.vuejs.org/) (state)
- [Tailwind CSS 4](https://tailwindcss.com/) (styling)
- [vite-svg-loader](https://github.com/jpkleemans/vite-svg-loader) (SVG as components)
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Clean Up

```bash
rm -rf node_modules dist
```
