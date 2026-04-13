# Config Registry API

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · **This Page**

Global registry that connects configs to web components. Register a config once, and every `<alap-link>`, `<alap-lightbox>`, and `<alap-lens>` on the page can use it.

## Quick start

```typescript
import { registerConfig, defineAlapLink } from 'alap';

registerConfig(myConfig);
defineAlapLink();
```

```html
<!-- Uses the default config automatically -->
<alap-link query=".coffee">coffee spots</alap-link>
```

## Functions

### `registerConfig(config, name?)`

Registers a config object and creates a corresponding `AlapEngine` instance. Both are stored in the global registry.

```typescript
function registerConfig(config: AlapConfig, name?: string): void
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config` | `AlapConfig` | required | The config object |
| `name` | `string` | `'_default'` | Registry key for this config |

```typescript
// Single config (most common)
registerConfig(myConfig);

// Multiple configs on one page
registerConfig(docsConfig, 'docs');
registerConfig(blogConfig, 'blog');
```

### `updateRegisteredConfig(config, name?)`

Updates a previously registered config and its engine. If the config doesn't exist yet, falls back to `registerConfig`.

```typescript
function updateRegisteredConfig(config: AlapConfig, name?: string): void
```

Use this for runtime config changes — the engine updates in place, and all web components using that config see the new data immediately.

### `getEngine(name?)`

Retrieves the engine instance for a registered config.

```typescript
function getEngine(name?: string): AlapEngine | undefined
```

Returns `undefined` if no config is registered under that name.

### `getConfig(name?)`

Retrieves the raw config object.

```typescript
function getConfig(name?: string): AlapConfig | undefined
```

## Named configs

By default, all functions use `'_default'` as the config name. You can register multiple configs and select them per-element with the `config` HTML attribute:

```typescript
registerConfig(docsConfig, 'docs');
registerConfig(blogConfig, 'blog');
```

```html
<!-- Uses 'docs' config -->
<alap-link config="docs" query=".guide">guides</alap-link>

<!-- Uses 'blog' config -->
<alap-lightbox config="blog" query=".post">posts</alap-lightbox>

<!-- Uses '_default' config (attribute omitted) -->
<alap-lens query=".bridge">bridges</alap-lens>
```

All web components (`<alap-link>`, `<alap-lightbox>`, `<alap-lens>`) share the same global registry. A single config registration feeds every renderer and instance on the page.

## How web components use the registry

When a web component opens (click or programmatic), it:

1. Reads its `config` attribute (defaults to `'_default'`)
2. Calls `getEngine(configName)` to get the engine
3. Calls `engine.resolve(query)` to get links
4. Renders the result

If no engine is found, a warning is logged:

```
<alap-link>: no config registered for "myconfig". Call registerConfig() first.
```

::: details Example: runtime config update
```typescript
import { registerConfig, updateRegisteredConfig } from 'alap';

// Initial registration
registerConfig(baseConfig);

// Later — add new links at runtime
const extended = mergeConfigs(baseConfig, {
  allLinks: {
    newItem: { label: 'New', url: '/new', tags: ['recent'] },
  },
});
updateRegisteredConfig(extended);

// All <alap-link> elements now see the new item
```
:::
