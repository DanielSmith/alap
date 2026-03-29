# Framework Guides

One page per framework. Each is self-contained — pick yours and go.

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
| [Eleventy](eleventy.md) | Eleventy | `eleventy-alap` plugin — shortcodes + filters |

## Which one should I use?

- **No framework?** Start with [Web Component](web-component.md) — it works in plain HTML
- **Have a framework?** Use its adapter — it feels native and integrates with your component tree
- **Need maximum CSS control?** [Vanilla DOM](vanilla-dom.md) renders into the page with no shadow boundary
- **Zero JS until click?** [Qwik](qwik.md) — resumability means no parser/engine code loads until someone interacts
- **htmx / HTML-over-the-wire?** Use the [Web Component](web-component.md) — `<alap-link>` auto-initializes after htmx swaps. [See the htmx example](../../examples/sites/htmx/).
- **Static site?** [Eleventy](eleventy.md), [Astro](astro.md), or [Web Component](web-component.md) with the CDN build
- **Next.js?** See the [Next.js integration](../../integrations/next-alap/) — `'use client'` handled, layout component, MDX config
- **Nuxt?** See the [Nuxt integration](../../integrations/nuxt-alap/) — client plugin, Vue re-exports, Nuxt Content
- **Hugo?** See the [Hugo integration](../../integrations/hugo-alap/) — shortcodes + web component
- **WordPress?** See the [WordPress plugin](../../plugins/wordpress/) — `[alap]` shortcode, SQLite containers

## See also

- [Getting Started](../getting-started/) — installation and setup
- [Styling](../core-concepts/styling.md) — CSS for both web component and DOM adapter
- [Events](../api-reference/events.md) — shared event model across all adapters
- [Full documentation index](../README.md)
