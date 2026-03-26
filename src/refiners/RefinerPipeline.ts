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

import type { ResolvedLink } from '../core/types';
import { warn } from '../core/logger';

/**
 * A single refiner step: name and arguments parsed from `*name:arg1:arg2*`.
 */
export interface RefinerStep {
  name: string;
  args: string[];
}

/**
 * Parse a refiner token value (e.g. "sort:label") into a RefinerStep.
 */
export const parseRefinerStep = (value: string): RefinerStep => {
  const parts = value.split(':');
  return { name: parts[0], args: parts.slice(1) };
};

/**
 * Apply a sequence of refiners to a link array.
 * Each refiner is a pure set-level operation (sort, limit, shuffle, etc.).
 * Returns the refined array.
 */
export const applyRefiners = (links: ResolvedLink[], steps: RefinerStep[]): ResolvedLink[] => {
  let result = links;

  for (const step of steps) {
    switch (step.name) {
      case 'sort': {
        const field = step.args[0] || 'label';
        result = [...result].sort((a, b) => {
          const aVal = field === 'id' ? a.id : String((a as unknown as Record<string, unknown>)[field] ?? '');
          const bVal = field === 'id' ? b.id : String((b as unknown as Record<string, unknown>)[field] ?? '');
          return aVal.localeCompare(bVal);
        });
        break;
      }
      case 'reverse':
        result = [...result].reverse();
        break;
      case 'limit': {
        const n = parseInt(step.args[0], 10);
        if (n >= 0 && !isNaN(n)) result = result.slice(0, n);
        break;
      }
      case 'skip': {
        const n = parseInt(step.args[0], 10);
        if (n > 0) result = result.slice(n);
        break;
      }
      case 'shuffle': {
        result = [...result];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        break;
      }
      case 'unique': {
        const field = step.args[0] || 'url';
        const seen = new Set<string>();
        result = result.filter(link => {
          const val = field === 'id' ? link.id : String((link as unknown as Record<string, unknown>)[field] ?? '');
          if (seen.has(val)) return false;
          seen.add(val);
          return true;
        });
        break;
      }
      default:
        warn(`Unknown refiner "${step.name}" — skipping`);
    }
  }

  return result;
};
