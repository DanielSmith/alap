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

## Which one should I use?

- **No framework?** Start with [Web Component](web-component.md) — it works in plain HTML
- **Have a framework?** Use its adapter — it feels native and integrates with your component tree
- **Need maximum CSS control?** [Vanilla DOM](vanilla-dom.md) renders into the page with no shadow boundary
- **Static site?** [Astro](astro.md) or [Web Component](web-component.md) with the CDN build

## See also

- [Getting Started](../getting-started/) — installation and setup
- [Styling](../core-concepts/styling.md) — CSS for both web component and DOM adapter
- [Events](../api-reference/events.md) — shared event model across all adapters
- [Full documentation index](../README.md)
