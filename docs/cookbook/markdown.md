# Markdown Integration

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · **This Page** · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md) | [All docs](../README.md)

Alap works in Markdown. Write a standard Markdown link with an `alap:` prefix, and it becomes a multi-target menu in the rendered page.

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
