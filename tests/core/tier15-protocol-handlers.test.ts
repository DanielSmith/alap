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
import type { AlapConfig } from '../../src/core/types';

/**
 * Tier 15: Protocol handlers — tests the behavior of each protocol handler
 * (time, price, location) including edge cases and error handling.
 */

describe('Tier 15: Protocol Handlers', () => {
  const engine = new AlapEngine(protocolConfig, { handlers: protocolHandlers });

  describe('time protocol', () => {
    it(':time:7d: returns items created within 7 days', () => {
      const ids = engine.query(':time:7d:');
      // Within 7 days: vwbug (5d), brooklyn (3d), highline (2d),
      // goldengate (1d), bluebottle (4d), aqus (7d)
      expect(ids).toContain('vwbug');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('highline');
      expect(ids).toContain('goldengate');
      expect(ids).toContain('bluebottle');
      // Older than 7 days:
      expect(ids).not.toContain('bmwe36');     // 60d
      expect(ids).not.toContain('centralpark'); // 100d
      expect(ids).not.toContain('acre');        // 50d
    });

    it(':time:30d: returns more items than :time:7d:', () => {
      const recent = engine.query(':time:7d:');
      const broader = engine.query(':time:30d:');
      expect(broader.length).toBeGreaterThan(recent.length);
      // 30d should include everything 7d has
      for (const id of recent) {
        expect(broader).toContain(id);
      }
    });

    it(':time:30d: includes mid-range items', () => {
      const ids = engine.query(':time:30d:');
      // miata (10d), manhattan (20d), dolores (15d) — all within 30d
      expect(ids).toContain('miata');
      expect(ids).toContain('manhattan');
      expect(ids).toContain('dolores');
      // bmwe36 (60d), centralpark (100d), acre (50d) — outside 30d
      expect(ids).not.toContain('bmwe36');
      expect(ids).not.toContain('centralpark');
      expect(ids).not.toContain('acre');
    });

    it(':time:7d:30d: range returns items between 7 and 30 days ago', () => {
      const ids = engine.query(':time:7d:30d:');
      // Between 7d and 30d: miata (10d), manhattan (20d), dolores (15d)
      expect(ids).toContain('miata');
      expect(ids).toContain('manhattan');
      expect(ids).toContain('dolores');
      // Within 7d — too recent:
      expect(ids).not.toContain('brooklyn');   // 3d
      expect(ids).not.toContain('goldengate'); // 1d
      // Older than 30d:
      expect(ids).not.toContain('bmwe36');     // 60d
      expect(ids).not.toContain('acre');       // 50d
    });

    it(':time:2d: returns items from the last 2 days', () => {
      const ids = engine.query(':time:2d:');
      // goldengate is 1d old — should match
      expect(ids).toContain('goldengate');
      // highline is 2d old — boundary, may or may not match
      // brooklyn is 3d old — should not match
      expect(ids).not.toContain('brooklyn');
    });

    it(':time:365d: returns all items with timestamps', () => {
      const ids = engine.query(':time:365d:');
      // All items have createdAt and are within 365 days
      expect(ids).toContain('vwbug');
      expect(ids).toContain('bmwe36');
      expect(ids).toContain('centralpark');
      expect(ids).toContain('acre');
    });

    it('excludes items without createdAt', () => {
      const config: AlapConfig = {
        protocols: protocolConfig.protocols,
        allLinks: {
          withDate: {
            label: 'Has Date',
            url: 'https://example.com/a',
            createdAt: Date.now() - 1000,
          },
          noDate: {
            label: 'No Date',
            url: 'https://example.com/b',
          },
        },
      };
      const e = new AlapEngine(config, { handlers: protocolHandlers });
      const ids = e.query(':time:7d:');
      expect(ids).toContain('withDate');
      expect(ids).not.toContain('noDate');
    });
  });

  describe('price protocol', () => {
    it(':price:0:10: returns items with price 0-10', () => {
      const ids = engine.query(':price:0:10:');
      // aqus ($5), bluebottle ($6), acre ($4)
      expect(ids).toContain('aqus');
      expect(ids).toContain('bluebottle');
      expect(ids).toContain('acre');
      // Cars are way more expensive
      expect(ids).not.toContain('vwbug');
      expect(ids).not.toContain('bmwe36');
    });

    it(':price:20000:30000: returns cars in that price range', () => {
      const ids = engine.query(':price:20000:30000:');
      // bmwe36 ($25000), miata ($20000)
      expect(ids).toContain('bmwe36');
      expect(ids).toContain('miata');
      // vwbug ($15000) is below range
      expect(ids).not.toContain('vwbug');
    });

    it(':price:10000:20000: includes boundary values', () => {
      const ids = engine.query(':price:10000:20000:');
      // vwbug ($15000), miata ($20000 — on boundary)
      expect(ids).toContain('vwbug');
      expect(ids).toContain('miata');
      // bmwe36 ($25000) is above range
      expect(ids).not.toContain('bmwe36');
    });

    it(':price:0:3: returns empty when no items match', () => {
      const ids = engine.query(':price:0:3:');
      // No items have price <= 3
      expect(ids).toEqual([]);
    });

    it('excludes items without price metadata', () => {
      const ids = engine.query(':price:0:999999:');
      // Only items with meta.price: vwbug, bmwe36, miata, aqus, bluebottle, acre
      expect(ids).not.toContain('brooklyn');
      expect(ids).not.toContain('highline');
      expect(ids).not.toContain('goldengate');
    });
  });

  describe('location protocol', () => {
    it(':location: returns items that have location metadata', () => {
      const ids = engine.query(':location:');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).toContain('goldengate');
      expect(ids.length).toBe(3);
    });

    it(':location: excludes items without location', () => {
      const ids = engine.query(':location:');
      expect(ids).not.toContain('highline');
      expect(ids).not.toContain('vwbug');
      expect(ids).not.toContain('aqus');
      expect(ids).not.toContain('acre');
    });

    it(':location:radius:lat,lng:5mi: returns items within 5 miles', () => {
      // Brooklyn Bridge (40.7061, -73.9969) is the anchor
      const ids = engine.query(':location:radius:40.7061,-73.9969:5mi:');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan'); // ~0.5mi away
      expect(ids).not.toContain('goldengate'); // SF, ~2500mi away
    });

    it(':location:radius: with km unit', () => {
      const ids = engine.query(':location:radius:40.7061,-73.9969:10km:');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).not.toContain('goldengate');
    });

    it(':location:radius: returns nothing when radius is too small', () => {
      const ids = engine.query(':location:radius:0,0:1mi:');
      expect(ids).toEqual([]);
    });

    it(':location:bbox:sw:ne: returns items inside the box', () => {
      // NYC bbox covers brooklyn + manhattan but not SF
      const ids = engine.query(':location:bbox:40.6,-74.1:40.8,-73.9:');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).not.toContain('goldengate');
    });

    it(':location:bbox: corner order is normalized', () => {
      // Pass NE,SW instead of SW,NE — handler should min/max them
      const ids = engine.query(':location:bbox:40.8,-73.9:40.6,-74.1:');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
    });

    it(':location:unknown: returns empty for unknown sub-mode', () => {
      const ids = engine.query(':location:unknown:foo:');
      expect(ids).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('unknown protocol returns empty', () => {
      const ids = engine.query(':nonexistent:');
      expect(ids).toEqual([]);
    });

    it('protocol with no handler returns empty', () => {
      const config: AlapConfig = {
        protocols: {
          broken: {} as any,
        },
        allLinks: {
          item: { label: 'Test', url: 'https://example.com' },
        },
      };
      const e = new AlapEngine(config);
      const ids = e.query(':broken:');
      expect(ids).toEqual([]);
    });

    it('protocol handler that throws is caught gracefully', () => {
      const config: AlapConfig = {
        allLinks: {
          item: { label: 'Test', url: 'https://example.com' },
        },
      };
      const e = new AlapEngine(config, {
        handlers: {
          bomb: { filter: () => { throw new Error('kaboom'); } },
        },
      });
      const ids = e.query(':bomb:');
      expect(ids).toEqual([]);
    });

    it('config with no protocols section handles protocol syntax gracefully', () => {
      const config: AlapConfig = {
        allLinks: {
          item: { label: 'Test', url: 'https://example.com' },
        },
      };
      const e = new AlapEngine(config);
      const ids = e.query(':time:7d:');
      expect(ids).toEqual([]);
    });
  });

  describe('ISO date args with hyphens', () => {
    it(':time:2025-01-01: — absolute date with hyphens passes through tokenizer', () => {
      // Hyphens in "2025-01-01" must not be parsed as the WITHOUT operator.
      // All test items have createdAt relative to now, so a past date should match most.
      const ids = engine.query(':time:2025-01-01:');
      expect(ids.length).toBeGreaterThan(0);
    });

    it(':time:2020-01-01:2024-12-31: — date range with hyphens', () => {
      // Range in the past — no test items should match (all are recent)
      const ids = engine.query(':time:2020-01-01:2024-12-31:');
      expect(ids).toEqual([]);
    });

    it(':time:2025-01-01: + .coffee — ISO date composed with tag', () => {
      // Verifies the protocol token ends cleanly and the + operator works after it
      const ids = engine.query(':time:2025-01-01: + .coffee');
      for (const id of ids) {
        expect(engine.resolve(id)[0]?.tags).toContain('coffee');
      }
    });
  });
});
