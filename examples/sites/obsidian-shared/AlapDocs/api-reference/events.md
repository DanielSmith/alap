---
source: api-reference/events.md
modified: '2026-04-15T15:42:57Z'
tags:
- api_reference
title: Events
description: '**API Reference:** Engine · Types · Config Registry · Placement · Lightbox
  · Lens · Embeds · Coordinators · Storage · **This Page** · Security · Servers'
---
# Events

**[[api-reference/README|API Reference]]:** [[api-reference/engine|Engine]] · [[api-reference/types|Types]] · [[api-reference/config-registry|Config Registry]] · [[api-reference/placement|Placement]] · [[api-reference/lightbox|Lightbox]] · [[api-reference/lens|Lens]] · [[api-reference/embeds|Embeds]] · [[api-reference/coordinators|Coordinators]] · [[api-reference/storage|Storage]] · **This Page** · [[api-reference/security|Security]] · [[api-reference/servers|Servers]]

Event model, keyboard navigation, and hook filtering across all adapters.

> Live version: https://alap.info/api-reference/events

## Delivery by adapter

All adapters emit the same event types. Delivery mechanism varies:

| Adapter | Delivery |
|---------|----------|
| DOM (`AlapUI`) | Constructor callback options (`onItemHover`, etc.) |
| Web Component | Custom DOM events (`alap:item-hover`, etc.) — bubble, composed |
| React | Callback props (`onItemHover`, etc.) |
| Vue | Emitted events (`@item-hover`, etc.) |
| Svelte | Callback props (`onItemHover`, etc.) |
| SolidJS | Callback props (`onItemHover`, etc.) |
| Qwik | QRL callback props (`onItemHover$`, etc.) |
| Alpine | Custom DOM events (`alap:item-hover`, etc.) — bubble |

## Event types

### `TriggerHoverDetail`

Fired when mouse enters a trigger element.

```typescript
{ query: string; anchorId?: string }
```

### `TriggerContextDetail`

Fired on right-click of a trigger element.

```typescript
{ query: string; anchorId?: string; event: MouseEvent }
```

### `ItemHoverDetail`

Fired when mouse enters a menu item.

```typescript
{ id: string; link: AlapLink; query: string }
```

### `ItemContextDetail`

Fired on right-click of a menu item, or ArrowRight key on a focused item (if the item has `item-context` in its hooks).

```typescript
{ id: string; link: AlapLink; query: string; event: MouseEvent | KeyboardEvent }
```

### `ItemContextDismissDetail`

Fired on ArrowLeft key on a focused menu item (if the item has `item-context` in its hooks).

```typescript
{ id: string; link: AlapLink; query: string }
```

## Hook filtering

Events only fire for items that opt in via hooks. An item participates if:

1. It has `hooks: ['item-hover']` (per-item), OR
2. The global `settings.hooks` includes `'item-hover'`

The resolved hooks are written to `data-alap-hooks` on the rendered `<a>` element.

```typescript
// Building a context menu on right-click
onItemContext: ({ id, link, event }) => {
  event.preventDefault();
  showContextPopup({
    x: event instanceof MouseEvent ? event.pageX : 0,
    y: event instanceof MouseEvent ? event.pageY : 0,
    title: link.label,
    image: link.thumbnail,
    description: link.description,
    directUrl: link.url,
  });
}
```

## Keyboard navigation

All adapters implement the same keyboard bindings:

| Key | Action |
|-----|--------|
| `ArrowDown` | Focus next menu item (wraps to first) |
| `ArrowUp` | Focus previous menu item (wraps to last) |
| `Home` | Focus first item |
| `End` | Focus last item |
| `Escape` | Close menu, return focus to trigger |
| `Tab` | Close menu, continue normal tab order |
| `ArrowRight` | Fire `item-context` on focused item (if item has `item-context` hook) |
| `ArrowLeft` | Fire `item-context-dismiss` (if item has `item-context` hook) |
| `Enter` / `Space` | Activate focused link |

## Dismiss behavior

Menus auto-dismiss via three channels:

1. **Mouse leave timeout** — configurable via `settings.menuTimeout` (default: 5000ms)
2. **Click outside** — clicking anywhere outside the menu closes it
3. **Escape key** — returns focus to the trigger

## Lightbox and lens keyboard navigation

Lightbox and lens have their own keyboard bindings, separate from menus:

| Key | Action |
|-----|--------|
| `ArrowLeft` | Previous item |
| `ArrowRight` | Next item |
| `Escape` | Back one step (coordinator stack), or close if stack is empty |

When a [[api-reference/coordinators|RendererCoordinator]] is active, Escape triggers `back()` instead of a direct close. This means Escape from a lightbox that was opened from a menu returns to the menu, not to the page.

## Cross-instance coordination

The [[api-reference/coordinators|InstanceCoordinator]] ensures only one renderer of a given type is open at a time. When a menu opens, all other open menus close automatically. This happens across all framework adapters — a React menu and a web component menu on the same page coordinate with each other.

No custom events are emitted for coordination. The coordinator calls each instance's close callback directly. See [[api-reference/coordinators|Coordinators]] for the full API.
