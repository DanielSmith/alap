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

import { MAX_WEB_RESPONSE_BYTES } from '../../constants';

/**
 * Read a fetch Response body with a byte cap enforced during consumption,
 * then parse as JSON.
 *
 * Protocol handlers used to consult `content-length` and proceed to
 * `response.json()` if the header was absent. A hostile server that omits
 * the header (or uses chunked transfer, which is common with HTTP/2) could
 * stream unbounded bytes within the fetch timeout — browser freeze / tab OOM.
 *
 * This helper:
 * 1. Honors `content-length` as an early-exit short-circuit when the server
 *    is honest (saves bandwidth).
 * 2. Streams the body via `response.body.getReader()`, counting bytes as
 *    each chunk arrives, and cancels the reader + returns `null` once the
 *    cap is exceeded.
 *
 * Returns:
 * - The parsed JSON on success
 * - `null` if the byte cap was exceeded (the caller should warn + return [])
 *
 * Throws on JSON parse errors or network errors — the caller's existing
 * try/catch handles these.
 */
export async function readCappedJson(
  response: Response,
  maxBytes: number = MAX_WEB_RESPONSE_BYTES,
): Promise<unknown | null> {
  // Header-based short-circuit — saves bandwidth when the server is honest.
  const contentLength = response.headers?.get?.('content-length');
  if (contentLength) {
    const declared = parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return null;
    }
  }

  // No streaming body — modern browser fetches always have one, so this
  // branch exists for older environments and test mocks that hand-roll a
  // minimal Response-like. Prefer arrayBuffer (still lets us size-check);
  // fall through to json() for legacy mocks that only provide it.
  if (!response.body) {
    if (typeof response.arrayBuffer === 'function') {
      const buf = await response.arrayBuffer();
      if (buf.byteLength > maxBytes) return null;
      const text = new TextDecoder('utf-8').decode(buf);
      return JSON.parse(text);
    }
    if (typeof response.json === 'function') {
      return await response.json();
    }
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        // Signal the server we're done. Don't await — cancel() can be slow
        // and we already have our answer.
        void reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    // Release the lock in case cancel() was not reached.
    reader.releaseLock?.();
  }

  // Concatenate chunks into a single buffer for decode.
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8').decode(merged);
  return JSON.parse(text);
}
