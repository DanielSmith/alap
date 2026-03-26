# Hooks & Media

Image triggers, div triggers, image menu items, hover preview panel, context popup, and live event log.

## Run

```bash
./serve.sh                # http://localhost:9030/sites/hooks-and-media/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/hooks-and-media/
```

## What to Try

- Click a **photo** — menu opens at click coordinates (image trigger)
- Click a **styled card** — div trigger with child elements
- See **image menu items** — `image` field renders photos instead of text labels
- **Hover** over menu items — preview panel shows thumbnail + description
- **Right-click** a menu item (or press ArrowRight) — context popup with detail card
- Press **ArrowLeft** — dismisses the context popup
- Watch the **event log** at the bottom — shows all hook events as they fire

## Key Files

- `index.html` — image triggers, div triggers, preview panel, event log
- `main.ts` — `AlapUI` with `onItemHover`, `onItemContext` hooks, event log wiring
- `config.ts` — items with `image`, `thumbnail`, `description`, `hooks` fields
- `styles.css` — preview panel, context popup, event log styling
