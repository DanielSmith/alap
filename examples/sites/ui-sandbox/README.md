# Placement Sandbox

Visual test harness for the placement engine across every adapter. Identical scenarios on each page so you can compare behavior side by side.

## Run

```bash
./serve.sh                # http://localhost:9300/ui-sandbox/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/ui-sandbox/
```

## Adapters

Each has its own page with identical scenarios:

- DOM + Web Component
- Vue
- React
- Svelte
- Solid
- Alpine

## Scenarios

1. **Compass Rose** — all 9 placements, centered trigger, happy path
2. **Right-Edge Overflow** — trigger near right edge, long titles, `min-width: 200px`
3. **Wide Menu Stress** — `min-width: 400px`, right-aligned trigger
4. **Dynamic Trigger Reflow** — trigger that moves from left to right edge (reactive adapters only)
5. **Corner Stress** — triggers in all 4 corners with long-title menus
6. **Long Menu** — 14 items, should clamp to viewport and scroll internally

## What to look for

Menus should never overflow the viewport. The right-edge scenarios reproduce real bugs where long menu titles extend past the screen edge.

## Key Files

- `index.html` — hub page linking to each adapter
- `shared/config.ts` — shared link data for all adapter pages
- `shared/styles.css` — shared layout and scenario styling
- `dom/main.ts` — DOM adapter + web component setup
- `react/App.tsx`, `vue/App.vue`, `svelte/App.svelte`, `solid/App.tsx` — framework versions
- `alpine/index.html` — Alpine directive version
