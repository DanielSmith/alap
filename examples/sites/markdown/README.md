# Markdown (remark-alap)

Live markdown editor with `[text](alap:query)` syntax transformed to `<alap-link>` web components via the remark-alap plugin. Edit markdown and config side by side, see the result instantly.

## Run

```bash
./serve.sh                # http://localhost:9040/sites/markdown/
```

Or from the alap root:
```bash
pnpm dev                  # http://localhost:5173/sites/markdown/
```

## Layout

Two-column layout filling the viewport:

**Left column:**
- **Markdown Source** — Editable textarea. The preview updates live as you type (150ms debounce).
- **Config** — Editable JSON config. Changes re-register with `registerConfig()` immediately. Reset button restores the original.

**Right column:**
- **Live Preview** — Rendered HTML with working `<alap-link>` web components. Click a link to see the menu.

**Help panel:**
- **?** button opens a slide-over from the left with markdown syntax, expression cheat sheet, and available tags/macros from the current config.

## Markdown Syntax

```markdown
[coffee spots](alap:.coffee)       ← tag query
[NYC bridges](alap:@nyc_bridges)   ← macro (use for expressions with spaces)
[Brooklyn Bridge](alap:brooklyn)   ← specific item by ID
```

Expressions with operators (`.nyc + .bridge`) must use macros — Markdown parsers break on spaces inside URLs.

## Key Files

- `content.md` — markdown source using `alap:` protocol links
- `main.ts` — unified + remarkParse + remarkAlap + remarkHtml pipeline, config editing, help panel
- `config.ts` — 8 macros, 12 links, `placement: 'S'` for centered menus
- `index.html` — two-column layout with help slide-over
- `styles.css` — column layout, themed scrollbars, alap-link and menu styling
- `env.d.ts` — TypeScript declaration for `*.md?raw` imports
