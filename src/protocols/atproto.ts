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

import type { AlapConfig, AlapLink, GenerateHandler } from '../core/types';
import { MAX_GENERATED_LINKS, MAX_WEB_RESPONSE_BYTES, WEB_FETCH_TIMEOUT_MS } from '../constants';
import { warn } from '../core/logger';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';
const BSKY_PDS_API = 'https://bsky.social/xrpc';
const BSKY_WEB = 'https://bsky.app';
const PDSLS_WEB = 'https://pdsls.dev/at';
const DEFAULT_LIMIT = 10;
const LABEL_MAX_LENGTH = 80;

// ═══════════════════════════════════════════════════════════════
// AT URI Parser
// ═══════════════════════════════════════════════════════════════

/**
 * Parsed AT URI components.
 */
export interface AtUri {
  /** DID or handle */
  authority: string;
  /** Lexicon collection, e.g. "app.bsky.feed.post" */
  collection?: string;
  /** Record key */
  rkey?: string;
}

/**
 * Parse an AT URI into its components.
 *
 * Accepts:
 *   at://did:plc:abc123/app.bsky.feed.post/3xyz
 *   at://handle.example/app.bsky.actor.profile/self
 *   at://handle.example
 */
export const parseAtUri = (uri: string): AtUri | null => {
  if (!uri.startsWith('at://')) return null;
  const path = uri.slice(5); // strip "at://"
  if (!path) return null;

  const parts = path.split('/');
  const authority = parts[0];
  if (!authority) return null;

  return {
    authority,
    collection: parts[1] || undefined,
    rkey: parts[2] || undefined,
  };
};

/**
 * Generate destination links for known clients based on AT URI type.
 *
 * Returns AlapLink entries for:
 *   - bsky.app (web client)
 *   - pdsls.dev (AT Proto record inspector)
 *   - Raw JSON API
 */
export const atUriToDestinations = (parsed: AtUri): AlapLink[] => {
  const { authority, collection, rkey } = parsed;
  const links: AlapLink[] = [];

  if (collection === 'app.bsky.feed.post' && rkey) {
    // Post — needs handle for bsky.app URL
    links.push({
      label: 'View on Bluesky',
      url: `${BSKY_WEB}/profile/${authority}/post/${rkey}`,
      tags: ['atproto', 'client'],
    });
    links.push({
      label: 'Inspect on pdsls.dev',
      url: `${PDSLS_WEB}/${authority}/${collection}/${rkey}`,
      tags: ['atproto', 'devtool'],
    });
    links.push({
      label: 'Raw JSON (API)',
      url: `${BSKY_PUBLIC_API}/app.bsky.feed.getPostThread?uri=at://${authority}/${collection}/${rkey}&depth=0`,
      tags: ['atproto', 'raw'],
    });
  } else if (!collection || collection === 'app.bsky.actor.profile') {
    // Profile
    links.push({
      label: 'View on Bluesky',
      url: `${BSKY_WEB}/profile/${authority}`,
      tags: ['atproto', 'client'],
    });
    links.push({
      label: 'Inspect on pdsls.dev',
      url: `${PDSLS_WEB}/${authority}`,
      tags: ['atproto', 'devtool'],
    });
    links.push({
      label: 'Raw JSON (API)',
      url: `${BSKY_PUBLIC_API}/app.bsky.actor.getProfile?actor=${authority}`,
      tags: ['atproto', 'raw'],
    });
  } else {
    // Generic collection — dev tools only
    const path = rkey
      ? `${authority}/${collection}/${rkey}`
      : `${authority}/${collection}`;
    links.push({
      label: 'Inspect on pdsls.dev',
      url: `${PDSLS_WEB}/${path}`,
      tags: ['atproto', 'devtool'],
    });
    links.push({
      label: 'Raw JSON (API)',
      url: `${BSKY_PUBLIC_API}/com.atproto.repo.getRecord?repo=${authority}&collection=${collection}${rkey ? `&rkey=${rkey}` : ''}`,
      tags: ['atproto', 'raw'],
    });
  }

  return links;
};

// ═══════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Parse handler segments into command, positional args, and named args.
 *
 * For :atproto:feed:eff.org:limit=5:
 *   segments = ['feed', 'eff.org', 'limit=5']
 *   => command='feed', positional=['eff.org'], named={ limit: '5' }
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
 * Resolve a positional arg through the protocol's searches map.
 *
 * Multi-word queries can't appear directly in expressions (the tokenizer
 * splits on whitespace). Instead, define named aliases in the config:
 *
 *   protocols: {
 *     atproto: {
 *       generate: atprotoHandler,
 *       searches: {
 *         open_source: 'open source',
 *         creative_commons: 'creative commons',
 *       }
 *     }
 *   }
 *
 * Then use the alias in expressions: :atproto:people:open_source:
 * Single-word queries work directly: :atproto:people:atproto:
 */
const resolveSearchAlias = (
  value: string,
  config: AlapConfig,
): string => {
  const searches = config.protocols?.atproto?.searches as
    Record<string, string> | undefined;
  if (searches && value in searches) {
    return searches[value];
  }
  return value;
};

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1) + '\u2026';

/**
 * Fetch JSON from the Bluesky API with safety limits.
 *
 * Unauthenticated requests go to the public API (public.api.bsky.app).
 * Authenticated requests go through the PDS (bsky.social) which proxies
 * to the AppView — this avoids CORS preflight issues that the public API
 * rejects when an Authorization header is present.
 */
const fetchApi = async (
  endpoint: string,
  params: Record<string, string>,
  accessJwt?: string,
): Promise<unknown> => {
  const base = accessJwt ? BSKY_PDS_API : BSKY_PUBLIC_API;
  const url = new URL(`${base}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS);

  const headers: Record<string, string> = {};
  if (accessJwt) {
    headers['Authorization'] = `Bearer ${accessJwt}`;
  }

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      credentials: 'omit',
      headers,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      warn(`:atproto: API error: ${response.status} ${response.statusText} for ${endpoint}`);
      return null;
    }

    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      warn(`:atproto: unexpected content-type: ${contentType}`);
      return null;
    }

    const contentLength = response.headers?.get?.('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_WEB_RESPONSE_BYTES) {
      warn(`:atproto: response too large: ${contentLength} bytes`);
      return null;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    const label = err instanceof DOMException && err.name === 'AbortError'
      ? `timeout after ${WEB_FETCH_TIMEOUT_MS}ms`
      : msg;
    warn(`:atproto: network error: ${label}`);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// Response mappers
// ═══════════════════════════════════════════════════════════════

interface BskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

interface BskyPost {
  uri: string;
  author: BskyAuthor;
  record: { text?: string; createdAt?: string };
  indexedAt?: string;
}

/**
 * Map a Bluesky post to an AlapLink.
 */
const mapPost = (post: BskyPost): AlapLink | null => {
  const parsed = parseAtUri(post.uri);
  if (!parsed || !parsed.rkey) return null;

  const author = post.author;
  const text = post.record?.text ?? '';
  const displayName = author.displayName || author.handle;
  const label = truncate(`${displayName}: ${text}`, LABEL_MAX_LENGTH);

  return {
    label,
    url: `${BSKY_WEB}/profile/${author.handle}/post/${parsed.rkey}`,
    description: text,
    thumbnail: author.avatar,
    tags: ['atproto', 'post'],
    createdAt: post.indexedAt || post.record?.createdAt,
    meta: {
      handle: author.handle,
      did: author.did,
      atUri: post.uri,
    },
  };
};

/**
 * Map a Bluesky profile/actor to an AlapLink.
 */
const mapProfile = (actor: BskyAuthor): AlapLink => ({
  label: actor.displayName || actor.handle,
  url: `${BSKY_WEB}/profile/${actor.handle}`,
  description: actor.description,
  thumbnail: actor.avatar,
  tags: ['atproto', 'profile'],
  meta: {
    handle: actor.handle,
    did: actor.did,
    followers: actor.followersCount,
    following: actor.followsCount,
    posts: actor.postsCount,
  },
});

// ═══════════════════════════════════════════════════════════════
// Command handlers
// ═══════════════════════════════════════════════════════════════

const handleProfile = async (
  positional: string[],
  _named: Record<string, string>,
  _accessJwt?: string,
): Promise<AlapLink[]> => {
  const actor = positional[0];
  if (!actor) {
    warn(':atproto: profile command requires an actor (handle or DID)');
    return [];
  }

  const data = await fetchApi('app.bsky.actor.getProfile', { actor });
  if (!data) return [];

  const profile = data as BskyAuthor;
  const displayName = profile.displayName || profile.handle;
  const meta = {
    handle: profile.handle,
    did: profile.did,
    followers: profile.followersCount,
    following: profile.followsCount,
    posts: profile.postsCount,
  };

  // Option of Choice: multiple destinations for the same profile
  const links: AlapLink[] = [
    {
      label: `${displayName} — Bluesky`,
      url: `${BSKY_WEB}/profile/${profile.handle}`,
      description: profile.description,
      thumbnail: profile.avatar,
      tags: ['atproto', 'profile', 'client'],
      meta,
    },
    {
      label: `${displayName} — pdsls.dev inspector`,
      url: `${PDSLS_WEB}/${profile.did}`,
      tags: ['atproto', 'profile', 'devtool'],
      meta,
    },
    {
      label: `${displayName} — raw JSON`,
      url: `${BSKY_PUBLIC_API}/app.bsky.actor.getProfile?actor=${profile.handle}`,
      tags: ['atproto', 'profile', 'raw'],
      meta,
    },
  ];

  return links;
};

const handleFeed = async (
  positional: string[],
  named: Record<string, string>,
  _accessJwt?: string,
): Promise<AlapLink[]> => {
  const actor = positional[0];
  if (!actor) {
    warn(':atproto: feed command requires an actor (handle or DID)');
    return [];
  }

  const limit = named.limit || String(DEFAULT_LIMIT);
  const data = await fetchApi('app.bsky.feed.getAuthorFeed', { actor, limit });
  if (!data) return [];

  const feed = (data as { feed?: { post: BskyPost }[] }).feed ?? [];
  const links: AlapLink[] = [];
  const cap = Math.min(feed.length, MAX_GENERATED_LINKS);

  for (let i = 0; i < cap; i++) {
    const link = mapPost(feed[i].post);
    if (link) links.push(link);
  }

  return links;
};

const handlePeople = async (
  positional: string[],
  named: Record<string, string>,
  _accessJwt?: string,
  config?: AlapConfig,
): Promise<AlapLink[]> => {
  const raw = positional[0];
  if (!raw) {
    warn(':atproto: people command requires a search query');
    return [];
  }

  const query = config ? resolveSearchAlias(raw, config) : raw;
  const limit = named.limit || String(DEFAULT_LIMIT);
  const data = await fetchApi('app.bsky.actor.searchActors', { q: query, limit });
  if (!data) return [];

  const actors = (data as { actors?: BskyAuthor[] }).actors ?? [];
  const cap = Math.min(actors.length, MAX_GENERATED_LINKS);
  const links: AlapLink[] = [];

  for (let i = 0; i < cap; i++) {
    links.push(mapProfile(actors[i]));
  }

  return links;
};

const handleThread = async (
  positional: string[],
  _named: Record<string, string>,
  _accessJwt?: string,
): Promise<AlapLink[]> => {
  const uri = positional[0];
  if (!uri || !uri.startsWith('at://')) {
    warn(':atproto: thread command requires a valid AT URI');
    return [];
  }

  const data = await fetchApi('app.bsky.feed.getPostThread', { uri, depth: '0' });
  if (!data) return [];

  const thread = data as { thread?: { post?: BskyPost } };
  const post = thread.thread?.post;
  if (!post) return [];

  const link = mapPost(post);
  return link ? [link] : [];
};

const handleSearch = async (
  positional: string[],
  named: Record<string, string>,
  accessJwt?: string,
  config?: AlapConfig,
): Promise<AlapLink[]> => {
  if (!accessJwt) {
    warn(':atproto: search requires authentication (searchPosts is not public). Pass an accessJwt via protocol config.');
    return [];
  }

  const raw = positional[0];
  if (!raw) {
    warn(':atproto: search command requires a query');
    return [];
  }

  const query = config ? resolveSearchAlias(raw, config) : raw;
  const limit = named.limit || String(DEFAULT_LIMIT);
  const data = await fetchApi('app.bsky.feed.searchPosts', { q: query, limit }, accessJwt);
  if (!data) return [];

  const posts = (data as { posts?: BskyPost[] }).posts ?? [];
  const cap = Math.min(posts.length, MAX_GENERATED_LINKS);
  const links: AlapLink[] = [];

  for (let i = 0; i < cap; i++) {
    const link = mapPost(posts[i]);
    if (link) links.push(link);
  }

  return links;
};

// ═══════════════════════════════════════════════════════════════
// Generate handler
// ═══════════════════════════════════════════════════════════════

const COMMANDS: Record<string, (
  positional: string[],
  named: Record<string, string>,
  accessJwt?: string,
  config?: AlapConfig,
) => Promise<AlapLink[]>> = {
  profile: handleProfile,
  feed: handleFeed,
  people: handlePeople,
  thread: handleThread,
  search: handleSearch,
};

/**
 * The :atproto: generate handler.
 *
 * Segment routing:
 *   :atproto:profile:pfrazee.com:       → getProfile
 *   :atproto:feed:eff.org:limit=5:      → getAuthorFeed
 *   :atproto:people:open source:limit=5: → searchActors
 *   :atproto:thread:at://...:           → getPostThread
 *   :atproto:search:cats:               → searchPosts (auth required)
 *
 * Config:
 *   protocols: {
 *     atproto: {
 *       generate: atprotoHandler,
 *       cache: 5,
 *       accessJwt: null,  // set at runtime after login
 *     },
 *   }
 */
export const atprotoHandler: GenerateHandler = async (segments, config) => {
  const { command, positional, named } = parseSegments(segments);

  const handler = COMMANDS[command];
  if (!handler) {
    warn(`:atproto: unknown command "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`);
    return [];
  }

  const protocol = config.protocols?.atproto;
  const accessJwt = protocol?.accessJwt as string | undefined;

  const links = await handler(positional, named, accessJwt, config);

  for (const link of links) {
    link.cssClass = link.cssClass ? `${link.cssClass} source_atproto` : 'source_atproto';
    if (!link.meta) link.meta = {};
    link.meta.source = 'atproto';
  }

  return links;
};
