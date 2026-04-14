# Types

**[API Reference](README.md):** [Engine](engine.md) · **This Page** · [Config Registry](config-registry.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · [Servers](servers.md)

All TypeScript interfaces for the Alap configuration and engine.

> Live version: https://alap.info/api-reference/types

## `AlapConfig`

Root configuration object. Passed to `registerConfig()`, `AlapUI`, `AlapEngine`, and framework providers.

```typescript
interface AlapConfig {
  allLinks: Record<string, AlapLink>;                          // required
  settings?: AlapSettings;
  macros?: Record<string, AlapMacro>;
  searchPatterns?: Record<string, AlapSearchPattern | string>;
  protocols?: Record<string, AlapProtocol>;
}
```

Only `allLinks` is required. Everything else is optional.

## `AlapLink`

A single link entry in `config.allLinks`.

```typescript
interface AlapLink {
  url: string;                         // required
  label?: string;                      // required unless image is set
  tags?: string[];
  cssClass?: string;
  image?: string;
  altText?: string;
  targetWindow?: string;               // '_self', '_blank', etc. Default: 'fromAlap'
  description?: string;
  thumbnail?: string;
  hooks?: string[];
  guid?: string;
  createdAt?: string | number;         // ISO 8601 or Unix ms
  meta?: Record<string, unknown>;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` | Yes | Destination URL |
| `label` | `string` | No | Display text (required unless `image` is set) |
| `tags` | `string[]` | No | Tags for `.tag` queries |
| `cssClass` | `string` | No | CSS class applied to the menu item |
| `image` | `string` | No | Image URL rendered instead of text |
| `altText` | `string` | No | Alt text for `image` |
| `targetWindow` | `string` | No | `_self`, `_blank`, `_parent`, `_top`, or any string |
| `description` | `string` | No | Used by search patterns and hooks |
| `thumbnail` | `string` | No | Preview image for hover/context events (not rendered in menu) |
| `hooks` | `string[]` | No | Event hooks this item participates in (overrides `settings.hooks`) |
| `guid` | `string` | No | Permanent UUID that survives renames |
| `createdAt` | `string \| number` | No | ISO 8601 or Unix ms. Used by age filters |
| `meta` | `Record<string, unknown>` | No | Arbitrary metadata for protocol queries |

## `AlapSettings`

Global settings in `config.settings`.

```typescript
interface AlapSettings {
  listType?: 'ul' | 'ol';
  menuTimeout?: number;
  maxVisibleItems?: number;
  hooks?: string[];
  existingUrl?: 'prepend' | 'append' | 'ignore';
  placement?: string;
  placementGap?: number;
  viewportPadding?: number;
  viewportAdjust?: boolean;
  preventFocusScroll?: boolean;
  targetWindow?: string;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `listType` | `'ul' \| 'ol'` | `'ul'` | Menu list element type |
| `menuTimeout` | `number` | `5000` | Auto-dismiss timeout (ms) after mouse leaves |
| `maxVisibleItems` | `number` | `10` | Items before the menu scrolls. `0` = no limit |
| `hooks` | `string[]` | — | Default hooks for all items |
| `existingUrl` | `'prepend' \| 'append' \| 'ignore'` | `'prepend'` | How to handle an existing `href` on the trigger |
| `placement` | `string` | `'SE'` | Comma-separated placement string: compass direction + strategy. See below. |
| `placementGap` | `number` | `4` | Pixel gap between trigger edge and menu edge |
| `viewportPadding` | `number` | `8` | Minimum distance the menu keeps from viewport edges |
| `viewportAdjust` | `boolean` | `true` | Enable smart placement with viewport containment and fallback |
| `preventFocusScroll` | `boolean` | `true` | Use `focus({ preventScroll: true })` when focusing menu items on keyboard open, preventing unwanted viewport scrolling in Shadow DOM contexts |
| `targetWindow` | `string` | — | Global default for link targets |

### Placement string

The `placement` value is a comma-separated string with a compass direction and an optional strategy. The same format works in config settings, DOM attributes (`data-alap-placement`), web component attributes (`placement`), and framework props.

**Compass directions:**

| Value | Position | Alignment |
|-------|----------|-----------|
| `N` | Above trigger | Centered horizontally |
| `NE` | Above trigger | Left edge aligned with trigger left |
| `E` | Right of trigger | Vertically centered |
| `SE` | Below trigger | Left edge aligned with trigger left |
| `S` | Below trigger | Centered horizontally |
| `SW` | Below trigger | Right edge aligned with trigger right |
| `W` | Left of trigger | Vertically centered |
| `NW` | Above trigger | Right edge aligned with trigger right |
| `C` | Centered over trigger | Both axes |

**Strategies:**

| Strategy | Behavior |
|----------|----------|
| `place` | Position at compass point. No fallback, no clamping. |
| `flip` | Position + try fallbacks if it doesn't fit. **Default.** |
| `clamp` | Flip + constrain to viewport + scroll long menus. |

**Examples:** `"SE"`, `"SE, clamp"`, `"N, place"`, `"clamp"` (defaults compass to SE).

When no placement is set, the engine doesn't run — the menu uses CSS-only positioning.

## `AlapMacro`

A named macro in `config.macros`.

```typescript
interface AlapMacro {
  linkItems: string;
  config?: Record<string, unknown>;    // reserved for future use
}
```

## `AlapSearchPattern`

A named regex pattern in `config.searchPatterns`. Can also be a plain string (shorthand for `{ pattern: "..." }`).

```typescript
interface AlapSearchPattern {
  pattern: string;
  options?: AlapSearchOptions;
}

interface AlapSearchOptions {
  fields?: string;                     // Field codes: l, u, t, d, k, a
  limit?: number;
  age?: string;                        // '30d', '24h', '2w'
  sort?: 'alpha' | 'newest' | 'oldest';
}
```

## `AlapProtocol`

A registered protocol in `config.protocols`. Protocols come in two kinds: **filter** (predicate over existing links) and **generate** (fetch external data and return new links). A protocol can have one or both.

```typescript
interface AlapProtocol {
  filter?: ProtocolHandler;            // Predicate: does this link match?
  generate?: GenerateHandler;          // Async: fetch and return new links
  cache?: number;                      // TTL in minutes for generate results (0 = no cache, default: 5)
  keys?: Record<string, WebKeyConfig>; // Key configs for external protocols
  allowedOrigins?: string[];           // Restrict :web: fetch to these origins
  sources?: string[];                  // Default: ['config']
  [key: string]: unknown;
}

type ProtocolHandler = (segments: string[], link: AlapLink, id: string) => boolean;
type GenerateHandler = (segments: string[], config: AlapConfig) => Promise<AlapLink[]>;
```

If `allowedOrigins` is set, any `:web:` fetch whose URL origin is not in the list is rejected before the request is made. Omit or pass an empty array to allow all origins.

## `WebKeyConfig`

Configuration for a single key in an external protocol like `:web:`.

```typescript
interface WebKeyConfig {
  url: string;                                    // Base URL for the API endpoint
  linkBase?: string;                              // Prepended to relative link URLs (e.g. "https://openlibrary.org")
  searches?: Record<string, Record<string, string | number>>;  // Predefined search aliases
  map?: {                                         // Field mapping: API field → AlapLink field
    label?: string;
    url?: string;
    meta?: Record<string, string>;
  };
  cache?: number;                                 // Per-key cache TTL override (minutes)
  credentials?: boolean;                           // Send browser credentials (cookies, auth) — default: false
}
```

## `ResolvedLink`

Returned by `engine.resolve()`.

```typescript
type ResolvedLink = { id: string } & AlapLink;
```

## `ResolveResult`

Full result with metadata (used internally by refiners).

```typescript
interface ResolveResult {
  links: ResolvedLink[];
  totalMatches: number;                // Count before refiners applied
}
```

## `ConfigStore`

Interface for persistence backends. See [Storage](storage.md).

```typescript
interface ConfigStore {
  save(name: string, config: AlapConfig): Promise<void>;
  load(name: string): Promise<AlapConfig | null>;
  loadEntry(name: string): Promise<ConfigEntry | null>;
  list(): Promise<string[]>;
  remove(name: string): Promise<void>;
}

interface ConfigEntry {
  config: AlapConfig;
  meta: ConfigMeta;
}

interface ConfigMeta {
  updatedAt: string;                   // ISO 8601
  createdAt: string;                   // ISO 8601
}
```

## Renderer and UI types

These types are documented on their own pages:

| Type | Page | Description |
|------|------|-------------|
| `Placement`, `PlacementStrategy`, `PlacementInput`, `PlacementResult` | [Placement](placement.md) | Compass positioning and strategies |
| `AlapLightboxOptions` | [Lightbox](lightbox.md) | Lightbox constructor options |
| `AlapLensOptions` | [Lens](lens.md) | Lens constructor options (transitions, meta labels, copy) |
| `EmbedType`, `EmbedPolicy`, `EmbedProvider`, `AlapEmbedOptions` | [Embeds](embeds.md) | Embed rendering and consent |
| `RendererType`, `OpenPayload`, `CoordinatedRenderer`, `RendererCoordinatorOptions` | [Coordinators](coordinators.md) | Renderer transitions and cross-instance dismiss |

## Constants

Safety limits enforced by the parser:

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_DEPTH` | 32 | Maximum parentheses nesting |
| `MAX_TOKENS` | 1024 | Maximum tokens per expression |
| `MAX_MACROS` | 10 | Maximum macro expansion rounds |
| `MAX_REGEX` | 5 | Maximum regex searches per expression |
| `MAX_REFINERS` | 10 | Maximum refiners per expression |
| `MAX_GENERATED_LINKS` | 200 | Maximum links a generate handler can return per call |
| `WEB_FETCH_TIMEOUT_MS` | 10,000 | Timeout for `:web:` protocol fetch requests (10 seconds) |
| `MAX_WEB_RESPONSE_BYTES` | 1,048,576 | Maximum response body size for `:web:` fetch (1 MB) |
