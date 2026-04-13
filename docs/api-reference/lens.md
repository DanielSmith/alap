# Lens API

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · **This Page** · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Config Registry](config-registry.md) | [All docs](../README.md)

Detail panel overlay for inspecting individual links with full metadata, tags, images, and embeds.

> See also: [Cookbook: Lens](../cookbook/lens.md) for usage patterns and styling recipes.

## Quick start

```typescript
import { AlapLens, defineAlapLens, registerConfig } from 'alap';

registerConfig(myConfig);
defineAlapLens();
```

```html
<alap-lens query=".bridge">NYC Bridges</alap-lens>
```

## `AlapLens` class

Programmatic API for the lens renderer.

```typescript
const lens = new AlapLens(config, {
  transition: 'fade',
  copyable: true,
  embedPolicy: 'prompt',
});
```

### Constructor

```typescript
new AlapLens(config: AlapConfig, options?: AlapLensOptions)
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
| `isOpen` | `boolean` | Whether the lens is currently visible |
| `rendererType` | `'lens'` | Renderer type constant (for coordinator) |

### `AlapLensOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selector` | `string` | `'.alap'` | CSS selector for trigger elements |
| `visitLabel` | `string` | `'Visit →'` | Label for the visit/navigate button |
| `closeLabel` | `string` | `'Close'` | Label for the close button |
| `metaLabels` | `Record<string, string>` | `{}` | Custom display names for meta keys |
| `copyable` | `boolean` | `true` | Show copy-to-clipboard on panel hover |
| `panelCloseButton` | `boolean` | `false` | Show a Close button in the actions row |
| `transition` | `'fade' \| 'resize' \| 'none'` | `'fade'` | Navigation transition between items |
| `tagSwitchTooltip` | `number` | `3000` | Duration (ms) of tag-switch tooltip. 0 to disable |
| `placement` | `Placement` | `'C'` | Viewport placement (compass direction) |
| `embedPolicy` | `EmbedPolicy` | `'prompt'` | `'prompt'` \| `'allow'` \| `'block'` |
| `embedAllowlist` | `string[]` | all providers | Override default embed provider allowlist |

#### Transition modes

| Mode | Behavior |
|------|----------|
| `'fade'` | Opacity crossfade between items. No reflow. |
| `'resize'` | Animated height change. Smooth panel resize. |
| `'none'` | Instant swap, no animation. |

## `<alap-lens>` web component

### Registration

```typescript
import { defineAlapLens } from 'alap';

defineAlapLens();              // registers as <alap-lens>
defineAlapLens('my-detail');   // custom tag name
```

### HTML attributes

| Attribute | Description |
|-----------|-------------|
| `query` | Alap expression (e.g. `.bridge`, `@favorites`) |
| `config` | Named config to use (default: `'_default'`) |
| `placement` | Viewport placement (compass direction) |
| `transition` | `'fade'` \| `'resize'` \| `'none'` |
| `copyable` | Show copy button (`'true'` or `'false'`) |
| `panel-close-button` | Show close button in actions row |
| `tag-switch-tooltip` | Tooltip duration in ms |
| `visit-label` | Visit button label |
| `close-label` | Close button label |
| `meta-labels` | JSON string with custom meta field labels |

### Methods

| Method | Description |
|--------|-------------|
| `close()` | Close the lens programmatically |

### ARIA

The web component automatically sets `role="button"`, `aria-haspopup="dialog"`, `tabindex="0"`, and toggles `aria-expanded`.

## CSS custom properties

All properties use the `--alap-lens-` prefix.

::: details Show all custom properties
**Panel**

| Property | Default |
|----------|---------|
| `--alap-lens-bg` | `#1a1a2e` |
| `--alap-lens-radius` | `12px` |
| `--alap-lens-shadow` | `0 24px 80px rgba(0, 0, 0, 0.5)` |
| `--alap-lens-max-width` | `520px` |
| `--alap-lens-padding` | `1.5rem` |

**Overlay**

| Property | Default |
|----------|---------|
| `--alap-lens-overlay-bg` | `rgba(0, 0, 0, 0.85)` |
| `--alap-lens-overlay-blur` | `4px` |
| `--alap-lens-overlay-padding` | `2rem` |
| `--alap-lens-z-index` | `10000` |

**Label**

| Property | Default |
|----------|---------|
| `--alap-lens-label-color` | `#fff` |
| `--alap-lens-label-size` | `1.4rem` |
| `--alap-lens-label-weight` | `600` |

**Description**

| Property | Default |
|----------|---------|
| `--alap-lens-desc-color` | `#aaa` |
| `--alap-lens-desc-size` | `0.95rem` |
| `--alap-lens-desc-line-height` | `1.5` |

**Tags**

| Property | Default |
|----------|---------|
| `--alap-lens-tag-bg` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lens-tag-color` | `#aac4f0` |
| `--alap-lens-tag-radius` | `12px` |
| `--alap-lens-tag-size` | `0.8rem` |
| `--alap-lens-tag-padding` | `0.15rem 0.6rem` |
| `--alap-lens-tag-gap` | `0.35rem` |

**Image**

| Property | Default |
|----------|---------|
| `--alap-lens-image-max-height` | `280px` |
| `--alap-lens-image-portrait-max-height` | `420px` |
| `--alap-lens-image-radius` | `8px` |

**Meta fields**

| Property | Default |
|----------|---------|
| `--alap-lens-meta-key-color` | `#7888b8` |
| `--alap-lens-meta-key-size` | `0.85rem` |
| `--alap-lens-meta-key-width` | `100px` |
| `--alap-lens-meta-value-color` | `#d0d7e5` |
| `--alap-lens-meta-value-size` | `0.9rem` |
| `--alap-lens-meta-chip-bg` | `rgba(255, 255, 255, 0.08)` |
| `--alap-lens-meta-chip-color` | `#aac4f0` |
| `--alap-lens-meta-link-color` | `#88bbff` |
| `--alap-lens-meta-link-hover` | `#ffd666` |
| `--alap-lens-meta-muted-color` | `#5a6a9a` |
| `--alap-lens-meta-row-gap` | `1rem` |
| `--alap-lens-meta-row-padding` | `0.3rem 0` |

**Visit button**

| Property | Default |
|----------|---------|
| `--alap-lens-visit-bg` | `#3a86ff` |
| `--alap-lens-visit-bg-hover` | `#2d6fdb` |
| `--alap-lens-visit-color` | `#fff` |
| `--alap-lens-visit-radius` | `6px` |
| `--alap-lens-visit-size` | `0.9rem` |
| `--alap-lens-visit-weight` | `500` |
| `--alap-lens-visit-padding` | `0.5rem 1.25rem` |

**Close buttons**

| Property | Default |
|----------|---------|
| `--alap-lens-close-bg` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lens-close-bg-hover` | `rgba(255, 255, 255, 0.15)` |
| `--alap-lens-close-color` | `#b8c4e8` |
| `--alap-lens-close-color-hover` | `#fff` |
| `--alap-lens-close-x-color` | `#fff` |
| `--alap-lens-close-x-size` | `2rem` |
| `--alap-lens-close-x-opacity` | `0.7` |

**Copy button**

| Property | Default |
|----------|---------|
| `--alap-lens-copy-color` | `rgba(255, 255, 255, 0.3)` |
| `--alap-lens-copy-color-hover` | `rgba(255, 255, 255, 0.7)` |
| `--alap-lens-copy-done-color` | `#4ade80` |
| `--alap-lens-copy-size` | `1.2rem` |

**Navigation**

| Property | Default |
|----------|---------|
| `--alap-lens-nav-bg` | `rgba(255, 255, 255, 0.1)` |
| `--alap-lens-nav-bg-hover` | `rgba(255, 255, 255, 0.2)` |
| `--alap-lens-nav-color` | `#fff` |
| `--alap-lens-nav-btn-size` | `36px` |
| `--alap-lens-nav-icon-size` | `1.5rem` |
| `--alap-lens-counter-color` | `#666` |
| `--alap-lens-counter-size` | `0.85rem` |
| `--alap-lens-counter-hover-color` | `#aac4f0` |
| `--alap-lens-counter-min-width` | `7em` |

**Drawer**

| Property | Default |
|----------|---------|
| `--alap-lens-drawer-toggle-color` | `rgba(255, 255, 255, 0.4)` |
| `--alap-lens-drawer-toggle-hover` | `rgba(255, 255, 255, 0.8)` |
| `--alap-lens-drawer-scrollbar-color` | `rgba(255, 255, 255, 0.2)` |

**Transitions**

| Property | Default |
|----------|---------|
| `--alap-lens-transition` | `0.25s` |
| `--alap-lens-fade` | `0.5s` |
| `--alap-lens-resize-transition` | `0.35s` |
:::

## `::part()` selectors

```css
alap-lens::part(panel) {
  background: #2a2a4e;
}

alap-lens::part(tags) {
  gap: 0.5rem;
}
```

::: details Show all part names
| Part | Element |
|------|---------|
| `overlay` | Main overlay backdrop |
| `close-x` | Close button (top right) |
| `panel` | Main content panel |
| `image-wrap` | Image container |
| `image` | Image element |
| `drawer` | Scrollable details container |
| `drawer-handle` | Drawer expand/collapse handle |
| `drawer-toggle` | Drawer toggle icon |
| `title-row` | Label + photo credit row |
| `label` | Item title/label |
| `credit` | Photo credit attribution |
| `tags` | Tag container |
| `description` | Item description |
| `meta` | Metadata section (dl) |
| `separator` | Separator line before meta |
| `actions` | Action buttons container |
| `visit` | Visit/navigate link |
| `close-btn` | Close button in actions |
| `nav` | Navigation buttons container |
| `nav-prev` | Previous button |
| `nav-next` | Next button |
| `counter-wrap` | Counter wrapper |
| `counter` | Item counter (e.g. "1 of 5") |
| `setnav` | Set navigator popup |
| `setnav-filter` | Set navigator filter input |
| `zoom-overlay` | Image zoom overlay |
:::
