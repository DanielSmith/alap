# Markdown (remark-alap)

`[text](alap:query)` syntax in Markdown transformed to `<alap-link>` web components via the remark-alap plugin. Two-column layout: rendered output with live menus alongside raw markdown source.

## Run

```bash
./serve.sh                # http://localhost:9040/sites/markdown/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/markdown/
```

## What to Try

- Click the blue Alap links in the left column — live menus from the web component
- Compare with the raw markdown source in the right column
- Notice `[text](alap:@macro)` syntax — macros recommended for expressions with spaces
- Try `[text](alap:.tag)` and `[text](alap:itemId)` — simple expressions work directly

## Key Files

- `content.md` — markdown source using `alap:` protocol links
- `main.ts` — unified + remarkParse + remarkAlap + remarkHtml pipeline, web component setup
- `config.ts` — 8 macros, 12 links
- `index.html` — two-column layout
- `styles.css` — column layout, alap-link styling
- `env.d.ts` — TypeScript declaration for `*.md?raw` imports
