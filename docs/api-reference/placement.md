# Placement API

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md) · **This Page** · [Lightbox](lightbox.md) · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Config Registry](config-registry.md)

Pure-geometry placement engine. Positions menus, overlays, and panels relative to trigger elements without touching the DOM.

> See also: [Cookbook: Placement](../cookbook/placement.md) for usage examples.

## Which import?

```typescript
// Browser — use with AlapUI or web components
import { computePlacement, parsePlacement } from 'alap';

// No DOM — use in tests or build tools
import { computePlacement, parsePlacement } from 'alap/core';
```

## `computePlacement(input)`

Computes where to position a menu relative to a trigger element. Pure geometry — no DOM access. Takes viewport-coordinate rects, returns viewport-coordinate results.

```typescript
const result = computePlacement({
  triggerRect: trigger.getBoundingClientRect(),
  menuSize: { width: menu.offsetWidth, height: menu.offsetHeight },
  viewport: { width: innerWidth, height: innerHeight },
  placement: 'SE',
  strategy: 'flip',
});

// result.x, result.y — top-left of menu in viewport coords
// result.placement — actual placement used (may differ if flipped)
// result.scrollY — true if menu content should scroll
```

### `PlacementInput`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `triggerRect` | `Rect` | required | Trigger element rect from `getBoundingClientRect()` |
| `menuSize` | `Size` | required | Natural (unconstrained) menu dimensions |
| `viewport` | `Size` | required | `{ width: innerWidth, height: innerHeight }` |
| `placement` | `Placement` | `'SE'` | Preferred compass direction |
| `strategy` | `PlacementStrategy` | `'flip'` | How hard to try to fit |
| `gap` | `number` | `4` | Pixel gap between trigger and menu edge |
| `padding` | `number` | `8` | Minimum distance from viewport edges |

### `PlacementResult`

| Field | Type | Description |
|-------|------|-------------|
| `placement` | `Placement` | The placement actually used (may differ from requested) |
| `x` | `number` | Menu top-left x in viewport coordinates |
| `y` | `number` | Menu top-left y in viewport coordinates |
| `maxWidth` | `number?` | Clamped max width (only set if menu needed to shrink) |
| `maxHeight` | `number?` | Clamped max height (only set if menu needed to shrink) |
| `scrollY` | `boolean` | Whether menu content should scroll vertically |

## `parsePlacement(input)`

Parses a comma-separated placement string into a compass direction and strategy.

```typescript
parsePlacement('SE')          // → { compass: 'SE', strategy: 'flip' }
parsePlacement('N, clamp')    // → { compass: 'N', strategy: 'clamp' }
parsePlacement('clamp')       // → { compass: 'SE', strategy: 'clamp' }
parsePlacement('SW, place')   // → { compass: 'SW', strategy: 'place' }
```

Unknown tokens are silently discarded. If multiple compass directions appear, uses the first. If multiple strategies appear, uses the highest effort.

## Types

### `Placement`

Nine compass directions plus center:

```typescript
type Placement = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'C';
```

### `PlacementStrategy`

Three levels of effort, each building on the last:

| Strategy | Behavior |
|----------|----------|
| `'place'` | Position at compass point. No fallback, no clamping. |
| `'flip'` | Place + try fallbacks if it doesn't fit. No clamping. **(default)** |
| `'clamp'` | Flip + constrain to viewport + scroll long menus. |

### `Rect`

```typescript
interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}
```

Same shape as `DOMRect`.

### `Size`

```typescript
interface Size { width: number; height: number; }
```

## `FALLBACK_ORDER`

When the `flip` or `clamp` strategy can't fit at the requested position, it walks this fallback order. Tries the opposite direction first, then adjacent, then remaining:

::: details Show fallback table
```typescript
const FALLBACK_ORDER: Record<Placement, Placement[]> = {
  N:  ['S',  'NE', 'NW', 'SE', 'SW', 'E',  'W',  'C'],
  NE: ['SW', 'SE', 'NW', 'S',  'N',  'E',  'W',  'C'],
  E:  ['W',  'SE', 'NE', 'SW', 'NW', 'S',  'N',  'C'],
  SE: ['NW', 'NE', 'SW', 'S',  'N',  'E',  'W',  'C'],
  S:  ['N',  'SE', 'SW', 'NE', 'NW', 'E',  'W',  'C'],
  SW: ['NE', 'NW', 'SE', 'S',  'N',  'W',  'E',  'C'],
  W:  ['E',  'NW', 'SW', 'NE', 'SE', 'N',  'S',  'C'],
  NW: ['SE', 'SW', 'NE', 'N',  'S',  'W',  'E',  'C'],
  C:  ['SE', 'NE', 'SW', 'NW', 'S',  'N',  'E',  'W'],
};
```
:::

## DOM helpers

These functions bridge `computePlacement` to the actual DOM. Used internally by all adapters.

### `calcPlacementState(triggerEl, menuEl, options)`

Measures trigger and menu, calls `computePlacement`, returns the result. Framework-agnostic — each adapter calls this in its own reactive context.

### `applyPlacementToMenu(menuEl, wrapperEl, state)`

Applies a `PlacementResult` to a menu element using wrapper-relative offsets. The menu must be inside a wrapper with `position: relative`.

### `applyPlacementAfterLayout(triggerEl, menuEl, wrapperEl, options)`

Schedules placement after the browser has completed layout via `requestAnimationFrame`. Returns a synchronous apply function for scroll handlers where rAF latency is unwanted.

### `calcPlacementAfterLayout(triggerEl, menuEl, options, onPlacement)`

Same as above but for adapters that position via viewport coordinates (e.g. Alpine, which appends menus to `document.body`). Calls the provided callback with the result.

### `applyPlacementClass(el, placement)` / `clearPlacementClass(el)`

Adds or removes `alap-placed-{direction}` CSS classes (e.g. `alap-placed-se`). Validates against the known set to prevent injection.

### `observeTriggerOffscreen(triggerEl, onOffscreen)`

Returns an `IntersectionObserver` that fires when the trigger scrolls fully off-screen. Disconnect it on menu close.
