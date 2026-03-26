# Plugins

Content-level transforms that bring Alap into Markdown and rich-text editing workflows.

| Plugin | Environment | What it does | Tests |
|--------|------------|-------------|-------|
| [remark-alap/](remark-alap/) | Remark/unified | `[text](alap:query)` → `<alap-link>` in Markdown | 20 |
| [tiptap-alap/](tiptap-alap/) | Tiptap/ProseMirror | Inline `<alap-link>` node extension for rich-text editors | 11 |

## Quick Start

```bash
npm install remark-alap   # for Markdown pipelines
npm install @alap/tiptap  # for Tiptap editors
```

See each plugin's README for configuration and usage.

## Relationship to Integrations

Plugins are **content transforms** — they operate on Markdown ASTs or editor documents. Integrations (in `../integrations/`) are **framework wrappers** that handle build-time setup for specific platforms. Some integrations use plugins internally (e.g., astro-alap can enable remark-alap automatically).
