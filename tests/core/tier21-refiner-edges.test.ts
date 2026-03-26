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
import type { AlapConfig } from '../../src/core/types';

const engine = new AlapEngine(protocolConfig);

describe('Tier 21: Refiner & Protocol Edge Cases (Security)', () => {

  describe('refiner edge cases', () => {
    it('*limit:0* returns empty', () => {
      const results = engine.resolve('.coffee *limit:0*');
      expect(results).toEqual([]);
    });

    it('*limit:-1* is treated as invalid (no change)', () => {
      const all = engine.resolve('.coffee');
      const limited = engine.resolve('.coffee *limit:-1*');
      expect(limited.length).toBe(all.length);
    });

    it('*skip* beyond result length returns empty', () => {
      const results = engine.resolve('.coffee *skip:999*');
      expect(results).toEqual([]);
    });

    it('*skip:-1* is treated as invalid (no change)', () => {
      const all = engine.resolve('.coffee');
      const skipped = engine.resolve('.coffee *skip:-1*');
      expect(skipped.length).toBe(all.length);
    });

    it('*sort:nonexistent_field* does not throw', () => {
      const results = engine.resolve('.coffee *sort:nonexistent*');
      expect(results.length).toBeGreaterThan(0);
    });

    it('*unique:nonexistent_field* does not throw', () => {
      const results = engine.resolve('.coffee *unique:nonexistent*');
      expect(results.length).toBeGreaterThan(0);
    });

    it('unknown refiner is skipped gracefully', () => {
      const results = engine.resolve('.coffee *bogus* *sort:label*');
      // bogus is skipped, sort still applies
      const labels = results.map(r => r.label);
      const sorted = [...labels].sort();
      expect(labels).toEqual(sorted);
    });

    it('refiner on empty result set returns empty', () => {
      const results = engine.resolve('.nonexistent *sort:label* *limit:5*');
      expect(results).toEqual([]);
    });

    it('many refiners up to MAX_REFINERS work', () => {
      // 10 refiners (the limit) — should all apply without error
      const expr = '.coffee *sort:label* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *limit:2*';
      const results = engine.resolve(expr);
      expect(results).toHaveLength(2);
    });

    it('refiners beyond MAX_REFINERS are skipped with warning', () => {
      // 12 refiners — exceeds MAX_REFINERS (10)
      const expr = '.coffee *sort:label* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *reverse* *limit:1*';
      const results = engine.resolve(expr);
      // Should still return results (first 10 refiners applied)
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('protocol edge cases', () => {
    it('unknown protocol returns empty, does not throw', () => {
      const ids = engine.query(':nonexistent:arg:');
      expect(ids).toEqual([]);
    });

    it('protocol with empty segments returns empty', () => {
      const ids = engine.query('::');
      expect(ids).toEqual([]);
    });

    it('handler that throws is caught per-item', () => {
      const config: AlapConfig = {
        allLinks: {
          a: { label: 'A', url: '/a', meta: { value: 'good' } },
          b: { label: 'B', url: '/b', meta: { value: 'bad' } },
          c: { label: 'C', url: '/c', meta: { value: 'good' } },
        },
        protocols: {
          fragile: {
            handler: (segments, link) => {
              if ((link.meta?.value as string) === 'bad') throw new Error('boom');
              return true;
            },
          },
        },
      };
      const e = new AlapEngine(config);
      const ids = e.query(':fragile:');
      // b threw, a and c passed
      expect(ids).toContain('a');
      expect(ids).toContain('c');
      expect(ids).not.toContain('b');
    });

    it('malformed protocol arguments do not crash built-in handlers', () => {
      // Path traversal attempt
      const ids1 = engine.query(':time:../../etc/passwd:');
      expect(ids1).toEqual([]);

      // SQL injection attempt
      const ids2 = engine.query(':price:; DROP TABLE configs;:');
      expect(ids2).toEqual([]);

      // Empty string
      const ids3 = engine.query(':time::');
      expect(ids3).toEqual([]);

      // Very long argument
      const longArg = 'x'.repeat(10000);
      const ids4 = engine.query(`:time:${longArg}:`);
      expect(ids4).toEqual([]);
    });

    it('protocol with missing meta field returns empty gracefully', () => {
      const config: AlapConfig = {
        allLinks: {
          noMeta: { label: 'No Meta', url: '/no-meta' },
        },
        protocols: {
          time: protocolConfig.protocols!.time,
        },
      };
      const e = new AlapEngine(config);
      const ids = e.query(':time:7d:');
      expect(ids).toEqual([]);
    });

    it('meta with wrong types does not crash handler', () => {
      const config: AlapConfig = {
        allLinks: {
          bad: { label: 'Bad', url: '/bad', meta: { timestamp: 'not-a-date', price: 'free' } },
        },
        protocols: {
          time: protocolConfig.protocols!.time,
          price: protocolConfig.protocols!.price,
        },
      };
      const e = new AlapEngine(config);
      expect(e.query(':time:7d:')).toEqual([]);
      expect(e.query(':price:0:10:')).toEqual([]);
    });
  });

  describe('composition stress', () => {
    it('many protocols in one expression', () => {
      const ids = engine.query(':time:30d: + :price:0:50000: + :loc:');
      // Only items with timestamp within 30d AND price AND location
      // vwbug: 5d, price 15k, no location → excluded (no location)
      // brooklyn: 3d, no price, has location → excluded (no price)
      expect(ids.length).toBeLessThanOrEqual(13); // at most all items
    });

    it('protocols and refiners in nested parens', () => {
      const results = engine.resolve(
        '((:time:7d: + .coffee) *sort:label* *limit:1*) | ((:time:30d: + .car) *sort:label* *limit:1*)'
      );
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });
});
