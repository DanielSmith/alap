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

// Metadata extraction rules for Alap editors
//
// Ported from TTT shared/src/meta-rules.ts for client-side use.
// Two halves:
// 1. DesiredFields — what we WANT from any URL, regardless of how we get it
// 2. SiteRule — how to GET those fields from raw metadata, per domain

// --- Half 1: What we want ---

/**
 * The ideal output from any URL extraction.
 * Everything here has been sanitized and is safe to store and render.
 */
export interface DesiredFields {
  url: string;
  title: string;
  description: string;
  authors: string[];
  keywords: string[];
  thumbnail: string | null;
  tags: string[];
  siteName: string | null;
  canonicalUrl: string | null;
  locale: string | null;
  publishedDate: string | null;
  modifiedDate: string | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
}

// --- Half 2: How to get it ---

export type FetchStrategy =
  | 'html_scrape'
  | 'oembed'
  | 'json_api'
  | 'at_protocol'
  | 'abstract_redirect';

export interface SiteRule {
  domain: string;
  strategy: FetchStrategy;
  strategyConfig: Record<string, unknown> | null;
  title: string[];
  description: string[];
  authors: string[];
  thumbnail: string[];
  canonicalUrl: string[];
  locale: string[];
  publishedDate: string[];
  modifiedDate: string[];
  latitude: string[];
  longitude: string[];
  placeName: string[];
  tags_from: string[];
  tags_skip: string[];
  tag_hostname: boolean;
}

// --- Default rule (always available, even before IndexedDB loads) ---

export const DEFAULT_RULE: SiteRule = {
  domain: '_default',
  strategy: 'html_scrape',
  strategyConfig: null,
  title: ['og_title', 'twitter_title', 'title_tag', 'oembed_title'],
  description: ['og_description', 'twitter_description', 'meta_description', 'oembed_description'],
  authors: ['article_author', 'meta_author', 'oembed_author'],
  thumbnail: ['og_images', 'twitter_image', 'oembed_thumbnail'],
  canonicalUrl: ['canonical_url'],
  locale: ['og_locale'],
  publishedDate: ['article_published_time', 'date', 'dc_date'],
  modifiedDate: ['article_modified_time', 'dcterms_modified'],
  latitude: ['place_latitude'],
  longitude: ['place_longitude'],
  placeName: ['geo_placename'],
  tags_from: [
    'og_site_name', 'og_type', 'article_section', 'meta_section',
    'meta_keywords', 'article_tags', 'og_locale',
  ],
  tags_skip: [],
  tag_hostname: true,
};

/**
 * Find the rule for a given hostname.
 *
 * Lookup order:
 *   1. Exact subdomain match (food.example.org)
 *   2. Bare domain match (example.org — wildcard for all subdomains)
 *   3. DEFAULT_RULE
 */
export const getRuleForDomain = (hostname: string, rules: SiteRule[] = []): SiteRule => {
  const clean = hostname.toLowerCase().replace(/^www\./, '');

  const exact = rules.find(r => clean === r.domain);
  if (exact) return exact;

  const domainFallback = rules.find(r => clean.endsWith(`.${r.domain}`));
  if (domainFallback) return domainFallback;

  return DEFAULT_RULE;
};

/**
 * Normalize a string into an Alap tag.
 * Lowercase, spaces/hyphens to underscores, strip everything else
 * that isn't alphanumeric or underscore. No hyphens (dash is WITHOUT operator).
 */
export const normalizeTag = (raw: string): string =>
  raw.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');

// --- Sanitization ---

const sanitize = (val: string): string | null => {
  if (!val) return null;
  if (/<script/i.test(val)) return null;
  if (/javascript\s*:/i.test(val)) return null;
  if (/on\w+\s*=/i.test(val)) return null;
  if (/data\s*:\s*text\/html/i.test(val)) return null;
  return val.replace(/<[^>]+>/g, '').trim();
};

const sanitizeUrl = (val: string): string | null => {
  if (!val) return null;
  const trimmed = val.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return null;
};

const decodeEntities = (val: string): string =>
  val
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(lt|gt|amp|quot|apos);/gi, (_, name) => {
      const map: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
      return map[name.toLowerCase()] ?? _;
    });

const isSuspicious = (val: string): boolean => {
  const decoded = decodeEntities(val);
  if (/<script/i.test(decoded)) return true;
  if (/javascript\s*:/i.test(decoded)) return true;
  if (/on\w+\s*=/i.test(decoded)) return true;
  if (/data\s*:\s*text\/html/i.test(decoded)) return true;
  if (/\\u/i.test(decoded)) return true;
  return false;
};

/**
 * Sanitize raw metadata before storage.
 * Suspicious strings are dropped entirely. Clean strings get HTML tags stripped.
 */
export const sanitizeRaw = (
  raw: Record<string, string | string[] | number | null>,
): Record<string, string | string[] | number | null> => {
  const cleaned: Record<string, string | string[] | number | null> = {};

  for (const [key, val] of Object.entries(raw)) {
    if (val === null || typeof val === 'number') {
      cleaned[key] = val;
      continue;
    }
    if (typeof val === 'string') {
      if (isSuspicious(val)) continue;
      cleaned[key] = val.replace(/<[^>]+>/g, '').trim() || null;
      continue;
    }
    if (Array.isArray(val)) {
      const safe = val
        .filter((v): v is string => typeof v === 'string' && !isSuspicious(v))
        .map(v => v.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      if (safe.length > 0) cleaned[key] = safe;
      continue;
    }
  }

  return cleaned;
};

/**
 * Apply a site rule to raw metadata to produce desired fields.
 * All output is sanitized — no embedded scripts, no HTML tags in text.
 */
export const applyRule = (
  raw: Record<string, string | string[] | number | null>,
  hostname: string,
  originalUrl?: string,
  rules: SiteRule[] = [],
): DesiredFields => {
  const rule = getRuleForDomain(hostname, rules);

  const resolveString = (keys: string[]): string | null => {
    for (const key of keys) {
      const val = raw[key];
      if (typeof val === 'string') {
        const clean = sanitize(val);
        if (clean) return clean;
      }
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        const clean = sanitize(val[0]);
        if (clean) return clean;
      }
    }
    return null;
  };

  const resolveUrl = (keys: string[]): string | null => {
    for (const key of keys) {
      const val = raw[key];
      if (typeof val === 'string') {
        const clean = sanitizeUrl(val);
        if (clean) return clean;
      }
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        const clean = sanitizeUrl(val[0]);
        if (clean) return clean;
      }
    }
    return null;
  };

  const resolveNumber = (keys: string[]): number | null => {
    for (const key of keys) {
      const val = raw[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const n = parseFloat(val);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  };

  // Resolve geo from compound fields
  if (raw.geo_position && typeof raw.geo_position === 'string') {
    const [lat, lng] = raw.geo_position.split(';').map(s => parseFloat(s.trim()));
    if (!isNaN(lat)) raw.geo_position_lat = lat;
    if (!isNaN(lng)) raw.geo_position_lng = lng;
  }
  if (raw.icbm && typeof raw.icbm === 'string') {
    const [lat, lng] = raw.icbm.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(lat)) raw.icbm_lat = lat;
    if (!isNaN(lng)) raw.icbm_lng = lng;
  }

  // Build tags
  const skipSet = new Set(rule.tags_skip);
  const seen = new Set<string>();
  const tags: string[] = [];

  const addTag = (val: string) => {
    for (const part of val.split(',')) {
      const normalized = normalizeTag(part);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        tags.push(normalized);
      }
    }
  };

  if (rule.tag_hostname) {
    addTag(hostname.replace(/^www\./, '').replace(/\./g, '_'));
  }

  for (const key of rule.tags_from) {
    if (skipSet.has(key)) continue;
    const val = raw[key];
    if (typeof val === 'string' && val) addTag(val);
    if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === 'string' && v) addTag(v);
      }
    }
  }

  // Keywords (raw, pre-normalization)
  const keywords: string[] = [];
  const rawKeywords = raw.meta_keywords;
  if (Array.isArray(rawKeywords)) {
    for (const k of rawKeywords) {
      if (typeof k === 'string') {
        const clean = sanitize(k);
        if (clean) keywords.push(clean);
      }
    }
  }

  // Authors (split on comma, each becomes a tag)
  const authorRaw = resolveString(rule.authors);
  const authors: string[] = [];
  if (authorRaw) {
    for (const a of authorRaw.split(',')) {
      const clean = sanitize(a);
      if (clean) {
        authors.push(clean);
        addTag(clean);
      }
    }
  }

  const locale = resolveString(rule.locale);
  const canonical = resolveUrl(rule.canonicalUrl);

  return {
    url: canonical ?? originalUrl ?? '',
    title: resolveString(rule.title) ?? hostname,
    description: resolveString(rule.description) ?? '',
    authors,
    keywords,
    thumbnail: resolveUrl(rule.thumbnail),
    tags,
    siteName: resolveString(['og_site_name']),
    canonicalUrl: canonical,
    locale: locale ? normalizeTag(locale) : null,
    publishedDate: resolveString(rule.publishedDate),
    modifiedDate: resolveString(rule.modifiedDate),
    latitude: resolveNumber([...rule.latitude, 'geo_position_lat', 'icbm_lat']),
    longitude: resolveNumber([...rule.longitude, 'geo_position_lng', 'icbm_lng']),
    placeName: resolveString(rule.placeName),
  };
};
