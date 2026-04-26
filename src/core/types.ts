/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A single link in the registry.
 */
export interface AlapLink {
  /** Display text (required unless `image` is provided) */
  label?: string;

  /** Destination URL */
  url: string;

  /** Tags used for class-based querying (.tagname syntax) */
  tags?: string[];

  /** CSS class applied to the menu list item */
  cssClass?: string;

  /** Image URL displayed instead of text label */
  image?: string;

  /** Alt text for image (accessibility) */
  altText?: string;

  /** Anchor target attribute. Default: "fromAlap" (opens in named tab) */
  targetWindow?: '_self' | '_blank' | '_parent' | '_top' | string;

  /** Human-readable description (used by AI/MCP, search) */
  description?: string;

  /** Image URL for tooltip/preview on hover or context action. Not rendered in menu — passed in event detail. */
  thumbnail?: string;

  /** Event hooks this item participates in, e.g. ["item-hover", "item-context"]. Falls back to settings.hooks. */
  hooks?: string[];

  /** Permanent UUID. Survives renames; generated at creation time via crypto.randomUUID(). */
  guid?: string;

  /** Creation timestamp — ISO 8601 string or Unix ms. Used by regex search age/sort filters. */
  createdAt?: string | number;

  /** Arbitrary metadata for protocol handlers (time, location, price, etc.) */
  meta?: Record<string, unknown>;

  /**
   * URI schemes the renderer should permit for this link's `url`/`image`/
   * `thumbnail`, on top of the strict-tier default of `http`/`https`/
   * `mailto`. Use this to let a trusted protocol handler (e.g. `:obsidian:`,
   * `:json:` with a custom `allowedSchemes` source) emit non-http URIs that
   * survive the sanitizer at render time.
   *
   * Security: `validateConfig` strips this field from any non-author-tier
   * link so storage-loaded configs and remote responses cannot widen their
   * own sanitization. Trusted protocol handlers stamp it via
   * `AlapEngine.injectLinks`, which preserves the field through the
   * sanitization pass.
   */
  allowedSchemes?: string[];
}

/**
 * A resolved link — the link data plus its ID from the registry.
 */
export type ResolvedLink = { id: string } & AlapLink;

/**
 * Result envelope returned by resolve().
 */
export interface ResolveResult {
  /** The resolved links after all filtering and refining */
  results: ResolvedLink[];
  /** Total matches before refiners (limit, skip) were applied */
  totalMatches: number;
  /** Names of refiners that were applied */
  appliedRefiners: string[];
}

/**
 * Filter handler — a predicate that tests whether a link matches.
 * Receives the parsed segments (args) and the link to test.
 */
export type ProtocolHandler = (segments: string[], link: AlapLink, id: string) => boolean;

/**
 * Options passed to a generate handler alongside its segments + config.
 *
 * `signal` is an AbortSignal the engine wires to its timeout + optional
 * dismiss-cancel logic. Handlers that support cancellation (e.g. via the
 * Fetch API's `signal` option) should forward it; handlers that don't may
 * ignore it — the engine still races a timeout externally, so a stuck
 * handler won't pin a "Loading…" placeholder forever.
 */
export interface GenerateHandlerOptions {
  signal?: AbortSignal;
}

/**
 * Generate handler — fetches external data and returns new links.
 * Receives the parsed segments (args), the full config, and optional
 * runtime options (abort signal). Existing handlers that take only two
 * args continue to work; the third parameter is additive.
 *
 * **Size contract.** Handlers SHOULD cap their output at
 * `MAX_GENERATED_LINKS` (200) internally — parse a `limit` arg, trim
 * upstream response arrays, etc. The engine slice-caps as a backstop
 * and emits a loud operator warning when a handler returns more than
 * 10× the cap; that's suggestive of a handler not respecting the
 * contract (or a hostile feed trying to balloon transient memory).
 * The slice is O(1) but holding a huge array in flight costs GC
 * pressure you don't want at render time.
 */
export type GenerateHandler = (
  segments: string[],
  config: AlapConfig,
  options?: GenerateHandlerOptions,
) => Promise<AlapLink[]>;

/**
 * A single entry in the handler registry.
 *
 * The bare-function shorthand is equivalent to `{ generate: fn }` — useful
 * for the common case of a :web:-style source protocol with no filter.
 * The object form is required when a protocol has both generate + filter,
 * or a filter only.
 */
export type ProtocolHandlerEntry =
  | GenerateHandler
  | { generate?: GenerateHandler; filter?: ProtocolHandler };

/**
 * The handler registry — keyed by protocol name (e.g. "web", "time").
 *
 * Passed to `new AlapEngine(config, { handlers: {...} })` at construction,
 * or registered post-construction via `engine.registerProtocol(name, entry)`.
 * Entries are atomic: registering the same name twice throws. If you need
 * both generate and filter for one protocol, register them together in one
 * object-form entry.
 */
export type ProtocolHandlerRegistry = Record<string, ProtocolHandlerEntry>;

/**
 * Options accepted by `new AlapEngine(config, options?)`.
 *
 * `AlapConfig` is data-only — handlers (functions) live here, not in the
 * config. This separation lets configs round-trip through JSON / storage
 * cleanly and makes the config's trust boundary explicit.
 */
export interface AlapEngineOptions {
  /** Protocol handler registry — see ProtocolHandlerRegistry. */
  handlers?: ProtocolHandlerRegistry;
  /**
   * Provenance tier to stamp the config's links with during the engine's
   * auto-validate pass on construction. Defaults to `'author'`. Consumers
   * building an engine from a storage-loaded config that was already
   * stamped by the storage adapter don't need to set this — validateConfig
   * short-circuits on pre-validated configs and preserves existing stamps.
   */
  provenance?: 'author' | 'storage:local' | 'storage:remote' | `protocol:${string}`;
}

/**
 * Configuration for a single key in a web/external protocol.
 */
export interface WebKeyConfig {
  /** Base URL for the API endpoint */
  url: string;
  /** URL prefix for generated links. Prepended to map.url values that don't start with "http". */
  linkBase?: string;
  /** Predefined searches — key is the alias used in expressions, value is the query params */
  searches?: Record<string, Record<string, string | number>>;
  /** Field mapping: external field name → AlapLink field path */
  map?: {
    label?: string;
    url?: string;
    meta?: Record<string, string>;
  };
  /** Cache TTL in minutes. 0 = no cache. Omit for protocol default. */
  cache?: number;
  /**
   * Send browser credentials (cookies, HTTP auth) with the fetch request.
   * Default is false — credentials are omitted for security.
   * Set to true for intranet APIs or subscription services where the
   * user's session should authenticate the request.
   */
  credentials?: boolean;
}

/**
 * Per-protocol configuration — data only.
 *
 * Handler functions (`generate`, `filter`) are passed separately at engine
 * construction via `AlapEngineOptions.handlers` — not here. This keeps the
 * config serializable and the trust boundary explicit. Attempting to set a
 * function field on `config.protocols[name]` is rejected by `validateConfig`
 * with a migration hint.
 */
export interface AlapProtocol {
  /** Ordered data sources to resolve against. Default: ['config'] */
  sources?: string[];
  /** Cache TTL in minutes for generate results. 0 = no cache. Default: 5. */
  cache?: number;
  /** Key configurations for external protocols (e.g. :web:) */
  keys?: Record<string, WebKeyConfig>;
  /** Allowed origins for :web: fetch requests. If set, rejects URLs whose origin is not in the list. */
  allowedOrigins?: string[];
  /** Extensible — protocol-specific fields */
  [key: string]: unknown;
}

/**
 * Root configuration object.
 */
export interface AlapConfig {
  settings?: AlapSettings;
  macros?: Record<string, AlapMacro>;
  searchPatterns?: Record<string, AlapSearchPattern | string>;
  protocols?: Record<string, AlapProtocol>;
  allLinks: Record<string, AlapLink>;
}

/**
 * Options for a regex search pattern.
 */
export interface AlapSearchOptions {
  /** Field codes to search: l(label), u(url), t(tags), d(description), k(id), a(all). Default: "a" */
  fields?: string;

  /** Maximum results to return */
  limit?: number;

  /** Age filter, e.g. "30d", "24h", "2w". Only items with createdAt within this window. */
  age?: string;

  /** Result ordering */
  sort?: 'alpha' | 'newest' | 'oldest';
}

/**
 * A named regex search pattern stored in config.
 * Can also be a plain string (shorthand for { pattern: "..." }).
 */
export interface AlapSearchPattern {
  /** The regex pattern string (compiled at query time) */
  pattern: string;

  /** Default search options (can be overridden in the expression) */
  options?: AlapSearchOptions;
}

/**
 * Global settings for Alap behavior.
 */
export interface AlapSettings {
  /** List type for menu rendering. Default: "ul" */
  listType?: 'ul' | 'ol';

  /** Time in ms before menu auto-dismisses after mouse leave. Default: 5000 */
  menuTimeout?: number;

  /** Max visible items before the menu scrolls. 0 = no limit. Default: 10 */
  maxVisibleItems?: number;

  /**
   * Declared hook keys. Serves two roles:
   *
   * 1. **Default** for items that don't set `link.hooks` themselves.
   * 2. **Allowlist** for hooks arriving on non-author-tier links (storage,
   *    protocol). Remote configs can't smuggle hook keys the app hasn't
   *    declared — anything outside this list is dropped with a warning
   *    at `validateConfig` time.
   *
   * If omitted and a non-author-tier link arrives with any `hooks`, those
   * hooks are stripped (fail-closed). Author-tier links always keep their
   * hooks verbatim — the developer wrote them.
   *
   * Example: `hooks: ["item-hover", "item-context"]`
   */
  hooks?: string[];

  /**
   * How to handle an existing `href` on a trigger element.
   * - `'prepend'` — insert the original URL as the first menu item (default)
   * - `'append'`  — insert the original URL as the last menu item
   * - `'ignore'`  — discard the original URL entirely
   *
   * Per-anchor override: `data-alap-existing="prepend|append|ignore"`
   */
  existingUrl?: 'prepend' | 'append' | 'ignore';

  /**
   * Default target window for all links. Per-link `targetWindow` overrides.
   * Default: `'fromAlap'` (opens in a named tab).
   * Set to `'_self'` for same-tab navigation.
   */
  targetWindow?: string;

  /**
   * Adjust menu position to stay within the viewport.
   * When true, menus that would overflow the bottom of the viewport
   * are repositioned above the trigger instead.
   * @default true
   */
  viewportAdjust?: boolean;

  /**
   * Menu placement as a comma-separated string of compass direction and strategy.
   *
   * Compass directions: N, NE, E, SE, S, SW, W, NW, C
   * Strategies: place (pinned), flip (default — tries fallbacks), clamp (full viewport constraint)
   *
   * Examples: "SE", "SE, clamp", "N, place", "clamp"
   *
   * If only a compass is given, strategy defaults to "flip".
   * If only a strategy is given, compass defaults to "SE".
   *
   * @default 'SE'
   */
  placement?: string;

  /**
   * Pixel gap between the trigger edge and the menu edge.
   * @default 4
   */
  placementGap?: number;

  /**
   * Minimum pixel distance the menu keeps from viewport edges.
   * @default 8
   */
  viewportPadding?: number;

  /**
   * Prevent the browser from scrolling the page when focus moves to a menu item.
   * When true, `focus({ preventScroll: true })` is used on menu open and
   * keyboard navigation, so the viewport stays put if the menu already fits.
   * @default true
   */
  preventFocusScroll?: boolean;

  /**
   * What to do when the trigger scrolls off-screen while the menu is open.
   * - 'close': close the menu (default)
   * - 'flip': recompute placement to keep menu visible
   * @default 'close'
   */
  triggerOffscreen?: 'close' | 'flip';

  /**
   * Maximum concurrent in-flight async protocol fetches. Additional requests
   * wait in a FIFO queue and still participate in in-flight dedup, so N
   * anchors requesting the same token collapse to one fetch. Default: 6.
   */
  maxConcurrentFetches?: number;

  /**
   * Per-fetch timeout in milliseconds. When exceeded, the engine treats the
   * fetch as errored and renders a "Couldn't load" placeholder. The underlying
   * request may continue running if the handler doesn't honor the abort
   * signal, but the engine stops waiting on it. Default: 30000 (30s).
   */
  fetchTimeout?: number;

  /**
   * When true, dismissing a menu while its async fetch is in flight cancels
   * the fetch (via AbortSignal). When false (default), the fetch runs to
   * completion so a quick re-click can use the cached result.
   */
  cancelFetchOnDismiss?: boolean;

  /** Extensible — additional settings */
  [key: string]: unknown;
}

/**
 * A named macro — a reusable expression stored in config.
 */
export interface AlapMacro {
  /** The expression string to expand, e.g. ".favorite + .video" */
  linkItems: string;

  /** Reserved for future per-macro configuration */
  config?: Record<string, unknown>;
}

/**
 * Per-source state returned by AlapEngine.resolveProgressive().
 *
 * Represents an async protocol token in the expression that is either
 * still fetching, has failed, or settled with an empty result. Sources
 * with a successful non-empty result do NOT appear here — their links
 * land in ProgressiveState.resolved.
 */
export interface SourceState {
  /** Protocol token, e.g. "hn:search:ai_papers" (without surrounding colons) */
  token: string;
  /** Current state of this async source */
  status: 'loading' | 'error' | 'empty';
  /** Only present when status === 'loading'. Settles when the fetch does. */
  promise?: Promise<void>;
  /** Only present when status === 'error'. */
  error?: Error;
}

/**
 * Progressive resolution state — what the renderer gets on click.
 *
 * `resolved` contains everything available right now (static matches +
 * async sources that have already cached successfully). `sources` lists
 * any async sources that are still in flight, errored, or empty-after-
 * fetch, so the renderer can emit placeholders for them. When a source's
 * promise settles, the caller is expected to re-invoke resolveProgressive()
 * to get a fresh state and re-render.
 */
export interface ProgressiveState {
  resolved: ResolvedLink[];
  sources: SourceState[];
}
