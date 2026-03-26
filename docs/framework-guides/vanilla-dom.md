# Vanilla DOM Adapter

**[Framework Guides](README.md):** **This Page** · [Web Component](web-component.md) · [React](react.md) · [Vue](vue.md) · [Svelte](svelte.md) · [SolidJS](solid.md) · [Astro](astro.md) · [Alpine.js](alpine.md) | [All docs](../README.md)

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

- **Anchor elements:** Menu positioned below the trigger's bottom edge, left-aligned
- **Image triggers:** Menu positioned at click coordinates (`pageX`, `pageY`)
- **Viewport adjustment** (`viewportAdjust: true`, default): Flips menu above trigger if it would overflow

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
