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

import { describe, it, expect, beforeEach } from 'vitest';
import { AlapEngine } from '../../src/core/AlapEngine';
import { testConfig } from '../fixtures/links';

describe('Tier 3: Operators', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  describe('AND (+) — intersection', () => {
    it('intersects two classes', () => {
      const result = engine.query('.nyc + .bridge');
      expect(result.sort()).toEqual(['brooklyn', 'manhattan']);
    });

    it('intersects classes with no overlap — empty result', () => {
      const result = engine.query('.car + .coffee');
      expect(result).toEqual([]);
    });

    it('intersects classes with single match', () => {
      const result = engine.query('.sf + .bridge');
      expect(result).toEqual(['goldengate']);
    });

    it('intersects three classes', () => {
      const result = engine.query('.nyc + .bridge + .landmark');
      expect(result).toEqual(['brooklyn']);
    });
  });

  describe('OR (|) — union', () => {
    it('unions two classes', () => {
      const result = engine.query('.nyc | .sf');
      expect(result.sort()).toEqual([
        'aqus', 'bluebottle', 'brooklyn', 'centralpark',
        'dolores', 'goldengate', 'highline', 'manhattan',
      ]);
    });

    it('unions overlapping classes — no duplicates', () => {
      const result = engine.query('.bridge | .landmark');
      expect(result.sort()).toEqual([
        'brooklyn', 'goldengate', 'highline', 'manhattan', 'towerbridge',
      ]);
    });

    it('unions a class with itself — identity', () => {
      const result = engine.query('.car | .car');
      expect(result.sort()).toEqual(['bmwe36', 'miata', 'vwbug']);
    });
  });

  describe('WITHOUT (-) — difference', () => {
    it('subtracts a class', () => {
      const result = engine.query('.nyc - .bridge');
      expect(result.sort()).toEqual(['bluebottle', 'centralpark', 'highline']);
    });

    it('subtracts removing partial overlap', () => {
      const result = engine.query('.nyc - .landmark');
      expect(result.sort()).toEqual(['bluebottle', 'centralpark', 'manhattan']);
    });

    it('subtracts everything — empty result', () => {
      const result = engine.query('.car - .car');
      expect(result).toEqual([]);
    });

    it('subtracts a class with no overlap — no change', () => {
      const result = engine.query('.car - .coffee');
      expect(result.sort()).toEqual(['bmwe36', 'miata', 'vwbug']);
    });
  });
});
