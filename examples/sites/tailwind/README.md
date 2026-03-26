# Tailwind CSS

Menu styled entirely with Tailwind utilities via CSS custom properties. Tailwind loaded from CDN — no build step.

## Run

```bash
./serve.sh                # http://localhost:9100/sites/tailwind/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/tailwind/
```

## What to Try

- Click any link — menu styled with Tailwind colors, shadows, and rounded corners
- Hover over menu items — smooth color transitions
- Resize the window — responsive styling

## Key Files

- `index.html` — Tailwind CDN script, styled triggers
- `main.ts` — `AlapUI` setup
- `config.ts` — standard demo config
- `styles.css` — Tailwind color tokens mapped to CSS custom properties for `#alapelem`
