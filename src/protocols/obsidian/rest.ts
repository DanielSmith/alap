/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * :obsidian:rest: — Local REST API plugin mode.
 *
 * Talks to the Obsidian Local REST API plugin running on the user's
 * machine (default `https://127.0.0.1:27124`). Returns the same
 * {@link AlapLink} shape as core mode by mapping search results into
 * {@link ObsidianNote}s and feeding them through the shared link builder.
 *
 * Node-only — relies on `node:https` for self-signed cert handling on
 * loopback. Excluded from browser bundles via the `alap/protocols/obsidian`
 * subpath export.
 *
 * Step 5 state: gates validate → `restSearch` dispatches `/search/simple/`
 * → `hydrateNotes` fans out to `/vault/{path}` in parallel → field-
 * restricted substring filter (shared with core mode via `matching.ts`)
 * → `buildLink` per note → bounded `AlapLink[]`.
 */

import type { AlapLink } from '../../core/types';
import { MAX_GENERATED_LINKS } from '../../constants';
import { warn } from '../../core/logger';
import {
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_UNAUTHORIZED,
  OBSIDIAN_API_KEY_ENV,
  OBSIDIAN_MAX_MATCH_BYTES,
  OBSIDIAN_NOTE_EXTENSION_RE,
  OBSIDIAN_SEARCH_SIMPLE_PATH,
  OBSIDIAN_VAULT_PATH,
} from './constants';
import { parseMarkdown } from './frontmatter';
import { scanInlineTags } from './inlineTags';
import { buildLink } from './linkBuilder';
import { matches, resolveSearchFields } from './matching';
import { redactKey, restFetch } from './restClient';
import { findAliasedNeedle, resolveTagAliases } from './tagAliases';
import type { ObsidianNote, ObsidianProtocolConfig, ObsidianRestConfig } from './types';

export interface ResolveRestArgs {
  /** Query string — segment immediately after `:obsidian:rest:`. */
  query: string;
  /** Named args from remaining segments + `$preset` expansion. */
  named: Record<string, string>;
  /** The validated protocol config (rest transport, vault display name). */
  config: ObsidianProtocolConfig;
}

/**
 * A single hit from `/search/simple/` reduced to the fields step 4 needs.
 * The plugin also returns `score` and `matches[]`; both are ignored here —
 * we re-rank via frontmatter after hydration.
 */
export interface RestSearchResult {
  /** Vault-relative path, forward-slash separated (matches the core mode shape). */
  relPath: string;
  /** Filename without directory or `.md` extension. */
  basename: string;
}

/** Raw shape the Obsidian Local REST API returns from `/search/simple/`. */
interface RestSimpleSearchHit {
  filename: string;
  score?: number;
  matches?: unknown[];
}

/**
 * REST mode entry point. Returns a bounded array of links.
 *
 * Validation order:
 *   1. API key — `config.rest.apiKey`, or `OBSIDIAN_API_KEY` env var
 *   2. Vault display name — `config.vault`, since REST mode doesn't read
 *      `vaultPath` to derive a default
 *
 * Both gates warn explicitly about what's missing and where to set it.
 */
export const resolveRest = async (args: ResolveRestArgs): Promise<AlapLink[]> => {
  const { config, query, named } = args;
  const rawRestConfig = config.rest ?? {};

  const apiKey = rawRestConfig.apiKey ?? process.env[OBSIDIAN_API_KEY_ENV];
  if (!apiKey) {
    warn(`:obsidian:rest: no API key — set protocols.obsidian.rest.apiKey in config or the ${OBSIDIAN_API_KEY_ENV} env var`);
    return [];
  }

  const vault = typeof config.vault === 'string' && config.vault.trim().length > 0
    ? config.vault.trim()
    : '';
  if (!vault) {
    warn(':obsidian:rest: missing `vault` display name — REST mode needs protocols.obsidian.vault since vaultPath is not consulted');
    return [];
  }

  // Fold the env-var fallback into the transport config so `restClient` sees
  // a single source of truth for the API key.
  const restConfig: ObsidianRestConfig = { ...rawRestConfig, apiKey };

  const hits = await restSearch(restConfig, query);
  if (hits.length === 0) return [];

  const notes = await hydrateNotes(restConfig, hits);
  if (notes.length === 0) return [];

  // Post-filter with the same field semantics core mode uses so
  // `fields=title` returns the identical set whichever sub-mode ran.
  // Obsidian's server-side search is fuzzy across all fields; this
  // narrows to exact-substring in the requested fields, matching
  // core's grep behaviour.
  const searchFields = resolveSearchFields(named.fields ?? config.searchFields);
  const needle = query.toLowerCase();
  const { keyToTag, tagToKey } = resolveTagAliases(config.tagAliases);
  const aliasedNeedle = findAliasedNeedle(needle, keyToTag);
  const filtered = notes.filter((note) => matches(note, needle, searchFields, aliasedNeedle));

  const links: AlapLink[] = [];
  for (const note of filtered) {
    if (links.length >= MAX_GENERATED_LINKS) break;
    links.push(
      buildLink({
        note,
        vault,
        linkTemplate: config.linkTemplate,
        thumbnailFields: config.thumbnailFields,
        mediaBaseUrl: config.mediaBaseUrl,
        tagToKey,
        // The strict-tier sanitizer always honors http/https/mailto
        // (see STRICT_BASE_SCHEMES in src/core/sanitizeUrl.ts);
        // `allowedSchemes` is a per-link list of EXTRA schemes the
        // protocol wants to widen the strict allowlist with. Default
        // to ['obsidian'] so this protocol's obsidian://open?…
        // URIs survive sanitization without explicit opt-in.
        allowedSchemes: config.allowedSchemes ?? ['obsidian'],
      }),
    );
  }
  return links;
};

/**
 * POST `/search/simple/?query={enc}` and reduce the response to the
 * minimal shape step 4 consumes. Returns `[]` on any failure —
 * `restFetch` already warns on transport errors, and a malformed
 * response shouldn't bubble up as a throw.
 *
 * Exported so tests can exercise URL construction and response parsing
 * in isolation.
 */
export const restSearch = async (
  config: ObsidianRestConfig,
  query: string,
): Promise<RestSearchResult[]> => {
  const path = `${OBSIDIAN_SEARCH_SIMPLE_PATH}?query=${encodeURIComponent(query)}`;
  const resp = await restFetch(config, path, { method: 'POST' });
  if (!resp) return [];

  if (!resp.ok) {
    if (isAuthRejection(resp.status)) {
      warn(`:obsidian:rest: auth rejected (HTTP ${resp.status}) — check apiKey`);
    } else {
      warn(`:obsidian:rest: search returned HTTP ${resp.status}`);
    }
    return [];
  }

  let raw: unknown;
  try {
    raw = await resp.json();
  } catch {
    warn(':obsidian:rest: search response was not valid JSON');
    return [];
  }

  if (!Array.isArray(raw)) {
    warn(':obsidian:rest: search response was not an array');
    return [];
  }

  const results: RestSearchResult[] = [];
  for (const hit of raw) {
    if (!hit || typeof hit !== 'object') continue;
    const filename = (hit as RestSimpleSearchHit).filename;
    if (typeof filename !== 'string' || filename.length === 0) continue;
    results.push({
      relPath: filename,
      basename: deriveBasename(filename),
    });
  }
  return results;
};

/**
 * True for HTTP statuses that indicate the API key was rejected by the
 * plugin (401 missing/invalid auth, 403 authenticated-but-denied). Kept
 * as a predicate so both `restSearch` and `hydrateNote` route to the
 * same operator-facing message.
 */
const isAuthRejection = (status: number): boolean =>
  status === HTTP_STATUS_UNAUTHORIZED || status === HTTP_STATUS_FORBIDDEN;

/** Last-segment filename without the `.md` extension. */
const deriveBasename = (relPath: string): string => {
  const slash = relPath.lastIndexOf('/');
  const name = slash >= 0 ? relPath.slice(slash + 1) : relPath;
  return name.replace(OBSIDIAN_NOTE_EXTENSION_RE, '');
};

/**
 * Reject any `relPath` that could escape the vault or point at an
 * unexpected target. Obsidian's plugin does its own validation, but we
 * guard defensively so a malicious or corrupted search response can't
 * coax us into GET-ing `/etc/passwd` via the REST proxy.
 *
 * Rejects: empty, NUL byte, leading `/` or `\`, Windows drive prefix
 * (`C:\...`), any `..` segment (in either slash direction).
 *
 * Exported for direct testing; `hydrateNote` uses it before each GET.
 */
export const isSafeVaultPath = (relPath: string): boolean => {
  if (typeof relPath !== 'string' || relPath.length === 0) return false;
  if (relPath.includes('\0')) return false;
  if (relPath.startsWith('/') || relPath.startsWith('\\')) return false;
  if (/^[A-Za-z]:[\\/]/.test(relPath)) return false;
  const normalized = relPath.replace(/\\/g, '/');
  for (const seg of normalized.split('/')) {
    if (seg === '..') return false;
  }
  return true;
};

/** Per-segment URL-encode the path so `?`, `#`, etc. don't break the URL,
 *  but preserve the `/` separators the REST plugin expects. */
const encodeVaultPath = (relPath: string): string =>
  relPath.split('/').map(encodeURIComponent).join('/');

/**
 * Fetch a single note via `GET /vault/{relPath}` and parse it into the
 * same `ObsidianNote` shape core mode produces. Returns `null` on any
 * failure — bad path, transport error, non-2xx, read failure — so one
 * bad note never takes down the whole batch.
 *
 * Mirrors `loadNote` in `core.ts` at the shape level: same frontmatter
 * parser, same basename derivation, same body truncation cap. The
 * visible difference is `absPath` (filesystem only) stays `undefined`.
 */
export const hydrateNote = async (
  config: ObsidianRestConfig,
  relPath: string,
): Promise<ObsidianNote | null> => {
  if (!isSafeVaultPath(relPath)) {
    warn(`:obsidian:rest: refusing unsafe vault path — ${redactKey(relPath, config.apiKey)}`);
    return null;
  }

  const path = `${OBSIDIAN_VAULT_PATH}${encodeVaultPath(relPath)}`;
  const resp = await restFetch(config, path);
  if (!resp) return null;

  if (!resp.ok) {
    if (isAuthRejection(resp.status)) {
      warn(`:obsidian:rest: auth rejected (HTTP ${resp.status}) on /vault/ — check apiKey`);
    } else {
      warn(`:obsidian:rest: /vault/ returned HTTP ${resp.status} for ${redactKey(relPath, config.apiKey)}`);
    }
    return null;
  }

  let source: string;
  try {
    source = await resp.text();
  } catch {
    warn(`:obsidian:rest: failed to read body for ${redactKey(relPath, config.apiKey)}`);
    return null;
  }

  const truncated = source.length > OBSIDIAN_MAX_MATCH_BYTES
    ? source.slice(0, OBSIDIAN_MAX_MATCH_BYTES)
    : source;
  const { frontmatter, body } = await parseMarkdown(truncated);

  return {
    relPath,
    basename: deriveBasename(relPath),
    frontmatter,
    body,
    inlineTags: scanInlineTags(body),
  };
};

/**
 * Hydrate a batch of search results into `ObsidianNote[]`, deduping by
 * `relPath` so the same note appearing twice in the hit list only costs
 * one HTTP round-trip. Hydrations run in parallel via `Promise.all` —
 * N+1 risk is real, but bounded by `MAX_GENERATED_LINKS` upstream and
 * by the plugin's own pagination.
 *
 * Exported for testing. `null` results (bad path, 404, etc.) are
 * dropped from the output but don't short-circuit the batch.
 */
export const hydrateNotes = async (
  config: ObsidianRestConfig,
  hits: RestSearchResult[],
): Promise<ObsidianNote[]> => {
  // Map relPath → the single in-flight promise for that path. Preserves
  // hit-order in the output while guaranteeing one fetch per unique path.
  const inflight = new Map<string, Promise<ObsidianNote | null>>();
  const ordered: Array<Promise<ObsidianNote | null>> = [];

  for (const hit of hits) {
    let p = inflight.get(hit.relPath);
    if (!p) {
      p = hydrateNote(config, hit.relPath);
      inflight.set(hit.relPath, p);
    }
    ordered.push(p);
  }

  const resolved = await Promise.all(ordered);
  const emitted = new Set<string>();
  const notes: ObsidianNote[] = [];
  for (const note of resolved) {
    if (!note) continue;
    if (emitted.has(note.relPath)) continue;
    emitted.add(note.relPath);
    notes.push(note);
  }
  return notes;
};
