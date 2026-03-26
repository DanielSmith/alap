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
 * Tier 17: Protocol composition — protocols combined with tags, operators,
 * parentheses, macros, and other expression features.
 */

describe('Tier 17: Protocol Composition', () => {
  const engine = new AlapEngine(protocolConfig);

  describe('protocol AND tag', () => {
    it('.coffee + :time:7d: — recent coffee shops', () => {
      const ids = engine.query('.coffee + :time:7d:');
      // coffee: aqus (7d), bluebottle (4d), acre (50d)
      // within 7d: aqus, bluebottle
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('acre'); // 50d old
    });

    it('.car + :price:10000:20000: — cars in price range', () => {
      const ids = engine.query('.car + :price:10000:20000:');
      // cars: vwbug ($15000), bmwe36 ($25000), miata ($20000)
      // price 10k-20k: vwbug, miata
      expect(ids).toContain('vwbug');
      expect(ids).toContain('miata');
      expect(ids).not.toContain('bmwe36');
    });

    it('.bridge + :loc: — bridges with location data', () => {
      const ids = engine.query('.bridge + :loc:');
      // bridges: brooklyn, manhattan, goldengate
      // all three have location data
      expect(ids.sort()).toEqual(['brooklyn', 'goldengate', 'manhattan']);
    });
  });

  describe('protocol OR protocol', () => {
    it(':time:7d: | :time:60d: — union of time ranges', () => {
      const recent = engine.query(':time:7d:');
      const broader = engine.query(':time:60d:');
      const union = engine.query(':time:7d: | :time:60d:');
      // Union should include everything from broader (60d includes 7d)
      expect(union.length).toBe(broader.length);
      for (const id of recent) {
        expect(union).toContain(id);
      }
    });

    it(':price:0:10: | :price:20000:30000: — cheap OR expensive', () => {
      const ids = engine.query(':price:0:10: | :price:20000:30000:');
      // cheap: aqus, bluebottle, acre
      // expensive: bmwe36, miata
      expect(ids).toContain('aqus');
      expect(ids).toContain('acre');
      expect(ids).toContain('bmwe36');
      expect(ids).toContain('miata');
      // vwbug ($15000) is in neither range
      expect(ids).not.toContain('vwbug');
    });

    it(':loc: | :price:0:10: — items with location OR cheap', () => {
      const ids = engine.query(':loc: | :price:0:10:');
      // loc: brooklyn, manhattan, goldengate
      // cheap: aqus, bluebottle, acre
      expect(ids.length).toBe(6);
    });
  });

  describe('protocol WITHOUT', () => {
    it('.car - :price:20000:999999: — cars without expensive ones', () => {
      const ids = engine.query('.car - :price:20000:999999:');
      // cars: vwbug ($15000), bmwe36 ($25000), miata ($20000)
      // expensive (20k+): bmwe36, miata
      // result: vwbug
      expect(ids).toEqual(['vwbug']);
    });

    it(':time:30d: - .coffee — recent items without coffee', () => {
      const ids = engine.query(':time:30d: - .coffee');
      // within 30d: vwbug (5d), brooklyn (3d), highline (2d),
      //   goldengate (1d), bluebottle (4d), aqus (7d), miata (10d),
      //   manhattan (20d), dolores (15d)
      // minus coffee: remove aqus, bluebottle
      expect(ids).not.toContain('aqus');
      expect(ids).not.toContain('bluebottle');
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('miata');
    });
  });

  describe('protocol in parenthesized groups', () => {
    it('(:time:7d: + .nyc), .car — group with protocol, comma with tag', () => {
      const ids = engine.query('(:time:7d: + .nyc), .car');
      // group: recent nyc items — brooklyn (3d), highline (2d), bluebottle (4d)
      // comma: all cars — vwbug, bmwe36, miata
      // union of both
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('highline');
      expect(ids).toContain('bluebottle');
      expect(ids).toContain('vwbug');
      expect(ids).toContain('bmwe36');
      expect(ids).toContain('miata');
    });

    it('(.car + :price:10000:20000:) | (.coffee + :time:7d:)', () => {
      const ids = engine.query('(.car + :price:10000:20000:) | (.coffee + :time:7d:)');
      // affordable cars: vwbug, miata
      // recent coffee: bluebottle (4d), aqus (7d boundary)
      expect(ids).toContain('vwbug');
      expect(ids).toContain('miata');
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('bmwe36');
      expect(ids).not.toContain('acre');
    });

    it('((:loc: + .nyc) | .car) — nested group with protocol', () => {
      const ids = engine.query('((:loc: + .nyc) | .car)');
      // loc + nyc: brooklyn, manhattan (goldengate is sf)
      // | car: vwbug, bmwe36, miata
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('manhattan');
      expect(ids).toContain('vwbug');
      expect(ids).not.toContain('goldengate');
    });
  });

  describe('macro with protocol', () => {
    it('@nycbridges + :time:7d: — macro AND protocol', () => {
      const ids = engine.query('@nycbridges + :time:7d:');
      // @nycbridges = .nyc + .bridge = brooklyn, manhattan
      // + :time:7d: — only those within 7 days
      // brooklyn (3d) — yes, manhattan (20d) — no
      expect(ids).toContain('brooklyn');
      expect(ids).not.toContain('manhattan');
    });

    it('@cars + :price:10000:20000: — macro AND price range', () => {
      const ids = engine.query('@cars + :price:10000:20000:');
      // @cars = vwbug, bmwe36
      // price 10k-20k: vwbug ($15000)
      // bmwe36 ($25000) out of range
      expect(ids).toContain('vwbug');
      expect(ids).not.toContain('bmwe36');
    });
  });

  describe('complex multi-feature compositions', () => {
    it('(:time:30d: + .nyc) - :loc: — recent NYC without location', () => {
      const ids = engine.query('(:time:30d: + .nyc) - :loc:');
      // recent nyc: brooklyn (3d), highline (2d), bluebottle (4d), manhattan (20d)
      // minus loc: remove brooklyn, manhattan (have location)
      expect(ids).toContain('highline');
      expect(ids).toContain('bluebottle');
      expect(ids).not.toContain('brooklyn');
      expect(ids).not.toContain('manhattan');
    });

    it(':loc: + :time:7d: + .bridge — triple intersection', () => {
      const ids = engine.query(':loc: + :time:7d: + .bridge');
      // loc: brooklyn, manhattan, goldengate
      // + time:7d: brooklyn (3d), goldengate (1d)
      // + bridge: brooklyn, goldengate
      expect(ids).toContain('brooklyn');
      expect(ids).toContain('goldengate');
      expect(ids).not.toContain('manhattan'); // 20d old
    });
  });
});
