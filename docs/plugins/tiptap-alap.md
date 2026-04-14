# @alap/tiptap

Tiptap extension that adds inline `<alap-link>` nodes with query-based menus to rich-text editors.

For a working site, see the [tiptap-alap example](https://examples.alap.info/tiptap/) (`examples/sites/tiptap/`).

## Install

Available in the [Alap monorepo](https://github.com/DanielSmith/alap) at `plugins/tiptap-alap/`.

<details>
<summary>Install from the monorepo</summary>

```bash
git clone https://github.com/DanielSmith/alap.git
cd alap
pnpm install
pnpm build
cd plugins/tiptap-alap
pnpm build
```

Then add it to your project as a local dependency in your `package.json`:

```json
"@alap/tiptap": "file:../path-to-alap/plugins/tiptap-alap"
```

</details>

Peer dependency: `@tiptap/core@^2`

## Usage

```js
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { AlapExtension } from '@alap/tiptap'

const editor = new Editor({
  extensions: [
    StarterKit,
    AlapExtension.configure({
      HTMLAttributes: { class: 'alap-link' },
    }),
  ],
})
```

## Commands

The extension adds three commands to the editor:

### `setAlapLink({ query })`

Insert an alap-link node. Wraps the current selection, or inserts a new node with placeholder text if nothing is selected.

```js
editor.commands.setAlapLink({ query: '.coffee' })
```

### `updateAlapLink({ query })`

Change the query on an existing alap-link at the cursor position.

```js
editor.commands.updateAlapLink({ query: '.tea' })
```

### `unsetAlapLink()`

Remove the alap-link node but keep its text content.

```js
editor.commands.unsetAlapLink()
```

## Keyboard Shortcut

`Mod-Shift-A` — Insert a new alap-link at the cursor (no-op if already inside one).

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `HTMLAttributes` | `Record<string, string>` | `{}` | Attributes merged onto every rendered `<alap-link>` |

```js
AlapExtension.configure({
  HTMLAttributes: { class: 'alap-link', 'data-tooltip': 'menu' },
})
```

## HTML Round-Trip

**Parses** `<alap-link query="...">text</alap-link>` from HTML content.

**Serializes** back to the same format, merging any configured `HTMLAttributes`. The `query` attribute is omitted when empty.

## Node Schema

- **Name:** `alapLink`
- **Group:** inline
- **Content:** inline nodes (text, marks)
- **Atom:** false (text inside is editable)

## License

Apache-2.0
