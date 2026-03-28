# Site Examples

15 browser demos showing Alap in action across different adapters, theming approaches, and features.

Each example is self-contained with its own `serve.sh` for standalone running. Ports are unique so you can run multiple examples simultaneously.

## Start Here

New to Alap? Go through these three in order:

| # | Example | Port | What you'll learn |
|---|---------|------|-------------------|
| 1 | [basic](basic/) | 9020 | Expression fundamentals — IDs, tags, operators, parentheses, macros |
| 2 | [react](react/) | 9050 | Framework adapter pattern — Provider, Link, useAlap hook |
| 3 | [web-component](web-component/) | 9120 | Zero-framework — `<alap-link>` with Shadow DOM and `::part()` |

## Theming

| Example | Port | What it shows |
|---------|------|---------------|
| [styling](styling/) | 9080 | Per-anchor CSS classes, custom item classes, image triggers |
| [tailwind](tailwind/) | 9100 | Tailwind utilities via CSS custom properties, CDN-only |

## Framework Adapters

Each adapter follows the same pattern: `<AlapProvider>` wraps `<AlapLink>` components, `useAlap()` provides programmatic access.

| Example | Port | Framework | Notes |
|---------|------|-----------|-------|
| [react](react/) | 9050 | React 19 | Three rendering modes (DOM, web component, popover) |
| [vue](vue/) | 9110 | Vue 3 | SFC templates with `<script setup>` |
| [svelte](svelte/) | 9090 | Svelte 5 | Runes (`$state`, `$derived`, `$effect`) |
| [solid](solid/) | 9070 | SolidJS | Fine-grained signals, `Dynamic` component |
| [alpine](alpine/) | 9000 | Alpine.js | `x-alap` directive, no build step, CDN-loadable |
| [astro-integration](astro-integration/) | 9010 | Astro | Real Astro project with auto-inject integration |
| [hugo](hugo/) | 9170 | Hugo | Shortcode + web component (in active development) |

**Note:** The Astro example uses its own dev server (`npx astro dev`), not the shared Vite config.

## Advanced CSS

| Example | Port | What it shows |
|---------|------|---------------|
| [advanced-css-wc](advanced-css-wc/) | 9140 | Web Component — 55+ CSS custom properties, corner-shape, shadows, typography, motion, themes |
| [advanced-css-dom](advanced-css-dom/) | 9150 | DOM + Popover — same effects via light DOM CSS classes |

## Advanced

| Example | Port | What it shows |
|---------|------|---------------|
| [regex-search](regex-search/) | 9060 | `/key/opts` named patterns — field codes, sorting, age, limits |
| [external-data](external-data/) | 9160 | `:web:` protocol — API data as Alap links, mixed with local, scoped refiners |
| [hooks-and-media](hooks-and-media/) | 9030 | Image triggers, hover preview, context popup, event log |
| [markdown](markdown/) | 9040 | remark-alap plugin — `[text](alap:query)` in Markdown |

## Running

**Standalone** (from any example directory):
```bash
./serve.sh
```

**All from root** (from `alap/`):
```bash
pnpm dev                  # http://localhost:5173/sites/<name>/
```

**Run all concurrently** — each has a unique port, no conflicts.
