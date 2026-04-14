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

import type { AlapConfig, AlapLink, GenerateHandler } from '../../core/types';
import type { JsonSourceConfig } from './types';
import { MAX_GENERATED_LINKS, MAX_WEB_RESPONSE_BYTES, WEB_FETCH_TIMEOUT_MS } from '../../constants';
import { warn } from '../../core/logger';
import { sanitizeUrlWithSchemes } from '../../core/sanitizeUrl';
import { getPath, stripHtml } from '../shared';
import { getFieldValue } from './getFieldValue';
import { isTemplate, interpolateTemplate } from './interpolateTemplate';

/**
 * Parse segments into a source name, positional args, and named args.
 *
 * For :json:bookmarks:frontend:limit=5:
 *   segments = ['bookmarks', 'frontend', 'limit=5']
 *   => source='bookmarks', positional=['frontend'], named={ limit: '5' }
 */
const parseSegments = (segments: string[]): {
  source: string;
  positional: string[];
  named: Record<string, string>;
} => {
  const source = segments[0];
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

  return { source, positional, named };
};

/**
 * Resolve a positional arg: if it starts with @, look it up in protocol vars;
 * otherwise decode %20-style encoding back to spaces.
 */
const resolvePositionalArg = (
  arg: string,
  vars?: Record<string, string>,
): string => {
  if (arg.startsWith('$')) {
    const key = arg.slice(1);
    const value = vars?.[key];
    if (value === undefined) {
      warn(`:json: var "$${key}" not found in protocol vars`);
      return arg;
    }
    return value;
  }
  return decodeURIComponent(arg);
};

/**
 * Build a fetch URL from a source config and positional args.
 * Positional args fill ${1}, ${2}, etc. in the URL template.
 * Args are resolved via @var lookup or %20 decoding first.
 */
const buildUrl = (
  sourceConfig: JsonSourceConfig,
  positional: string[],
  vars?: Record<string, string>,
): string => {
  let url = sourceConfig.url;
  for (let i = 0; i < positional.length; i++) {
    const resolved = resolvePositionalArg(positional[i], vars);
    url = url.replace(`\${${i + 1}}`, encodeURIComponent(resolved));
  }
  return url;
};

/**
 * Extract envelope metadata from the full response object.
 * Each key in envelopeMap is the target meta key, value is the dot-path in the response.
 */
const extractEnvelope = (
  data: Record<string, unknown>,
  envelopeMap: Record<string, string>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [metaKey, sourcePath] of Object.entries(envelopeMap)) {
    const val = getPath(data, sourcePath);
    if (val !== undefined && val !== null) {
      result[metaKey] = val;
    }
  }
  return result;
};

/**
 * Navigate to the data array in a response.
 *
 * - root specified + array at path → use it
 * - root specified + object at path → wrap as singleton [obj]
 * - root omitted + response is bare array → use directly
 * - root omitted + response is object → warn, return null (no guessing)
 */
const extractItems = (data: unknown, root?: string): Record<string, unknown>[] | null => {
  if (root) {
    const target = getPath(data as Record<string, unknown>, root);
    if (Array.isArray(target)) return target as Record<string, unknown>[];
    if (target && typeof target === 'object' && !Array.isArray(target)) {
      return [target as Record<string, unknown>];
    }
    warn(`:json: root "${root}" did not resolve to an array or object`);
    return null;
  }

  if (Array.isArray(data)) return data as Record<string, unknown>[];

  if (data && typeof data === 'object') {
    warn(':json: response is an object but no root path configured');
    return null;
  }

  return null;
};

/**
 * Normalize tags from various API formats:
 * - Comma-separated string → split and trim
 * - Array of strings → use directly
 * - Array of objects with [].field path → extract field from each
 */
/** Trim and replace spaces with underscores — tags can't contain spaces in the expression grammar. */
const sanitizeTag = (tag: string): string =>
  tag.trim().replace(/\s+/g, '_');

const normalizeTags = (raw: unknown, tagPath: string): string[] | undefined => {
  if (raw === undefined || raw === null) return undefined;

  let tags: string[] | undefined;

  if (typeof raw === 'string') {
    tags = raw.split(',').map(t => t.trim()).filter(Boolean);
  } else if (Array.isArray(raw)) {
    if (raw.length === 0) return undefined;

    if (raw.every(v => typeof v === 'string')) {
      tags = raw as string[];
    } else {
      // Array of objects — check for [].field extraction in the path
      const extractMatch = tagPath.match(/\[\]\.(\w+)$/);
      if (extractMatch) {
        const field = extractMatch[1];
        tags = raw
          .filter((v): v is Record<string, unknown> => v !== null && typeof v === 'object')
          .map(obj => obj[field])
          .filter((v): v is string => typeof v === 'string');
      }
    }
  }

  if (!tags || tags.length === 0) return undefined;
  return tags.map(sanitizeTag).filter(Boolean);
};

/**
 * Resolve a fieldMap value to a string, trying template interpolation first,
 * then falling back to dot-path field access.
 */
const resolveField = (
  mapping: string,
  item: Record<string, unknown>,
  envelope?: Record<string, unknown>,
): unknown => {
  if (isTemplate(mapping)) {
    return interpolateTemplate(mapping, item, envelope);
  }
  return getFieldValue(item, mapping);
};

/**
 * Map a single raw item to an AlapLink.
 */
const mapItem = (
  item: Record<string, unknown>,
  sourceConfig: JsonSourceConfig,
  envelopeData?: Record<string, unknown>,
): AlapLink | null => {
  const { fieldMap, linkBase, allowedSchemes } = sourceConfig;

  // Resolve label
  let label: string | undefined;
  if (fieldMap.label) {
    const raw = resolveField(fieldMap.label, item, envelopeData);
    if (typeof raw === 'string') label = stripHtml(raw);
  }

  // Resolve URL
  let url: string | undefined;
  if (fieldMap.url) {
    const raw = resolveField(fieldMap.url, item, envelopeData);
    if (typeof raw === 'string') url = raw;
    else if (typeof raw === 'number') url = String(raw);
  }

  // Must have a URL — AlapLink requires it
  if (!url) return null;

  // Apply linkBase to relative URLs
  if (linkBase && !url.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:/)) {
    const base = linkBase.endsWith('/') ? linkBase : linkBase + '/';
    const path = url.startsWith('/') ? url.slice(1) : url;
    url = base + path;
  }

  // Sanitize URL with allowed schemes
  url = sanitizeUrlWithSchemes(url, allowedSchemes);
  if (url === 'about:blank') return null;

  const link: AlapLink = { url };
  if (label) link.label = label;

  // Tags
  if (fieldMap.tags) {
    const raw = getFieldValue(item, fieldMap.tags);
    const tags = normalizeTags(raw, fieldMap.tags);
    if (tags) link.tags = tags;
  }

  // Description
  if (fieldMap.description) {
    const raw = resolveField(fieldMap.description, item, envelopeData);
    if (typeof raw === 'string') link.description = stripHtml(raw);
  }

  // Thumbnail
  if (fieldMap.thumbnail) {
    const raw = resolveField(fieldMap.thumbnail, item, envelopeData);
    if (typeof raw === 'string') {
      const sanitized = sanitizeUrlWithSchemes(raw, allowedSchemes);
      if (sanitized !== 'about:blank') link.thumbnail = sanitized;
    }
  }

  // Image
  if (fieldMap.image) {
    const raw = resolveField(fieldMap.image, item, envelopeData);
    if (typeof raw === 'string') {
      const sanitized = sanitizeUrlWithSchemes(raw, allowedSchemes);
      if (sanitized !== 'about:blank') link.image = sanitized;
    }
  }

  // Meta fields
  if (fieldMap.meta) {
    const meta: Record<string, unknown> = {};
    for (const [metaKey, sourcePath] of Object.entries(fieldMap.meta)) {
      const val = resolveField(sourcePath, item, envelopeData);
      if (val !== undefined && val !== null) meta[metaKey] = val;
    }
    if (Object.keys(meta).length > 0) link.meta = meta;
  }

  // Attach envelope data to meta
  if (envelopeData && Object.keys(envelopeData).length > 0) {
    if (!link.meta) link.meta = {};
    for (const [k, v] of Object.entries(envelopeData)) {
      link.meta[k] = v;
    }
  }

  return link;
};

/**
 * The :json: generate handler.
 *
 * Reads source config from the protocol's `sources` map, fetches JSON,
 * extracts items via the declared root path, and maps each item to an
 * AlapLink through explicit field mapping.
 */
export const jsonHandler: GenerateHandler = async (segments, config) => {
  const { source, positional } = parseSegments(segments);

  const protocol = config.protocols?.json;
  if (!protocol) {
    warn(':json: protocol not configured');
    return [];
  }

  const sources = protocol.sources as Record<string, JsonSourceConfig> | undefined;
  if (!sources) {
    warn(':json: protocol has no sources configured');
    return [];
  }

  const sourceConfig = sources[source];
  if (!sourceConfig) {
    warn(`:json: source "${source}" not found in protocol sources`);
    return [];
  }

  // Build URL with positional arg interpolation
  const vars = protocol.vars as Record<string, string> | undefined;
  let fetchUrl: string;
  try {
    fetchUrl = buildUrl(sourceConfig, positional, vars);
  } catch {
    warn(`:json: failed to build URL for source "${source}"`);
    return [];
  }

  // Fetch
  let data: unknown;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS);

    const fetchOptions: RequestInit = {
      signal: controller.signal,
      credentials: sourceConfig.credentials ? 'include' : 'omit',
    };

    if (sourceConfig.headers) {
      fetchOptions.headers = { ...sourceConfig.headers };
    }

    const response = await fetch(fetchUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      warn(`:json: fetch failed for "${source}": ${response.status} ${response.statusText}`);
      return [];
    }

    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      warn(`:json: unexpected content-type for "${source}": ${contentType} (expected application/json)`);
      return [];
    }

    const contentLength = response.headers?.get?.('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_WEB_RESPONSE_BYTES) {
      warn(`:json: response too large for "${source}": ${contentLength} bytes (max ${MAX_WEB_RESPONSE_BYTES})`);
      return [];
    }

    data = await response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const label = err instanceof DOMException && err.name === 'AbortError'
      ? `timeout after ${WEB_FETCH_TIMEOUT_MS}ms`
      : msg;
    warn(`:json: network error for source "${source}": ${label}`);
    return [];
  }

  // Extract envelope metadata
  let envelopeData: Record<string, unknown> | undefined;
  if (sourceConfig.envelope && data && typeof data === 'object' && !Array.isArray(data)) {
    envelopeData = extractEnvelope(data as Record<string, unknown>, sourceConfig.envelope);
  }

  // Extract items
  const items = extractItems(data, sourceConfig.root);
  if (!items) return [];

  // Map items to AlapLinks
  const links: AlapLink[] = [];
  const limit = Math.min(items.length, MAX_GENERATED_LINKS);

  for (let i = 0; i < limit; i++) {
    const link = mapItem(items[i], sourceConfig, envelopeData);
    if (link) {
      link.cssClass = link.cssClass ? `${link.cssClass} source_json` : 'source_json';
      if (!link.meta) link.meta = {};
      link.meta.source = 'json';
      links.push(link);
    }
  }

  return links;
};
