# Frequently Asked Questions

**[All docs](README.md)**

---

## General

### What is Alap?

Alap is a JavaScript library that turns links into contextual menus. Instead of "one link, one destination," each link opens a menu of curated targets selected by tags, expressions, macros, or search patterns. The reader chooses where to go.

### What does "Alap" mean?

The name started as a practical choice — "MultiLink," "ManyLinks," and "MenuLinks" were all taken. You can think of it as whatever acronym feels memorable — "A Link, All Places" works.

There's also a tie-in to music: the **alap** is the opening section of a North Indian classical performance — a form of melodic improvisation that introduces and develops a raga. This fits the spirit: Alap is a means of dynamically introducing and developing a set of destinations, especially when the menu is assembled at runtime from a living config.

### Is this a new project?

No — the concept dates back to the 1990s:

- **1990s:** The dissatisfaction with "one anchor, one destination" started here. Ted Nelson's Xanadu project imagined links as rich, bidirectional, context-carrying objects. But Xanadu required replacing the web's plumbing entirely. Alap shares some of Xanadu's premise (links should be richer than `<a href>`) while rejecting its approach — the richness comes from the configuration layer, not from rewriting how documents connect.
- **2012:** Originally called "MultiLinks," built with jQuery.
- **2021 (v1):** Rewritten as an ES6 library, no dependencies. Published on npm as `alap`.
- **2021 (v2):** Introduced an API mode so frameworks like Vue and React could use Alap for data without Alap touching the DOM.
- **2026 (v3):** Complete rewrite in TypeScript. 8 framework adapters, expression parser with set-theory operators, regex search, storage layer, event hooks, security hardening, 550+ tests.

### How is this different from a dropdown menu or a tooltip?

A dropdown is a navigation element — it's part of the page structure. An Alap link is inline — it lives inside your content, inside a sentence. The menu appears on click and disappears when you're done. It's closer to a footnote or a citation than a nav bar.

### Won't users be confused by links that open menus?

The `aria-haspopup="true"` attribute signals to screen readers that the link opens a menu. For sighted users, the cursor changes and the menu appears on click — the interaction is the same as any popup menu. The key is signaling intent: dotted underlines, subtle icons, or different link styling can distinguish Alap links from regular links. See [Styling](core-concepts/styling.md) for details.

### Does this affect SEO?

Alap links render as web components or ARIA-attributed spans, not as traditional `<a href>` elements in the page source. For SEO, use the `existingUrl` feature — anchors with an existing `href` include the original URL as the first menu item, so crawlers see a real link while humans get the full menu. The Astro and Eleventy integrations can also resolve expressions at build time for fully static output. See [Existing URLs](cookbook/existing-urls.md).

---

## Technical

### What about Angular / Lit / Preact / Qwik / Ember / htmx?

The `<alap-link>` web component works in any framework that supports custom elements — which is all of them. No adapter needed:

| Framework | How to use Alap |
|-----------|----------------|
| **Angular** | Add `CUSTOM_ELEMENTS_SCHEMA`, use `<alap-link>` directly in templates |
| **Lit** | Native — Lit is a web component framework, `<alap-link>` is a web component |
| **Preact** | `alap/react` works via Preact's React compatibility layer, or use the web component |
| **Qwik** | Use `<alap-link>` as a custom element in Qwik templates |
| **Ember** | Ember supports custom elements natively |
| **Stencil** | Web component to web component — works directly |
| **htmx** | Use `<alap-link>` in any HTML; for zero-JS, use the Eleventy static shortcode |

Alap ships native adapters for React, Vue, Svelte, SolidJS, Astro, and Alpine because those frameworks benefit from deep integration. For everything else, the [Web Component](framework-guides/web-component.md) provides the full experience with no adapter code.

### How big is the library?

The IIFE build is ~27 KB (8.2 KB gzipped). The core (`alap/core`) has zero runtime dependencies and is fully tree-shakeable. See [Installation](getting-started/installation.md) for the full import table.

### Which browsers are supported?

All modern browsers (Chrome, Firefox, Safari, Edge). The Popover API mode requires Chrome 114+, Firefox 125+, Safari 17+. Older browsers work fine with DOM and Web Component modes.

### Does it work without JavaScript?

The interactive menu requires JavaScript. However, expression resolution can happen without client-side JS. The Eleventy plugin resolves expressions at build time and outputs plain HTML lists as a no-JS fallback. The Python, Go, and Rust parser ports could serve as build-time pre-resolvers for other static generators. See [Markdown Integration](cookbook/markdown.md).

### Can I use it with TypeScript?

Yes. The library ships `.d.ts` type declarations for all exports. See [Types](api-reference/types.md) for the full interface reference.

### How do I style the menus?

Depends on the rendering mode:

- **Web Component:** `--alap-*` CSS custom properties + `::part()` selectors
- **DOM mode:** Style `#alapelem`, `.alapListElem`, and standard CSS
- **Framework adapters:** Pass `menuClassName` and `menuStyle` props

See [Styling](core-concepts/styling.md) for the full guide, and [Web Component](framework-guides/web-component.md) for all 55+ CSS custom properties.

### What's the difference between DOM mode, Web Component mode, and Popover mode?

| Mode | How it works | When to use |
|------|-------------|-------------|
| **DOM** | Single shared menu container, compass-based placement with viewport containment | Maximum compatibility, simplest CSS |
| **Web Component** | Per-element Shadow DOM, same placement engine, `::part()` theming | Style isolation, third-party embedding |
| **Popover** | HTML Popover API, browser-managed stacking | Modern browsers, no z-index management |

DOM and Web Component modes support 9 placement positions (N, NE, E, SE, S, SW, W, NW, C) with automatic fallback when the preferred position doesn't fit in the viewport. Popover mode skips the compass placement engine and relies on the browser's native positioning instead.

### Can I have multiple configs on one page?

Yes. Two approaches:

**Named configs** — each link library is independent:

```typescript
registerConfig(blogConfig, 'blog');
registerConfig(docsConfig, 'docs');
```

```html
<alap-link query=".tutorial" config="docs">tutorials</alap-link>
<alap-link query=".recipe" config="blog">recipes</alap-link>
```

**Merged configs** — combine libraries into one:

```typescript
import { mergeConfigs } from 'alap/core';

const merged = mergeConfigs(baseConfig, teamConfig, userConfig);
registerConfig(merged);
```

The merge is shallow per section: `allLinks`, `macros`, `settings`, and `searchPatterns` each merge independently. If two configs define the same item ID, the later one wins. See [Engine](api-reference/engine.md) for `mergeConfigs` details.

### Can I filter links by time, location, or custom dimensions?

Yes. Protocol expressions extend the query language with dimensional filtering:

```
.coffee + :loc:40.7,-74.0:5mi:    → coffee within 5 miles
(:time:7d: + .featured), .pinned  → featured from last week, plus pinned
```

Register custom handlers for any dimension — `:price:10:50:`, `:beds:2:4:`, anything. See [Protocols](core-concepts/protocols.md).

### Can I sort, limit, or shuffle results?

Yes. Refiners shape the result set after selection:

```
.coffee *sort:label* *limit:5*           → top 5 alphabetically
.coffee *shuffle* *limit:3*              → 3 random picks
(.nyc *sort:label* *limit:3*) | (.sf *sort:label* *limit:3*)  → top 3 from each city
```

See [Refiners](core-concepts/refiners.md).

### Is the expression language Turing complete?

No, and deliberately so. It's a query language, not a programming language. No variables, no loops, no conditionals, no unbounded recursion. Every expression terminates. There's a max nesting depth (32), max token count (1024), and max macro expansion rounds (10). It's closer to CSS selectors or SQL's `WHERE` clause than to a general-purpose language.

### Is the expression parser safe from malicious input?

It has been hardened against known attack vectors, though it has not undergone a third-party security audit. See [Security](api-reference/security.md) for the full list of guardrails (URL sanitization, ReDoS protection, config validation, parser resource limits).

---

## Content & Workflow

### Who manages the link library?

That depends on your team. The [Editors](cookbook/editors.md) page covers the visual tools for managing configs. Writers use expressions in their content. Developers set up the infrastructure.

### How do I update a URL that changed?

Update it once in the config. Every Alap link on every page that includes that item now points to the new URL. No articles need editing.

### What happens when I delete an item?

It disappears from every menu that included it. The expressions still work — they just return fewer results. If the item was referenced by ID, that reference silently returns nothing.

### Can writers use Alap in Markdown?

Yes, with the `remark-alap` plugin:

```markdown
Check out these [cafes](alap:.coffee).
The [best bridges](alap:@nycBridges) are worth visiting.
```

Spaces in expressions break Markdown URL parsing, so use macros for complex expressions. See [Markdown](cookbook/markdown.md).

### How do I test my expressions?

Every Alap [editor](cookbook/editors.md) includes a live query tester. Type an expression, see which items it resolves to.

---

## Project

### Is this AI-generated code?

The codebase was built with AI assistance (Claude, Gemini) but every architectural decision, security measure, and design choice was directed and reviewed by Daniel Smith. The project has 550+ tests organized into progressive tiers, zero-dependency core, hand-rolled recursive descent parser, consistent adapter contracts across 8 frameworks, and defensive guardrails — none of which are characteristics of unreviewed AI output.

### Why Apache 2.0 license?

It's permissive (use it anywhere, including commercial projects) while providing patent protection. Same license as Kubernetes, Android, and Swift.

### Where can I report bugs or request features?

Open an issue at [github.com/DanielSmith/alap](https://github.com/DanielSmith/alap/issues).

### Can I extend the expression language with custom operand types?

Yes. The protocol expression system is a plugin architecture. Register a handler function in `config.protocols` and your custom `:protocol:args:` syntax works immediately — composing with tags, operators, macros, parentheses, and refiners. See [Protocols](core-concepts/protocols.md).
