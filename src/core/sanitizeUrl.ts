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
 * Sanitize a URL to prevent XSS via dangerous URI schemes.
 *
 * Allows: http, https, mailto, tel, relative URLs, empty string.
 * Blocks: javascript, data, vbscript, blob (and case/whitespace variations).
 *
 * Returns the URL unchanged if safe, or 'about:blank' if dangerous.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;

  // Strip ASCII control characters and whitespace that could disguise a scheme.
  // e.g., "java\nscript:" or "java\tscript:"
  const normalized = url.replace(/[\x00-\x1f\x7f]/g, '').trim();

  // Check for dangerous schemes (case-insensitive)
  if (/^(javascript|data|vbscript|blob)\s*:/i.test(normalized)) {
    return 'about:blank';
  }

  return url;
}
