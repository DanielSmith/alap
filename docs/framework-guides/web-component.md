# Web Component

**[Framework Guides](README.md):** [Vanilla DOM](vanilla-dom.md) · **This Page** · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) · [Eleventy](eleventy.md)

The `<alap-link>` custom element. Works in any HTML — no framework required.

> Live version with interactive examples: https://docs.alap.info/framework-guides/web-component

## Setup

```typescript
import { defineAlapLink, registerConfig } from 'alap';

defineAlapLink();           // registers <alap-link> custom element
registerConfig(config);     // feed config to the registry
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `defineAlapLink()` | `(tagName?: string) => void` | Register the custom element. Default tag: `'alap-link'`. Safe to call multiple times. |
| `registerConfig()` | `(config: AlapConfig, name?: string) => void` | Register a config. Default name: `'_default'` |
| `updateRegisteredConfig()` | `(config: AlapConfig, name?: string) => void` | Update a registered config |

## HTML attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Expression to evaluate |
| `config` | `string` | No | Named config to use. Default: `'_default'` |
| `href` | `string` | No | Existing URL — included in menu per `existingUrl` setting |
| `placement` | `string` | No | Placement string: compass + strategy, e.g. `"SE"`, `"SE, clamp"`. Overrides config |

```html
<alap-link query=".coffee">cafes</alap-link>
<alap-link query=".nyc + .bridge">NYC bridges</alap-link>
<alap-link query="@favorites" placement="N">my picks (menu above)</alap-link>
```

### Multi-config

```typescript
registerConfig(newsConfig, 'news');
registerConfig(docsConfig, 'docs');
defineAlapLink();
```

```html
<alap-link query=".breaking" config="news">latest stories</alap-link>
<alap-link query=".api" config="docs">API reference</alap-link>
```

## ARIA (set automatically)

| Attribute | Value |
|-----------|-------|
| `role` | `"button"` (on host, if not already set) |
| `aria-haspopup` | `"true"` |
| `aria-expanded` | `"true"` when open, `"false"` when closed |
| `tabindex` | `"0"` (if not already focusable) |

## Shadow DOM structure

```
<alap-link>
  (light DOM — your content)
  #shadow-root (open)
    <style>...</style>
    <slot></slot>
    <div class="menu" role="menu" aria-hidden="true" part="menu">
      <ul part="list">
        <li role="none" part="item">
          <a role="menuitem" part="link" tabindex="-1">
            Link Label
          </a>
        </li>
      </ul>
    </div>
```

## Custom events

All events bubble and are composed (pierce the shadow boundary). Listen at any ancestor or on `document`.

| Event | Detail Type | When |
|-------|-------------|------|
| `alap:trigger-hover` | `TriggerHoverDetail` | Mouse enters trigger |
| `alap:trigger-context` | `TriggerContextDetail` | Right-click on trigger |
| `alap:item-hover` | `ItemHoverDetail` | Mouse enters menu item |
| `alap:item-context` | `ItemContextDetail` | Right-click or ArrowRight on menu item |
| `alap:item-context-dismiss` | `ItemContextDismissDetail` | ArrowLeft on menu item |

```javascript
document.addEventListener('alap:item-hover', (e) => {
  const { id, link } = e.detail;
  showPreview(link.thumbnail, link.description);
});
```

See [Events](../api-reference/events.md) for full detail type definitions.

## Styling

The web component uses an open Shadow DOM. External CSS cannot reach inside — use `::part()` selectors and `--alap-*` custom properties instead.

### `::part()` selectors

| Selector | Element | Description |
|----------|---------|-------------|
| `alap-link::part(menu)` | `<div>` | Menu container |
| `alap-link::part(list)` | `<ul>` / `<ol>` | The list element |
| `alap-link::part(item)` | `<li>` | Each list item |
| `alap-link::part(link)` | `<a>` | Each link anchor |
| `alap-link::part(image)` | `<img>` | Image inside a link (when `image` field is set) |

### CSS custom properties

Set these on `alap-link` or any ancestor. They cross the shadow boundary.

#### Menu box

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-bg` | `#ffffff` | Menu background |
| `--alap-border` | `#e5e7eb` | Menu border color |
| `--alap-border-width` | `1px` | Menu border width |
| `--alap-radius` | `6px` | Menu border radius |
| `--alap-corner-shape` | `round` | Corner geometry: `round`, `squircle`, `scoop`, `notch`, `bevel`, `straight` |
| `--alap-shadow` | `0 4px 12px rgba(0,0,0,0.1)` | Menu box shadow |
| `--alap-drop-shadow` | *(unset)* | Menu `filter: drop-shadow()` |
| `--alap-opacity` | `1` | Menu container opacity |
| `--alap-backdrop` | *(unset)* | Menu `backdrop-filter` (e.g. `blur(10px)`) |
| `--alap-min-width` | `200px` | Minimum menu width |
| `--alap-max-width` | `none` | Maximum menu width |
| `--alap-z-index` | `10` | Menu stacking order |
| `--alap-gap` | `0.5rem` | Space between trigger and menu |
| `--alap-menu-padding` | `0.25rem 0` | Padding on the list |
| `--alap-menu-transition` | *(unset)* | Transition for menu properties |

#### Items

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-item-border` | *(unset)* | Border on each `li` |
| `--alap-item-border-radius` | *(unset)* | Border radius on each `li` |
| `--alap-item-gap` | `0` | Vertical space between items |

#### Text and links

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-font` | `inherit` | Font family |
| `--alap-text` | `#1a1a1a` | Link text color |
| `--alap-font-size` | `0.9rem` | Link font size |
| `--alap-font-weight` | *(inherit)* | Link font weight |
| `--alap-letter-spacing` | *(unset)* | Letter spacing |
| `--alap-text-decoration` | `none` | Text decoration |
| `--alap-text-transform` | *(unset)* | Text transform |
| `--alap-padding` | `0.5rem 1rem` | Link padding |
| `--alap-cursor` | `pointer` | Cursor style |
| `--alap-transition` | *(unset)* | Transition for hover/focus effects |

#### Hover

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-hover-bg` | `#eff6ff` | Hover background |
| `--alap-hover-text` | `#2563eb` | Hover text color |
| `--alap-hover-shadow` | *(unset)* | Box shadow on hover |
| `--alap-hover-text-shadow` | *(unset)* | Text shadow on hover |
| `--alap-hover-transform` | *(unset)* | Transform on hover (e.g. `translateX(4px)`) |
| `--alap-hover-border` | *(unset)* | Border on hover |
| `--alap-dim-unhovered` | *(unset)* | Opacity for non-hovered items (e.g. `0.5`) |

#### Focus

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-focus-ring` | `#2563eb` | Keyboard focus outline color |
| `--alap-focus-bg` | *(falls back to hover-bg)* | Background on focus |
| `--alap-focus-text` | *(falls back to hover-text)* | Text color on focus |

#### Images

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-img-max-height` | `4rem` | Max height for image items |
| `--alap-img-radius` | `3px` | Border radius for image items |

#### Scrollbar

| Property | Default | Description |
|----------|---------|-------------|
| `--alap-scrollbar-width` | `thin` | Scrollbar width |
| `--alap-scrollbar-thumb` | `#cbd5e1` | Scrollbar thumb color |
| `--alap-scrollbar-track` | `transparent` | Scrollbar track color |

### Theming examples

**Dark theme:**
```css
alap-link {
  --alap-bg: #1e1e2e;
  --alap-border: #313244;
  --alap-text: #cdd6f4;
  --alap-hover-bg: #313244;
  --alap-hover-text: #89b4fa;
  --alap-focus-ring: #89b4fa;
  --alap-radius: 12px;
}
```

**Glassmorphism:**
```css
alap-link {
  --alap-bg: rgba(255, 255, 255, 0.15);
  --alap-backdrop: blur(12px) saturate(180%);
  --alap-border: rgba(255, 255, 255, 0.2);
  --alap-radius: 16px;
  --alap-corner-shape: squircle;
}
```

**Animated open:**
```css
.animated::part(menu) {
  display: block !important;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(6px);
  transition: opacity 0.2s ease, visibility 0.2s, transform 0.2s ease;
}
.animated[aria-expanded="true"]::part(menu) {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}
```

## Positioning

The web component uses the same compass-based placement engine as the DOM adapter. Set placement globally via `settings.placement` or per-element via the `placement` attribute. The value is a comma-separated string with a compass direction and optional strategy:

```html
<alap-link query=".coffee" placement="S">centered below</alap-link>
<alap-link query=".coffee" placement="N">above me</alap-link>
<alap-link query=".coffee" placement="SE, clamp">constrained to viewport</alap-link>
<alap-link query=".coffee" placement="C">centered over me</alap-link>
```

Strategies: `flip` (default — tries fallbacks), `clamp` (flip + constrain to viewport), `place` (pinned, no fallback).

The `--alap-gap` CSS custom property controls the gap between trigger and menu. The placement engine reads this value automatically. You can also set `placementGap` in config settings — the CSS variable takes priority when set.

See [Placement](../cookbook/placement.md) for the full guide on placement, strategies, and CSS styling.

## CDN / IIFE build

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<script>
  Alap.defineAlapLink();
  Alap.registerConfig({
    allLinks: {
      reuters: { url: 'https://reuters.com', label: 'Reuters', tags: ['news'] },
      ap:      { url: 'https://apnews.com',  label: 'AP News', tags: ['news'] },
    },
  });
</script>

<alap-link query=".news">sources</alap-link>
```

**Size:** ~27 KB (8.2 KB gzipped)

## Browser support

All `--alap-*` properties work in every modern browser (Chrome 49+, Firefox 31+, Safari 9.1+, Edge 15+).

The `corner-shape` property requires Chrome/Edge 134+. Older browsers fall back to standard `border-radius` with no errors or layout shift.
