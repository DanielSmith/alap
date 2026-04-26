---
source: api-reference/engine.md
modified: '2026-04-23T16:22:30Z'
tags:
- api_reference
title: Engine API
description: '**API Reference:** **This Page** · Types · Config Registry · Placement
  · Lightbox · Lens · Embeds · Coordinators · Storage · Events · Security · Servers'
---
# Engine API

**[[api-reference/README|API Reference]]:** **This Page** · [[api-reference/types|Types]] · [[api-reference/config-registry|Config Registry]] · [[api-reference/placement|Placement]] · [[api-reference/lightbox|Lightbox]] · [[api-reference/lens|Lens]] · [[api-reference/embeds|Embeds]] · [[api-reference/coordinators|Coordinators]] · [[api-reference/storage|Storage]] · [[api-reference/events|Events]] · [[api-reference/security|Security]] · [[api-reference/servers|Servers]]

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
| `resolve()` | `(expression: string, anchorId?: string) => ResolvedLink[]` | Sync: expression to full link objects (returns `[]` for unresolved async tokens) |
| `resolveProgressive()` | `(expression: string, anchorId?: string) => ProgressiveState` | Sync return with async side effect — see below |
| `resolveAsync()` | `(expression: string, anchorId?: string) => Promise<ResolvedLink[]>` | Awaits generate protocols, then returns resolved links |
| `preResolve()` | `(expressions: string[]) => Promise<void>` | Optional: warm the cache for generate protocols before first click |
| `abortInFlight()` | `(token: string) => void` | Cancel a currently-fetching protocol token (for `cancelFetchOnDismiss`) |
| `getLinks()` | `(ids: string[]) => ResolvedLink[]` | IDs to full link objects |
| `clearGenerated()` | `() => void` | Remove all temp IDs injected by async resolution |
| `updateConfig()` | `(config: AlapConfig) => void` | Replace configuration |
| `clearCache()` | `() => void` | Clear cached generate protocol results (and error cache) |

### Progressive resolution (3.2+)

`resolveProgressive()` is what the shipped renderers (`AlapUI`, `AlapLens`, `AlapLightbox`) call on trigger-click. It returns synchronously with whatever's available right now, and — as a side effect — starts any fetches that are still cold.

```typescript
interface ProgressiveState {
  resolved: ResolvedLink[];   // static matches + already-cached async sources
  sources: SourceState[];     // one entry per async source that's loading, errored, or settled-empty
}

interface SourceState {
  token: string;                       // e.g. "hn:search:ai_papers"
  status: 'loading' | 'error' | 'empty';
  promise?: Promise<void>;             // only when status === 'loading'
  error?: Error;                       // only when status === 'error'
}
```

Re-invoke on each loading source's `promise` settlement to pick up the new state. Duplicate fetches for the same token collapse via an in-flight map; concurrency is capped by `settings.maxConcurrentFetches` (default 6) and each fetch is bounded by `settings.fetchTimeout` (default 30s).

```typescript
const state = engine.resolveProgressive(':hn:top: | .coffee');
render(state.resolved);                       // show what we have
for (const src of state.sources) {
  if (src.status === 'loading') {
    src.promise!.then(() => {
      const fresh = engine.resolveProgressive(':hn:top: | .coffee');
      render(fresh.resolved);
    });
  }
}
```

### Examples

```typescript
import { AlapEngine } from 'alap/core';

const engine = new AlapEngine(config);

// Get just the IDs
const ids = engine.query('.coffee + .sf');
// → ['bluebottle']

// Get full link objects (sync — returns [] for cold async tokens)
const links = engine.resolve('.coffee');
// → [{ id: 'bluebottle', url: '...', label: 'Blue Bottle', tags: ['coffee', 'sf'] }, ...]

// Async: headless/programmatic resolution of generate protocols
const books = await engine.resolveAsync(':web:books:architecture:limit=5:');

// Optional: warm the cache ahead of time (e.g. on hover, for UX polish —
// shipped renderers don't need this, they handle async progressively)
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

These utilities compose into a custom adapter in ~30 lines. See [[api-reference/events|Events]] for the full event type definitions.
