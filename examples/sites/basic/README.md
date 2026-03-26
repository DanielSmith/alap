# Basic

The fundamentals — item IDs, tag queries, operators, parentheses, macros, and existing URL preservation.

## Run

```bash
./serve.sh                # http://localhost:9020/sites/basic/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/basic/
```

## What to Try

- Click **VW Bug and the BMW E36** — direct item ID references
- Click **coffee spots** — `.coffee` tag query
- Click **NYC bridges** — `.nyc + .bridge` intersection
- Click **NYC or SF** — `.nyc | .sf` union
- Click **NYC or SF bridges** — parenthesized grouping
- Click **cars (macro)** — `@cars` macro expansion
- Click **Brooklyn Bridge and more** — existing `href` prepended as first menu item
- Compare the three "Existing URL" links — prepend, append, ignore modes

## Key Files

- `index.html` — all expression patterns with inline docs
- `main.ts` — `new AlapUI(demoConfig)` setup
- `config.ts` — 12 links, 2 macros, tags across 5 categories
