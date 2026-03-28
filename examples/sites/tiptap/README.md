# Alap + Tiptap

Rich-text editor with inline `<alap-link>` nodes. Authors insert Alap links while writing — on publish, the HTML contains web components that become interactive menus.

## Run

```bash
npm install
npm run dev
```

Opens at http://localhost:9180.

## Layout

Two-column layout filling the viewport:

**Left column:**
- **Editor** — Tiptap with `AlapExtension`. Alap links are inline nodes you can type around, select, and edit.
- **Config** — Editable JSON config. Changes take effect immediately. Reset button restores the original.

**Right column (tabbed):**
- **Preview** — The editor's HTML rendered with live `<alap-link>` web components. Click a link to see the menu.
- **HTML Output** — The serialized HTML with `<alap-link>` tags, formatted for readability.

**Toolbar:**
- **?** — Opens a slide-over help panel with expression syntax, available tags, and macros (updates when config changes).
- **Insert Alap Link** — Wraps the current selection (or inserts placeholder text) as an `<alap-link>` node.
- **Query field** — Type a query to auto-update the Alap link at the cursor.
- **Remove** — Removes the Alap link node but keeps its text content.

## Key Code

```js
import { AlapExtension } from '@alap/tiptap';

const editor = new Editor({
  extensions: [
    StarterKit,
    AlapExtension.configure({
      HTMLAttributes: { class: 'alap-link' },
    }),
  ],
});

// Insert a link
editor.commands.setAlapLink({ query: '.coffee' });

// Update query on current link
editor.commands.updateAlapLink({ query: '.bridge' });

// Remove link, keep text
editor.commands.unsetAlapLink();
```
