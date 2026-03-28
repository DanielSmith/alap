# Rich-Text Editors

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · **This Page** · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md) | [All docs](../README.md)

Alap links can live inside rich-text editors. The `@alap/tiptap` extension adds `<alap-link>` as an inline node in Tiptap/ProseMirror, so content authors can insert multi-target links while they write.

## The idea

A CMS author writes a blog post in a Tiptap editor. They select "coffee spots" and press Cmd+Shift+A — it becomes an Alap link with a query. On publish, the HTML contains `<alap-link query=".coffee">coffee spots</alap-link>`, and the web component takes over on the reader's side.

The editor treats Alap links as first-class inline nodes — not marks, not decorations. They appear in the document model, serialize to clean HTML, and parse back from it.

## Setup

```bash
npm install @alap/tiptap @tiptap/core @tiptap/starter-kit
```

```js
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { AlapExtension } from '@alap/tiptap';

const editor = new Editor({
  extensions: [
    StarterKit,
    AlapExtension.configure({
      HTMLAttributes: { class: 'alap-link' },
    }),
  ],
});
```

## Commands

Three commands are added to the editor:

### Insert

```js
editor.commands.setAlapLink({ query: '.coffee' });
```

Wraps the current selection in an `<alap-link>`. If nothing is selected, inserts a node with placeholder text.

### Update

```js
editor.commands.updateAlapLink({ query: '.bridge' });
```

Changes the query on the Alap link at the cursor position. In the example app, typing in the query field auto-updates the current link (no button click needed).

### Remove

```js
editor.commands.unsetAlapLink();
```

Removes the node but keeps the text inline.

## Keyboard shortcut

`Mod-Shift-A` inserts a new Alap link at the cursor. If the cursor is already inside one, it's a no-op (your bubble menu or toolbar can handle the update).

## HTML round-trip

The extension parses `<alap-link query="...">text</alap-link>` from HTML input and serializes back to the same format. This means:

- Paste HTML with Alap links → they become editable nodes
- `editor.getHTML()` → clean output ready for the web component
- Content stored in a CMS database round-trips without loss

## Styling in the editor

Alap links inside the editor are regular DOM elements — style them with CSS:

```css
.alap-link {
  color: #2563eb;
  text-decoration: underline dotted;
  background: #eef2ff;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
}

/* Selected node */
.alap-link.ProseMirror-selectednode {
  outline: 2px solid #2563eb;
}
```

## Live config editing

The example app includes an editable config panel below the editor. Changes to the JSON config take effect immediately — `registerConfig()` accepts being called again to replace the active config and engine. The preview re-renders with the new data.

```js
// Re-register on config change
const newConfig = JSON.parse(configTextarea.value);
registerConfig(newConfig);
previewEl.innerHTML = editor.getHTML();
```

A Reset button restores the original config.

## Preview

To preview the rendered output with working menus, inject the editor's HTML into a container that has the web component registered:

```js
import { registerConfig, defineAlapLink } from 'alap';

registerConfig(myConfig);
defineAlapLink();

// On each editor update:
previewEl.innerHTML = editor.getHTML();
```

The `<alap-link>` elements in the preview become interactive immediately. In the example app, Preview and HTML Output are tabbed views in the right column — switch between the live interactive preview and the formatted HTML source.

## Help panel

The example includes a slide-over help panel (activated by the **?** button in the toolbar) that shows:

- Expression syntax cheat sheet (tags, operators, macros)
- Available tags extracted from the current config
- Available macros from the current config

The tag and macro lists update dynamically when the config changes.

## Example

See [`examples/sites/tiptap/`](../../examples/sites/tiptap/) for the working demo.
