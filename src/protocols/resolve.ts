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

import type { AlapConfig, ProtocolHandler } from '../core/types';
import { warn } from '../core/logger';

/**
 * Resolve a protocol expression against the link registry.
 *
 * For filter protocols: runs the predicate against every link, returns matching IDs.
 * For generate protocols: looks up pre-resolved IDs from the generatedIds map.
 *
 * @param value - Token value: "name|arg1|arg2" (segments joined by |)
 * @param config - The active config
 * @param generatedIds - Map of pre-resolved generate protocol results (token value → temp IDs)
 * @returns Array of matching item IDs
 */
export const resolveProtocol = (
  value: string,
  config: AlapConfig,
  generatedIds?: Map<string, string[]>,
): string[] => {
  const segments = value.split('|');
  const protocolName = segments[0];
  const args = segments.slice(1);

  // Check for pre-generated IDs first (from generate protocols)
  if (generatedIds?.has(value)) {
    return generatedIds.get(value)!;
  }

  const protocol = config.protocols?.[protocolName];
  if (!protocol) {
    warn(`Protocol "${protocolName}" not found in config.protocols`);
    return [];
  }

  // Resolve the filter function: filter > handler (deprecated)
  const filter: ProtocolHandler | undefined =
    typeof protocol.filter === 'function' ? protocol.filter :
    typeof protocol.handler === 'function' ? protocol.handler :
    undefined;

  if (!filter) {
    // Protocol exists but has no filter — might be generate-only.
    // If we got here without generatedIds, the preResolve step was skipped.
    if (protocol.generate) {
      warn(`Protocol "${protocolName}" is a generate protocol but preResolve was not called. Use engine.resolveAsync() for external protocols.`);
    } else {
      warn(`Protocol "${protocolName}" has no filter or generate handler`);
    }
    return [];
  }

  const allLinks = config.allLinks;
  if (!allLinks || typeof allLinks !== 'object') return [];

  const result: string[] = [];
  for (const [id, link] of Object.entries(allLinks)) {
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
