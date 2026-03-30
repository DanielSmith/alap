# Framework Guides

## Adapters

These ship with `alap` — import from `alap/react`, `alap/vue`, etc. Each adapter integrates with your framework's component model, state management, and lifecycle.

| Page | Framework | Pattern |
|------|-----------|---------|
| [Vanilla DOM](vanilla-dom.md) | None | `AlapUI` class, `.alap` CSS selector |
| [Web Component](web-component.md) | None | `<alap-link>` custom element, Shadow DOM |
| [React](react.md) | React | `AlapProvider` + `AlapLink` + `useAlap()` |
| [Vue](vue.md) | Vue 3 | SFC components + `useAlap()` composable |
| [Svelte](svelte.md) | Svelte 5 | Components + runes |
| [SolidJS](solid.md) | SolidJS | Components + signals |
| [Astro](astro.md) | Astro | `.astro` components wrapping the web component |
| [Alpine.js](alpine.md) | Alpine.js | `x-alap` directive plugin |
| [Qwik](qwik.md) | Qwik | Resumable components — zero JS until interaction |

## Integrations

Separate packages that connect Alap to specific platforms, build tools, and content pipelines. Each has its own install step.

| Integration | Package | What it does |
|-------------|---------|-------------|
| [Eleventy](eleventy.md) | `eleventy-alap` | Shortcodes + filters, optional build-time resolution |
| [Next.js](../../integrations/next-alap/) | `next-alap` | `'use client'` boundaries, layout component, MDX config |
| [Nuxt](../../integrations/nuxt-alap/) | `nuxt-alap` | Client plugin, Vue re-exports, Nuxt Content markdown |
| [Astro Integration](../../integrations/astro-alap/) | `astro-alap` | Zero-config setup — one line in your Astro config |
| [Hugo](../../integrations/hugo-alap/) | `hugo-alap` | Shortcodes + partials that output `<alap-link>` |
| [Qwik City](../../integrations/qwik-alap/) | `qwik-alap` | Vite plugin for Qwik City projects |
| [VitePress](../../integrations/vitepress-alap/) | `vitepress-alap` | Vite plugin for `<alap-link>` in markdown docs |
| [WordPress](../../plugins/wordpress/) | WordPress plugin | `[alap]` shortcode, SQLite containers |
| [Markdown](../../plugins/remark-alap/) | `remark-alap` | `[text](alap:query)` syntax for any remark pipeline |
| [HTML / CMS](../../plugins/rehype-alap/) | `rehype-alap` | Transform `<a href="alap:query">` from headless CMSs |
| [MDX](../../plugins/mdx/) | `@alap/mdx` | React-based MDX content |
| [Tiptap](../../plugins/tiptap-alap/) | `tiptap-alap` | Inline Alap links in Tiptap rich-text editors |
| [CDN / IIFE](../getting-started/installation.md) | — | `<script>` tag, no bundler, no npm |
| [htmx](../../examples/sites/htmx/) | — | `<alap-link>` auto-initializes after htmx swaps |

## Which one should I use?

- **No framework?** Start with [Web Component](web-component.md) — it works in plain HTML
- **Have a framework?** Use its adapter — it feels native and integrates with your component tree
- **Need maximum CSS control?** [Vanilla DOM](vanilla-dom.md) renders into the page with no shadow boundary
- **Zero JS until click?** [Qwik](qwik.md) — resumability means no parser/engine code loads until someone interacts
- **htmx / HTML-over-the-wire?** Use the [Web Component](web-component.md) — `<alap-link>` auto-initializes after htmx swaps. See the [htmx example](../../examples/sites/htmx/)
- **Static site?** [Eleventy](eleventy.md), [Astro](astro.md), [VitePress](../../integrations/vitepress-alap/), or [Web Component](web-component.md) with the CDN build
- **VitePress docs?** See the [VitePress integration](../../integrations/vitepress-alap/) — Vite plugin registers `<alap-link>` for markdown
- **Next.js?** See the [Next.js integration](../../integrations/next-alap/) — `'use client'` handled, layout component, MDX config
- **Nuxt?** See the [Nuxt integration](../../integrations/nuxt-alap/) — client plugin, Vue re-exports, Nuxt Content
- **Hugo?** See the [Hugo integration](../../integrations/hugo-alap/) — shortcodes + web component
- **WordPress?** See the [WordPress plugin](../../plugins/wordpress/) — `[alap]` shortcode, SQLite containers

## See also

- [Getting Started](../getting-started/) — installation and setup
- [Styling](../core-concepts/styling.md) — CSS for both web component and DOM adapter
- [Events](../api-reference/events.md) — shared event model across all adapters
- [Full documentation index](../README.md)
