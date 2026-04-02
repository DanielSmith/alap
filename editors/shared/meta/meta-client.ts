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

// Client-side metadata extraction orchestrator for Alap editors.
//
// Single entry point: extractMetadata(url) replaces the old fetch('/api/meta') call.
// Selects strategy per domain, fetches client-side when possible (oEmbed, JSON API),
// falls back to the server proxy for html_scrape.

import type { DesiredFields, SiteRule } from './meta-rules';
import { getRuleForDomain, applyRule, sanitizeRaw } from './meta-rules';
import type { RawMeta } from './fetch-strategy';
import { buildFetchPlan, parseJsonApiResponse, parseOembedResponse } from './fetch-strategy';
import { scrapeRaw } from './html-scrape';
import { createMetaStore, computeChecksum, type MetaStore } from './meta-store';

let storePromise: Promise<MetaStore> | null = null;

function getStore(): Promise<MetaStore> {
  if (!storePromise) {
    storePromise = createMetaStore();
  }
  return storePromise;
}

/**
 * Extract metadata from a URL using the best available strategy.
 *
 * Flow:
 * 1. Look up site rule from IndexedDB (falls back to DEFAULT_RULE)
 * 2. Build a fetch plan (oEmbed, JSON API, or html_scrape)
 * 3. Execute: oEmbed/json_api fetch directly from browser; html_scrape via server proxy
 * 4. Parse response into raw metadata
 * 5. Sanitize and store snapshot (with checksum dedup)
 * 6. Apply rule to produce DesiredFields
 */
export async function extractMetadata(
  url: string,
  signal?: AbortSignal,
): Promise<DesiredFields> {
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^www\./, '');

  const store = await getStore();
  const allRules = await store.getRulesForUrl(url);
  const rule = getRuleForDomain(hostname, allRules);
  const plan = buildFetchPlan(url, rule);

  let raw: RawMeta;

  if (plan.expectedFormat === 'json') {
    raw = await fetchJson(plan.url, rule, signal);
  } else {
    raw = await fetchHtmlViaProxy(url, signal);
  }

  // Sanitize before storage
  const sanitized = sanitizeRaw(raw);

  // Store snapshot with dedup
  const checksum = await computeChecksum(sanitized);
  await store.saveSnapshot({
    url,
    raw: sanitized,
    checksum,
    strategy: plan.strategy,
    fetchedAt: new Date().toISOString(),
  });

  return applyRule(sanitized, hostname, url, allRules);
}

/**
 * Fetch JSON (oEmbed or JSON API) directly from the browser.
 * Falls back to html_scrape via proxy on CORS or network failure.
 */
async function fetchJson(
  fetchUrl: string,
  rule: SiteRule,
  signal?: AbortSignal,
): Promise<RawMeta> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Chain the external signal to our controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const response = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (rule.strategy === 'oembed') {
      return parseOembedResponse(data);
    }
    return parseJsonApiResponse(data, rule.strategyConfig ?? {});
  } catch {
    // CORS failure, timeout, or bad response — fall back to html_scrape via proxy
    const originalUrl = extractOriginalUrl(fetchUrl, rule);
    return fetchHtmlViaProxy(originalUrl, signal);
  }
}

/**
 * Fetch raw HTML through the server proxy and parse client-side.
 */
async function fetchHtmlViaProxy(
  url: string,
  signal?: AbortSignal,
): Promise<RawMeta> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const response = await fetch(
      `/api/meta?url=${encodeURIComponent(url)}&raw=true`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) return {};

    const html = await response.text();
    return scrapeRaw(html);
  } catch {
    return {};
  }
}

/**
 * Recover the original URL from a transformed fetch URL.
 * Used when a JSON strategy fails and we need to fall back to html_scrape.
 */
function extractOriginalUrl(fetchUrl: string, rule: SiteRule): string {
  const config = rule.strategyConfig ?? {};

  if (rule.strategy === 'oembed') {
    // oEmbed URLs encode the original as a query param
    try {
      const parsed = new URL(fetchUrl);
      const urlParam = parsed.searchParams.get('url');
      if (urlParam) return urlParam;
    } catch { /* fall through */ }
  }

  if (rule.strategy === 'json_api') {
    // Undo the transform (e.g. strip trailing .json)
    const template = (config.jsonUrlTransform as string) ?? '${url}.json';
    const suffix = template.replace('${url}', '');
    if (suffix && fetchUrl.endsWith(suffix)) {
      return fetchUrl.slice(0, -suffix.length);
    }
  }

  return fetchUrl;
}
