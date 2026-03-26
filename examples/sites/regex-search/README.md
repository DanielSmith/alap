# Regex Search

`/key/opts` syntax — named search patterns with field codes, sorting, age filters, result limits, and composition with operators.

## Run

```bash
./serve.sh                # http://localhost:9060/sites/regex-search/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/regex-search/
```

## What to Try

- Click **bridges** — `/bridges/` matches labels containing "bridge"
- Click **German cars** — `/german/` with `fields: 'l'` (label only)
- Click **Scenic spots** — `/scenic/` with `fields: 'd'` (description only)
- Click **Wikipedia links** — `/wikipedia/` with `fields: 'u'` (URL only)
- Click **German (override to tags)** — `/german/t` overrides config fields at expression level
- Click **Bridges (A-Z)** — `sort: 'alpha'` ordering
- Click **Top 2 Bridges** — `limit: 2` truncation
- Click **NYC bridges** — `/bridges/ + .nyc` regex composed with tag operator
- Click **NYC bridges or coffee** — `(/bridges/ + .nyc) | .coffee` regex in parentheses

## Key Files

- `index.html` — all regex patterns with inline docs and code examples
- `main.ts` — `AlapUI` setup
- `config.ts` — 8 search patterns, 10 links with descriptions and tags
