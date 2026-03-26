# Web Component

`<alap-link>` custom element with Shadow DOM encapsulation and `::part()` theming.

## Run

```bash
./serve.sh                # http://localhost:9120/sites/web-component/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/web-component/
```

## What to Try

- Click any `<alap-link>` — menu renders inside Shadow DOM
- Inspect the element — shadow root contains slot, styles, and menu div
- Notice `::part(menu)`, `::part(list)`, `::part(link)`, and `::part(image)` styling from the page's CSS
- Try keyboard: Enter/Space to open, ArrowDown/Up to navigate, Escape to close
- Right-click a menu item for context events (if hooks are configured)

## Key Files

- `index.html` — `<alap-link query="...">` elements with `::part()` CSS
- `main.ts` — `defineAlapLink()` + `registerConfig()`
- `config.ts` — standard demo config
- `styles.css` — `::part()` selectors for Shadow DOM theming
