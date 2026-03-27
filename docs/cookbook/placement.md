# Placement

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md) · **This Page** | [All docs](../README.md)

How the menu gets positioned, how to control it, and where Alap's job ends and CSS takes over.

> Live version: https://alap.info/cookbook/placement

## The placement engine

Every Alap menu is positioned by a compass-based placement engine. You specify a preferred direction; the engine handles the geometry.

### The 9 positions

```
     NW    N    NE
      ┌────┬────┐
   W  │  trigger │  E
      └────┴────┘
     SW    S    SE

      C = centered over trigger
```

| Placement | Position | Alignment |
|-----------|----------|-----------|
| `N` | Above | Centered horizontally |
| `NE` | Above | Left edge aligned with trigger left |
| `E` | Right | Vertically centered |
| `SE` | Below | Left edge aligned with trigger left (default) |
| `S` | Below | Centered horizontally |
| `SW` | Below | Right edge aligned with trigger right |
| `W` | Left | Vertically centered |
| `NW` | Above | Right edge aligned with trigger right |
| `C` | Over trigger | Centered both axes |

### Setting placement

**Globally in config:**

```typescript
const config = {
  settings: {
    placement: 'S',       // all menus below, centered
    placementGap: 8,      // 8px gap between trigger and menu
    viewportPadding: 12,  // 12px from viewport edges
  },
  allLinks: { ... },
};
```

**Per-element (DOM mode):**

```html
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="N">above</a>
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="E">beside</a>
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="C">centered</a>
```

**Per-element (web component):**

```html
<alap-link query=".coffee" placement="N">above</alap-link>
<alap-link query=".coffee" placement="E">beside</alap-link>
<alap-link query=".coffee" placement="C">centered</alap-link>
```

### Fallback behavior

Placement is a preference, not a guarantee. When the preferred position doesn't fit in the viewport:

1. **Try the opposite side** — if `SE` overflows, try `NW`
2. **Try adjacent positions** — `NE`, `SW`, then `S`, `N`, etc.
3. **Best fit with clamping** — if nothing fits fully, pick the position with the most visible area, clamp the height, and enable scrolling within the menu

The menu never causes the page to scroll. In DOM mode, this is enforced with `overflow-x: clip` on the menu container, which prevents horizontal overflow from creating a scrollable context (unlike `overflow: hidden`, which can cause unwanted scrollbars on the other axis).

### Image triggers

In DOM mode, image triggers (`<img>` elements with the `.alap` class) use the click coordinates as a point rect. The placement engine positions the menu relative to the click point — same compass logic, same fallback.

## Alap vs. CSS: where's the boundary?

Alap handles **where** the menu goes. CSS handles **how it looks**.

### What Alap controls

- **Position** — which compass direction, which side of the trigger
- **Fallback** — what happens when the preferred position overflows
- **Viewport containment** — the menu stays on screen, with clamping and scroll
- **Gap** — the distance between the trigger edge and the menu edge
- **No-scroll guarantee** — the menu never causes page-level scroll

### What CSS controls

Everything visual:

- Colors, backgrounds, borders, shadows, rounded corners
- Font, size, padding, spacing
- Hover/focus effects, transitions, animations
- Menu width constraints (`--alap-min-width`, `--alap-max-width`)
- Scrollbar appearance (`--alap-scrollbar-*`)
- Opacity, backdrop blur, drop shadows

### The overlap

A few things sit at the boundary:

| Concern | Alap config | CSS |
|---------|-------------|-----|
| Gap between trigger and menu | `placementGap` (px) | `--alap-gap` (web component only, takes priority) |
| Menu max height | Set automatically when clamping | Can set via CSS, but placement engine overrides when needed |
| Menu width | Not controlled by placement | `--alap-min-width`, `--alap-max-width` |
| z-index | `10` (hardcoded) | `--alap-z-index` (web component) or `#alapelem { z-index }` (DOM) |

**Rule of thumb:** if it affects where the menu sits in viewport space, it's Alap's job. If it affects how the menu looks once it's there, it's CSS's job.

### Example: custom tooltip-style menu

Combine placement with CSS for a tooltip feel:

```typescript
settings: {
  placement: 'N',       // above the trigger
  placementGap: 12,     // generous gap
}
```

```css
/* Web component */
alap-link {
  --alap-radius: 8px;
  --alap-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  --alap-bg: #1e1e2e;
  --alap-text: #cdd6f4;
  --alap-hover-bg: #313244;
  --alap-hover-text: #89b4fa;
  --alap-min-width: 160px;
}
```

```css
/* DOM mode */
#alapelem {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: #1e1e2e;
  min-width: 160px;
}

#alapelem a {
  color: #cdd6f4;
  padding: 6px 12px;
}

#alapelem a:hover {
  background: #313244;
  color: #89b4fa;
}
```

Alap places the menu above; CSS makes it look like a dark tooltip. Neither needs to know about the other.

### Example: context menu at click point

For a right-click-style menu, use `C` placement on an image trigger:

```html
<img class="alap" data-alap-linkitems=".actions" data-alap-placement="C">
```

The menu appears centered at the click point. CSS can add a context-menu visual style; placement handles the geometry.

## Disabling placement

Set `viewportAdjust: false` to disable the placement engine entirely. The menu is positioned with static CSS (`top: 100%; left: 0` or equivalent) with no viewport awareness. Use this only when you want full manual control over positioning via CSS.
