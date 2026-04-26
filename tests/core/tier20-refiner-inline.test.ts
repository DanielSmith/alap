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
import { protocolConfig, protocolHandlers } from '../fixtures/links-protocols';

/**
 * Tier 20: Inline refiners — refiners applied inside parenthesized groups,
 * allowing independent sorting/limiting per group before union/intersection.
 */

describe('Tier 20: Inline Refiners', () => {
  const engine = new AlapEngine(protocolConfig, { handlers: protocolHandlers });

  describe('refiners inside parenthesized groups', () => {
    it('(.nyc *sort:label*) — single group sorted', () => {
      const results = engine.resolve('(.nyc *sort:label*)');
      const labels = results.map(r => r.label);
      const expected = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      expect(labels).toEqual(expected);
    });

    it('(.nyc *sort:label*) | (.sf *sort:label*) — each group sorted independently', () => {
      const results = engine.resolve('(.nyc *sort:label*) | (.sf *sort:label*)');
      // NYC sorted: Blue Bottle, Brooklyn Bridge, Central Park, Manhattan Bridge, The High Line
      // SF sorted: Aqus Cafe, Dolores Park, Golden Gate
      // Union preserves group order, deduplicates (bluebottle is nyc+sf — appears from nyc group)
      const labels = results.map(r => r.label);
      expect(labels.length).toBeGreaterThan(0);
      // The nyc group items should appear sorted among themselves
      const nycLabels = results.filter(r => r.tags?.includes('nyc')).map(r => r.label);
      const sortedNyc = [...nycLabels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      // nyc items that appear first should be in sorted order
      expect(nycLabels).toEqual(sortedNyc);
    });

    it('(.nyc *sort:label* *limit:2*) | (.sf *limit:1*) — different limits per group', () => {
      const results = engine.resolve('(.nyc *sort:label* *limit:2*) | (.sf *limit:1*)');
      // NYC sorted and limited to 2
      // SF limited to 1
      // Total: at most 3 (may overlap if sf item is also nyc)
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.length).toBeGreaterThan(0);
    });

    it('(.coffee *sort:label* *limit:2*) | .car — refiner in one group, none in other', () => {
      const results = engine.resolve('(.coffee *sort:label* *limit:2*) | .car');
      // Coffee sorted limited 2: Acre Coffee, Aqus Cafe
      // Cars: vwbug, bmwe36, miata (insertion order)
      const labels = results.map(r => r.label);
      expect(labels.length).toBe(5);
      // First two should be the limited sorted coffee
      expect(labels[0]).toBe('Acre Coffee');
      expect(labels[1]).toBe('Aqus Cafe');
    });
  });

  describe('nested groups with refiners', () => {
    it('((.nyc + .bridge) *sort:label*) — nested group then refined', () => {
      const results = engine.resolve('((.nyc + .bridge) *sort:label*)');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Brooklyn Bridge', 'Manhattan Bridge']);
    });

    it('((.car *sort:label* *limit:2*) | .coffee) *limit:4*', () => {
      const results = engine.resolve('((.car *sort:label* *limit:2*) | .coffee) *limit:4*');
      // Inner: cars sorted limited 2 = BMW E36, Mazda Miata
      // Union with coffee: + Aqus, Blue Bottle, Acre
      // Outer limit 4: first 4 of the unioned set
      expect(results.length).toBeLessThanOrEqual(4);
    });

    it('(.car *limit:1*), (.coffee *limit:1*) — comma-separated groups with limits', () => {
      const results = engine.resolve('(.car *limit:1*), (.coffee *limit:1*)');
      // One car + one coffee = 2 items
      expect(results.length).toBe(2);
    });
  });

  describe('refiners preserve group independence', () => {
    it('(.bridge *sort:label* *reverse*) returns bridges Z-A', () => {
      const results = engine.resolve('(.bridge *sort:label* *reverse*)');
      const labels = results.map(r => r.label);
      const expected = [...labels].sort((a, b) => (b ?? '').localeCompare(a ?? ''));
      expect(labels).toEqual(expected);
    });

    it('(.nyc *skip:1* *limit:2*) paginates within group', () => {
      const all = engine.resolve('.nyc');
      const paged = engine.resolve('(.nyc *skip:1* *limit:2*)');
      expect(paged.length).toBe(2);
      // Should be items 2 and 3 from the full nyc set
      expect(paged.map(r => r.id)).toEqual(all.slice(1, 3).map(r => r.id));
    });

    it('(.coffee *sort:label*) | (.car *sort:label* *reverse*)', () => {
      const results = engine.resolve('(.coffee *sort:label*) | (.car *sort:label* *reverse*)');
      const labels = results.map(r => r.label);
      // Coffee sorted A-Z first, then cars sorted Z-A
      const coffeeLabels = ['Acre Coffee', 'Aqus Cafe', 'Blue Bottle'];
      const carLabels = ['VW Bug', 'Mazda Miata', 'BMW E36'];
      expect(labels.slice(0, 3)).toEqual(coffeeLabels);
      expect(labels.slice(3)).toEqual(carLabels);
    });
  });
});
