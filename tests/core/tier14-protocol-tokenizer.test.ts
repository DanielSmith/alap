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
 * Tier 14: Protocol tokenizer — verifies that :protocol: syntax is correctly
 * parsed and resolved through the full query pipeline.
 */

describe('Tier 14: Protocol Tokenizer', () => {
  const engine = new AlapEngine(protocolConfig, { handlers: protocolHandlers });

  describe('basic protocol parsing', () => {
    it(':time:7d: resolves to items created within 7 days', () => {
      const ids = engine.query(':time:7d:');
      expect(ids.length).toBeGreaterThan(0);
      // vwbug (5d), brooklyn (3d), highline (2d), goldengate (1d), bluebottle (4d), aqus (7d)
      expect(ids).toContain('vwbug');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('highline');
      expect(ids).toContain('goldengate');
      expect(ids).toContain('bluebottle');
    });

    it(':price:10:50: resolves to items with price between 10 and 50', () => {
      const ids = engine.query(':price:10:50:');
      // vwbug (15000), bmwe36 (25000), miata (20000) — all > 50
      // aqus (5), bluebottle (6), acre (4) — all < 10
      expect(ids).toEqual([]);
    });

    it(':price:0:10: resolves to items with price 0-10', () => {
      const ids = engine.query(':price:0:10:');
      expect(ids).toContain('aqus');
      expect(ids).toContain('bluebottle');
      expect(ids).toContain('acre');
    });

    it(':location: resolves to items with location metadata', () => {
      const ids = engine.query(':location:');
      // brooklyn, manhattan, goldengate have location
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).toContain('goldengate');
      expect(ids).not.toContain('highline');
      expect(ids).not.toContain('vwbug');
    });
  });

  describe('protocol adjacent to operators', () => {
    it('.coffee + :time:7d: — tag AND protocol', () => {
      const ids = engine.query('.coffee + :time:7d:');
      // coffee items created within 7 days
      // aqus (7d, coffee), bluebottle (4d, coffee)
      // acre (50d, coffee) — too old
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('acre');
    });

    it(':time:7d: + .nyc — protocol AND tag', () => {
      const ids = engine.query(':time:7d: + .nyc');
      // Items within 7 days AND tagged nyc
      // brooklyn (3d, nyc), highline (2d, nyc), bluebottle (4d, nyc)
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('highline');
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('goldengate'); // sf, not nyc
    });

    it(':time:7d: | .car — protocol OR tag', () => {
      const ids = engine.query(':time:7d: | .car');
      // Union of recent items and all cars
      expect(ids).toContain('vwbug');     // recent AND car
      expect(ids).toContain('bmwe36');    // car (60d old)
      expect(ids).toContain('miata');     // car (10d old)
      expect(ids).toContain('goldengate'); // recent (1d)
    });

    it(':time:7d: - .coffee — protocol WITHOUT tag', () => {
      const ids = engine.query(':time:7d: - .coffee');
      // Recent items minus coffee ones
      expect(ids).not.toContain('aqus');
      expect(ids).not.toContain('bluebottle');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('goldengate');
    });
  });

  describe('protocol in parentheses', () => {
    it('(:time:7d: + .nyc) resolves correctly', () => {
      const ids = engine.query('(:time:7d: + .nyc)');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('highline');
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('goldengate');
    });

    it('(:time:7d:) | .car — grouped protocol OR tag', () => {
      const ids = engine.query('(:time:7d:) | .car');
      expect(ids).toContain('vwbug');
      expect(ids).toContain('bmwe36');
      expect(ids).toContain('goldengate');
    });
  });

  describe('multiple protocols', () => {
    it(':time:7d: + :price:0:10: — time AND price', () => {
      const ids = engine.query(':time:7d: + :price:0:10:');
      // Recent items with low price
      // aqus (7d, $5), bluebottle (4d, $6)
      // acre is 50d old — excluded by time
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('acre');
    });

    it(':time:7d: + :location: — time AND location', () => {
      const ids = engine.query(':time:7d: + :location:');
      // Recent items with location
      // brooklyn (3d, has loc), goldengate (1d, has loc)
      // manhattan (20d) — too old
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('goldengate');
      expect(ids).not.toContain('manhattan');
    });
  });

  describe('edge cases', () => {
    it('empty protocol :: produces no results gracefully', () => {
      const ids = engine.query('::');
      expect(ids).toEqual([]);
    });

    it('unknown protocol returns empty', () => {
      const ids = engine.query(':unknown:');
      expect(ids).toEqual([]);
    });

    it('negative coordinates in protocol args are not parsed as WITHOUT operator', () => {
      // :location:radius:40.7,-74.0:5mi: — the -74.0 must stay inside the protocol segment
      // not be split into a minus operator
      const ids = engine.query(':location:radius:40.7,-74.0:5mi:');
      // brooklyn and manhattan are within 5mi of (40.7, -74.0); goldengate is in SF
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).not.toContain('goldengate');
    });

    it('bounding box with negative coords parses correctly', () => {
      // :location:bbox:40.7,-74.0:40.8,-73.9: — two coordinate pairs with negative longitudes
      const ids = engine.query(':location:bbox:40.7,-74.0:40.8,-73.9:');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).not.toContain('goldengate');
    });
  });
});
