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
 * Read-only view over the engine's link inventory. Callers (parser,
 * resolveProtocol, refiners) go through this instead of touching
 * `config.allLinks` directly so the engine can freeze the author-supplied
 * config while still layering in ephemeral protocol-generated entries at
 * resolve time.
 *
 * Two implementations ship: `staticCatalog` (author config only) and
 * `OverlayCatalog` (author config + a mutable overlay for generated links).
 */
export interface LinkCatalog {
  /** Return the link registered under `id`, or undefined if missing. */
  get(id: string): AlapLink | undefined;
  /** True when a link exists for `id`. */
  has(id: string): boolean;
  /** Iterate all (id, link) pairs. Order: author first, overlay last. */
  entries(): IterableIterator<[string, AlapLink]>;
}

/**
 * Trivial catalog wrapping a plain `allLinks` object. Used when a parser
 * is instantiated without an engine (tests, standalone use).
 */
export function staticCatalog(allLinks: Record<string, AlapLink> | undefined): LinkCatalog {
  const links = allLinks && typeof allLinks === 'object' ? allLinks : {};
  return {
    get(id) {
      return links[id];
    },
    has(id) {
      return Object.prototype.hasOwnProperty.call(links, id);
    },
    *entries() {
      for (const k of Object.keys(links)) {
        yield [k, links[k]];
      }
    },
  };
}

/**
 * Author catalog + ephemeral overlay for protocol-generated links.
 *
 * Lookup order is author-first: a generated link with an id that
 * collides with an author id is never visible. Protocol output can't
 * shadow a known-good item like `login` or `home`. Since engine-generated
 * ids are opaque (`__alap_gen_<protocol>_<counter>_<timestamp>`) this is
 * effectively a defense-in-depth invariant rather than something that
 * fires in practice.
 */
export class OverlayCatalog implements LinkCatalog {
  constructor(
    private readonly base: Record<string, AlapLink>,
    private readonly overlay: Map<string, AlapLink>,
  ) {}

  get(id: string): AlapLink | undefined {
    if (Object.prototype.hasOwnProperty.call(this.base, id)) return this.base[id];
    return this.overlay.get(id);
  }

  has(id: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.base, id) || this.overlay.has(id);
  }

  *entries(): IterableIterator<[string, AlapLink]> {
    for (const k of Object.keys(this.base)) {
      yield [k, this.base[k]];
    }
    for (const [k, link] of this.overlay) {
      if (!Object.prototype.hasOwnProperty.call(this.base, k)) {
        yield [k, link];
      }
    }
  }
}
