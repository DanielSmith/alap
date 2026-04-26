---
source: framework-guides/README.md
modified: '2026-04-15T15:42:57Z'
tags:
- framework_guides
title: Framework Guides
description: These ship with `alap` — import from `alap/react`, `alap/vue`, etc. Each
  adapter integrates with your framework's component model, state management, and
  lifecycle.
---
# Framework Guides

## Adapters

These ship with `alap` — import from `alap/react`, `alap/vue`, etc. Each adapter integrates with your framework's component model, state management, and lifecycle.

| Page | Framework | Pattern |
|------|-----------|---------|
| [[framework-guides/vanilla-dom|Vanilla DOM]] | None | `AlapUI` class, `.alap` CSS selector |
| [[framework-guides/web-component|Web Component]] | None | `<alap-link>` custom element, Shadow DOM |
| [[framework-guides/react|React]] | React | `AlapProvider` + `AlapLink` + `useAlap()` |
| [[framework-guides/vue|Vue]] | Vue 3 | SFC components + `useAlap()` composable |
| [[framework-guides/svelte|Svelte]] | Svelte 5 | Components + runes |
| [[framework-guides/solid|SolidJS]] | SolidJS | Components + signals |
| [[framework-guides/astro|Astro]] | Astro | `.astro` components wrapping the web component |
| [[framework-guides/alpine|Alpine.js]] | Alpine.js | `x-alap` directive plugin |
| [[framework-guides/qwik|Qwik]] | Qwik | Resumable components — zero JS until interaction |

## Integrations

Separate packages that connect Alap to specific platforms, build tools, and content pipelines. Each has its own install step.

| Integration | Package | What it does |
|-------------|---------|-------------|
| [[framework-guides/eleventy|Eleventy]] | `eleventy-alap` | Shortcodes + filters, optional build-time resolution |
| [[integrations/next|Next.js]] | `next-alap` | `'use client'` boundaries, layout component, MDX config |
| [[integrations/nuxt|Nuxt]] | `nuxt-alap` | Client plugin, Vue re-exports, Nuxt Content markdown |
| [[integrations/astro|Astro Integration]] | `astro-alap` | Zero-config setup — one line in your Astro config |
| [[integrations/hugo|Hugo]] | `hugo-alap` | Shortcodes + partials that output `<alap-link>` |
| [[integrations/qwik-city|Qwik City]] | `qwik-alap` | Vite plugin for Qwik City projects |
| [[integrations/vitepress|VitePress]] | `vitepress-alap` | Vite plugin for `<alap-link>` in markdown docs |
| [[integrations/wordpress|WordPress]] | WordPress plugin | `[alap]` shortcode, SQLite containers |
| [[plugins/remark-alap|Markdown]] | `remark-alap` | `[text](alap:query)` syntax for any remark pipeline |
| [[plugins/rehype-alap|HTML / CMS]] | `rehype-alap` | Transform `<a href="alap:query">` from headless CMSs |
| [[plugins/mdx|MDX]] | `@alap/mdx` | React-based MDX content |
| [[plugins/tiptap-alap|Tiptap]] | `tiptap-alap` | Inline Alap links in Tiptap rich-text editors |
| [[getting-started/installation|CDN / IIFE]] | — | `
```

This keeps your bundle small — you only pay for what you import.

## Which one should I use?

- **No framework?** Start with [[framework-guides/web-component|Web Component]] — it works in plain HTML
- **Have a framework?** Use its adapter — it feels native and integrates with your component tree
- **Need maximum CSS control?** [[framework-guides/vanilla-dom|Vanilla DOM]] renders into the page with no shadow boundary
- **Zero JS until click?** [[framework-guides/qwik|Qwik]] — resumability means no parser/engine code loads until someone interacts
- **htmx / HTML-over-the-wire?** Use the [[framework-guides/web-component|Web Component]] — `<alap-link>` auto-initializes after htmx swaps. See the [htmx example](https://examples.alap.info/htmx/)
- **Static site?** [[framework-guides/eleventy|Eleventy]], [[framework-guides/astro|Astro]], [[integrations/vitepress|VitePress]], or [[framework-guides/web-component|Web Component]] with the CDN build
- **VitePress docs?** See the [[integrations/vitepress|VitePress integration]] — Vite plugin registers `<alap-link>` for markdown
- **Next.js?** See the [[integrations/next|Next.js integration]] — `'use client'` handled, layout component, MDX config
- **Nuxt?** See the [[integrations/nuxt|Nuxt integration]] — client plugin, Vue re-exports, Nuxt Content
- **Hugo?** See the [[integrations/hugo|Hugo integration]] — shortcodes + web component
- **WordPress?** See the [[integrations/wordpress|WordPress plugin]] — `[alap]` shortcode, SQLite containers

## See also

- [Getting Started](../getting-started/) — installation and setup
- [[core-concepts/styling|Styling]] — CSS for both web component and DOM adapter
- [[api-reference/events|Events]] — shared event model across all adapters
- [[README|Full documentation index]]
