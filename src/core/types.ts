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
 * Generate handler — fetches external data and returns new links.
 * Receives the parsed segments (args) and the full config.
 */
export type GenerateHandler = (segments: string[], config: AlapConfig) => Promise<AlapLink[]>;

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
 * A registered protocol in config.protocols.
 */
export interface AlapProtocol {
  /** Filter predicate: does this link match the given segments? */
  filter?: ProtocolHandler;
  /** Generate function: fetch external data and return new links */
  generate?: GenerateHandler;
  /** @deprecated Use `filter` instead. Kept for backward compatibility. */
  handler?: ProtocolHandler;
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

  /** Global default hooks for all items, e.g. ["item-hover", "item-context"]. Per-link hooks override. */
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
   * What to do when the trigger scrolls off-screen while the menu is open.
   * - 'close': close the menu (default)
   * - 'flip': recompute placement to keep menu visible
   * @default 'close'
   */
  triggerOffscreen?: 'close' | 'flip';

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
