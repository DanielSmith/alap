# Placement

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · [Rich-Text](rich-text.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md) · **This Page**

How the menu gets positioned, how to control it, and where Alap's job ends and CSS takes over.

> Live version: https://docs.alap.info/cookbook/placement

## The placement engine

Every Alap menu is positioned by a compass-based placement engine. You specify a preferred direction and how hard the engine should try; it handles the geometry.

### The 9 positions

```
     NW    N    NE
      ┌────┬────┐
   W  │ trigger │  E
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

The `placement` attribute is a comma-separated string with a compass direction and an optional strategy. The same format works everywhere — config, DOM attributes, web component attributes, and framework props.

**Globally in config:**

```typescript
const config = {
  settings: {
    placement: 'S',             // all menus below, centered (flip strategy is the default)
    // placement: 'S, clamp',   // same, but constrain to viewport
    placementGap: 8,            // 8px gap between trigger and menu
    viewportPadding: 12,        // 12px from viewport edges
  },
  allLinks: { ... },
};
```

**Per-element (DOM mode):**

```html
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="N">above</a>
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="E">beside</a>
<a class="alap" data-alap-linkitems=".coffee" data-alap-placement="SE, clamp">constrained</a>
```

**Per-element (web component):**

```html
<alap-link query=".coffee" placement="N">above</alap-link>
<alap-link query=".coffee" placement="E">beside</alap-link>
<alap-link query=".coffee" placement="SE, clamp">constrained</alap-link>
```

**Framework adapters (Vue, React, Svelte, Solid, Alpine):**

```html
<AlapLink query=".coffee" placement="SE, clamp">cafes</AlapLink>
```

### The four tiers

The placement system has four tiers of effort. The first is the absence of the attribute — the engine stays out of it entirely.

| Tier | Attribute value | What happens |
|------|----------------|--------------|
| 0 | *(not set)* | No placement engine. CSS positions the menu (`top: 100%; left: 0`). |
| 1 | `"SE, place"` | Position at compass point. No fallback, no clamping. Pinned. |
| 2 | `"SE"` | Position + flip to fallback if it doesn't fit. **Default strategy.** |
| 3 | `"SE, clamp"` | Flip + constrain to viewport + scroll long menus. Maximum effort. |

When you set `placement="SE"` without a strategy, you get **flip** — the engine tries the requested direction, flips to a fallback if it doesn't fit, but doesn't override your CSS sizing. This handles the common case (edge collisions) without side effects.

When you need the menu to absolutely stay in viewport — dynamic trigger positions, long titles from metadata, `min-width` on the menu — use **clamp**. This overrides `min-width` and adds `overflow-y: auto` when needed.

When you know exactly where the trigger is and want no engine intervention beyond initial positioning, use **place**.

### Parsing rules

The attribute value is parsed as comma-separated values, lowercased, with unrecognized values silently discarded:

- Compass directions: `n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`, `c`
- Strategies: `place`, `flip`, `clamp`
- If no compass direction: defaults to `se`
- If no strategy: defaults to `flip`
- If multiple compass directions: first wins
- If multiple strategies: highest effort wins

### Fallback behavior (flip and clamp strategies)

With **flip** or **clamp** strategy, placement is a preference, not a guarantee. When the preferred position doesn't fit in the viewport:

1. **Try the opposite side** — if `SE` overflows, try `NW`
2. **Try adjacent positions** — `NE`, `SW`, then `S`, `N`, etc.
3. **Best-effort return** (flip) — return the preferred position anyway, no clamping
4. **Best fit with clamping** (clamp only) — pick the position with the most visible area, clamp dimensions, and enable scrolling within the menu

With **place** strategy, the engine positions at the compass point and returns — no fallback, no clamping.

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

Simply don't set the `placement` attribute. Without it, the engine doesn't run — the menu is positioned with static CSS (`top: 100%; left: 0` or equivalent) with no viewport awareness. This is tier 0, the default.

You can also set `viewportAdjust: false` in config settings to explicitly disable the engine globally.

## Placement inside constrained containers

When an Alap link lives inside a container with `overflow: auto` or `overflow: hidden` (tables, scrollable panels, card grids), the menu can get clipped by the container's overflow boundary.

The fix: use placement to direct the menu *away* from the container's clipping edge.

```html
<!-- Inside a table cell — menu opens below the table, not clipped by it -->
<alap-link query=".bridge" placement="S, clamp">bridges</alap-link>
```

This works because the web component renders the menu as a fixed-position overlay outside the table's flow. The `S, clamp` placement positions it below and constrains it to the viewport — the table's `overflow` never comes into play.

This is especially useful in documentation sites (VitePress, MkDocs, Docusaurus) where tables and code blocks often have `overflow: auto`. A per-element `placement` attribute gives you fine-grained control without changing the site's CSS.
