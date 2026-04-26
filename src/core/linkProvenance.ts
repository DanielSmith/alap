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

/**
 * Where a link came from. Phase 6 sanitizers read this to decide how
 * strictly to sanitize URLs, allow CSS classes, permit targetWindow, etc.
 *
 * Tiers, loosest → strictest:
 *   - `author`          — link came from the developer's hand-written config
 *   - `storage:local`   — loaded from IndexedDB / localStorage on this device
 *   - `storage:remote`  — loaded from a remote config server
 *   - `protocol:<name>` — returned by a protocol handler (`:web:`, `:hn:`, …)
 */
export type Provenance =
  | 'author'
  | 'storage:local'
  | 'storage:remote'
  | `protocol:${string}`;

/**
 * Provenance is tracked in a WeakMap *outside* the AlapLink object on purpose.
 *
 * A `.provenance` field on the link would be attacker-writable: a malicious
 * remote config or `:web:` response could pre-stamp itself `'author'` and win
 * author-tier trust for free. A WeakMap keyed on runtime object identity has
 * no field for an attacker to fill — only library code at trust boundaries
 * can stamp, because only library code holds the object references.
 *
 * Bonus: when a link's reference falls out of scope, its WeakMap entry is
 * reclaimed by GC. No manual cleanup; no leak across resolve cycles.
 *
 * Implication for cloning: `structuredClone(config)` produces new objects,
 * and new objects have no stamps. Whoever does the cloning (storage adapter
 * load path, etc.) is responsible for stamping the clones. `validateConfig`
 * does this automatically via its `provenance` option.
 *
 * Implication for mergeConfigs: it's a link-map-level merge (`dest[key] =
 * src[key]`), so link object identity is preserved across a merge. Stamps
 * travel with the link; no "lowest tier wins" rule needed.
 */
const STAMPS: WeakMap<AlapLink, Provenance> = new WeakMap();

/** Stamp a link with its provenance tier. Overwrites any existing stamp. */
export function stampProvenance(link: AlapLink, tier: Provenance): void {
  STAMPS.set(link, tier);
}

/** Read a link's provenance tier, or `undefined` if it was never stamped. */
export function getProvenance(link: AlapLink): Provenance | undefined {
  return STAMPS.get(link);
}

/** True if the link was hand-written in the developer's config. */
export function isAuthorTier(link: AlapLink): boolean {
  return STAMPS.get(link) === 'author';
}

/** True if the link was loaded from a storage adapter (local or remote). */
export function isStorageTier(link: AlapLink): boolean {
  const prov = STAMPS.get(link);
  return prov === 'storage:local' || prov === 'storage:remote';
}

/** True if the link was returned by a protocol handler. */
export function isProtocolTier(link: AlapLink): boolean {
  const prov = STAMPS.get(link);
  return typeof prov === 'string' && prov.startsWith('protocol:');
}

/**
 * Copy the provenance stamp from one link to another.
 *
 * Needed anywhere the engine creates a fresh object derived from a stamped
 * one — e.g., `ResolvedLink = { id, ...link }` allocates a new object that
 * wouldn't inherit the WeakMap entry otherwise. Call after the new object
 * exists but before handing it to anything that might read provenance.
 *
 * No-op if the source is unstamped.
 */
export function cloneProvenance(src: AlapLink, dest: AlapLink): void {
  const prov = STAMPS.get(src);
  if (prov !== undefined) STAMPS.set(dest, prov);
}
