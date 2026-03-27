# Placement Demo

Demonstrates the compass-based placement engine, including happy-path placements and edge-case stress tests.

## What it shows

1. **Compass rose** — all 9 placements in a centered grid (happy path)
2. **Horizontal edge flips** — links at viewport left/right edges; E flips to W, W flips to E
3. **Vertical edge flips** — links near the top; N/NW/NE flip southward
4. **Corner stress tests** — links pinned to each viewport corner with the worst-case placement
5. **Long menu clamping** — 20-item menu that can't fit; clamped with internal scroll, no page scroll
6. **Long menu near bottom** — 20 items near the bottom of the page; flips or clamps
7. **Web component compass rose** — same grid using `<alap-link>`
8. **Inline text** — placement integrated naturally with flowing text, including a long inline menu
9. **Right-aligned text** — SE and E placements near the right edge of right-aligned text

## Run

```bash
./serve.sh
# → http://localhost:9170
```

## Key code

**Per-element placement (DOM):**
```html
<a class="alap" data-alap-linkitems=".bridge" data-alap-placement="N">above</a>
```

**Per-element placement (web component):**
```html
<alap-link query=".bridge" placement="N">above</alap-link>
```

**Global placement (config):**
```typescript
settings: { placement: 'S', placementGap: 6 }
```
