# Site Examples

29 browser demos showing Alap in action across different adapters, theming approaches, and features.

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
| [next](next/) | 9210 | Next.js | App Router pattern — layout, pages, web component mode |
| [vitepress](vitepress/) | — | VitePress | `vitepress-alap` plugin with `<alap-link>` in markdown |
| [hugo](hugo/) | — | Hugo | Shortcode + web component |
| [eleventy](eleventy/) | — | Eleventy | `eleventy-alap` plugin with shortcodes |

**Note:** The Astro example uses its own dev server (`npx astro dev`), not the shared Vite config. Hugo and Eleventy examples use their own build tools.

## Advanced CSS

| Example | Port | What it shows |
|---------|------|---------------|
| [advanced-css-wc](advanced-css-wc/) | 9140 | Web Component — 55+ CSS custom properties, corner-shape, shadows, typography, motion, themes |
| [advanced-css-dom](advanced-css-dom/) | 9150 | DOM + Popover — same effects via light DOM CSS classes |

## Content Pipelines

| Example | Port | What it shows |
|---------|------|---------------|
| [markdown](markdown/) | 9040 | `remark-alap` plugin — `[text](alap:query)` in Markdown |
| [mdx](mdx/) | 9060 | `@alap/mdx` — React JSX in MDX content |
| [cms-content](cms-content/) | 9200 | `rehype-alap` — live editor transforming CMS HTML into Alap menus |
| [tiptap](tiptap/) | — | `tiptap-alap` — Alap links as inline nodes in a rich-text editor |

## Protocols and Dynamic Data

| Example | Port | What it shows |
|---------|------|---------------|
| [external-data](external-data/) | 9160 | `:web:` protocol — API data as Alap links, mixed with local, scoped refiners |
| [bluesky-atproto](bluesky-atproto/) | 9170 | `:atproto:` protocol — live Bluesky feeds, profiles, search, combined with static data and `:web:` |

## Advanced Features

| Example | Port | What it shows |
|---------|------|---------------|
| [regex-search](regex-search/) | 9060 | `/key/opts` named patterns — field codes, sorting, age, limits |
| [hooks-and-media](hooks-and-media/) | 9030 | Image triggers, hover preview, context popup, event log |
| [placement](placement/) | 9170 | Compass-based menu positioning — 9 positions with viewport containment |
| [cdn](cdn/) | 9130 | Zero-build `<script>` tag setup — no npm, no bundler |
| [htmx](htmx/) | 9220 | htmx + web component — HTML over the wire, zero framework |
| [lightbox](lightbox/) | — | Lightbox renderer — fullscreen overlay instead of dropdown, thumbnail previews |

## Development

| Example | Port | What it shows |
|---------|------|---------------|
| [ui-sandbox](ui-sandbox/) | 9300 | Placement engine test harness — identical scenarios across all 6 adapters |

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
