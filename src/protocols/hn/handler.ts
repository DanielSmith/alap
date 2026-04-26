/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * :hn: — Hacker News generate protocol.
 *
 * Zero-auth, CORS-friendly, universal (runs in browser or Node).
 * Two backends:
 *   - Firebase (hacker-news.firebaseio.com) — listings + items + users
 *   - Algolia  (hn.algolia.com/api/v1)      — full-text search
 *
 * Sub-modes:
 *   :hn:top:                              top stories
 *   :hn:new: *limit:20*                   newest
 *   :hn:best:                             best
 *   :hn:ask: / :hn:show: / :hn:job:       Ask HN / Show HN / jobs
 *   :hn:user:pg:                          user's submissions
 *   :hn:search:$ai_papers:                Algolia search via named preset
 *   :hn:item:8863:                        single item
 *
 * Defense floor (shared with other generate protocols via {@link fetchJson}):
 *   - SSRF guard — pre-fetch {@link assertSafeUrl} rejects loopback, RFC
 *     1918, link-local (including 169.254.169.254 cloud metadata), CGN,
 *     multicast, reserved; IPv4 and IPv6 including IPv4-mapped.
 *   - Per-request timeout — {@link WEB_FETCH_TIMEOUT_MS} (10 s default)
 *     via {@link AbortController}. No hung requests.
 *   - Response size cap — {@link MAX_WEB_RESPONSE_BYTES} (1 MiB) via
 *     `content-length` header.
 *   - Content-type check — non-JSON responses refused.
 *   - `credentials: 'omit'` — no cookies or HTTP auth ever leave the caller.
 *
 * Protocol-specific caps:
 *   - {@link MAX_GENERATED_LINKS} (200) — ceiling on any handler's output.
 *   - {@link HN_ITEMS_MAX} (6) — cap on `:hn:items:id1,id2,...:` fan-out,
 *     since Firebase has no batch item endpoint.
 *
 * All warnings go through {@link warn} with a `:hn:` prefix and are written
 * for the operator (config author), never the end-user page. They tell the
 * operator *what* went wrong and *how* to fix it.
 */

import type { AlapConfig, AlapLink, GenerateHandler } from '../../core/types';
import { MAX_GENERATED_LINKS } from '../../constants';
import { warn } from '../../core/logger';
import { fetchJson } from './fetch';
import { mapAlgoliaHit, mapItem } from './mapping';
import type { HnItem, HnUser, AlgoliaHit } from './types';

const FIREBASE_BASE = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';
const DEFAULT_LIMIT = 20;

/**
 * Cap on the number of explicit ids in `:hn:items:id1,id2,...:`.
 *
 * HN's Firebase API has no batch item endpoint — each id is a separate
 * HTTP round-trip. A menu with 50 explicit ids is 50 parallel fetches
 * per render, every render. This cap keeps per-request fan-out bounded
 * so we're never abusive to hacker-news.firebaseio.com regardless of
 * what a config author writes.
 *
 * 6 is a usability cap as much as a rate-limit one — an explicit-items
 * menu with more than a handful of entries is unwieldy UX anyway.
 */
const HN_ITEMS_MAX = 6;

/**
 * Parse handler segments into command, positional args, and named args.
 *
 * For :hn:user:pg:limit=5:
 *   segments = ['user', 'pg', 'limit=5']
 *   => command='user', positional=['pg'], named={ limit: '5' }
 */
const parseSegments = (segments: string[]): {
  command: string;
  positional: string[];
  named: Record<string, string>;
} => {
  const command = segments[0];
  const positional: string[] = [];
  const named: Record<string, string> = {};

  for (const seg of segments.slice(1)) {
    if (seg.includes('=')) {
      const eqIdx = seg.indexOf('=');
      named[seg.slice(0, eqIdx)] = seg.slice(eqIdx + 1);
    } else {
      positional.push(seg);
    }
  }

  return { command, positional, named };
};

/**
 * Resolve the per-protocol default limit. Precedence:
 *   named arg (limit=N) > config.defaults.limit > DEFAULT_LIMIT.
 * Always bounded by MAX_GENERATED_LINKS at the fan-out layer.
 */
const resolveLimit = (named: Record<string, string>, config: AlapConfig): number => {
  const fromNamed = named.limit ? parseInt(named.limit, 10) : NaN;
  if (Number.isFinite(fromNamed) && fromNamed > 0) return fromNamed;

  const defaults = config.protocols?.hn?.defaults as { limit?: number } | undefined;
  if (defaults?.limit && defaults.limit > 0) return defaults.limit;

  return DEFAULT_LIMIT;
};

/**
 * Resolve a search alias through the protocol's `searches` map. Accepts
 * both `$name` (explicit lookup sigil) and bare `name` per the protocol
 * argument convention — the parser doesn't mind either form; handlers
 * strip the optional `$` and do the lookup the same way.
 *
 * If the key isn't in the map, return the raw value as a literal search
 * term so single-word queries like `:hn:search:rust:` still work.
 */
const resolveSearchAlias = (raw: string, config: AlapConfig): string => {
  const key = raw.startsWith('$') ? raw.slice(1) : raw;
  const searches = config.protocols?.hn?.searches as Record<string, string> | undefined;
  if (searches && key in searches) return searches[key];
  return key;
};

/**
 * Fetch a batch of items by ID, in parallel, and map into AlapLinks.
 * Caps fan-out at min(limit, MAX_GENERATED_LINKS) so a hostile or
 * oversized list can't flood the menu.
 */
const fetchItems = async (ids: number[], limit: number): Promise<AlapLink[]> => {
  // Firebase is typed as number[] but at runtime could return garbage.
  // Filter to real numbers so we never fire a fetch for a non-numeric id.
  const numeric = ids.filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  const cap = Math.min(limit, MAX_GENERATED_LINKS);
  const capped = numeric.slice(0, cap);
  const items = await Promise.all(
    capped.map((id) => fetchJson(`${FIREBASE_BASE}/item/${id}.json`) as Promise<HnItem | null>),
  );
  const links: AlapLink[] = [];
  for (const item of items) {
    const link = mapItem(item);
    if (link) links.push(link);
  }
  return links;
};

// ═══════════════════════════════════════════════════════════════
// Sub-mode handlers
// ═══════════════════════════════════════════════════════════════

const LISTING_ENDPOINTS: Record<string, string> = {
  top: 'topstories',
  new: 'newstories',
  best: 'beststories',
  ask: 'askstories',
  show: 'showstories',
  job: 'jobstories',
};

const handleListing = async (
  command: string,
  limit: number,
): Promise<AlapLink[]> => {
  const endpoint = LISTING_ENDPOINTS[command];
  if (!endpoint) return [];

  const ids = await fetchJson(`${FIREBASE_BASE}/${endpoint}.json`) as number[] | null;
  if (!Array.isArray(ids)) return [];

  return fetchItems(ids, limit);
};

const handleUser = async (
  positional: string[],
  limit: number,
): Promise<AlapLink[]> => {
  const username = positional[0];
  if (!username) {
    warn(':hn: user command requires a username — :hn:user:pg:');
    return [];
  }

  const user = await fetchJson(
    `${FIREBASE_BASE}/user/${encodeURIComponent(username)}.json`,
  ) as HnUser | null;
  if (!user || !Array.isArray(user.submitted)) return [];

  return fetchItems(user.submitted, limit);
};

const handleSearch = async (
  positional: string[],
  limit: number,
  config: AlapConfig,
): Promise<AlapLink[]> => {
  const raw = positional[0];
  if (!raw) {
    warn(':hn: search requires a query preset — :hn:search:$ai_papers:');
    return [];
  }

  const query = resolveSearchAlias(raw, config);
  const hitsPerPage = Math.min(limit, MAX_GENERATED_LINKS);

  const url = new URL(`${ALGOLIA_BASE}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('hitsPerPage', String(hitsPerPage));
  // Restrict to stories — comments have no title and get filtered out
  // downstream anyway. Doing this server-side keeps the hit count
  // meaningful (so `limit=5` yields 5 usable results, not 5 that might
  // all be comments).
  url.searchParams.set('tags', 'story');

  const data = await fetchJson(url.toString()) as { hits?: AlgoliaHit[] } | null;
  if (!data || !Array.isArray(data.hits)) return [];

  const links: AlapLink[] = [];
  for (const hit of data.hits) {
    const link = mapAlgoliaHit(hit);
    if (link) links.push(link);
  }
  return links;
};

/**
 * Fetch zero or more specific items by id. Each id is its own positional
 * segment:
 *
 *   :hn:items:              → no ids, no-op ([])
 *   :hn:items:8863:         → one item
 *   :hn:items:8863:8845:828: → three items
 *
 * Non-numeric positionals are silently dropped. Named args (e.g.
 * `limit=5`) are ignored — the id list itself defines the count.
 *
 * Capped at {@link HN_ITEMS_MAX} because each id is a separate HTTP
 * round-trip to HN (no batch endpoint). Excess ids are dropped
 * with a visible warning so the config author knows what happened.
 */
const handleItems = async (positional: string[]): Promise<AlapLink[]> => {
  if (positional.length === 0) return []; // :hn:items: — explicit no-op

  const ids = positional
    .filter((s) => /^\d+$/.test(s))
    .map((s) => parseInt(s, 10));

  if (ids.length === 0) {
    warn(
      `:hn:items: requires numeric ids as positional args — :hn:items:8863:8845: — got non-numeric [${positional.join(', ')}]`,
    );
    return [];
  }

  if (ids.length > HN_ITEMS_MAX) {
    warn(
      `:hn:items: received ${ids.length} ids; capping at ${HN_ITEMS_MAX} to avoid rate-limit pressure. ` +
      `HN's API has no batch endpoint — each id is a separate fetch. ` +
      `Keep explicit-items lists small.`,
    );
  }
  const capped = ids.slice(0, HN_ITEMS_MAX);

  return fetchItems(capped, capped.length);
};

// ═══════════════════════════════════════════════════════════════
// Generate handler
// ═══════════════════════════════════════════════════════════════

/**
 * The :hn: generate handler. Dispatches on the sub-mode verb, stamps
 * source indicators on every returned link, and caps the output.
 */
export const hnHandler: GenerateHandler = async (segments, config) => {
  const { command, positional, named } = parseSegments(segments);
  const limit = resolveLimit(named, config);

  let links: AlapLink[] = [];

  if (command in LISTING_ENDPOINTS) {
    links = await handleListing(command, limit);
  } else if (command === 'user') {
    links = await handleUser(positional, limit);
  } else if (command === 'search') {
    links = await handleSearch(positional, limit, config);
  } else if (command === 'items') {
    links = await handleItems(positional);
  } else {
    warn(
      `:hn: unknown command "${command}". Available: top, new, best, ask, show, job, user, search, items`,
    );
    return [];
  }

  // Source indicator — appended, not replaced, so any existing cssClass survives.
  for (const link of links) {
    link.cssClass = link.cssClass ? `${link.cssClass} source_hn` : 'source_hn';
    if (!link.meta) link.meta = {};
    link.meta.source = 'hn';
  }

  return links.slice(0, MAX_GENERATED_LINKS);
};
