/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * All tunables for the :obsidian: protocol live here. Anything that looks
 * like a magic value in core.ts / rest.ts / linkBuilder.ts should come
 * from this module.
 */

/** Mode dispatched on by the segment immediately after `:obsidian:`. */
export const OBSIDIAN_MODE_CORE = 'core';
export const OBSIDIAN_MODE_REST = 'rest';

/** Host the Local REST API plugin binds to. */
export const OBSIDIAN_REST_HOST = '127.0.0.1';

/** Port the Local REST API plugin binds to. */
export const OBSIDIAN_REST_PORT = 27124;

/** Scheme the Local REST API plugin serves. */
export const OBSIDIAN_REST_SCHEME = 'https';

/**
 * Hosts the REST handler will talk to by default. Loopback only — anything
 * outside this list requires explicit opt-in via `rest.allowedHosts`.
 */
export const OBSIDIAN_REST_DEFAULT_ALLOWED_HOSTS = ['127.0.0.1', '::1', 'localhost'] as const;

/** Env var consulted when `rest.apiKey` is not set in config. */
export const OBSIDIAN_API_KEY_ENV = 'OBSIDIAN_API_KEY';

/** URI template expanded by the link builder. `vault` and `path` are substituted. */
export const OBSIDIAN_URI_TEMPLATE = 'obsidian://open?vault={vault}&file={path}';

/** Default include globs evaluated against paths relative to `vaultPath`. */
export const OBSIDIAN_DEFAULT_GLOBS = ['**/*.md'] as const;

/**
 * Default ignore globs — Obsidian's internal folders and common OS debris.
 * Evaluated against paths relative to `vaultPath`.
 */
export const OBSIDIAN_DEFAULT_IGNORE = [
  '.obsidian/**',
  '.trash/**',
  '**/.DS_Store',
  'node_modules/**',
] as const;

/** Fields the core grep scans when matching the query. */
export const OBSIDIAN_DEFAULT_SEARCH_FIELDS = ['title', 'tags', 'body'] as const;

/** Frontmatter fields checked (in order) when looking for a note's thumbnail. */
export const OBSIDIAN_DEFAULT_THUMBNAIL_FIELDS = ['cover', 'image'] as const;

/** Per-file read cap to keep giant notes from blowing the heap. 256 KiB. */
export const OBSIDIAN_MAX_MATCH_BYTES = 262_144;

/** Mount prefix for the reference tier-2 media route (server responsibility). */
export const OBSIDIAN_MEDIA_ROUTE_PREFIX = '/vault-media/';

/** REST endpoints we talk to. Paths only; host/port/scheme come from config. */
export const OBSIDIAN_SEARCH_SIMPLE_PATH = '/search/simple/';
export const OBSIDIAN_VAULT_PATH = '/vault/';
export const OBSIDIAN_TAGS_PATH = '/tags/';

/** HTTP success-status range. `[OK_MIN, OK_MAX_EXCLUSIVE)` is the 2xx window. */
export const HTTP_STATUS_OK_MIN = 200;
export const HTTP_STATUS_OK_MAX_EXCLUSIVE = 300;

/**
 * HTTP statuses treated as "auth rejected — check apiKey" across the REST
 * paths. Kept as separate named constants because 401 and 403 have distinct
 * meanings at the HTTP layer (missing auth vs. authenticated-but-denied),
 * even though the user-facing remedy is the same: check the key.
 *
 * Emitted only to the local `warn()` logger, never serialized into an HTTP
 * response body — see `docs/security-obsidian.md` on operator-vs-remote
 * audience split.
 */
export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_FORBIDDEN = 403;

/**
 * Window target for `obsidian://` links. Stays on the current tab —
 * the OS dispatches the external scheme without rendering anything,
 * so the default named-window target (`fromAlap`) would spawn a tab
 * that immediately ends up at about:blank. `_self` lets browsers
 * dispatch the external protocol from the current tab without any
 * visible navigation.
 */
export const OBSIDIAN_LINK_TARGET_WINDOW = '_self';

/** File extension stripped from filenames when deriving a note's basename label. */
export const OBSIDIAN_NOTE_EXTENSION_RE = /\.md$/i;

/**
 * CSS class appended to every link produced by the obsidian handler.
 * Mirrors the `source_web` / `source_atproto` convention.
 */
export const OBSIDIAN_LINK_CSS_CLASS = 'source_obsidian';

/** Meta field stamped on every generated link. */
export const OBSIDIAN_LINK_SOURCE = 'obsidian';

/**
 * Package specifiers tried via `loadOptional`. If present, used; otherwise
 * the protocol falls back to its built-in minimal implementations.
 */
export const OBSIDIAN_OPTIONAL_YAML_PKG = 'yaml';
export const OBSIDIAN_OPTIONAL_GLOB_PKG = 'fast-glob';

/** Frontmatter delimiter for the fallback parser (RFC-ish: `---\n…\n---`). */
export const OBSIDIAN_FRONTMATTER_FENCE = '---';
