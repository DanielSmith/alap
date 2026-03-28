# Integrations

Framework-level packages that wire Alap into static site generators and documentation platforms. Each handles setup, script injection, and optional Markdown support so you don't have to.

| Integration | Framework | What it does | Tests |
|-------------|-----------|-------------|-------|
| [astro-alap/](astro-alap/) | Astro | Zero-config `injectScript`, optional remark-alap | 19 |
| [eleventy-alap/](eleventy-alap/) | Eleventy | Static (zero JS) + interactive shortcodes and filters | 21 |
| [hugo-alap/](hugo-alap/) | Hugo | Shortcode + partial for `<alap-link>` web components | — |
| [qwik-alap/](qwik-alap/) | Qwik City | Vite plugin — auto-injects web component setup, config validation | — |

> **Docusaurus:** A dedicated integration is planned but temporarily on hold due to an upstream transitive dependency vulnerability (`serialize-javascript` via `@docusaurus/core`). In the meantime, use `remark-alap` directly in your Docusaurus remark pipeline.

## Quick Start

Each integration has its own README with install and config instructions. The general pattern:

```bash
npm install astro-alap    # or eleventy-alap
```

Then add to your framework config — one line for Astro, a plugin call for Eleventy.

## Relationship to Plugins

Integrations are **framework wrappers** — they handle lifecycle, script injection, and build hooks for a specific framework. Plugins (in `../plugins/`) are **content transforms** — they operate on Markdown or rich-text content regardless of framework. Some integrations use plugins internally (e.g., astro-alap can enable remark-alap automatically).
