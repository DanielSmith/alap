# Lightbox Renderer

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · [Rich-Text](rich-text.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images and Media](images-and-media.md) · [Placement](placement.md) · [Lens Renderer](lens.md) · [Embeds](embeds.md) · **This Page** | [All docs](../README.md)

The lightbox renderer presents resolved links as a fullscreen overlay carousel instead of a dropdown menu. Same config, different presentation.

> Live version: https://examples.alap.info/lightbox/

## Basic usage

```typescript
import { AlapLightbox } from 'alap/ui-lightbox';
import 'alap/ui-lightbox/lightbox.css';

const lightbox = new AlapLightbox(config, {
  selector: '.alap',
});
```

```html
<a class="alap" data-alap-linkitems=".bridge">bridges</a>
```

Click the link to open the lightbox. If the expression resolves to multiple items, prev/next arrows and a set navigator appear.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `selector` | `string` | `'.alap'` | CSS selector for trigger elements |
| `placement` | `Placement` | `null` (centered) | Viewport anchor for the panel |
| `embedPolicy` | `EmbedPolicy` | `'prompt'` | Embed consent policy: `'prompt'`, `'allow'`, or `'block'` |
| `embedAllowlist` | `string[]` | all providers | Narrow the default embed provider list |

## What it shows

Each item in the lightbox displays:

- **Image** from `thumbnail` or `image` field (350px fixed height, `object-fit: cover`)
- **Label** as the title
- **Photographer credit** from `meta.photoCredit` (with optional `meta.photoCreditUrl` link)
- **Description** text
- **Visit button** linking to the item's URL

Items without an image but with `meta.embed` show an iframe in the image area (see [Embeds](embeds.md)). Items with neither show a text-only panel with a transparent card background.

## Keyboard and mouse interactions

| Input | Action |
|---|---|
| **Escape** | Close the lightbox (or close zoom first if open) |
| **ArrowLeft** | Previous item |
| **ArrowRight** | Next item |
| **ArrowUp** | Previous item |
| **ArrowDown** | Next item |
| **Click image** | Open fullscreen zoom |
| **Click overlay backdrop** | Close the lightbox |
| **Hover prev/next zones** | Show navigation arrows |

While the lightbox is open, page scrolling is locked — arrow keys and mousewheel affect only the overlay, preserving the user's scroll position on the page behind it.

### Rapid navigation

Single arrow presses produce a smooth fade transition. When pressing rapidly, the fade duration halves for responsiveness. One navigation is queued during a fade — additional presses are absorbed. After 1 second of calm, the fade speed returns to normal.

## Set navigator

The counter (e.g. "2 / 5") doubles as a navigation menu, identical to the lens renderer:

- **Hover** the counter to see "menu..." hint
- **Click** the counter to open a popup listing all items
- **Type** to filter items by label (greedy regex)
- **Arrow keys** to highlight, **Enter** to jump
- **Escape** closes the popup without closing the lightbox

## Image zoom

Click any image to open a fullscreen zoom overlay. Click or press Escape to dismiss. Escape stacking: first Escape closes zoom, second closes the lightbox.

## Transitions

Item-to-item navigation uses a fade crossfade (250ms default). Content fades out, data swaps, content fades back in. The overlay itself opens and closes with a separate 500ms fade.

Both durations are configurable via CSS custom properties:

```css
:root {
  --alap-lightbox-transition: 0.25s;  /* item crossfade */
  --alap-lightbox-fade: 0.5s;         /* overlay open/close */
}
```

## Viewport placement

The lightbox panel is centered by default. Pass a compass direction to anchor it elsewhere:

```typescript
const lightbox = new AlapLightbox(config, {
  placement: 'N',  // anchored to top
});
```

Available directions: `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`, `C` (centered).

Change placement at runtime:

```typescript
lightbox.setPlacement('SE');   // move to bottom-right
lightbox.setPlacement(null);   // revert to centered
```

## CSS custom properties

Override any of these on `:root` or a parent element:

```css
:root {
  /* Overlay */
  --alap-lightbox-fade: 0.5s;

  /* Panel */
  --alap-lightbox-transition: 0.25s;

  /* Counter */
  --alap-lightbox-counter-color: #666;
  --alap-lightbox-counter-size: 0.85rem;
  --alap-lightbox-counter-hover-color: #aac4f0;

  /* Set navigator popup */
  --alap-lightbox-setnav-min-width: 220px;
  --alap-lightbox-setnav-max-width: 320px;
  --alap-lightbox-setnav-bg: #1e1e3a;
  --alap-lightbox-setnav-border: rgba(255, 255, 255, 0.1);
  --alap-lightbox-setnav-radius: 8px;
  --alap-lightbox-setnav-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --alap-lightbox-setnav-max-height: 240px;

  /* Set navigator items */
  --alap-lightbox-setnav-item-padding: 0.4rem 0.75rem;
  --alap-lightbox-setnav-item-color: #d0d7e5;
  --alap-lightbox-setnav-item-size: 0.85rem;
  --alap-lightbox-setnav-item-hover-bg: rgba(255, 255, 255, 0.1);
  --alap-lightbox-setnav-item-hover-color: #fff;
  --alap-lightbox-setnav-item-active-bg: rgba(58, 134, 255, 0.2);
  --alap-lightbox-setnav-item-active-color: #88bbff;
  --alap-lightbox-setnav-item-active-weight: 600;
  --alap-lightbox-setnav-item-highlight-bg: rgba(255, 255, 255, 0.15);
  --alap-lightbox-setnav-item-highlight-color: #fff;

  /* Set navigator filter */
  --alap-lightbox-setnav-filter-padding: 0.5rem 0.75rem;
  --alap-lightbox-setnav-filter-bg: rgba(255, 255, 255, 0.05);
  --alap-lightbox-setnav-filter-color: #fff;
  --alap-lightbox-setnav-filter-size: 0.8rem;
  --alap-lightbox-setnav-placeholder-color: rgba(255, 255, 255, 0.3);
  --alap-lightbox-setnav-clear-color: rgba(255, 255, 255, 0.4);
  --alap-lightbox-setnav-clear-hover-color: #fff;
}
```

See `src/ui-lightbox/lightbox.css` for the full list.

## CoordinatedRenderer

The lightbox implements the `CoordinatedRenderer` interface, so it works with `RendererCoordinator` for menu-to-lightbox transitions:

```typescript
import { RendererCoordinator } from 'alap';
import { AlapUI } from 'alap';
import { AlapLightbox } from 'alap/ui-lightbox';

const menu = new AlapUI(config);
const lightbox = new AlapLightbox(config);

const coordinator = new RendererCoordinator();
coordinator.register(menu);
coordinator.register(lightbox);
```

## Web component

The `<alap-lightbox>` custom element provides the same lightbox as an attribute-driven web component with Shadow DOM encapsulation.

```typescript
import { registerConfig } from 'alap';
import { defineAlapLightbox } from 'alap/ui-lightbox';

registerConfig(config);
defineAlapLightbox();
```

```html
<alap-lightbox query=".bridge">bridges</alap-lightbox>
<alap-lightbox query=".coffee" placement="S">coffee</alap-lightbox>
```

### Attributes

| Attribute | Description |
|---|---|
| `query` | Alap expression (`.tag`, `@macro`, item IDs) |
| `config` | Named config key (default: `_default`) |
| `placement` | Viewport anchor (`N`, `SE`, `C`, etc.) |

### Styling with `::part()`

```css
alap-lightbox::part(overlay) { /* backdrop */ }
alap-lightbox::part(panel) { /* card */ }
alap-lightbox::part(image-wrap) { /* image container */ }
alap-lightbox::part(image) { /* the img element */ }
alap-lightbox::part(label) { /* title */ }
alap-lightbox::part(credit) { /* photographer credit */ }
alap-lightbox::part(description) { /* description text */ }
alap-lightbox::part(visit) { /* visit button */ }
alap-lightbox::part(close-btn) { /* close button */ }
alap-lightbox::part(close-x) { /* overlay close X */ }
alap-lightbox::part(counter) { /* item counter */ }
alap-lightbox::part(counter-wrap) { /* counter container */ }
alap-lightbox::part(setnav) { /* set navigator popup */ }
alap-lightbox::part(setnav-filter) { /* filter input */ }
alap-lightbox::part(nav-prev) { /* prev arrow zone */ }
alap-lightbox::part(nav-next) { /* next arrow zone */ }
alap-lightbox::part(body) { /* text content area */ }
alap-lightbox::part(label-row) { /* title + credit row */ }
alap-lightbox::part(zoom-overlay) { /* zoom backdrop */ }
```

## Lightbox vs. Lens

| | Lightbox | Lens |
|---|---|---|
| Focus | Browse multiple items visually | Inspect one item deeply |
| Content | Image, label, description, credit | All fields: meta, tags, embeds |
| Transition | Fade only (250ms) | Fade (250ms), resize, or none |
| Tags | Not shown | Clickable with drill-down |
| Meta fields | Not shown | Auto-detected type rendering |
| Copy button | No | Yes |
| Up/Down keys | Navigate prev/next | Expand/collapse drawer |
| Details drawer | No | Yes (scrollable, slides over image) |

They compose: menu shows items, lightbox browses them visually, lens inspects one in detail.
