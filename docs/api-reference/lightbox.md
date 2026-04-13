# Lightbox API

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md) · [Placement](placement.md) · **This Page** · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Config Registry](config-registry.md) | [All docs](../README.md)

Full-screen overlay carousel for browsing link collections with images, metadata, and embeds.

> See also: [Cookbook: Lightbox](../cookbook/lightbox.md) for usage patterns and styling recipes.

## Quick start

```typescript
import { AlapLightbox, defineAlapLightbox, registerConfig } from 'alap';

registerConfig(myConfig);
defineAlapLightbox();
```

```html
<alap-lightbox query=".bridge">NYC Bridges</alap-lightbox>
```

## `AlapLightbox` class

Programmatic API for the lightbox renderer.

```typescript
const lightbox = new AlapLightbox(config, {
  placement: 'C',
  embedPolicy: 'prompt',
});
```

### Constructor

```typescript
new AlapLightbox(config: AlapConfig, options?: AlapLightboxOptions)
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `openWith()` | `(payload: OpenPayload) => void` | Open with pre-resolved links |
| `close()` | `() => HTMLElement \| null` | Close overlay, returns the trigger element |
| `setPlacement()` | `(placement: Placement \| null) => void` | Change viewport placement at runtime |
| `getEngine()` | `() => AlapEngine` | Access the underlying engine |
| `destroy()` | `() => void` | Close overlay and remove event listeners |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether the lightbox is currently visible |
| `rendererType` | `'lightbox'` | Renderer type constant (for coordinator) |

### `AlapLightboxOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selector` | `string` | `'.alap'` | CSS selector for trigger elements |
| `placement` | `Placement` | `null` | Viewport placement (compass direction) |
| `embedPolicy` | `EmbedPolicy` | `'prompt'` | `'prompt'` \| `'allow'` \| `'block'` |
| `embedAllowlist` | `string[]` | all providers | Override default embed provider allowlist |

## `<alap-lightbox>` web component

### Registration

```typescript
import { defineAlapLightbox } from 'alap';

defineAlapLightbox();            // registers as <alap-lightbox>
defineAlapLightbox('my-viewer'); // custom tag name
```

Safe to call multiple times — subsequent calls are no-ops.

### HTML attributes

| Attribute | Description |
|-----------|-------------|
| `query` | Alap expression (e.g. `.bridge`, `@favorites`) |
| `config` | Named config to use (default: `'_default'`) |
| `placement` | Viewport placement (compass direction) |

### Methods

| Method | Description |
|--------|-------------|
| `close()` | Close the lightbox programmatically |

### ARIA

The web component automatically sets `role="button"`, `aria-haspopup="dialog"`, `tabindex="0"`, and toggles `aria-expanded`.

## CSS custom properties

All properties use the `--alap-lightbox-` prefix. Override them on `:root` or on `alap-lightbox` directly.

::: details Show all custom properties
**Overlay**

| Property | Default |
|----------|---------|
| `--alap-lightbox-z-index` | `10000` |
| `--alap-lightbox-overlay-bg` | `rgba(0, 0, 0, 0.85)` |
| `--alap-lightbox-overlay-blur` | `4px` |
| `--alap-lightbox-fade` | `0.5s` |

**Panel**

| Property | Default |
|----------|---------|
| `--alap-lightbox-bg` | `#1a1a2e` |
| `--alap-lightbox-radius` | `12px` |
| `--alap-lightbox-max-width` | `600px` |
| `--alap-lightbox-shadow` | `0 24px 80px rgba(0, 0, 0, 0.5)` |
| `--alap-lightbox-transition` | `0.25s` |
| `--alap-lightbox-body-padding` | `0.75rem 1.5rem 1.5rem` |

**Image**

| Property | Default |
|----------|---------|
| `--alap-lightbox-image-height` | `350px` |
| `--alap-lightbox-image-bg` | `#111` |

**Label**

| Property | Default |
|----------|---------|
| `--alap-lightbox-label-size` | `1.4rem` |
| `--alap-lightbox-label-weight` | `600` |
| `--alap-lightbox-label-color` | `#fff` |

**Photo credit**

| Property | Default |
|----------|---------|
| `--alap-lightbox-credit-size` | `0.75rem` |
| `--alap-lightbox-credit-color` | `rgba(255, 255, 255, 0.4)` |
| `--alap-lightbox-credit-link-color` | `rgba(255, 255, 255, 0.5)` |
| `--alap-lightbox-credit-link-hover` | `#fff` |

**Description**

| Property | Default |
|----------|---------|
| `--alap-lightbox-desc-margin` | `0.5rem 0 0` |
| `--alap-lightbox-desc-color` | `#aaa` |
| `--alap-lightbox-desc-size` | `0.95rem` |
| `--alap-lightbox-desc-line-height` | `1.5` |

**Visit button**

| Property | Default |
|----------|---------|
| `--alap-lightbox-visit-bg` | `#3a86ff` |
| `--alap-lightbox-visit-color` | `#fff` |
| `--alap-lightbox-visit-radius` | `6px` |
| `--alap-lightbox-visit-size` | `0.9rem` |
| `--alap-lightbox-visit-weight` | `500` |
| `--alap-lightbox-visit-padding` | `0.5rem 1.25rem` |
| `--alap-lightbox-visit-bg-hover` | `#2d6fdb` |
| `--alap-lightbox-visit-margin` | `1rem auto 0` |

**Close button (X)**

| Property | Default |
|----------|---------|
| `--alap-lightbox-close-x-color` | `#fff` |
| `--alap-lightbox-close-x-size` | `2rem` |
| `--alap-lightbox-close-x-opacity` | `0.7` |

**Close button (text)**

| Property | Default |
|----------|---------|
| `--alap-lightbox-close-margin` | `0.5rem auto 0` |
| `--alap-lightbox-close-bg` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lightbox-close-color` | `#b8c4e8` |
| `--alap-lightbox-close-bg-hover` | `rgba(255, 255, 255, 0.15)` |
| `--alap-lightbox-close-color-hover` | `#fff` |

**Counter**

| Property | Default |
|----------|---------|
| `--alap-lightbox-counter-margin` | `1rem` |
| `--alap-lightbox-counter-color` | `#666` |
| `--alap-lightbox-counter-size` | `0.85rem` |
| `--alap-lightbox-counter-hover-color` | `#aac4f0` |

**Navigation**

| Property | Default |
|----------|---------|
| `--alap-lightbox-nav-bg` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lightbox-nav-color` | `#fff` |
| `--alap-lightbox-nav-icon-size` | `2rem` |
| `--alap-lightbox-nav-btn-size` | `48px` |
| `--alap-lightbox-nav-bg-hover` | `rgba(255, 255, 255, 0.2)` |
| `--alap-lightbox-nav-offset` | `calc(50% - 340px)` |

**Set navigator popup**

| Property | Default |
|----------|---------|
| `--alap-lightbox-setnav-bg` | `#1e1e3a` |
| `--alap-lightbox-setnav-border` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lightbox-setnav-radius` | `8px` |
| `--alap-lightbox-setnav-shadow` | `0 8px 32px rgba(0, 0, 0, 0.4)` |
| `--alap-lightbox-setnav-min-width` | `220px` |
| `--alap-lightbox-setnav-max-width` | `320px` |
| `--alap-lightbox-setnav-max-height` | `240px` |
| `--alap-lightbox-setnav-item-padding` | `0.4rem 0.75rem` |
| `--alap-lightbox-setnav-item-color` | `#d0d7e5` |
| `--alap-lightbox-setnav-item-size` | `0.85rem` |
| `--alap-lightbox-setnav-item-hover-bg` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lightbox-setnav-item-hover-color` | `#fff` |
| `--alap-lightbox-setnav-item-active-bg` | `rgba(58, 134, 255, 0.2)` |
| `--alap-lightbox-setnav-item-active-color` | `#88bbff` |
| `--alap-lightbox-setnav-item-active-weight` | `600` |
| `--alap-lightbox-setnav-filter-padding` | `0.5rem 0.75rem` |
| `--alap-lightbox-setnav-filter-bg` | `rgba(255, 255, 255, 0.05)` |
| `--alap-lightbox-setnav-filter-color` | `#fff` |
| `--alap-lightbox-setnav-filter-size` | `0.8rem` |
:::

## `::part()` selectors

Style lightbox internals from outside the shadow DOM:

```css
alap-lightbox::part(panel) {
  background: #2a2a4e;
  max-width: 800px;
}

alap-lightbox::part(visit) {
  background: coral;
}
```

::: details Show all part names
| Part | Element |
|------|---------|
| `overlay` | Main overlay backdrop |
| `panel` | Content card |
| `close-x` | Top-right close button |
| `image-wrap` | Image container |
| `image` | Image element |
| `body` | Text content area |
| `label-row` | Title + credit row |
| `label` | Title (h2) |
| `credit` | Photo credit attribution |
| `description` | Description paragraph |
| `visit` | Visit link button |
| `close-btn` | Close button (text) |
| `counter-wrap` | Counter container |
| `counter` | Counter text (e.g. "1 of 5") |
| `setnav` | Set navigator popup |
| `setnav-filter` | Filter input in set navigator |
| `nav-prev` | Previous navigation zone |
| `nav-next` | Next navigation zone |
| `zoom-overlay` | Image zoom overlay |
:::
