# Svelte Editor

Alap config editor built with Svelte 5 and CSS custom properties. Ported from the [react-design](../react-design/) reference implementation.

**Title:** alap editor — svelte

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

## Svelte 5 Patterns

- Runes: `$state()`, `$derived()`, `$effect()`, `$props()`
- No external state library — runes provide fine-grained reactivity
- `Icon.svelte` wrapper with `?raw` SVG imports
- All styling via `--alap-*` CSS custom properties

## Stack

- [Svelte 5](https://svelte.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (utility classes)
- CSS custom properties (`--alap-*`) for all colors, shadows, transitions
- Vite meta-grabber plugin (dev-server URL metadata endpoint)

## Build

```bash
pnpm build    # 16.31 KB CSS + 96 KB JS
```

## Clean Up

```bash
rm -rf node_modules dist
```
