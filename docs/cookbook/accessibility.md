# Accessibility

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · **This Page** · [Existing URLs](existing-urls.md) · [Images & Media](images-and-media.md) | [All docs](../README.md)

Alap menus are keyboard-navigable, screen-reader-announced, and focus-managed out of the box. You don't configure this — it's built into every adapter.

> Live version: https://alap.info/cookbook/accessibility

## What the trigger announces

When a screen reader reaches an Alap trigger, it hears something like:

> "Coffee shops, button, menu, collapsed"

Three pieces of information before the user interacts: there's a button, it opens a menu, and the menu is currently closed. This comes from ARIA attributes that Alap sets automatically:

- `role="button"` — it's activatable
- `aria-haspopup="true"` — it opens something
- `aria-expanded="false"` — that something is currently closed

When the menu opens, `aria-expanded` flips to `true` and the screen reader announces the change.

## Keyboard navigation

**Opening:** `Enter` or `Space` on the trigger opens the menu. The placement engine positions the menu using the configured compass direction (default: `SE`), falling back to an alternative position if the preferred one overflows the viewport. Focus moves to the first item automatically.

**Navigating:**

| Key | Action |
|-----|--------|
| `ArrowDown` | Next item (wraps to first) |
| `ArrowUp` | Previous item (wraps to last) |
| `Home` | Jump to first item |
| `End` | Jump to last item |
| `Enter` | Follow the focused link |

**Closing:** `Escape` closes the menu and returns focus to the trigger. `Tab` also closes the menu, moving focus forward in the page. Clicking outside closes it too.

No focus is ever lost. Open the menu, navigate, close it — you're back where you started.

## The menu structure

The rendered menu follows the WAI-ARIA menu button pattern:

```
[trigger]  role="button", aria-haspopup, aria-expanded
  └─ [menu container]  role="menu", aria-labelledby="trigger-id"
       └─ [list]  role="presentation"
            ├─ [item]  role="none"
            │    └─ [link]  role="menuitem", tabindex="-1"
            ├─ [item]  role="none"
            │    └─ [link]  role="menuitem", tabindex="-1"
            └─ ...
```

The `<ul>` and `<li>` elements have their list semantics removed. Screen readers see only the menu and its items — no "list of 3 items" clutter.

Menu items use `tabindex="-1"` so they're reachable by arrow keys but don't appear in the page's normal tab order. `Tab` exits the menu, arrows navigate within it.

## Auto-dismiss channels

- **Mouse leave timeout** — configurable via `settings.menuTimeout`, default 5 seconds
- **Click outside** — anywhere on the page
- **Escape key** — from keyboard
- **Tab key** — moves focus out, menu closes
- **Popover mode** — browser handles dismissal natively (Chrome 114+, Firefox 125+, Safari 17+)

## What you get for free

All of this — ARIA roles, keyboard navigation, focus management, auto-dismiss — is built into every adapter: vanilla DOM, web component, React, Vue, Svelte, SolidJS, Alpine, and Astro. Render the component, and the accessibility is there.

## Viewport containment

The placement engine ensures menus stay within the viewport. When a menu would overflow, it repositions automatically — no content is hidden off-screen, and the page never scrolls to accommodate a menu. If the menu is taller than the available space, it's clamped with a scrollable region. Keyboard navigation (arrow keys, Home, End) works correctly within scrollable menus.

The menus follow the WAI-ARIA menu button pattern. Formal WCAG 2.1 AA auditing is planned but not yet complete.
