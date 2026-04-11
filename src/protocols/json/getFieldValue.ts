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

import { BLOCKED_PATH_SEGMENTS } from '../shared';

/**
 * Parse a single path segment that may contain bracket notation.
 *
 * "images[0]" => { field: "images", index: 0 }
 * "actors[]"  => { field: "actors", index: -1 }  (-1 signals extract-all)
 * "name"      => { field: "name", index: undefined }
 */
const parseBracket = (segment: string): { field: string; index: number | undefined } => {
  const match = segment.match(/^([^[]+)\[(\d*)\]$/);
  if (!match) return { field: segment, index: undefined };
  const indexStr = match[2];
  return {
    field: match[1],
    index: indexStr === '' ? -1 : parseInt(indexStr, 10),
  };
};

/**
 * Extended path accessor supporting bracket notation.
 *
 * Supports everything getPath does, plus:
 * - Bracket indexing: "images[0].src"
 * - Array-of-objects extraction: "actors[].name" returns string[]
 *
 * Rejects prototype-pollution paths.
 */
export const getFieldValue = (obj: Record<string, unknown>, path: string): unknown => {
  const segments = path.split('.');
  let current: unknown = obj;

  for (let i = 0; i < segments.length; i++) {
    const raw = segments[i];
    if (BLOCKED_PATH_SEGMENTS.has(raw)) return undefined;
    if (current === null || current === undefined) return undefined;

    const { field, index } = parseBracket(raw);
    if (BLOCKED_PATH_SEGMENTS.has(field)) return undefined;

    // Navigate to the field
    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[field];
    } else if (Array.isArray(current) && index === undefined) {
      const idx = parseInt(field, 10);
      current = isNaN(idx) ? undefined : current[idx];
    } else {
      return undefined;
    }

    if (current === null || current === undefined) return undefined;

    // Apply bracket index
    if (index !== undefined) {
      if (!Array.isArray(current)) return undefined;

      if (index === -1) {
        // Extract-all: remaining path segments are applied to each element
        const remaining = segments.slice(i + 1).join('.');
        if (!remaining) return current;
        return current
          .filter((el): el is Record<string, unknown> => el !== null && typeof el === 'object')
          .map(el => getFieldValue(el, remaining))
          .filter(v => v !== undefined && v !== null);
      }

      current = current[index];
    }
  }

  return current;
};
