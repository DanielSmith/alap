---
source: api-reference/coordinators.md
modified: '2026-04-15T15:42:57Z'
tags:
- api_reference
title: Coordinators API
description: '**API Reference:** Engine · Types · Storage · Events · Security · Servers
  · Placement · Lightbox · Lens · Embeds · **This Page** · Config Registry'
---
# Coordinators API

**[[api-reference/README|API Reference]]:** [[api-reference/engine|Engine]] · [[api-reference/types|Types]] · [[api-reference/storage|Storage]] · [[api-reference/events|Events]] · [[api-reference/security|Security]] · [[api-reference/servers|Servers]] · [[api-reference/placement|Placement]] · [[api-reference/lightbox|Lightbox]] · [[api-reference/lens|Lens]] · [[api-reference/embeds|Embeds]] · **This Page** · [[api-reference/config-registry|Config Registry]]

Two coordinators manage how renderers interact: one orchestrates transitions between renderer types (menu, lightbox, lens), the other ensures only one instance of a type is open at a time.

## `RendererCoordinator`

Orchestrates transitions between renderers. Manages a state stack so `back()` restores the previous renderer. Uses the View Transitions API for smooth animations when available.

```typescript
import { RendererCoordinator } from 'alap';

const coordinator = new RendererCoordinator();
coordinator.register(menu);
coordinator.register(lightbox);
coordinator.register(lens);
coordinator.bindKeyboard();
```

### Constructor

```typescript
new RendererCoordinator(options?: RendererCoordinatorOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `reduceMotion` | `boolean` | `true` | Respect `prefers-reduced-motion` |
| `viewTransitions` | `boolean` | `true` | Use View Transitions API when available |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `register()` | `(renderer: CoordinatedRenderer) => void` | Register a renderer |
| `unregister()` | `(type: RendererType) => void` | Unregister a renderer by type |
| `transitionTo()` | `(target: RendererType, payload: OpenPayload) => void` | Transition to target, pushing current state onto stack |
| `back()` | `() => void` | Go back one step, or close all if stack is empty |
| `closeAll()` | `() => void` | Close everything and clear the stack |
| `bindKeyboard()` | `() => void` | Bind capture-phase Escape handler for `back()` |
| `unbindKeyboard()` | `() => void` | Remove keyboard listener |
| `destroy()` | `() => void` | Full cleanup: close all, unbind keyboard, clear registrations |

### State queries

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `depth` | `number` | Current stack depth (read-only) |
| `isTransitioning` | `boolean` | Whether a transition is in progress (read-only) |
| `hasOpenRenderer()` | `boolean` | Whether any registered renderer is currently open |

### View Transitions

When the View Transitions API is available and not disabled:

- Outgoing and incoming content gets `viewTransitionName` for shared-element animation
- Back navigation adds `alap_vt_back` class to `document.documentElement` for CSS direction
- Duration reads from `--alap-coordinator-transition` CSS property (fallback: 300ms)
- Falls back to instant swap when reduced motion is preferred or API is unavailable

::: details Example: menu → lightbox → back
```typescript
// User clicks a menu item that should open in lightbox
coordinator.transitionTo('lightbox', {
  links: resolvedLinks,
  triggerElement: menuItem,
  initialIndex: 0,
});

// User presses Escape — back to menu
coordinator.back();

// Escape again — closes menu (stack empty)
coordinator.back();
```
:::

## `InstanceCoordinator`

Global singleton that ensures only one menu (or one lightbox, etc.) is open at a time across all framework adapters.

```typescript
import { getInstanceCoordinator } from 'alap';

const coordinator = getInstanceCoordinator();
```

### `getInstanceCoordinator()`

Returns the global singleton. All adapters (DOM, Web Component, React, Vue, Svelte, Solid, Alpine, Qwik) share this instance.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribe()` | `(id: string, type: RendererType, close: () => void) => () => void` | Register an instance; returns unsubscribe function |
| `notifyOpen()` | `(id: string) => void` | Notify that this instance opened; closes all others of the same type |
| `closeAll()` | `(type?: RendererType) => void` | Close all instances of given type, or all if type omitted |
| `has()` | `(id: string) => boolean` | Whether a specific instance is registered |
| `destroy()` | `() => void` | Remove all subscriptions |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Number of registered instances (read-only) |

::: details Example: custom adapter integration
```typescript
const coordinator = getInstanceCoordinator();

// Register this menu instance
const unsubscribe = coordinator.subscribe(
  'menu-123',
  'menu',
  () => { closeMyMenu(); },
);

// When this menu opens, close all other menus
coordinator.notifyOpen('menu-123');

// Cleanup on unmount
unsubscribe();
```
:::

## `CoordinatedRenderer` interface

Any renderer that wants to participate in coordinator transitions must implement this interface.

```typescript
interface CoordinatedRenderer {
  readonly rendererType: RendererType;
  readonly isOpen: boolean;
  openWith(payload: OpenPayload): void;
  close(): HTMLElement | null;
}
```

`AlapLightbox` and `AlapLens` both implement this interface. Custom renderers can too.

## Types

### `RendererType`

```typescript
type RendererType = 'menu' | 'lightbox' | 'lens';
```

### Constants

```typescript
const RENDERER_MENU = 'menu';
const RENDERER_LIGHTBOX = 'lightbox';
const RENDERER_LENS = 'lens';
```

### `OpenPayload`

```typescript
interface OpenPayload {
  links: ResolvedLink[];
  triggerElement?: HTMLElement;
  initialIndex?: number;
}
```

### `RendererStackEntry`

Internal stack state saved by the coordinator for `back()` navigation.

```typescript
interface RendererStackEntry {
  renderer: RendererType;
  links: ResolvedLink[];
  activeIndex: number;
  triggerElement: HTMLElement | null;
}
```
