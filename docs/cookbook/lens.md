# Lens Renderer

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · [Rich-Text](rich-text.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images and Media](images-and-media.md) · [Placement](placement.md) · [Lightbox Renderer](lightbox.md) · [Embeds](embeds.md) · **This Page**

The lens renderer shows a single item's full data in an overlay panel — label, description, thumbnail, tags, and all meta fields. Same config, different presentation.

> Live version: https://examples.alap.info/lens/

## Basic usage

```typescript
import { AlapLens } from 'alap/ui-lens';
import 'alap/ui-lens/lens.css';

const lens = new AlapLens(config, {
  selector: '.alap-lens',
});
```

```html
<a class="alap-lens" data-alap-linkitems=".bridge">bridges</a>
```

Click the link to open the lens panel. If the expression resolves to multiple items, prev/next arrows and a set navigator appear.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `selector` | `string` | `'.alap'` | CSS selector for trigger elements |
| `visitLabel` | `string` | `'Visit →'` | Label for the URL button |
| `closeLabel` | `string` | `'Close'` | Label for the close button (when shown) |
| `metaLabels` | `Record<string, string>` | `{}` | Display name overrides for meta keys |
| `copyable` | `boolean` | `true` | Show copy-to-clipboard button on panel hover |
| `panelCloseButton` | `boolean` | `false` | Show a Close button in the actions row |
| `transition` | `'fade' \| 'resize' \| 'none'` | `'fade'` | Navigation transition between items |
| `tagSwitchTooltip` | `number` | `3000` | Duration (ms) of "switching to .tag" tooltip on counter. `0` to disable |
| `embedPolicy` | `EmbedPolicy` | `'prompt'` | Embed consent policy: `'prompt'`, `'allow'`, or `'block'` |
| `embedAllowlist` | `string[]` | all providers | Narrow the default embed provider list |

## Photographer credits

If an item has `meta.photoCredit`, the lens displays it on the same row as the item label. If `meta.photoCreditUrl` is also present, the credit is a clickable link.

```typescript
allLinks: {
  goldengate: {
    label: 'Golden Gate Bridge',
    thumbnail: '../shared/img/goldengate.jpg',
    meta: {
      photoCredit: 'Maarten van den Heuvel',
      photoCreditUrl: 'https://unsplash.com/@mvdheuvel',
    },
  },
}
```

## Clickable tags

Tag chips in the lens are interactive. Click any tag to drill into that tag's full set — the lens resolves `.tagname` against the config and swaps the entire item set.

When you drill into a tag:
- The clicked tag stays highlighted (blue tint) across all items in the set
- The counter briefly shows "switching to .tagname" as a tooltip (configurable duration, blue color)
- The counter smoothly transitions between states (500ms ease-in-out, configurable)

This turns the lens into a browsable data explorer without leaving the panel.

## Keyboard and mouse interactions

| Input | Action |
|---|---|
| **Escape** | Close the lens (or close zoom first if open) |
| **ArrowLeft** | Previous item |
| **ArrowRight** | Next item |
| **ArrowUp** | Expand drawer (slide details over the image) |
| **ArrowDown** | Collapse drawer (restore the image) |
| **Click image** | Open fullscreen zoom |
| **Click tag** | Drill into that tag's full set |
| **Click overlay backdrop** | Close the lens |
| **Hover drawer handle** | Reveal the drawer toggle and highlight the handle row |
| **Click drawer handle** | Toggle drawer expanded/collapsed |
| **Hover panel** | Reveal scrollbar in the details area |

While the lens is open, page scrolling is locked — arrow keys and mousewheel affect only the overlay, preserving the user's scroll position on the page behind it.

### Rapid navigation

Single arrow presses (Left/Right) produce a smooth fade transition. When pressing rapidly, the fade duration halves for responsiveness. One navigation is queued during a fade — additional presses are absorbed. After 1 second of calm, the fade speed returns to normal.

## Details drawer

When an item has more content than fits on screen, the details area (title, tags, description, meta fields) is a scrollable container. The scrollbar is hidden until hovering over the panel, then fades in smoothly (no layout jump).

A drawer handle sits between the image and the details. Hover the handle row to reveal the toggle icon and a subtle background highlight. Click anywhere on the handle row (or press ArrowUp) to expand the drawer over the image, giving more room for metadata-heavy items. Click again (or press ArrowDown) to restore the image.

The drawer state resets when the lens closes.

## Set navigator

When viewing multiple items, the counter (e.g. "2 / 5") doubles as a navigation menu:

- **Hover** the counter to see "menu..." hint
- **Click** the counter to open a popup listing all items
- **Type** to filter items by label (greedy regex)
- **Arrow keys** to highlight, **Enter** to jump
- **Escape** closes the popup without closing the lens

## Image zoom

Click any thumbnail to open a fullscreen zoom overlay. Click or press Escape to dismiss. Escape stacking: first Escape closes zoom, second closes the lens.

## Transitions

Three modes for navigating between items:

- **`fade`** (default) — opacity crossfade (250ms), no reflow. Content fades out, swaps, fades back in.
- **`resize`** — animated height transition (350ms). Locks current height, swaps content, measures new height, animates smoothly. Good when items vary significantly in size.
- **`none`** — instant swap, no animation.

The overlay itself opens and closes with a separate 500ms fade. All durations are configurable via CSS custom properties:

```css
:root {
  --alap-lens-transition: 0.25s;          /* item crossfade (fade mode) */
  --alap-lens-resize-transition: 0.35s;   /* item height animation (resize mode) */
  --alap-lens-fade: 0.5s;                 /* overlay open/close */
}
```

## CSS custom properties

All visual values are tokenized. Override any of these on `:root` or a parent element:

```css
:root {
  /* Panel */
  --alap-lens-bg: #1a1a2e;
  --alap-lens-radius: 12px;
  --alap-lens-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  --alap-lens-max-width: 520px;
  --alap-lens-padding: 1.5rem;

  /* Tag switch tooltip */
  --alap-lens-tag-tooltip-color: #88bbff;
  --alap-lens-tag-tooltip-size: 0.85rem;
  --alap-lens-tag-tooltip-weight: 500;

  /* Counter transition */
  --alap-lens-counter-transition: 500ms;
}
```

See `src/ui-lens/lens.css` for the full list of ~50 custom properties.

## CoordinatedRenderer

The lens implements the `CoordinatedRenderer` interface, so it works with `RendererCoordinator` for menu → lightbox → lens transitions:

```typescript
import { RendererCoordinator } from 'alap';
import { AlapUI } from 'alap';
import { AlapLens } from 'alap/ui-lens';

const menu = new AlapUI(config);
const lens = new AlapLens(config, { selector: '.alap-lens' });

const coordinator = new RendererCoordinator();
coordinator.register(menu);
coordinator.register(lens);
```

## Items without URLs

Items with empty or missing `url` fields are first-class in the lens. They show metadata only (no Visit button). This makes the lens useful for pure data display — nutritional info, reference data, dictionary definitions.

```typescript
allLinks: {
  apple: {
    label: 'Apple',
    url: '',
    tags: ['fruit', 'rosaceae'],
    description: 'A widely cultivated tree fruit.',
    meta: {
      calories: 52,
      fiber: 2.4,
      vitamin_c: '14% DV',
    },
  },
}
```

## Embed rendering

If an item has `meta.embed`, the lens renders an iframe (or consent placeholder) in the meta zone, above the field list. The `embed` and `embedType` keys are filtered from the displayed fields. See [Embeds](embeds.md) for full details on providers, policies, and security.

## Meta field auto-detection

The lens inspects each meta value at render time and picks the appropriate presentation:

| Type | Detection | Rendering |
|---|---|---|
| Short string (<100 chars) | `typeof === 'string'` | Key-value row |
| Long string (>=100 chars) | Length check | Paragraph block |
| Number | `typeof === 'number'` | Key-value row |
| Boolean | `typeof === 'boolean'` | Check/cross icon |
| Array of strings | `Array.isArray && every string` | Chips/badges |
| Array of URLs | `Array.isArray && every http` | Clickable link list |

Override auto-detection with `_display` hints in meta:

```typescript
meta: {
  bio: 'A long biography...',
  bio_display: 'text',      // force paragraph
  episodes: ['https://...'],
  episodes_display: 'links', // force link list
}
```

## Web component

The `<alap-lens>` custom element provides the same lens as an attribute-driven web component with Shadow DOM encapsulation.

```typescript
import { registerConfig } from 'alap';
import { defineAlapLens } from 'alap/ui-lens';

registerConfig(config);
defineAlapLens();
```

```html
<alap-lens query=".bridge">bridges</alap-lens>
<alap-lens query=".fruit" transition="resize">fruit data</alap-lens>
<alap-lens query=".tv" panel-close-button>TV shows</alap-lens>
```

### Attributes

| Attribute | Description |
|---|---|
| `query` | Alap expression (`.tag`, `@macro`, item IDs) |
| `config` | Named config key (default: `_default`) |
| `placement` | Viewport anchor (`N`, `SE`, `C`, etc.) |
| `transition` | Navigation mode: `fade` (default), `resize`, `none` |
| `copyable` | Show copy-to-clipboard button (present = true) |
| `panel-close-button` | Show a Close button in the actions row (present = true) |
| `tag-switch-tooltip` | Duration (ms) of tag switch tooltip. `0` to disable |

### Styling with `::part()`

```css
alap-lens::part(overlay) { /* backdrop */ }
alap-lens::part(panel) { /* card container */ }
alap-lens::part(close-x) { /* overlay close X */ }
alap-lens::part(image-wrap) { /* image container */ }
alap-lens::part(image) { /* the img element */ }
alap-lens::part(drawer-handle) { /* drawer toggle row */ }
alap-lens::part(drawer-toggle) { /* drawer toggle icon */ }
alap-lens::part(drawer) { /* scrollable details container */ }
alap-lens::part(title-row) { /* label + credit row */ }
alap-lens::part(label) { /* item title */ }
alap-lens::part(credit) { /* photographer credit */ }
alap-lens::part(tags) { /* tag chips container */ }
alap-lens::part(description) { /* description text */ }
alap-lens::part(meta) { /* meta fields section */ }
alap-lens::part(actions) { /* visit + close buttons */ }
alap-lens::part(visit) { /* visit button */ }
alap-lens::part(close-btn) { /* close button */ }
alap-lens::part(nav) { /* navigation bar */ }
alap-lens::part(nav-prev) { /* prev button */ }
alap-lens::part(nav-next) { /* next button */ }
alap-lens::part(counter) { /* item counter */ }
alap-lens::part(counter-wrap) { /* counter container */ }
```

## Lens vs. Lightbox

| | Lens | Lightbox |
|---|---|---|
| Focus | Inspect one item deeply | Browse multiple items visually |
| Content | All fields: meta, tags, embeds | Image, label, description, credit |
| Transition | Fade (250ms), resize, or none | Fade only (250ms) |
| Tags | Clickable with drill-down | Not shown |
| Meta fields | Auto-detected type rendering | Not shown |
| Copy button | Yes | No |
| Up/Down keys | Expand/collapse drawer | Navigate prev/next |
| Details drawer | Yes (scrollable, slides over image) | No |

They compose: menu shows items, lightbox browses them visually, lens inspects one in detail.
