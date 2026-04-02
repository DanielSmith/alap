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

// Fetch strategy planning and response parsing for Alap editors
//
// Ported from TTT shared/src/fetch-strategy.ts.
// Platform-agnostic — no actual HTTP calls.
// Tells the caller WHAT to fetch and HOW to interpret the response.

import type { SiteRule, FetchStrategy } from './meta-rules';

// --- Fetch Plan ---

export interface FetchPlan {
  strategy: FetchStrategy;
  url: string;
  expectedFormat: 'html' | 'json';
  headers?: Record<string, string>;
}

/**
 * Given an original URL and a site rule, produce a fetch plan.
 * The caller executes the plan and hands the response back for parsing.
 */
export const buildFetchPlan = (originalUrl: string, rule: SiteRule): FetchPlan => {
  const config = rule.strategyConfig ?? {};

  switch (rule.strategy) {
    case 'json_api': {
      const template = (config.jsonUrlTransform as string) ?? '${url}.json';
      const fetchUrl = template.replace('${url}', originalUrl);
      return { strategy: 'json_api', url: fetchUrl, expectedFormat: 'json' };
    }

    case 'oembed': {
      const template = (config.oembedUrl as string) ?? '';
      const fetchUrl = template.replace('${url}', encodeURIComponent(originalUrl));
      return { strategy: 'oembed', url: fetchUrl, expectedFormat: 'json' };
    }

    case 'abstract_redirect': {
      const rewrite = config.urlRewrite as string | undefined;
      const fetchUrl = rewrite
        ? applyUrlRewrite(originalUrl, rewrite)
        : originalUrl;
      return { strategy: 'abstract_redirect', url: fetchUrl, expectedFormat: 'html' };
    }

    case 'at_protocol': {
      const endpoint = (config.apiEndpoint as string) ?? '';
      const fetchUrl = endpoint.replace('${url}', encodeURIComponent(originalUrl));
      return { strategy: 'at_protocol', url: fetchUrl, expectedFormat: 'json' };
    }

    case 'html_scrape':
    default:
      return { strategy: 'html_scrape', url: originalUrl, expectedFormat: 'html' };
  }
};

// --- Response Parsing ---

export type RawMeta = Record<string, string | string[] | number | null>;

/**
 * Parse a JSON API response into raw metadata fields.
 * Uses jsonPath mappings from strategyConfig to extract fields.
 */
export const parseJsonApiResponse = (data: unknown, config: Record<string, unknown>): RawMeta => {
  const raw: RawMeta = {};
  const paths = (config.jsonPath as Record<string, string>) ?? {};

  for (const [field, path] of Object.entries(paths)) {
    const val = resolvePath(data, path);
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' || typeof val === 'number') {
        raw[field] = val;
      } else if (Array.isArray(val)) {
        const strings = val.filter((v): v is string => typeof v === 'string');
        if (strings.length) raw[field] = strings;
      }
    }
  }

  return raw;
};

/**
 * Parse an oEmbed JSON response into raw metadata fields.
 * oEmbed has a standard shape — no per-site config needed.
 */
export const parseOembedResponse = (data: unknown): RawMeta => {
  if (!data || typeof data !== 'object') return {};

  const obj = data as Record<string, unknown>;
  const raw: RawMeta = {};

  if (typeof obj.title === 'string') raw.oembed_title = obj.title;
  if (typeof obj.author_name === 'string') raw.oembed_author = obj.author_name;
  if (typeof obj.author_url === 'string') raw.oembed_author_url = obj.author_url;
  if (typeof obj.provider_name === 'string') raw.og_site_name = obj.provider_name;
  if (typeof obj.thumbnail_url === 'string') raw.oembed_thumbnail = obj.thumbnail_url;
  if (typeof obj.html === 'string') raw.oembed_html = obj.html;
  if (typeof obj.type === 'string') raw.oembed_type = obj.type;

  if (typeof obj.width === 'number') raw.oembed_width = obj.width;
  if (typeof obj.height === 'number') raw.oembed_height = obj.height;
  if (typeof obj.thumbnail_width === 'number') raw.oembed_thumb_width = obj.thumbnail_width;
  if (typeof obj.thumbnail_height === 'number') raw.oembed_thumb_height = obj.thumbnail_height;

  return raw;
};

// --- Helpers ---

const resolvePath = (obj: unknown, path: string): unknown => {
  let current: unknown = obj;

  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined;

    if (Array.isArray(current)) {
      const idx = parseInt(segment, 10);
      if (isNaN(idx)) return undefined;
      current = current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
};

const applyUrlRewrite = (url: string, rewrite: string): string => {
  const parts = rewrite.split(/\s*(?:→|->|>)\s*/);
  if (parts.length === 2) {
    return url.replace(parts[0], parts[1]);
  }
  return url;
};
