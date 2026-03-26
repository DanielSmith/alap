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

import { describe, it, expect } from 'vitest';
import { AlapEngine } from '../../src/core/AlapEngine';
import { protocolConfig } from '../fixtures/links-protocols';

/**
 * Tier 18: Refiner tokenizer — verifies that *refiner* syntax is correctly
 * parsed and applied to query results through the full pipeline.
 */

describe('Tier 18: Refiner Tokenizer', () => {
  const engine = new AlapEngine(protocolConfig);

  describe('basic refiner parsing', () => {
    it('.coffee *sort:label* returns results sorted by label', () => {
      const results = engine.resolve('.coffee *sort:label*');
      const labels = results.map(r => r.label);
      // Alphabetical: Acre Coffee, Aqus Cafe, Blue Bottle
      expect(labels).toEqual(['Acre Coffee', 'Aqus Cafe', 'Blue Bottle']);
    });

    it('.coffee *reverse* reverses the result order', () => {
      const normal = engine.resolve('.coffee');
      const reversed = engine.resolve('.coffee *reverse*');
      const normalLabels = normal.map(r => r.label);
      const reversedLabels = reversed.map(r => r.label);
      expect(reversedLabels).toEqual([...normalLabels].reverse());
    });

    it('.coffee *limit:2* returns only 2 results', () => {
      const results = engine.resolve('.coffee *limit:2*');
      expect(results).toHaveLength(2);
    });

    it('.coffee *sort:label* *limit:2* sorts then limits', () => {
      const results = engine.resolve('.coffee *sort:label* *limit:2*');
      const labels = results.map(r => r.label);
      // Sorted: Acre Coffee, Aqus Cafe, Blue Bottle → limited to first 2
      expect(labels).toEqual(['Acre Coffee', 'Aqus Cafe']);
    });
  });

  describe('refiner edge cases', () => {
    it('*sort:label* alone with no selection returns empty', () => {
      const results = engine.resolve('*sort:label*');
      expect(results).toEqual([]);
    });

    it('multiple refiners chained: *sort:label* *reverse* *limit:1*', () => {
      const results = engine.resolve('.coffee *sort:label* *reverse* *limit:1*');
      const labels = results.map(r => r.label);
      // Sorted A-Z then reversed = Z-A, limited to 1
      expect(labels).toEqual(['Blue Bottle']);
    });

    it('unknown refiner is skipped gracefully', () => {
      const results = engine.resolve('.coffee *bogus:foo*');
      // Should still return coffee items, just without the unknown refiner applied
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.id)).toContain('aqus');
    });

    it('refiner with tag produces correct count', () => {
      const all = engine.resolve('.car');
      const limited = engine.resolve('.car *limit:1*');
      expect(all.length).toBe(3);
      expect(limited.length).toBe(1);
    });

    it('refiner does not affect query() ID results', () => {
      const ids = engine.query('.coffee *sort:label*');
      // query() returns IDs — sort refiner should still affect order
      expect(ids.length).toBe(3);
    });

    it('limit larger than result set returns all', () => {
      const results = engine.resolve('.coffee *limit:100*');
      expect(results.length).toBe(3);
    });

    it('.car *sort:label* *limit:2* sorts cars then limits', () => {
      const results = engine.resolve('.car *sort:label* *limit:2*');
      const labels = results.map(r => r.label);
      // Sorted: BMW E36, Mazda Miata, VW Bug → limited to 2
      expect(labels).toEqual(['BMW E36', 'Mazda Miata']);
    });
  });
});
