# remark-alap

Remark plugin that transforms `[text](alap:query)` markdown links into `<alap-link>` web components.

For a working site, see the [remark-alap example](https://examples.alap.info/markdown/) (`examples/sites/markdown/`).

## Install

Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `plugins/remark-alap/`.

<details>
<summary>Install from the monorepo</summary>

```bash
git clone https://github.com/DanielSmith/alap.git
cd alap
pnpm install
pnpm build
cd plugins/remark-alap
pnpm build
```

Then add it to your project as a local dependency in your `package.json`:

```json
"remark-alap": "file:../path-to-alap/plugins/remark-alap"
```

</details>

Peer dependency: `unified@^11`

## Usage

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkAlap from 'remark-alap'
import remarkHtml from 'remark-html'

const result = await unified()
  .use(remarkParse)
  .use(remarkAlap, { className: 'alap' })
  .use(remarkHtml, { allowDangerousHtml: true })
  .process('[coffee spots](alap:@coffee)')

// => <alap-link query="@coffee" class="alap">coffee spots</alap-link>
```

Works with any remark pipeline — Astro, Next.js, or custom unified setups.

## Markdown Syntax

Use the `alap:` protocol in standard markdown links:

```markdown
<!-- Macro reference -->
[coffee spots](alap:@coffee)

<!-- Direct item -->
[my site](alap:homepage)

<!-- Tag query -->
[cafes](alap:.coffee)

<!-- Comma-separated items (no spaces) -->
[places](alap:item1,item2,item3)
```

**Important:** Markdown parsers break on spaces inside URLs. For expressions with operators (`.nyc + .food`, `.a | .b`), define a macro in your Alap config and reference it: `[cities](alap:@nycFood)`.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tagName` | `string` | `'alap-link'` | HTML element name to emit |
| `queryAttr` | `string` | `'query'` | Attribute name for the query value |
| `className` | `string` | — | CSS class added to every emitted element |

```js
.use(remarkAlap, {
  tagName: 'my-link',
  queryAttr: 'data-query',
  className: 'alap-link',
})
// => <my-link data-query="@coffee" class="alap-link">coffee spots</my-link>
```

## How It Works

1. Walks the markdown AST looking for links with `alap:` URLs
2. Extracts the query string (everything after `alap:`)
3. Replaces the link node with an HTML node containing the web component tag
4. Leaves all other links untouched

Rich inline content (bold, italic, code) inside the link text is preserved as plain text in the output.

## License

Apache-2.0
