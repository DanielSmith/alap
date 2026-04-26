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

import type { AlapLink } from './types';
import { getProvenance } from './linkProvenance';
import { sanitizeUrl, sanitizeUrlStrict } from './sanitizeUrl';

/**
 * Tier-aware sanitizers. Consumers (buildMenuList, lens, lightbox,
 * framework adapters) read provenance off each link and apply the
 * appropriate rule — strict on anything that crossed a trust boundary
 * (storage adapter, protocol handler, unstamped), loose on author-tier
 * links the developer hand-wrote in their config.
 *
 * Fail-closed policy: if a link has no provenance stamp at all, we
 * treat it as untrusted. The only way to get an unstamped link into a
 * renderer is to bypass validateConfig — a code path that shouldn't
 * exist in normal usage. AlapEngine auto-validates on construction and
 * updateConfig, so developer-written configs never land here unstamped.
 */

function isAuthorSafe(link: AlapLink): boolean {
  return getProvenance(link) === 'author';
}

/**
 * Author-tier gets the loose sanitizer (allows tel:, mailto:, custom
 * developer-intended schemes). Everything else — including unstamped —
 * gets the strict sanitizer (http/https/mailto only), optionally
 * widened by `link.allowedSchemes` for trusted protocol handlers that
 * stamp it (validateConfig strips the field from non-author tiers, so
 * only handler-injected links can carry it past sanitization).
 */
export function sanitizeUrlByTier(url: string, link: AlapLink): string {
  return isAuthorSafe(link)
    ? sanitizeUrl(url)
    : sanitizeUrlStrict(url, link.allowedSchemes);
}

/**
 * Author-tier keeps its cssClass. Everything else drops it — attacker-
 * controlled class names can target CSS selectors that exfil data via
 * `content: attr(...)`, trigger layout-driven side-channels, or simply
 * overlay visible UI to mislead the user. There is no narrow allowlist
 * that beats "don't let untrusted input pick a class at all."
 */
export function sanitizeCssClassByTier(
  cssClass: string | undefined,
  link: AlapLink,
): string | undefined {
  if (cssClass === undefined) return undefined;
  return isAuthorSafe(link) ? cssClass : undefined;
}

/**
 * Author-tier keeps its targetWindow as-is (pass-through, including
 * `undefined` so the caller's fallback chain still applies). Everything
 * else gets clamped to `_blank` unconditionally — even when the link
 * itself didn't specify a target. Inheriting an author's named-window
 * default (e.g. `'fromAlap'`) for an untrusted link would let a
 * `protocol:web` response ride into a window the author reserved for
 * their own links; clamping to `_blank` on non-author tiers forecloses
 * that.
 */
export function sanitizeTargetWindowByTier(
  targetWindow: string | undefined,
  link: AlapLink,
): string | undefined {
  if (isAuthorSafe(link)) return targetWindow;
  return '_blank';
}
