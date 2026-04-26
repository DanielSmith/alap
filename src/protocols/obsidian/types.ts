/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import type { OBSIDIAN_MODE_CORE, OBSIDIAN_MODE_REST } from './constants';

export type ObsidianMode = typeof OBSIDIAN_MODE_CORE | typeof OBSIDIAN_MODE_REST;

/** Which note fields the core grep scans when matching the query. */
export type ObsidianSearchField = 'title' | 'tags' | 'body' | 'path';

/**
 * Parsed representation of a note — produced by the core scanner,
 * consumed by the link builder. REST mode maps its responses into the
 * same shape before building links.
 */
export interface ObsidianNote {
  /** Path relative to `vaultPath`, forward-slash separated. */
  relPath: string;
  /** Absolute path on disk (core mode only; REST leaves this undefined). */
  absPath?: string;
  /** File basename without the `.md` extension. */
  basename: string;
  /** Parsed frontmatter (empty object when absent). */
  frontmatter: Record<string, unknown>;
  /** Note body with frontmatter stripped. Truncated at `OBSIDIAN_MAX_MATCH_BYTES`. */
  body: string;
  /**
   * Inline `#tags` discovered in the body. Captured as raw Obsidian-side
   * strings (hyphens, nested `/` preserved verbatim) in first-occurrence
   * order. Populated by both core and rest sub-modes so downstream match +
   * link-build logic is identical. Empty when no inline tags are present.
   */
  inlineTags: string[];
}

/**
 * REST-mode transport config. Lives under `protocols.obsidian.rest` so core
 * mode never has to see it.
 */
export interface ObsidianRestConfig {
  host?: string;
  port?: number;
  scheme?: 'http' | 'https';
  apiKey?: string;
  /**
   * Disable TLS certificate verification. Honoured ONLY when the host is
   * loopback (127.0.0.0/8, ::1, localhost). Silently ignored otherwise.
   */
  rejectUnauthorized?: boolean;
  /**
   * Hosts the REST handler is permitted to talk to. Defaults to loopback
   * only (`['127.0.0.1', '::1', 'localhost']`). Add a host here to permit
   * a corporate or remote vault — explicit opt-in protects against typo-
   * routing or rogue config pointing at an arbitrary endpoint.
   */
  allowedHosts?: string[];
}

/**
 * A named preset for the `@name` segment. The keys mirror the inline
 * `key=value` args the handler understands (`fields`, `maxFiles`, …).
 * Values may be strings or numbers — strings pass through to the named
 * parser unchanged; numbers are stringified.
 */
export type ObsidianSearchPreset = Record<string, string | number>;

/**
 * Protocol-specific fields stored under `config.protocols.obsidian`.
 * Combined with the base `AlapProtocol` fields (`generate`, `cache`, …).
 */
export interface ObsidianProtocolConfig {
  /** Display name used in `obsidian://open?vault=X`. Defaults to basename(vaultPath). */
  vault?: string;

  /** Absolute path to the vault on disk. Required for core mode. */
  vaultPath?: string;

  /** REST-mode transport config. */
  rest?: ObsidianRestConfig;

  /** Include globs (relative to vault). Default: `['**\/*.md']`. */
  globs?: string[];

  /** Ignore globs (relative to vault). Merged with sensible defaults. */
  ignore?: string[];

  /** Which fields the search matches against. Default: ['title','tags','body']. */
  searchFields?: ObsidianSearchField[];

  /** Frontmatter keys consulted (in order) when picking a thumbnail. */
  thumbnailFields?: string[];

  /**
   * Media URL resolution:
   * - `null` / omitted  → tier 1 (thumbnails pulled from frontmatter, no rewriting)
   * - absolute URL      → tier 3 (prefixed directly onto the attachment path)
   * Tier 2 (server-proxied) is opt-in by the server mounting a route matching
   * {@link OBSIDIAN_MEDIA_ROUTE_PREFIX}; the handler never serves media itself.
   */
  mediaBaseUrl?: string | null;

  /** Cap on files enumerated per resolution. Default: `MAX_FILESYSTEM_FILES`. */
  maxFiles?: number;

  /** Override the `obsidian://` URI template if you need a custom scheme. */
  linkTemplate?: string;

  /** Network timeout for REST mode (ms). Defaults to `WEB_FETCH_TIMEOUT_MS`. */
  timeoutMs?: number;

  /**
   * Named presets referenced from expressions via `$name`.
   *
   *   protocols.obsidian.searches = {
   *     meta:  { fields: 'title;tags' },
   *     small: { maxFiles: 20 },
   *   }
   *
   *   :obsidian:core:music:$meta:
   *
   * `$` (not `@`) because `@` is already the expression-level macro sigil.
   */
  searches?: Record<string, ObsidianSearchPreset>;

  /**
   * Alias map from Alap-safe expression keys to raw Obsidian tag strings.
   * Obsidian tags legally contain hyphens and forward slashes; Alap's tag
   * atom (`.className`) accepts only `[A-Za-z_]\w*`. The alias map is the
   * bridge — users declare the handles they want to type in expressions,
   * and the obsidian handler resolves them against faithful Obsidian tags
   * at match time.
   *
   *   protocols.obsidian.tagAliases = {
   *     thisDashTag:  'this-tag',     // .thisDashTag → matches #this-tag
   *     work_project: 'work/project', // .work_project → matches #work/project
   *     techno:       '#techno',      // leading '#' accepted and stripped
   *   }
   *
   * **Key shape**: must match `[A-Za-z_]\w*` (same as a `.className` atom).
   * **Value shape**: a raw Obsidian tag string with optional leading `#`;
   * preserved verbatim otherwise. Slashes denote Obsidian nested tags and
   * are preserved whole — Alap never decomposes them.
   *
   * When no alias entry exists for a given Alap-safe key, matching falls
   * back to a literal compare (`.foo` → `#foo`). The map is a *selective
   * override*, not a required translation table.
   */
  tagAliases?: Record<string, string>;

  /**
   * EXTRA URI schemes the renderer should permit for emitted links —
   * unioned on top of the strict-tier baseline (`http`/`https`/`mailto`),
   * which is always honored regardless of this list. Use this to surface
   * non-http URIs the protocol legitimately emits (the obsidian protocol
   * itself emits `obsidian://open?vault=…&file=…`).
   *
   * Defaults to `['obsidian']` so the protocol works out of the box —
   * setting `['obsidian']` does NOT disable http/https; it adds
   * `obsidian` on top of them.
   *
   * The library-enforced scheme ceiling (`SCHEME_CEILING` in
   * `src/core/sanitizeUrl.ts`) intersects this list before applying it,
   * so requesting a scheme outside the ceiling silently has no effect.
   * Today the ceiling holds only `'obsidian'`; adding new entries is a
   * deliberate library change.
   *
   * Set to `[]` to drop the obsidian widening (the strict baseline still
   * applies, but `obsidian://` URIs would then be sanitized to
   * `about:blank`).
   */
  allowedSchemes?: string[];
}
