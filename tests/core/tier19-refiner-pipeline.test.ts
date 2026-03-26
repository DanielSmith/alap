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
 * Tier 19: Refiner pipeline — thorough testing of each refiner function:
 * sort, reverse, limit, skip, shuffle, unique.
 */

describe('Tier 19: Refiner Pipeline', () => {
  const engine = new AlapEngine(protocolConfig);

  describe('sort refiner', () => {
    it('*sort:label* sorts alphabetically by label', () => {
      const results = engine.resolve('.coffee *sort:label*');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Acre Coffee', 'Aqus Cafe', 'Blue Bottle']);
    });

    it('*sort:url* sorts alphabetically by URL', () => {
      const results = engine.resolve('.coffee *sort:url*');
      const urls = results.map(r => r.url);
      const expected = [...urls].sort((a, b) => a.localeCompare(b));
      expect(urls).toEqual(expected);
    });

    it('*sort:id* sorts alphabetically by item ID', () => {
      const results = engine.resolve('.car *sort:id*');
      const ids = results.map(r => r.id);
      expect(ids).toEqual(['bmwe36', 'miata', 'vwbug']);
    });

    it('default *sort* sorts by label', () => {
      const results = engine.resolve('.coffee *sort*');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Acre Coffee', 'Aqus Cafe', 'Blue Bottle']);
    });

    it('*sort:label* on cars', () => {
      const results = engine.resolve('.car *sort:label*');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['BMW E36', 'Mazda Miata', 'VW Bug']);
    });

    it('*sort:label* on nyc items', () => {
      const results = engine.resolve('.nyc *sort:label*');
      const labels = results.map(r => r.label);
      const expected = [...labels].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
      expect(labels).toEqual(expected);
    });
  });

  describe('reverse refiner', () => {
    it('*reverse* reverses insertion order', () => {
      const normal = engine.resolve('.coffee');
      const reversed = engine.resolve('.coffee *reverse*');
      expect(reversed.map(r => r.id)).toEqual([...normal.map(r => r.id)].reverse());
    });

    it('*sort:label* *reverse* produces Z-A order', () => {
      const results = engine.resolve('.coffee *sort:label* *reverse*');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Blue Bottle', 'Aqus Cafe', 'Acre Coffee']);
    });

    it('*reverse* *reverse* restores original order', () => {
      const normal = engine.resolve('.car');
      const doubleReversed = engine.resolve('.car *reverse* *reverse*');
      expect(doubleReversed.map(r => r.id)).toEqual(normal.map(r => r.id));
    });
  });

  describe('limit refiner', () => {
    it('*limit:1* returns exactly one result', () => {
      const results = engine.resolve('.car *limit:1*');
      expect(results).toHaveLength(1);
    });

    it('*limit:3* returns three results', () => {
      const results = engine.resolve('.nyc *limit:3*');
      expect(results).toHaveLength(3);
    });

    it('limit larger than result set returns all', () => {
      const all = engine.resolve('.coffee');
      const limited = engine.resolve('.coffee *limit:100*');
      expect(limited.length).toBe(all.length);
    });

    it('*sort:label* *limit:2* — sorted then truncated', () => {
      const results = engine.resolve('.car *sort:label* *limit:2*');
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['BMW E36', 'Mazda Miata']);
    });
  });

  describe('skip refiner', () => {
    it('*skip:1* skips first result', () => {
      const all = engine.resolve('.coffee *sort:label*');
      const skipped = engine.resolve('.coffee *sort:label* *skip:1*');
      expect(skipped.map(r => r.label)).toEqual(all.slice(1).map(r => r.label));
    });

    it('*skip:2* skips first two results', () => {
      const all = engine.resolve('.coffee *sort:label*');
      const skipped = engine.resolve('.coffee *sort:label* *skip:2*');
      expect(skipped).toHaveLength(1);
      expect(skipped[0].label).toBe('Blue Bottle');
    });

    it('skip beyond result length returns empty', () => {
      const results = engine.resolve('.coffee *skip:100*');
      expect(results).toEqual([]);
    });

    it('*skip:1* *limit:1* — pagination page 2 size 1', () => {
      const results = engine.resolve('.coffee *sort:label* *skip:1* *limit:1*');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Aqus Cafe');
    });
  });

  describe('skip + limit pagination', () => {
    it('*skip:0* *limit:2* — first page', () => {
      const results = engine.resolve('.nyc *sort:label* *skip:0* *limit:2*');
      expect(results).toHaveLength(2);
    });

    it('*skip:2* *limit:2* — second page', () => {
      const all = engine.resolve('.nyc *sort:label*');
      const page2 = engine.resolve('.nyc *sort:label* *skip:2* *limit:2*');
      const expected = all.slice(2, 4).map(r => r.label);
      expect(page2.map(r => r.label)).toEqual(expected);
    });
  });

  describe('shuffle refiner', () => {
    it('*shuffle* returns same items, same length', () => {
      const normal = engine.resolve('.nyc');
      const shuffled = engine.resolve('.nyc *shuffle*');
      expect(shuffled.length).toBe(normal.length);
      // Same items regardless of order
      expect(shuffled.map(r => r.id).sort()).toEqual(normal.map(r => r.id).sort());
    });

    it('*shuffle* *limit:2* shuffles then limits', () => {
      const results = engine.resolve('.nyc *shuffle* *limit:2*');
      expect(results).toHaveLength(2);
      // Each result should be a valid nyc item
      const allNyc = engine.resolve('.nyc').map(r => r.id);
      for (const r of results) {
        expect(allNyc).toContain(r.id);
      }
    });
  });

  describe('unique refiner', () => {
    it('*unique:url* deduplicates by URL', () => {
      // Create a config with duplicate URLs
      const config = {
        ...protocolConfig,
        allLinks: {
          ...protocolConfig.allLinks,
          aqus_dupe: {
            label: 'Aqus Duplicate',
            url: 'https://example.com/aqus', // same URL as aqus
            tags: ['coffee'],
          },
        },
      };
      const e = new AlapEngine(config);
      const results = e.resolve('.coffee *unique:url*');
      const urls = results.map(r => r.url);
      // No duplicate URLs
      expect(new Set(urls).size).toBe(urls.length);
    });

    it('*unique:label* deduplicates by label', () => {
      const config = {
        ...protocolConfig,
        allLinks: {
          ...protocolConfig.allLinks,
          aqus_dupe: {
            label: 'Aqus Cafe', // same label as aqus
            url: 'https://example.com/aqus-other',
            tags: ['coffee'],
          },
        },
      };
      const e = new AlapEngine(config);
      const results = e.resolve('.coffee *unique:label*');
      const labels = results.map(r => r.label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });
});
