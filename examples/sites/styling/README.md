# Styling

CSS theming techniques — per-anchor classes, custom item classes, image triggers, and menu positioning.

## Run

```bash
./serve.sh                # http://localhost:9080/sites/styling/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/styling/
```

## What to Try

- Click links to see different per-anchor styles (`alap_anchorId` CSS classes)
- Click items with custom `cssClass` — individual menu items styled differently
- Click an image to open a menu positioned at click coordinates
- Notice menu z-index inherits from the anchor's context

## Key Files

- `index.html` — styled triggers and image triggers
- `main.ts` — `AlapUI` setup
- `config.ts` — items with `cssClass`, `image`, and `targetWindow` properties
- `styles.css` — per-anchor themes, custom item classes, image styling
