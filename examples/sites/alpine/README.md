cd # Alpine.js

`alapPlugin` + `x-alap` directive — no build step required, sprinkle Alap onto any HTML page.

## Run

```bash
./serve.sh                # http://localhost:9000/sites/alpine/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/alpine/
```

## What to Try

- Click any `x-alap` element — menu appears with resolved items
- Notice no build step — Alpine loaded from CDN, Alap plugin via ES module import
- Keyboard: Tab, Enter, ArrowDown/Up, Escape

## Key Files

- `index.html` — everything in one file: Alpine CDN, Alap plugin import, `x-alap` directives, inline config
