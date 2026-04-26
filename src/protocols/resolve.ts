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

import type { AlapConfig, GenerateHandler, ProtocolHandler } from '../core/types';
import type { LinkCatalog } from '../core/linkCatalog';
import { staticCatalog } from '../core/linkCatalog';
import { warn } from '../core/logger';

/**
 * Resolve a protocol expression against the link registry.
 *
 * For filter protocols: runs the predicate against every link in the
 * catalog, returns matching IDs. The catalog is author-config-first —
 * protocol-generated overlay entries can't shadow an author id.
 * For generate protocols: looks up pre-resolved IDs from the generatedIds map.
 *
 * @param value - Token value: "name|arg1|arg2" (segments joined by |)
 * @param config - The active config (data only; no handlers)
 * @param catalog - Link lookup view (author links + engine overlay). When
 *   omitted, a plain view over `config.allLinks` is used.
 * @param generatedIds - Map of pre-resolved generate protocol results (token value → temp IDs)
 * @param getHandlers - Lookup into the engine's handler registry. Supplied by
 *   ExpressionParser when constructed by an AlapEngine; undefined when the
 *   parser is used standalone (no handlers available → filter protocols return []).
 * @returns Array of matching item IDs
 */
export const resolveProtocol = (
  value: string,
  config: AlapConfig,
  catalog?: LinkCatalog,
  generatedIds?: Map<string, string[]>,
  getHandlers?: (name: string) => { generate?: GenerateHandler; filter?: ProtocolHandler } | undefined,
): string[] => {
  const segments = value.split('|');
  const protocolName = segments[0];
  const args = segments.slice(1);

  // Check for pre-generated IDs first (from generate protocols)
  if (generatedIds?.has(value)) {
    return generatedIds.get(value)!;
  }

  const protocol = config.protocols?.[protocolName];
  const entry = getHandlers?.(protocolName);
  if (!protocol && !entry) {
    warn(`Protocol "${protocolName}" not found in config.protocols`);
    return [];
  }

  const filter: ProtocolHandler | undefined =
    typeof entry?.filter === 'function' ? entry.filter : undefined;

  if (!filter) {
    // Protocol exists but has no filter — might be generate-only.
    // For generate protocols, reaching this branch just means the cache is
    // cold for this token: the fetch is in flight and a subsequent call
    // (after the promise in ProgressiveState.sources settles) will find the
    // ids. That's normal progressive-rendering behavior, not an error.
    if (!entry?.generate) {
      warn(`Protocol "${protocolName}" has no filter or generate handler`);
    }
    return [];
  }

  const view = catalog ?? staticCatalog(config.allLinks);

  const result: string[] = [];
  for (const [id, link] of view.entries()) {
    if (!link || typeof link !== 'object') continue;
    try {
      if (filter(args, link, id)) {
        result.push(id);
      }
    } catch {
      warn(`Protocol "${protocolName}" handler threw for item "${id}" — skipping`);
    }
  }
  return result;
};
