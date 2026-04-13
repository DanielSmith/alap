# Engine API

**[API Reference](README.md):** **This Page** · [Types](types.md) · [Config Registry](config-registry.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md)

Core engine classes and helper functions. No DOM dependency — safe for Node.js.

> Live version: https://alap.info/api-reference/engine

## Which import do I use?

Alap has two entry points. Pick the one that matches your environment:

- **`alap`** — you're building a website. This gives you the engine, the UI, the web component, and the DOM layer. **Use this when there's a browser.**

- **`alap/core`** — you're writing a server, a build tool, a test, or a library that processes Alap configs without rendering anything. No DOM, no window, no CSS. **Use this when there's no browser.**

Think of it this way: `alap/core` is the brain. `alap` is the brain plus the body. If you don't need hands and eyes (DOM, events, UI), just import the brain.

### `alap` (browser)

Everything you need to render Alap on a page:

```typescript
import {
  AlapEngine,
  ExpressionParser,
  mergeConfigs,
  AlapUI,
  AlapLinkElement,
  registerConfig,
  updateRegisteredConfig,
  defineAlapLink,
} from 'alap';
```

### `alap/core` (no DOM)

Engine and utilities only. Safe for Node.js, tests, and build tools:

```typescript
import {
  AlapEngine,
  ExpressionParser,
  mergeConfigs,
  validateConfig,
  sanitizeUrl,
  validateRegex,
} from 'alap/core';
```

## `AlapEngine`

Stateful wrapper around the expression parser.

```typescript
const engine = new AlapEngine(config);
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `query()` | `(expression: string, anchorId?: string) => string[]` | Expression to deduplicated array of item IDs |
| `resolve()` | `(expression: string, anchorId?: string) => ResolvedLink[]` | Expression to full link objects |
| `resolveAsync()` | `(expression: string, anchorId?: string) => Promise<ResolvedLink[]>` | Pre-resolves generate protocols, then evaluates |
| `preResolve()` | `(expressions: string[]) => Promise<void>` | Pre-resolve multiple expressions (warm the cache for generate protocols) |
| `getLinks()` | `(ids: string[]) => ResolvedLink[]` | IDs to full link objects |
| `updateConfig()` | `(config: AlapConfig) => void` | Replace configuration |
| `clearCache()` | `() => void` | Clear cached generate protocol results |

```typescript
import { AlapEngine } from 'alap/core';

const engine = new AlapEngine(config);

// Get just the IDs
const ids = engine.query('.coffee + .sf');
// → ['bluebottle']

// Get full link objects
const links = engine.resolve('.coffee');
// → [{ id: 'bluebottle', url: '...', label: 'Blue Bottle', tags: ['coffee', 'sf'] }, ...]

// Use anchorId for bare @ macros
const fromMacro = engine.query('@', 'nycbridges');

// Async: expressions with generate protocols (e.g. :web:)
const books = await engine.resolveAsync(':web:books:architecture:limit=5:');

// Pre-resolve: warm the cache for multiple expressions at once
await engine.preResolve([':web:books:', ':web:music:', ':atproto:feed:']);

// Update config at runtime
engine.updateConfig(newConfig);
```

## `ExpressionParser`

Low-level stateless parser. Use `AlapEngine` unless you need direct parser access.

```typescript
const parser = new ExpressionParser(config);
const ids = parser.query('.coffee + .nyc');
```

## Utility functions

### `mergeConfigs(...configs)`

Compose multiple configs. Later configs win on key collision.

```typescript
const merged = mergeConfigs(baseConfig, overrides, moreOverrides);
```

Merges `settings`, `macros`, `allLinks`, `searchPatterns` independently. Returns a new object. Filters prototype-pollution keys (`__proto__`, `constructor`, `prototype`).

```typescript
import { mergeConfigs } from 'alap/core';

const baseConfig = {
  settings: { menuTimeout: 5000 },
  allLinks: {
    home: { url: '/', label: 'Home', tags: ['nav'] },
    about: { url: '/about', label: 'About', tags: ['nav'] },
  },
};

const blogOverrides = {
  allLinks: {
    latest: { url: '/blog/latest', label: 'Latest Post', tags: ['blog'] },
  },
  macros: {
    navigation: { linkItems: '.nav' },
  },
};

const blogConfig = mergeConfigs(baseConfig, blogOverrides);
// blogConfig.allLinks has: home, about, latest
// blogConfig.macros has: navigation
// blogConfig.settings has: menuTimeout: 5000
```

### `validateConfig(raw)`

Sanitize an untrusted config (from a remote API or JSON file).

```typescript
const config = validateConfig(JSON.parse(jsonString));
```

- Validates structure (`allLinks` must be an object, links must have `url` strings)
- Sanitizes URLs via `sanitizeUrl()`
- Removes dangerous regex patterns via `validateRegex()`
- Filters prototype-pollution keys
- Strips unknown fields from link entries
- Returns a sanitized copy. Throws if structurally invalid.

```typescript
import { validateConfig } from 'alap/core';

const response = await fetch('https://api.example.com/configs/main');
const raw = await response.json();

try {
  const config = validateConfig(raw);
  registerConfig(config);
} catch (e) {
  console.error('Invalid config:', e.message);
}
```

### `sanitizeUrl(url)`

Block dangerous URI schemes.

```typescript
sanitizeUrl('https://example.com')     // → 'https://example.com'
sanitizeUrl('javascript:alert(1)')      // → 'about:blank'
sanitizeUrl('data:text/html,...')       // → 'about:blank'
sanitizeUrl('/relative/path')           // → '/relative/path'
sanitizeUrl('mailto:user@example.com')  // → 'mailto:user@example.com'
```

Allows: `http`, `https`, `mailto`, `tel`, relative URLs.
Blocks: `javascript`, `data`, `vbscript`, `blob`.

### `validateRegex(pattern)`

Check a regex pattern for catastrophic backtracking (ReDoS).

```typescript
validateRegex('(a+)+$')   // → { safe: false, reason: 'Nested quantifier detected...' }
validateRegex('bridge')    // → { safe: true }
validateRegex('\\w+')      // → { safe: true }
```

## Shared utilities

Internal building blocks used by all adapters. Exported for custom integrations.

### `buildMenuList(links, options)`

Pure DOM builder. Returns a `<ul>` or `<ol>` element.

| Option | Type | Description |
|--------|------|-------------|
| `listType` | `string` | `'ul'` or `'ol'` |
| `maxVisibleItems` | `number` | Scroll after N items |
| `globalHooks` | `string[]` | Default hooks from `settings.hooks` |
| `liAttributes` | `Record<string, string>` | Extra attributes on `<li>` |
| `aAttributes` | `Record<string, string>` | Extra attributes on `<a>` |

### `handleMenuKeyboard(event, items, activeElement, closeMenu, options?)`

Stateless keyboard nav handler. Returns `true` if the event was consumed.

### `DismissTimer`

Auto-dismiss timer. Call `start()` when mouse leaves, `stop()` when it re-enters.

```typescript
const timer = new DismissTimer(5000, () => { menu.hidden = true; });

menu.addEventListener('mouseenter', () => timer.stop());
menu.addEventListener('mouseleave', () => timer.start());
```

### `resolveExistingUrlMode(trigger, globalSetting)`

Resolves the `existingUrl` mode for a trigger element.

### `injectExistingUrl(links, trigger, mode)`

Extracts `href` from a trigger and injects a synthetic link item. Returns a new array.

## Building a custom adapter

These utilities compose into a custom adapter in ~30 lines. See [Events](events.md) for the full event type definitions.
