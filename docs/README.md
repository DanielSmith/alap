# Alap v3 Documentation

Alap turns links into contextual menus. One link, one query, many destinations.

> Interactive version with live demos: https://alap.info

## Getting Started

New to Alap? Start here.

- [Installation](getting-started/installation.md) — npm, CDN, peer dependencies
- [Quick Start](getting-started/quick-start.md) — first working link in 2 minutes
- [Configuration](getting-started/configuration.md) — the config object that powers everything
- [FAQ](FAQ.md) — common questions about Alap, the expression language, styling, SEO, security

## Core Concepts

How the expression language works.

- [Expressions](core-concepts/expressions.md) — tags, operators, parentheses, the full query grammar
- [Macros](core-concepts/macros.md) — name and reuse expressions with `@`
- [Search Patterns](core-concepts/search-patterns.md) — regex-based discovery with `/pattern/`
- [Protocols](core-concepts/protocols.md) — dimensional queries (time, location, price) with `:protocol:args:`
- [Refiners](core-concepts/refiners.md) — sort, limit, shuffle results with `*refiner*`
- [Styling](core-concepts/styling.md) — CSS custom properties, `::part()`, dark mode, effects

## Framework Guides

One page per framework. Self-contained — pick yours and go.

- [Vanilla DOM](framework-guides/vanilla-dom.md) — `AlapUI` class, no framework needed
- [Web Component](framework-guides/web-component.md) — `<alap-link>` custom element
- [React](framework-guides/react.md) — `AlapProvider`, `AlapLink`, `useAlap()`
- [Vue](framework-guides/vue.md) — SFC components + composable
- [Svelte](framework-guides/svelte.md) — Svelte 5 with runes
- [SolidJS](framework-guides/solid.md) — fine-grained signals
- [Astro](framework-guides/astro.md) — `.astro` components
- [Alpine.js](framework-guides/alpine.md) — `x-alap` directive
- [Qwik](framework-guides/qwik.md) — resumable components + Qwik City integration
- [Eleventy](framework-guides/eleventy.md) — `eleventy-alap` plugin with shortcodes and filters

## API Reference

Types, methods, and contracts.

- [Engine](api-reference/engine.md) — `AlapEngine`, `ExpressionParser`, utility functions
- [Types](api-reference/types.md) — `AlapConfig`, `AlapLink`, `AlapSettings`, all interfaces
- [Storage](api-reference/storage.md) — IndexedDB, Remote, Hybrid persistence
- [Events](api-reference/events.md) — event types, keyboard navigation, hooks
- [Security](api-reference/security.md) — URL sanitization, ReDoS protection, parser limits
- [Servers](api-reference/servers.md) — REST API contract, 9 server examples, OpenAPI spec

## Cookbook

Advanced topics and integrations.

- [Language Ports](cookbook/language-ports.md) — Python, PHP, Go, Rust expression parsers
- [Editors](cookbook/editors.md) — 7 visual editor apps for building configs
- [Markdown](cookbook/markdown.md) — `remark-alap` plugin, `[text](alap:.tag)` syntax
- [MDX](cookbook/markdown.md) — `@alap/mdx` plugin with React provider
- [Rich-Text Editors](cookbook/rich-text.md) — `@alap/tiptap` extension for Tiptap/ProseMirror
- [Accessibility](cookbook/accessibility.md) — ARIA, keyboard nav, focus management
- [Existing URLs](cookbook/existing-urls.md) — progressive enhancement with `existingUrl`
- [Images and Media](cookbook/images-and-media.md) — image items, thumbnails, hover previews
- [Placement](cookbook/placement.md) — compass-based positioning, viewport containment, Alap vs. CSS
