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
 * Tier 22: Protocols and refiners together — full integration testing of
 * protocol handlers composed with refiner pipelines, macros, and groups.
 */

describe('Tier 22: Protocols and Refiners', () => {
  const engine = new AlapEngine(protocolConfig);

  describe('protocol results refined', () => {
    it('.coffee + :time:7d: *sort:label* — recent coffee, sorted', () => {
      const results = engine.resolve('.coffee + :time:7d: *sort:label*');
      const labels = results.map(r => r.label);
      // Recent coffee (within 7d): aqus (7d), bluebottle (4d)
      // Sorted by label: Aqus Cafe, Blue Bottle
      for (const r of results) {
        expect(r.tags).toContain('coffee');
      }
      const expected = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      expect(labels).toEqual(expected);
    });

    it('.car + :price:10000:20000: *sort:label* — cars in price range, sorted', () => {
      const results = engine.resolve('.car + :price:10000:20000: *sort:label*');
      const labels = results.map(r => r.label);
      // Cars 10k-20k: vwbug ($15000), miata ($20000)
      // Sorted: Mazda Miata, VW Bug
      expect(labels).toEqual(['Mazda Miata', 'VW Bug']);
    });

    it('.car + :price:10000:20000: *sort:label* *limit:1* — sorted and limited', () => {
      const results = engine.resolve('.car + :price:10000:20000: *sort:label* *limit:1*');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Mazda Miata');
    });

    it(':time:30d: *sort:label* *limit:3* — recent items sorted and limited', () => {
      const results = engine.resolve(':time:30d: *sort:label* *limit:3*');
      expect(results).toHaveLength(3);
      const labels = results.map(r => r.label);
      const expected = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      expect(labels).toEqual(expected);
    });

    it(':loc: *sort:label* — items with location, sorted', () => {
      const results = engine.resolve(':loc: *sort:label*');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Brooklyn Bridge', 'Golden Gate', 'Manhattan Bridge']);
    });
  });

  describe('protocols with refiners in groups', () => {
    it('(.coffee + :time:30d: *sort:label*) | (.car *limit:1*)', () => {
      const results = engine.resolve('(.coffee + :time:30d: *sort:label*) | (.car *limit:1*)');
      // Coffee within 30d sorted: aqus (7d), bluebottle (4d) → Aqus Cafe, Blue Bottle
      // Plus one car
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.length).toBeLessThanOrEqual(4);
      // First items should be the sorted coffee
      const coffeeResults = results.filter(r => r.tags?.includes('coffee'));
      const coffeeLabels = coffeeResults.map(r => r.label);
      const sortedCoffee = [...coffeeLabels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      expect(coffeeLabels).toEqual(sortedCoffee);
    });

    it('(:time:7d: + .nyc *sort:label*) | (:price:10000:20000: *sort:label*)', () => {
      const results = engine.resolve('(:time:7d: + .nyc *sort:label*) | (:price:10000:20000: *sort:label*)');
      // Group 1: recent nyc sorted — Blue Bottle, Brooklyn Bridge, The High Line
      // Group 2: price 10k-20k sorted — Mazda Miata, VW Bug
      expect(results.length).toBeGreaterThan(0);
      // All results should be from one of those two groups
      for (const r of results) {
        const isRecentNyc = r.tags?.includes('nyc');
        const hasMidPrice = r.meta?.price !== undefined &&
          (r.meta.price as number) >= 10000 && (r.meta.price as number) <= 20000;
        expect(isRecentNyc || hasMidPrice).toBe(true);
      }
    });

    it('(.bridge + :loc: *sort:label* *limit:2*) — protocol in group with refiners', () => {
      const results = engine.resolve('(.bridge + :loc: *sort:label* *limit:2*)');
      // Bridges with location: brooklyn, manhattan, goldengate
      // Sorted: Brooklyn Bridge, Golden Gate, Manhattan Bridge → limited to 2
      expect(results).toHaveLength(2);
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Brooklyn Bridge', 'Golden Gate']);
    });
  });

  describe('macros with refiners', () => {
    it('@sorted_coffee expands to .coffee *sort:label*', () => {
      const results = engine.resolve('@sorted_coffee');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Acre Coffee', 'Aqus Cafe', 'Blue Bottle']);
    });

    it('@top2_nyc expands to .nyc *sort:label* *limit:2*', () => {
      const results = engine.resolve('@top2_nyc');
      expect(results).toHaveLength(2);
      const labels = results.map(r => r.label);
      // NYC sorted by label: Blue Bottle, Brooklyn Bridge, Central Park, Manhattan Bridge, The High Line
      // Limited to 2: Blue Bottle, Brooklyn Bridge
      expect(labels).toEqual(['Blue Bottle', 'Brooklyn Bridge']);
    });

    it('@sorted_coffee + :time:7d: — refiner in macro interrupts segment', () => {
      // sorted_coffee expands to ".coffee *sort:label*"
      // Full expression: ".coffee *sort:label* + :time:7d:"
      // The refiner terminates the segment at ".coffee *sort:label*"
      // The "+ :time:7d:" becomes orphaned (no left operand for +)
      // Result: all coffee, sorted by label
      const results = engine.resolve('@sorted_coffee + :time:7d:');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Acre Coffee', 'Aqus Cafe', 'Blue Bottle']);
    });

    it('(@sorted_coffee) + :time:7d: — parens isolate the macro refiner', () => {
      // Wrapping in parens: "(.coffee *sort:label*) + :time:7d:"
      // Group resolves and sorts coffee, then intersects with :time:7d:
      const results = engine.resolve('(@sorted_coffee) + :time:7d:');
      for (const r of results) {
        expect(r.tags).toContain('coffee');
      }
      expect(results.map(r => r.id)).not.toContain('acre');
    });

    it('@top2_nyc | .car — refiner in macro interrupts segment', () => {
      // top2_nyc expands to ".nyc *sort:label* *limit:2*"
      // Full: ".nyc *sort:label* *limit:2* | .car"
      // Refiners terminate the segment at ".nyc *sort:label* *limit:2*"
      // The "| .car" is orphaned
      const results = engine.resolve('@top2_nyc | .car');
      // Result: just the 2 sorted NYC items
      expect(results.length).toBe(2);
    });

    it('(@top2_nyc) | .car — parens isolate the macro refiners', () => {
      // "(.nyc *sort:label* *limit:2*) | .car"
      const results = engine.resolve('(@top2_nyc) | .car');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.map(r => r.id)).toContain('vwbug');
    });
  });

  describe('complex compositions', () => {
    it('.car + :price:10000:20000: *sort:label* *reverse* — reverse sorted', () => {
      const results = engine.resolve('.car + :price:10000:20000: *sort:label* *reverse*');
      const labels = results.map(r => r.label);
      // Sorted Z-A: VW Bug, Mazda Miata
      expect(labels).toEqual(['VW Bug', 'Mazda Miata']);
    });

    it(':time:30d: - .car *sort:label* *skip:1* *limit:2* — full pipeline', () => {
      const results = engine.resolve(':time:30d: - .car *sort:label* *skip:1* *limit:2*');
      // Items within 30d minus cars, sorted, skip 1, limit 2
      expect(results).toHaveLength(2);
      const labels = results.map(r => r.label);
      const sorted = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      expect(labels).toEqual(sorted);
    });

    it('(:loc: *sort:label*), (@sorted_coffee *limit:1*) — groups with different refiners', () => {
      const results = engine.resolve('(:loc: *sort:label*), (@sorted_coffee *limit:1*)');
      // loc sorted: Brooklyn Bridge, Golden Gate, Manhattan Bridge
      // sorted_coffee limited 1: Acre Coffee
      const labels = results.map(r => r.label);
      expect(labels).toContain('Brooklyn Bridge');
      expect(labels).toContain('Acre Coffee');
    });

    it('(.coffee + :price:0:5: *sort:label*) | (.car + :price:10000:20000: *sort:label* *reverse*)', () => {
      // Cheap coffee sorted A-Z, union with mid-range cars sorted Z-A
      const results = engine.resolve('(.coffee + :price:0:5: *sort:label*) | (.car + :price:10000:20000: *sort:label* *reverse*)');
      const ids = results.map(r => r.id);
      // Cheap coffee (price <= 5): acre (4), aqus (5) → sorted: Acre, Aqus
      // Mid-range cars (10k-20k): vwbug (15k), miata (20k) → sorted reverse: VW Bug, Mazda Miata
      expect(ids).toContain('acre');
      expect(ids).toContain('aqus');
      expect(ids).toContain('vwbug');
      expect(ids).toContain('miata');
      expect(ids).not.toContain('bmwe36'); // 25k, out of range
      expect(ids).not.toContain('bluebottle'); // price 6, out of range
    });

    it('(:time:7d: + .nyc *sort:label*) | (:time:7d: + .sf *sort:label*) — recent items by city', () => {
      // Recent NYC sorted, union with recent SF sorted
      const results = engine.resolve('(:time:7d: + .nyc *sort:label*) | (:time:7d: + .sf *sort:label*)');
      const labels = results.map(r => r.label);
      // Recent NYC (within 7d): brooklyn (3d), highline (2d), bluebottle (4d, tagged nyc)
      // Recent SF (within 7d): goldengate (1d), aqus (7d), bluebottle (4d, tagged sf)
      expect(labels.length).toBeGreaterThanOrEqual(3);
      expect(labels).toContain('Golden Gate');
      expect(labels).toContain('Brooklyn Bridge');
    });

    it('.bridge *sort:label* *unique:url* *limit:2* — chained refiners on bridges', () => {
      const results = engine.resolve('.bridge *sort:label* *unique:url* *limit:2*');
      expect(results).toHaveLength(2);
      const labels = results.map(r => r.label);
      // All bridges sorted: Brooklyn Bridge, Golden Gate, Manhattan Bridge
      // unique:url is a no-op (all different URLs), limit:2
      expect(labels).toEqual(['Brooklyn Bridge', 'Golden Gate']);
    });

    it('(.nyc *limit:3* *sort:label*) - .bridge — refine then subtract', () => {
      // Get 3 NYC items, sort them, then subtract bridges
      // This tests that the paren group with refiners produces a clean ID set
      // that the outer subtraction can work with
      const results = engine.resolve('(.nyc *limit:3* *sort:label*) - .bridge');
      for (const r of results) {
        expect(r.tags).not.toContain('bridge');
      }
    });
  });
});
