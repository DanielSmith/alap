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

/**
 * Vite plugin that adds a `GET /api/meta?url=...` endpoint to the dev server.
 * Fetches a URL server-side and extracts title, description, and og:image.
 *
 * Works in both React and Vue editors (and any Vite-based project).
 * Replaces the Netlify serverless function dependency.
 */

import type { Plugin } from 'vite';

interface MetaResult {
  title: string;
  description: string;
  images: string[];
  keywords: string[];
  siteName: string;
  type: string;
  canonicalUrl: string;
  locale: string;
  articleTags: string[];
  articleSection: string;
}

function extractMeta(html: string, fallbackHost: string): MetaResult {
  const result: MetaResult = {
    title: fallbackHost,
    description: '',
    images: [],
    keywords: [],
    siteName: '',
    type: '',
    canonicalUrl: '',
    locale: '',
    articleTags: [],
    articleSection: '',
  };

  // <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) result.title = decodeEntities(titleMatch[1].trim());

  // og:title (preferred over <title>)
  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle) result.title = ogTitle;

  // description
  const desc = extractMetaName(html, 'description');
  if (desc) result.description = desc;

  // og:description (preferred)
  const ogDesc = extractMetaContent(html, 'og:description');
  if (ogDesc) result.description = ogDesc;

  // og:site_name
  const siteName = extractMetaContent(html, 'og:site_name');
  if (siteName) result.siteName = siteName;

  // og:type
  const ogType = extractMetaContent(html, 'og:type');
  if (ogType) result.type = ogType;

  // og:locale
  const locale = extractMetaContent(html, 'og:locale');
  if (locale) result.locale = locale;

  // keywords → tags (split on comma, trim, replace spaces with underscores, lowercase)
  const keywords = extractMetaName(html, 'keywords');
  if (keywords) {
    result.keywords = keywords
      .split(',')
      .map((k) => k.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean);
  }

  // article:tag (multiple — common on news sites)
  const articleTagRegex1 = /<meta[^>]+property=["']article:tag["'][^>]+content=["']([^"']+)["']/gi;
  const articleTagRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:tag["']/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = articleTagRegex1.exec(html)) !== null) {
    result.articleTags.push(decodeEntities(tagMatch[1]).trim().toLowerCase().replace(/\s+/g, '_'));
  }
  while ((tagMatch = articleTagRegex2.exec(html)) !== null) {
    result.articleTags.push(decodeEntities(tagMatch[1]).trim().toLowerCase().replace(/\s+/g, '_'));
  }

  // article:section
  const section = extractMetaContent(html, 'article:section');
  if (section) result.articleSection = section;

  // canonical URL
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (canonicalMatch) result.canonicalUrl = decodeEntities(canonicalMatch[1]);

  // og:image (collect all)
  const imageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imageRegex.exec(html)) !== null) {
    result.images.push(decodeEntities(imgMatch[1]));
  }
  const imageRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi;
  while ((imgMatch = imageRegex2.exec(html)) !== null) {
    result.images.push(decodeEntities(imgMatch[1]));
  }

  // twitter:image as fallback
  if (result.images.length === 0) {
    const twitterImg = extractMetaName(html, 'twitter:image')
      ?? extractMetaContent(html, 'twitter:image');
    if (twitterImg) result.images.push(twitterImg);
  }

  return result;
}

function extractMetaContent(html: string, property: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i',
  );
  const m1 = html.match(re1);
  if (m1) return decodeEntities(m1[1]);

  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i',
  );
  const m2 = html.match(re2);
  if (m2) return decodeEntities(m2[1]);

  return null;
}

function extractMetaName(html: string, name: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i',
  );
  const m1 = html.match(re1);
  if (m1) return decodeEntities(m1[1]);

  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i',
  );
  const m2 = html.match(re2);
  if (m2) return decodeEntities(m2[1]);

  return null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

/**
 * Block requests to private/internal network addresses (SSRF prevention).
 * Checks the hostname against known private ranges, localhost, and link-local.
 */
function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Localhost
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower === '[::1]') {
    return true;
  }

  // Strip IPv6 brackets
  const bare = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;

  // IPv6 private ranges: fc00::/7 (unique local), fe80::/10 (link-local)
  if (/^f[cd][\da-f]{2}:/i.test(bare) || /^fe[89ab][\da-f]:/i.test(bare)) {
    return true;
  }

  // IPv4 private/reserved ranges
  const parts = bare.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16
    if (a === 127) return true;                          // 127.0.0.0/8
    if (a === 169 && b === 254) return true;             // 169.254.0.0/16 (link-local)
    if (a === 0) return true;                            // 0.0.0.0/8
  }

  return false;
}

export function metaGrabberPlugin(): Plugin {
  return {
    name: 'alap-meta-grabber',
    configureServer(server) {
      server.middlewares.use('/api/meta', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        let parsed: URL;
        try {
          parsed = new URL(targetUrl);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid URL' }));
          return;
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'URL must use http or https' }));
          return;
        }

        if (isPrivateHost(parsed.hostname)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Requests to private/internal addresses are not allowed' }));
          return;
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'AlapEditor/1.0 (meta-grabber)' },
          });
          clearTimeout(timeout);

          const text = (await response.text()).slice(0, 100_000);
          const meta = extractMeta(text, parsed.hostname);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          });
          res.end(JSON.stringify(meta));
        } catch {
          const fallback: MetaResult = {
            title: parsed.hostname,
            description: '',
            images: [],
            keywords: [],
            siteName: '',
            type: '',
            canonicalUrl: '',
            locale: '',
            articleTags: [],
            articleSection: '',
          };
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          });
          res.end(JSON.stringify(fallback));
        }
      });
    },
  };
}
