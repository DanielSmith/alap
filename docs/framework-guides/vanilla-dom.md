# Vanilla DOM Adapter

**[Framework Guides](README.md):** **This Page** · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) · [Eleventy](eleventy.md)

The `AlapUI` class binds Alap menus to vanilla HTML. No framework required.

> Live version with interactive examples: https://alap.info/framework-guides/vanilla-dom

## Setup

```typescript
import { AlapUI } from 'alap';

const ui = new AlapUI(config, {
  selector: '.alap',
  menuTimeout: 5000,
  onItemHover: (detail) => { ... },
  onItemContext: (detail) => { ... },
});
```

## Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selector` | `string` | `'.alap'` | CSS selector for trigger elements |
| `menuTimeout` | `number` | from config | Auto-dismiss timeout in ms |
| `onTriggerHover` | `function` | — | Callback when mouse enters trigger |
| `onTriggerContext` | `function` | — | Callback on right-click of trigger |
| `onItemHover` | `function` | — | Callback when mouse enters menu item |
| `onItemContext` | `function` | — | Callback on right-click/ArrowRight of menu item |

See [Events](../api-reference/events.md) for callback detail types.

## Methods

| Method | Description |
|--------|-------------|
| `refresh()` | Re-scan DOM for new trigger elements |
| `updateConfig(config)` | Replace config and re-scan |
| `destroy()` | Remove all event listeners and menu container |

## HTML attributes

| Attribute | On | Description |
|-----------|----|-------------|
| `class="alap"` | Trigger | Default selector (configurable via `selector`) |
| `data-alap-linkitems` | Trigger | Expression to evaluate |
| `data-alap-existing` | Trigger | Per-anchor `existingUrl` override: `"prepend"`, `"append"`, `"ignore"` |
| `data-alap-placement` | Trigger | Placement string: compass + strategy, e.g. `"SE"`, `"SE, clamp"`, `"N, place"` |

```html
<a class="alap" data-alap-linkitems=".coffee">cafes</a>
<a class="alap" data-alap-linkitems=".nyc + .bridge">NYC bridges</a>
<a class="alap" data-alap-linkitems="@favorites" id="favorites">my picks</a>
```

## ARIA (set automatically)

| Attribute | On | Value |
|-----------|----|-------|
| `role` | Trigger | `"button"` |
| `aria-haspopup` | Trigger | `"true"` |
| `aria-expanded` | Trigger | `"true"` when open, `"false"` when closed |
| `tabindex` | Trigger | `"0"` (if not already focusable) |
| `role` | Menu | `"menu"` |
| `aria-labelledby` | Menu | Trigger's `id` (if present) |
| `role` | `<li>` | `"none"` |
| `role` | `<a>` | `"menuitem"` |

## Generated markup

```html
<div id="alapelem" class="alapelem alap_mylink" role="menu" aria-labelledby="mylink">
  <ul>
    <li class="alapListElem" role="none">
      <a href="..." role="menuitem" tabindex="-1"
         data-alap-hooks="item-hover item-context"
         data-alap-guid="a1b2c3d4..."
         data-alap-thumbnail="https://...">
        Link Label
      </a>
    </li>
  </ul>
</div>
```

## Styling

The DOM adapter creates a single shared menu container. No shadow boundary — the full CSS cascade applies.

### Selectors

| Selector | Element | Description |
|----------|---------|-------------|
| `#alapelem` | `<div>` | Menu container (shared, repositioned per trigger) |
| `.alap_${anchorId}` | `<div>` | Per-anchor class (when trigger has an `id`) |
| `.alapListElem` | `<li>` | Every list item |

### Per-item `cssClass`

The `cssClass` field on an `AlapLink` is applied to the `<li>`:

```json
{ "label": "Special", "url": "...", "cssClass": "featured" }
```

```html
<li class="alapListElem featured" role="none">...</li>
```

### Basic styling

```css
#alapelem {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
}

#alapelem a {
  display: block;
  padding: 8px 16px;
  color: #333;
  text-decoration: none;
}

#alapelem a:hover, #alapelem a:focus {
  background: #f0f7ff;
  color: #2563eb;
}
```

## Positioning

Alap uses a compass-based placement engine. The menu is positioned relative to the trigger, with automatic fallback when the preferred position doesn't fit in the viewport.

### Placement directions

```
     NW    N    NE
      ┌────┬────┐
   W  │ trigger │  E
      └────┴────┘
     SW    S    SE
         (C = centered over trigger)
```

Default: `SE` (below, left-aligned). Set globally via `settings.placement` or per-trigger via `data-alap-placement`. The attribute accepts a comma-separated string with a compass direction and optional strategy:

```html
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="N">above me</a>
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="E">beside me</a>
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="SE, clamp">constrained</a>
```

### Strategies

The strategy controls how hard the engine tries:

- **`flip`** (default) — tries the preferred direction, flips to a fallback if it doesn't fit
- **`clamp`** — flip + constrain to viewport, override `min-width`, scroll long menus
- **`place`** — pinned at compass point, no fallback, no clamping

When no `placement` attribute is set at all, the engine doesn't run — CSS positions the menu.

### Viewport containment (flip and clamp)

- If the preferred placement overflows the viewport, Alap tries the opposite side, then adjacent positions
- With `clamp` strategy: if no placement fits fully, the menu is clamped to the available space with vertical scrolling
- The menu never causes the page to scroll — uses `overflow: clip` to prevent layout shift
- `placementGap` controls the pixel gap between trigger and menu (default: 4)
- `viewportPadding` controls the minimum distance from viewport edges (default: 8)

### Image triggers

Image triggers use a point rect at the click coordinates. The placement engine positions the menu relative to the click point using the same compass logic and fallback behavior.

### Static positioning

Don't set the `placement` attribute, or set `viewportAdjust: false` to disable the engine globally. The menu is positioned below the trigger with no viewport awareness.

## Examples

**Hover preview panel:**

```typescript
const preview = document.getElementById('preview');

const ui = new AlapUI(config, {
  onItemHover: ({ link }) => {
    preview.innerHTML = `
      <img src="${link.thumbnail}" />
      <p>${link.description}</p>
    `;
    preview.hidden = false;
  },
});
```

**Dynamically added content:**

```typescript
ui.refresh();                    // after AJAX loads new .alap links
ui.updateConfig(updatedConfig);  // after config changes
ui.destroy();                    // cleanup on SPA route change
```

**Existing URL preservation:**

```html
<!-- Original href becomes the first menu item (default: prepend) -->
<a class="alap" href="https://example.com" data-alap-linkitems=".coffee">
  example.com and coffee
</a>

<!-- Override per-link -->
<a class="alap" href="https://example.com" data-alap-linkitems=".coffee" data-alap-existing="append">
  coffee then example.com
</a>
```
