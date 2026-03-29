# CMS Content Transform (rehype-alap)

Interactive demo of `rehype-alap` — the rehype plugin that transforms HTML from headless CMSs into Alap web components.

**Port:** 9200

## What it shows

A three-panel live editor:

1. **CMS HTML** (left) — editable textarea with raw HTML as a headless CMS would return it. Links use `<a href="alap:query">` syntax.
2. **Transformed HTML** (center) — readonly view of the rehype-alap output showing the `<a>` → `<alap-link>` rewrite.
3. **Live Preview** (right) — the transformed HTML rendered with working Alap menus. Click any dotted-underline link to see the menu.

## The CMS use case

Content teams write in WYSIWYG editors (Contentful, Sanity, Strapi, WordPress). They can't insert `<alap-link>` web components directly. Instead, they link to `alap:.coffee` or `alap:@macro` using the editor's normal link tool. The developer's frontend runs the CMS output through `rehype-alap` in the build pipeline, and the links become interactive menus.

## Running

```bash
./serve.sh
# → http://localhost:9200
```

Or from the repo root:
```bash
pnpm dev
# → http://localhost:5173/sites/cms-content/
```

## Recommended patterns

Keep `alap:` expressions simple in `href` values — CMS sanitizers may mangle operators:

| Pattern | Example | Notes |
|---------|---------|-------|
| Tag query | `<a href="alap:.coffee">` | Simple, safe |
| Item ID | `<a href="alap:golden">` | Direct reference |
| Macro | `<a href="alap:@nycfood">` | Best for complex expressions |
| Comma list | `<a href="alap:golden,brooklyn">` | No spaces |

For expressions with operators (`.nyc + .bridge`), define a macro in your config and reference it with `@`.

## How it works

The `rehype-alap` plugin runs in the browser via the unified ecosystem. On every keystroke (debounced 300ms):

1. `rehype-parse` converts the HTML string into an AST (hast)
2. `rehype-alap` walks the AST, rewrites `<a href="alap:...">` nodes to `<alap-link query="...">`
3. `rehype-sanitize` strips dangerous elements (script tags, event handlers)
4. `rehype-stringify` serializes back to HTML
5. The preview div receives the HTML, and Alap's web component auto-discovers the new `<alap-link>` elements

## See also

- [rehype-alap plugin](../../../plugins/rehype-alap/) — the plugin itself
- [remark-alap plugin](../../../plugins/remark-alap/) — the Markdown equivalent
- [Markdown example](../markdown/) — remark-alap in action
