---
source: README.md
modified: '2026-04-16T04:08:09Z'
title: Alap v3 Documentation
description: '**A query language for hyperlinks.** Every Alap link has a query that
  selects from a library of destinations. One link, one expression, many options for
  the reader.'
---
# Alap v3 Documentation

**A query language for hyperlinks.** Every Alap link has a query that selects from a library of destinations. One link, one expression, many options for the reader.

```html
<alap-link query=".coffee + .nyc">NYC coffee spots</alap-link>
```

> Interactive version with live demos: https://alap.info

**[[getting-started/casual|Casual Mode]]** — just want to know what Alap is? Start here. No jargon, no setup, just the idea.

## Getting Started

Ready to build? Start here.

- [[getting-started/installation|Installation]] — npm, CDN, peer dependencies
- [[getting-started/quick-start|Quick Start]] — first working link in 2 minutes
- [[getting-started/configuration|Configuration]] — the config object that powers everything
- [[FAQ]] — common questions about Alap, the expression language, styling, SEO, security

## Core Concepts

How the expression language works.

- [[core-concepts/expressions|Expressions]] — tags, operators, parentheses — the tutorial
- [[api-reference/spec|Expression Spec]] — formal grammar, operator semantics, worked examples
- [[core-concepts/macros|Macros]] — name and reuse expressions with `@`
- [[core-concepts/search-patterns|Search Patterns]] — regex-based discovery with `/pattern/`
- [[core-concepts/protocols|Protocols]] — dimensional queries (time, location, live data sources) with `:protocol:args:`
- [[core-concepts/refiners|Refiners]] — sort, limit, shuffle results with `*refiner*`
- [[core-concepts/styling|Styling]] — CSS custom properties, `::part()`, dark mode, effects

## Framework Guides

### Adapters

Ship with `alap` — import from `alap/react`, `alap/vue`, etc.

- [[framework-guides/vanilla-dom|Vanilla DOM]] — `AlapUI` class, no framework needed
- [[framework-guides/web-component|Web Component]] — `<alap-link>` custom element
- [[framework-guides/react|React]] — `AlapProvider`, `AlapLink`, `useAlap()`
- [[framework-guides/vue|Vue]] — SFC components + composable
- [[framework-guides/svelte|Svelte]] — Svelte 5 with runes
- [[framework-guides/solid|SolidJS]] — fine-grained signals
- [[framework-guides/astro|Astro]] — `.astro` components
- [[framework-guides/alpine|Alpine.js]] — `x-alap` directive
- [[framework-guides/qwik|Qwik]] — resumable components

### Integrations

Separate packages for specific platforms and content pipelines.

- [[framework-guides/eleventy|Eleventy]] — `eleventy-alap` plugin with shortcodes and filters
- [[integrations/next|Next.js]] — App Router layout + `'use client'` components
- [[integrations/nuxt|Nuxt]] — client plugin + Nuxt Content markdown
- [[integrations/astro|Astro Integration]] — zero-config setup
- [[integrations/hugo|Hugo]] — shortcodes + web component
- [[integrations/vitepress|VitePress]] — Vite plugin for `<alap-link>` in markdown docs
- [[integrations/wordpress|WordPress]] — `[alap]` shortcode, SQLite containers
- [[plugins/remark-alap|Markdown]] — `remark-alap` for any remark pipeline
- [[plugins/rehype-alap|HTML / CMS]] — `rehype-alap` for headless CMS output
- [[plugins/mdx|MDX]] — `@alap/mdx` for React-based MDX
- [[plugins/tiptap-alap|Tiptap]] — Alap links in Tiptap rich-text editors
- [htmx](https://examples.alap.info/htmx/) — `<alap-link>` auto-initializes after swaps
- [[getting-started/installation|CDN / IIFE]] — `<script>` tag, no bundler

## API Reference

Types, methods, and contracts.

- [[api-reference/engine|Engine]] — `AlapEngine`, `ExpressionParser`, utility functions
- [[api-reference/types|Types]] — `AlapConfig`, `AlapLink`, `AlapSettings`, all interfaces
- [[api-reference/config-registry|Config Registry]] — `registerConfig`, named configs, `getEngine`
- [[api-reference/placement|Placement]] — `computePlacement`, strategies, fallback order
- [[api-reference/lightbox|Lightbox]] — `AlapLightbox`, `<alap-lightbox>`, CSS custom properties
- [[api-reference/lens|Lens]] — `AlapLens`, `<alap-lens>`, transitions, meta fields
- [[api-reference/embeds|Embeds]] — `createEmbed`, providers, consent management
- [[api-reference/coordinators|Coordinators]] — `RendererCoordinator`, `InstanceCoordinator`, View Transitions
- [[api-reference/storage|Storage]] — IndexedDB, Remote, Hybrid persistence
- [[api-reference/events|Events]] — event types, keyboard navigation, hooks
- [[api-reference/security|Security]] — URL sanitization, ReDoS protection, parser limits
- [[api-reference/servers|Servers]] — REST API contract, 11 server examples, OpenAPI spec

## Cookbook

Advanced topics and integrations.

- [[cookbook/language-ports|Language Ports]] — Python, PHP, Go, Rust, Ruby expression parsers
- [[cookbook/editors|Editors]] — 7 visual editor apps for building configs
- [[cookbook/markdown|Markdown]] — `remark-alap` plugin, `[text](alap:.tag)` syntax
- [[cookbook/markdown|MDX]] — `@alap/mdx` plugin with React provider
- [[cookbook/markdown|HTML / CMS Content]] — `rehype-alap` plugin for headless CMS output
- [[cookbook/rich-text|Rich-Text Editors]] — `@alap/tiptap` extension for Tiptap/ProseMirror
- [[cookbook/accessibility|Accessibility]] — ARIA, keyboard nav, focus management
- [[cookbook/existing-urls|Existing URLs]] — progressive enhancement with `existingUrl`
- [[cookbook/images-and-media|Images and Media]] — image items, thumbnails, hover previews
- [[cookbook/placement|Placement]] — compass-based positioning, viewport containment, Alap vs. CSS
- [[cookbook/embeds|Embeds]] — YouTube, Vimeo, Spotify, CodePen iframes with consent

### Beyond menus

The same query that drives a menu can also drive richer presentations:

- [[cookbook/lightbox|Lightbox]] — full-screen carousel with images, embeds, and set navigation
- [[cookbook/lens|Lens]] — detail panel with metadata, tags, image zoom, and copy-to-clipboard

## Packages

Projects in the Alap ecosystem that consume `alap` as a dependency.

- [[packages/gather|alap-gather]] — drag menu items into a collection tray, organize with folders, export or view in lightbox/lens. Includes HighNotes floating cards.
