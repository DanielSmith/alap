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

// HTML metadata scraping for Alap editors
//
// Ported from TTT shared/src/html-scrape.ts.
// Pure parsing — no HTTP, no I/O. Takes an HTML string, returns raw metadata.

import type { RawMeta } from './fetch-strategy';

/**
 * Scrape all metadata fields from raw HTML.
 * Returns everything — no filtering, no priorities, no opinions.
 */
export const scrapeRaw = (html: string): RawMeta => {
  const raw: RawMeta = {};

  // --- Titles ---
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag) raw.title_tag = decode(titleTag[1].trim());
  raw.og_title = extractAny(html, 'og:title');
  raw.twitter_title = extractAny(html, 'twitter:title');

  // --- Descriptions ---
  raw.meta_description = byName(html, 'description');
  raw.og_description = extractAny(html, 'og:description');
  raw.twitter_description = extractAny(html, 'twitter:description');

  // --- Site / type / locale ---
  raw.og_site_name = extractAny(html, 'og:site_name');
  raw.og_type = extractAny(html, 'og:type');
  raw.og_locale = extractAny(html, 'og:locale');
  raw.meta_section = byName(html, 'meta-section');

  // --- Canonical URL ---
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (canonical) raw.canonical_url = decode(canonical[1]);

  // --- Keywords ---
  const keywords = byName(html, 'keywords');
  if (keywords) {
    raw.meta_keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
  }

  // --- article:tag (multiple) ---
  const articleTags: string[] = [];
  for (const regex of [
    /<meta[^>]+property=["']article:tag["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:tag["']/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) articleTags.push(decode(m[1]).trim());
  }
  if (articleTags.length) raw.article_tags = articleTags;

  // --- article:section ---
  raw.article_section = byProp(html, 'article:section');

  // --- Author ---
  raw.article_author = byProp(html, 'article:author');
  raw.meta_author = byName(html, 'author');

  // --- Dates ---
  raw.article_published_time = byProp(html, 'article:published_time');
  raw.article_modified_time = byProp(html, 'article:modified_time');
  raw.date = byName(html, 'date');
  raw.dc_date = byName(html, 'dc.date');
  raw.dcterms_modified = byName(html, 'dcterms.modified');

  // --- Images ---
  const images: string[] = [];
  for (const regex of [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi,
    /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) images.push(decode(m[1]));
  }
  if (images.length) raw.og_images = images;

  raw.twitter_image = extractAny(html, 'twitter:image');
  raw.twitter_card = extractAny(html, 'twitter:card');

  // --- Geo ---
  raw.place_latitude = byProp(html, 'place:location:latitude');
  raw.place_longitude = byProp(html, 'place:location:longitude');
  raw.geo_position = byName(html, 'geo.position');
  raw.icbm = byName(html, 'ICBM');
  raw.geo_placename = byName(html, 'geo.placename');
  raw.geo_region = byName(html, 'geo.region');

  // Strip nulls and unsafe values
  for (const key of Object.keys(raw)) {
    const val = raw[key];
    if (val === null || val === undefined) {
      delete raw[key];
      continue;
    }
    if (typeof val === 'string') {
      if (looksUnsafe(val)) { delete raw[key]; continue; }
    }
    if (Array.isArray(val)) {
      raw[key] = val.filter(v => typeof v !== 'string' || !looksUnsafe(v));
      if ((raw[key] as unknown[]).length === 0) delete raw[key];
    }
  }

  return raw;
};

// --- Helpers ---

const looksUnsafe = (val: string): boolean =>
  /<script/i.test(val)
  || /javascript\s*:/i.test(val)
  || /on\w+\s*=/i.test(val)
  || /data\s*:\s*text\/html/i.test(val);

const extractAny = (html: string, key: string): string | null =>
  byProp(html, key) ?? byName(html, key);

const byProp = (html: string, property: string): string | null => {
  for (const re of [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
  ]) {
    const m = html.match(re);
    if (m) return decode(m[1]);
  }
  return null;
};

const byName = (html: string, name: string): string | null => {
  for (const re of [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
  ]) {
    const m = html.match(re);
    if (m) return decode(m[1]);
  }
  return null;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018', rsquo: '\u2019',
  ldquo: '\u201C', rdquo: '\u201D', bull: '\u2022', hellip: '\u2026',
  copy: '\u00A9', reg: '\u00AE', trade: '\u2122', nbsp: ' ',
  laquo: '\u00AB', raquo: '\u00BB', deg: '\u00B0', middot: '\u00B7',
  times: '\u00D7', divide: '\u00F7', euro: '\u20AC', pound: '\u00A3',
};

const decode = (str: string): string =>
  str
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
