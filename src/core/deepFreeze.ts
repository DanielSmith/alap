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
 * Recursively Object.freeze an object graph.
 *
 * Cycles are handled implicitly by the `isFrozen` early return — once a
 * node has been frozen, revisiting it short-circuits. This matters because
 * `deepCloneData` rejects cycles at clone time, but `deepFreeze` is also
 * used in paths (like author configs passed straight to the engine) that
 * skip cloning, so callers may hand us self-referential structures.
 *
 * Non-object values pass through untouched. Functions are frozen as
 * objects (their own properties become read-only) but remain callable —
 * relevant during the migration window before handlers-out-of-config
 * fully lands.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;

  Object.freeze(value);

  for (const key of Object.getOwnPropertyNames(value)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && (typeof child === 'object' || typeof child === 'function')) {
      deepFreeze(child);
    }
  }

  return value;
}
