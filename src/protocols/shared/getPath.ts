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

import { BLOCKED_PATH_SEGMENTS } from './guards';

/**
 * Get a nested value from an object using a dot-path string.
 * e.g. getPath({ a: { b: 1 } }, "a.b") => 1
 * Numeric path segments index into arrays: "author_name.0" => author_name[0]
 *
 * Rejects prototype-pollution paths (__proto__, constructor, prototype).
 */
export const getPath = (obj: Record<string, unknown>, path: string): unknown => {
  let current: unknown = obj;
  for (const segment of path.split('.')) {
    if (BLOCKED_PATH_SEGMENTS.has(segment)) return undefined;
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(segment, 10);
      current = isNaN(idx) ? undefined : current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};
