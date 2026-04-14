# rehype-alap

Rehype plugin that transforms `<a href="alap:query">` links into `<alap-link>` web components.

Designed for content from headless CMSs (Contentful, Sanity, Strapi, WordPress REST API, Ghost, Prismic) where authors use WYSIWYG editors and the API returns raw HTML.

## Install

Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `plugins/rehype-alap/`.

<details>
<summary>Install from the monorepo</summary>

```bash
git clone https://github.com/DanielSmith/alap.git
cd alap
pnpm install
pnpm build
cd plugins/rehype-alap
pnpm build
```

Then add it to your project as a local dependency in your `package.json`:

```json
"rehype-alap": "file:../path-to-alap/plugins/rehype-alap"
```

</details>

## Usage

```js
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeAlap from 'rehype-alap';
import rehypeStringify from 'rehype-stringify';

const result = await unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeAlap)
  .use(rehypeStringify)
  .process('<a href="alap:.coffee">coffee spots</a>');

// → <alap-link query=".coffee">coffee spots</alap-link>
```

## How it works

The plugin walks the HTML AST (hast) and rewrites `<a>` elements whose `href` starts with `alap:`. Children, classes, IDs, and data attributes are preserved. The `href` is removed and replaced with a `query` attribute.

The Alap engine still needs to be loaded on the frontend for the `<alap-link>` web components to become interactive.

## Recommended patterns

Keep expressions simple in `href` values. CMS sanitizers and WYSIWYG editors may URL-encode or strip operators.

```html
<!-- Tags, IDs, macros — safe everywhere -->
<a href="alap:.coffee">spots</a>
<a href="alap:golden">bridge</a>
<a href="alap:@nycfood">food</a>
<a href="alap:golden,brooklyn">picks</a>

<!-- Operators in href values are fragile — use macros instead -->
<!-- Don't: <a href="alap:.nyc + .bridge">bridges</a> -->
<!-- Do:    <a href="alap:@nycbridges">bridges</a>     -->
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tagName` | `string` | `'alap-link'` | Output element name |
| `queryAttr` | `string` | `'query'` | Attribute for the query expression |
| `className` | `string` | — | CSS class added to every emitted element |

## Security

- AST-based transformation — no string concatenation, structurally prevents injection
- Strict `alap:` prefix match — no regex, no partial matching
- Idempotent — running twice produces same output as once
- Use `rehype-sanitize` in pipelines that render user-supplied HTML

## See also

- [remark-alap](remark-alap.md) — the Markdown equivalent (`[text](alap:query)`)
- [CMS content example](https://examples.alap.info/cms-content/) — interactive demo

## License

Apache-2.0
