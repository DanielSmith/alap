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

import type { AlapConfig } from './types';

/** Keys that must never be copied during object merging (prototype pollution defense). */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Copy own enumerable keys from src to dest, skipping prototype-pollution vectors. */
function safeMerge<T extends Record<string, unknown>>(dest: T, src: Record<string, unknown>): T {
  for (const key of Object.keys(src)) {
    if (!BLOCKED_KEYS.has(key)) {
      (dest as Record<string, unknown>)[key] = src[key];
    }
  }
  return dest;
}

/**
 * Merge multiple configs into one. Later configs win on collision.
 *
 * - settings: shallow merge (later values override earlier)
 * - macros: shallow merge by name (later wins)
 * - allLinks: shallow merge by ID (later wins)
 * - searchPatterns: shallow merge by name (later wins)
 *
 * Returns a new object — inputs are not mutated.
 */
export function mergeConfigs(...configs: AlapConfig[]): AlapConfig {
  const merged: AlapConfig = { allLinks: {} };

  for (const config of configs) {
    if (config.settings) {
      merged.settings = safeMerge({ ...merged.settings } as Record<string, unknown>, config.settings) as AlapConfig['settings'];
    }
    if (config.macros) {
      merged.macros = safeMerge({ ...merged.macros } as Record<string, unknown>, config.macros) as AlapConfig['macros'];
    }
    if (config.searchPatterns) {
      merged.searchPatterns = safeMerge({ ...merged.searchPatterns } as Record<string, unknown>, config.searchPatterns) as AlapConfig['searchPatterns'];
    }
    safeMerge(merged.allLinks as Record<string, unknown>, config.allLinks);
  }

  return merged;
}
