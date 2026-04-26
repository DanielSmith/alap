# Alap v3 Documentation

**A query language for hyperlinks.** Every Alap link has a query that selects from a library of destinations. One link, one expression, many options for the reader.

```html
<alap-link query=".coffee + .nyc">NYC coffee spots</alap-link>
```

> Interactive version with live demos: https://alap.info

**[Casual Mode](getting-started/casual.md)** — just want to know what Alap is? Start here. No jargon, no setup, just the idea.

## Getting Started

Ready to build? Start here.

- [Installation](getting-started/installation.md) — npm, CDN, peer dependencies
- [Quick Start](getting-started/quick-start.md) — first working link in 2 minutes
- [Configuration](getting-started/configuration.md) — the config object that powers everything
- [FAQ](FAQ.md) — common questions about Alap, the expression language, styling, SEO, security

## Core Concepts

How the expression language works.

- [Expressions](core-concepts/expressions.md) — tags, operators, parentheses — the tutorial
- [Expression Spec](api-reference/spec.md) — formal grammar, operator semantics, worked examples
- [Macros](core-concepts/macros.md) — name and reuse expressions with `@`
- [Search Patterns](core-concepts/search-patterns.md) — regex-based discovery with `/pattern/`
- [Protocols](core-concepts/protocols.md) — dimensional queries (time, location, live data sources) with `:protocol:args:`
- [Refiners](core-concepts/refiners.md) — sort, limit, shuffle results with `*refiner*`
- [Styling](core-concepts/styling.md) — CSS custom properties, `::part()`, dark mode, effects

## Framework Guides

### Adapters

Ship with `alap` — import from `alap/react`, `alap/vue`, etc.

- [Vanilla DOM](framework-guides/vanilla-dom.md) — `AlapUI` class, no framework needed
- [Web Component](framework-guides/web-component.md) — `<alap-link>` custom element
- [React](framework-guides/react.md) — `AlapProvider`, `AlapLink`, `useAlap()`
- [Vue](framework-guides/vue.md) — SFC components + composable
- [Svelte](framework-guides/svelte.md) — Svelte 5 with runes
- [SolidJS](framework-guides/solid.md) — fine-grained signals
- [Astro](framework-guides/astro.md) — `.astro` components
- [Alpine.js](framework-guides/alpine.md) — `x-alap` directive
- [Qwik](framework-guides/qwik.md) — resumable components

### Integrations

Separate packages for specific platforms and content pipelines.

- [Eleventy](framework-guides/eleventy.md) — `eleventy-alap` plugin with shortcodes and filters
- [Next.js](integrations/next.md) — App Router layout + `'use client'` components
- [Nuxt](integrations/nuxt.md) — client plugin + Nuxt Content markdown
- [Astro Integration](integrations/astro.md) — zero-config setup
- [Hugo](integrations/hugo.md) — shortcodes + web component
- [VitePress](integrations/vitepress.md) — Vite plugin for `<alap-link>` in markdown docs
- [WordPress](integrations/wordpress.md) — `[alap]` shortcode, SQLite containers
- [Markdown](plugins/remark-alap.md) — `remark-alap` for any remark pipeline
- [HTML / CMS](plugins/rehype-alap.md) — `rehype-alap` for headless CMS output
- [MDX](plugins/mdx.md) — `@alap/mdx` for React-based MDX
- [Tiptap](plugins/tiptap-alap.md) — Alap links in Tiptap rich-text editors
- [htmx](https://examples.alap.info/htmx/) — `<alap-link>` auto-initializes after swaps
- [CDN / IIFE](getting-started/installation.md) — `<script>` tag, no bundler

## API Reference

Types, methods, and contracts.

- [Engine](api-reference/engine.md) — `AlapEngine`, `ExpressionParser`, utility functions
- [Types](api-reference/types.md) — `AlapConfig`, `AlapLink`, `AlapSettings`, all interfaces
- [Config Registry](api-reference/config-registry.md) — `registerConfig`, named configs, `getEngine`
- [Placement](api-reference/placement.md) — `computePlacement`, strategies, fallback order
- [Lightbox](api-reference/lightbox.md) — `AlapLightbox`, `<alap-lightbox>`, CSS custom properties
- [Lens](api-reference/lens.md) — `AlapLens`, `<alap-lens>`, transitions, meta fields
- [Embeds](api-reference/embeds.md) — `createEmbed`, providers, consent management
- [Coordinators](api-reference/coordinators.md) — `RendererCoordinator`, `InstanceCoordinator`, View Transitions
- [Storage](api-reference/storage.md) — IndexedDB, Remote, Hybrid persistence
- [Events](api-reference/events.md) — event types, keyboard navigation, hooks
- [Security](api-reference/security.md) — URL sanitization, ReDoS protection, parser limits
- [Servers](api-reference/servers.md) — REST API contract, 11 server examples, OpenAPI spec

## Cookbook

Advanced topics and integrations.

- [Language Ports](cookbook/language-ports.md) — Python, PHP, Go, Rust, Ruby expression parsers
- [Editors](cookbook/editors.md) — 7 visual editor apps for building configs
- [Markdown](cookbook/markdown.md) — `remark-alap` plugin, `[text](alap:.tag)` syntax
- [MDX](cookbook/markdown.md) — `@alap/mdx` plugin with React provider
- [HTML / CMS Content](cookbook/markdown.md) — `rehype-alap` plugin for headless CMS output
- [Rich-Text Editors](cookbook/rich-text.md) — `@alap/tiptap` extension for Tiptap/ProseMirror
- [Accessibility](cookbook/accessibility.md) — ARIA, keyboard nav, focus management
- [Existing URLs](cookbook/existing-urls.md) — progressive enhancement with `existingUrl`
- [Images and Media](cookbook/images-and-media.md) — image items, thumbnails, hover previews
- [Placement](cookbook/placement.md) — compass-based positioning, viewport containment, Alap vs. CSS
- [Embeds](cookbook/embeds.md) — YouTube, Vimeo, Spotify, CodePen iframes with consent

### Beyond menus

The same query that drives a menu can also drive richer presentations:

- [Lightbox](cookbook/lightbox.md) — full-screen carousel with images, embeds, and set navigation
- [Lens](cookbook/lens.md) — detail panel with metadata, tags, image zoom, and copy-to-clipboard

## Packages

Projects in the Alap ecosystem that consume `alap` as a dependency.

- [alap-gather](packages/gather.md) — drag menu items into a collection tray, organize with folders, export or view in lightbox/lens. Includes HighNotes floating cards.
