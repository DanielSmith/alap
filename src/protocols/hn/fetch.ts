/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * :hn: — bounded JSON fetch helper.
 *
 * Shared between the Firebase listing/item endpoints and the Algolia
 * search endpoint. Enforces the standard generate-protocol limits:
 * SSRF guard, timeout, response size cap, content-type sanity,
 * `credentials: 'omit'`. Never throws — logs via {@link warn} and
 * returns `null` on any failure so one bad call can't crash the page.
 */

import { MAX_WEB_RESPONSE_BYTES, WEB_FETCH_TIMEOUT_MS } from '../../constants';
import { warn } from '../../core/logger';
import { guardedFetch } from '../guarded-fetch';
import { assertSafeUrl } from '../ssrf-guard';

/**
 * Fetch and parse JSON from a URL under the shared generate-protocol
 * limits. Returns the parsed body on success or `null` on any failure
 * (SSRF refusal, network error, timeout, non-2xx, wrong content-type,
 * oversize body, JSON parse error).
 */
export const fetchJson = async (url: string): Promise<unknown> => {
  // Pre-fetch SSRF guard. Protects against operator misconfig of the base
  // URL (e.g. accidentally pointing FIREBASE_BASE at 169.254.169.254 in a
  // server-side runner). Loopback/private/reserved hosts never reach fetch.
  try {
    assertSafeUrl(url);
  } catch (err) {
    warn(`:hn: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS);

  try {
    const response = await guardedFetch(url, {
      signal: controller.signal,
      credentials: 'omit',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      warn(`:hn: HTTP ${response.status} ${response.statusText} for ${url}`);
      return null;
    }

    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      warn(`:hn: unexpected content-type "${contentType}" for ${url}`);
      return null;
    }

    const contentLength = response.headers?.get?.('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_WEB_RESPONSE_BYTES) {
      warn(`:hn: response too large (${contentLength} bytes) for ${url}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    const label = err instanceof DOMException && err.name === 'AbortError'
      ? `timeout after ${WEB_FETCH_TIMEOUT_MS}ms`
      : msg;
    warn(`:hn: network error: ${label}`);
    return null;
  }
};
