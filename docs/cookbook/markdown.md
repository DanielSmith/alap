# Markdown, HTML & MDX Integration

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · **This Page** · [Rich-Text](rich-text.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md)

Alap works in Markdown, raw HTML from CMSs, and MDX. Three plugins cover the content pipeline:

| Plugin | Input | Use case |
|--------|-------|----------|
| `remark-alap` | Markdown (`[text](alap:query)`) | Markdown files, blog posts, documentation |
| `rehype-alap` | HTML (`<a href="alap:query">`) | Headless CMS output (Contentful, Sanity, Strapi, WordPress API, Ghost) |
| `@alap/mdx` | MDX | React-based MDX content with `AlapMDXProvider` |

All three produce `<alap-link>` web components. The Alap engine still needs to be loaded on the frontend.

## Markdown (remark-alap)

Write a standard Markdown link with an `alap:` prefix, and it becomes a multi-target menu in the rendered page.

> Live version: https://alap.info/cookbook/markdown

## What you write

```markdown
Check out these [coffee spots](alap:.coffee) in the city.

Here are my [favorite bridges](alap:@nyc_bridges).

Don't miss [Devocion](alap:devocion) — or browse [all NYC picks](alap:@nyc).
```

Standard Markdown syntax. Any Markdown editor renders it as a link. The `alap:` prefix tells the plugin to transform it.

## What comes out

The plugin (`remark-alap`) walks the Markdown AST and replaces `alap:` links with web component tags:

```markdown
[coffee spots](alap:.coffee)
```

becomes:

```html
<alap-link query=".coffee">coffee spots</alap-link>
```

From there, the web component takes over — it resolves the query, builds the menu, handles events. The Markdown author just writes links.

## Why macros matter here

Markdown parsers break on spaces inside URLs. This works:

```markdown
[cafes](alap:.coffee)
```

This doesn't:

```markdown
[bridges](alap:.nyc + .bridge)     ← spaces break the parser
```

The fix is a macro:

```json
{
  "macros": {
    "nyc_bridges": { "linkItems": ".nyc + .bridge" }
  }
}
```

```markdown
[bridges](alap:@nyc_bridges)       ← no spaces, works everywhere
```

Simple queries — a single tag like `.coffee`, an item ID like `devocion` — work directly. The moment you need operators, reach for a macro.

## Setting it up

The plugin is a standard Remark plugin:

```javascript
import remarkAlap from 'remark-alap';

// In your remark pipeline
.use(remarkAlap)
```

### Astro

```javascript
import { alapIntegration } from 'astro-alap';

export default defineConfig({
  integrations: [alapIntegration({ config: './src/alap-config.ts' })],
});
```

<!-- Docusaurus dedicated integration temporarily removed pending upstream
     dependency fix. Use remark-alap directly in your Docusaurus remark config. -->

### Eleventy

Two modes:
- **Interactive mode** — outputs web components (client-side JavaScript required)
- **Static mode** — resolves expressions at build time, outputs plain HTML lists (zero client-side JavaScript)

See [Eleventy](../framework-guides/eleventy.md) for the full guide.

## Live editing

The example app at [`examples/sites/markdown/`](../../examples/sites/markdown/) is a live sandbox:

- **Editable markdown** on the left — type `[text](alap:query)` and the preview updates instantly
- **Editable config** below the source — add links, change tags, create macros, and see the effect immediately. `registerConfig()` accepts being called again to replace the active config.
- **Live preview** on the right with working `<alap-link>` web components
- **Help panel** (slide-over from the **?** button) — shows markdown syntax, expression cheat sheet, and the available tags/macros from the current config (updates dynamically when config changes)
- **Reset button** restores the original config

This makes the example useful both as a demo and as a playground for experimenting with expressions, macros, and config structure.

## HTML from CMSs (rehype-alap)

When content arrives as raw HTML from a headless CMS, there's no Markdown stage for `remark-alap` to intercept. The `rehype-alap` plugin transforms HTML instead.

### What the CMS author writes

In the CMS's WYSIWYG editor, the author creates a link with `alap:` as the URL:

```
Link text: coffee spots
Link URL:  alap:.coffee
```

The CMS API returns:

```html
<p>We found great <a href="alap:.coffee">coffee spots</a> today.</p>
```

### What comes out

```html
<p>We found great <alap-link query=".coffee">coffee spots</alap-link> today.</p>
```

### Setup

```js
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeAlap from 'rehype-alap';
import rehypeStringify from 'rehype-stringify';

const result = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeAlap)
  .use(rehypeStringify)
  .process(cmsHtml);
```

### Recommended patterns

CMS sanitizers and WYSIWYG editors may URL-encode or mangle operators in `href` values. Use macros for anything beyond simple tags and IDs:

| Safe in `href` | Example |
|----------------|---------|
| Tag query | `alap:.coffee` |
| Item ID | `alap:golden` |
| Macro | `alap:@nycfood` |
| Comma list | `alap:golden,brooklyn` |

For expressions with operators (`.nyc + .bridge`), define a macro in your config and use `alap:@macroname`.

### Interactive demo

The example at [`examples/sites/cms-content/`](../../examples/sites/cms-content/) is a live editor — type HTML on the left, see working Alap menus on the right, with the transformed HTML displayed in between.

## MDX (@alap/mdx)

For MDX content, `@alap/mdx` provides a remark transform plus a React-compatible `AlapMDXProvider`:

```bash
npm install @alap/mdx
```

The remark transform handles `[text](alap:query)` syntax in MDX files (same as `remark-alap`). The provider wraps your MDX content and makes `<AlapLink>` available as a React component.

See [`plugins/mdx/`](../../plugins/mdx/) for the full API.

## WordPress

For WordPress sites, the Alap WordPress plugin provides a `[alap]` shortcode:

```
[alap query=".coffee"]coffee spots[/alap]
```

No Markdown or rehype pipeline needed — the shortcode is processed by WordPress's built-in shortcode engine.

See [`plugins/wordpress/`](../../plugins/wordpress/) for install instructions, Docker setup (SQLite, single container), and the instant demo.
