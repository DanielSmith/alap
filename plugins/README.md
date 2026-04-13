# Plugins

Content-level transforms and platform-specific packages that bring Alap into different environments.

| Plugin | Environment | What it does | Tests |
|--------|------------|-------------|-------|
| [remark-alap/](remark-alap/) | Remark/unified | `[text](alap:query)` → `<alap-link>` in Markdown | 20 |
| [rehype-alap/](rehype-alap/) | Rehype/unified | `<a href="alap:query">` → `<alap-link>` in HTML (headless CMS content) | 29 |
| [mdx/](mdx/) | MDX/React | Remark transform + `AlapMDXProvider` for MDX content | — |
| [tiptap-alap/](tiptap-alap/) | Tiptap/ProseMirror | Inline `<alap-link>` node extension for rich-text editors | 11 |
| [wordpress/](wordpress/) | WordPress | `[alap query=".tag"]` shortcode, SQLite containers (instant demo + fresh install) | — |


## Quick Start

```bash
npm install remark-alap   # for Markdown pipelines
npm install rehype-alap   # for HTML from headless CMSs
npm install @alap/mdx     # for MDX (includes remark transform + React provider)
npm install @alap/tiptap  # for Tiptap editors
```

See each plugin's README for configuration and usage.

## Relationship to Integrations

Plugins are **content transforms** — they operate on Markdown ASTs or editor documents. Integrations (in `../integrations/`) are **framework wrappers** that handle build-time setup for specific platforms. Some integrations use plugins internally (e.g., astro-alap can enable remark-alap automatically).
