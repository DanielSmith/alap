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

import type { AlapConfig, AlapLink, GenerateHandler, WebKeyConfig } from '../core/types';
import { MAX_GENERATED_LINKS, MAX_WEB_RESPONSE_BYTES, WEB_FETCH_TIMEOUT_MS } from '../constants';
import { warn } from '../core/logger';

/**
 * Get a nested value from an object using a dot-path string.
 * e.g. getPath({ a: { b: 1 } }, "a.b") => 1
 * Numeric path segments index into arrays: "author_name.0" => author_name[0]
 */
const getPath = (obj: Record<string, unknown>, path: string): unknown => {
  let current: unknown = obj;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(segment, 10);
      current = isNaN(idx) ? undefined : current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

/**
 * Default field mapping — tries common API field names.
 */
const DEFAULT_MAP: WebKeyConfig['map'] = {
  label: 'name',
  url: 'url',
};

const LABEL_CANDIDATES = ['name', 'title', 'full_name', 'label'];
const URL_CANDIDATES = ['url', 'html_url', 'href', 'link', 'wiki'];

/**
 * Map a raw API object to an AlapLink using the key's field mapping.
 * Falls back to common field names if no mapping is provided.
 * If linkBase is set, it's prepended to URL values that don't start with "http".
 */
const mapToLink = (item: Record<string, unknown>, map?: WebKeyConfig['map'], linkBase?: string): AlapLink | null => {
  let label: string | undefined;
  let url: string | undefined;

  if (map?.label) {
    const val = getPath(item, map.label);
    if (typeof val === 'string') label = val;
  } else {
    for (const candidate of LABEL_CANDIDATES) {
      const val = getPath(item, candidate);
      if (typeof val === 'string') { label = val; break; }
    }
  }

  if (map?.url) {
    const val = getPath(item, map.url);
    if (typeof val === 'string') url = val;
  } else {
    for (const candidate of URL_CANDIDATES) {
      const val = getPath(item, candidate);
      if (typeof val === 'string' && val.startsWith('http')) { url = val; break; }
    }
  }

  if (!url) return null;

  // Prepend linkBase to relative URLs
  if (linkBase && !url.startsWith('http')) {
    const base = linkBase.endsWith('/') ? linkBase : linkBase + '/';
    const path = url.startsWith('/') ? url.slice(1) : url;
    url = base + path;
  }

  const link: AlapLink = { url };
  if (label) link.label = label;

  // Map meta fields
  if (map?.meta) {
    const meta: Record<string, unknown> = {};
    for (const [metaKey, sourcePath] of Object.entries(map.meta)) {
      const val = getPath(item, sourcePath);
      if (val !== undefined) meta[metaKey] = val;
    }
    if (Object.keys(meta).length > 0) link.meta = meta;
  }

  return link;
};

/**
 * Parse segments into a key name, positional args, and named args.
 *
 * For :web:books:architecture:limit=5:
 *   segments = ['books', 'architecture', 'limit=5']
 *   => key='books', positional=['architecture'], named={ limit: '5' }
 */
const parseSegments = (segments: string[]): {
  key: string;
  positional: string[];
  named: Record<string, string>;
} => {
  const key = segments[0];
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

  return { key, positional, named };
};

/**
 * Build a fetch URL from a key config, positional args, and named args.
 *
 * If the key has a `searches` map and the first positional arg matches a search alias,
 * the search params are used as the base and named args override them.
 * Otherwise, named args become query parameters directly.
 */
const buildUrl = (
  keyConfig: WebKeyConfig,
  positional: string[],
  named: Record<string, string>,
): string => {
  const url = new URL(keyConfig.url);
  const searchAlias = positional[0];

  // Check if the positional arg is a predefined search alias
  if (searchAlias && keyConfig.searches?.[searchAlias]) {
    const searchParams = keyConfig.searches[searchAlias];
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, String(v));
    }
  }

  // Named args override or add query params
  for (const [k, v] of Object.entries(named)) {
    url.searchParams.set(k, v);
  }

  return url.toString();
};

/**
 * The :web: generate handler.
 *
 * Reads key config from the protocol's `keys` map, builds a URL from the segments,
 * fetches JSON, and maps each result to an AlapLink.
 *
 * The config is purely declarative — this handler does all the logic.
 */
export const webHandler: GenerateHandler = async (segments, config) => {
  const { key, positional, named } = parseSegments(segments);

  // Look up the key config from the protocol registration
  const protocol = config.protocols?.web;
  if (!protocol?.keys) {
    warn(':web: protocol has no keys configured');
    return [];
  }

  const keyConfig = protocol.keys[key] as WebKeyConfig | undefined;
  if (!keyConfig) {
    warn(`:web: key "${key}" not found in protocol keys`);
    return [];
  }

  let fetchUrl: string;
  try {
    fetchUrl = buildUrl(keyConfig, positional, named);
  } catch {
    warn(`:web: failed to build URL for key "${key}"`);
    return [];
  }

  // Validate origin against allowlist (if configured)
  const allowedOrigins = protocol.allowedOrigins as string[] | undefined;
  if (allowedOrigins && allowedOrigins.length > 0) {
    const origin = new URL(fetchUrl).origin;
    if (!allowedOrigins.includes(origin)) {
      warn(`:web: origin "${origin}" not in allowedOrigins for key "${key}"`);
      return [];
    }
  }

  let data: unknown;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS);
    const creds = keyConfig.credentials ? 'include' : 'omit';
    const response = await fetch(fetchUrl, { signal: controller.signal, credentials: creds });
    clearTimeout(timeoutId);
    if (!response.ok) {
      warn(`:web: fetch failed for "${key}": ${response.status} ${response.statusText}`);
      return [];
    }
    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      warn(`:web: unexpected content-type for "${key}": ${contentType} (expected application/json)`);
      return [];
    }
    const contentLength = response.headers?.get?.('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_WEB_RESPONSE_BYTES) {
      warn(`:web: response too large for "${key}": ${contentLength} bytes (max ${MAX_WEB_RESPONSE_BYTES})`);
      return [];
    }
    data = await response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const label = err instanceof DOMException && err.name === 'AbortError'
      ? `timeout after ${WEB_FETCH_TIMEOUT_MS}ms`
      : msg;
    warn(`:web: network error for key "${key}": ${label}`);
    return [];
  }

  // Drill into the response — support both top-level arrays and nested arrays
  const items: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' && !Array.isArray(data))
      ? findArray(data as Record<string, unknown>)
      : [];

  const links: AlapLink[] = [];
  const limit = Math.min(items.length, MAX_GENERATED_LINKS);

  for (let i = 0; i < limit; i++) {
    const link = mapToLink(items[i], keyConfig.map, keyConfig.linkBase);
    if (link) {
      link.cssClass = link.cssClass ? `${link.cssClass} source_web` : 'source_web';
      if (!link.meta) link.meta = {};
      link.meta.source = 'web';
      links.push(link);
    }
  }

  return links;
};

/**
 * Find the first array value in a response object.
 * Handles common patterns like { items: [...] }, { docs: [...] }, { results: [...] }.
 */
const findArray = (obj: Record<string, unknown>): Record<string, unknown>[] => {
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) return val as Record<string, unknown>[];
  }
  return [];
};
