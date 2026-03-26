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

describe('Tier 7: Parentheses', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  describe('basic grouping', () => {
    it('groups two ANDs with OR', () => {
      // NYC bridges OR SF bridges
      const result = engine.query('(.nyc + .bridge) | (.sf + .bridge)');
      expect(result.sort()).toEqual(['brooklyn', 'goldengate', 'manhattan']);
    });

    it('group on right side only', () => {
      // all nyc items, plus (sf items minus coffee)
      const result = engine.query('.nyc | (.sf - .coffee)');
      expect(result.sort()).toEqual([
        'bluebottle', 'brooklyn', 'centralpark',
        'dolores', 'goldengate', 'highline', 'manhattan',
      ]);
    });

    it('group on left side only', () => {
      // (nyc or sf) intersected with bridge
      const result = engine.query('(.nyc | .sf) + .bridge');
      expect(result.sort()).toEqual(['brooklyn', 'goldengate', 'manhattan']);
    });

    it('intersect tag with grouped union on right', () => {
      // "coffee, parks, all in nyc"
      // .nyc = brooklyn, manhattan, highline, centralpark, bluebottle
      // (.coffee | .park) = aqus, bluebottle, acre, highline, centralpark, dolores
      // intersection = bluebottle, highline, centralpark
      const result = engine.query('.nyc + (.coffee | .park)');
      expect(result.sort()).toEqual(['bluebottle', 'centralpark', 'highline']);
    });

    it('subtract a grouped union', () => {
      // all bridges minus (nyc or london)
      const result = engine.query('.bridge - (.nyc | .london)');
      expect(result).toEqual(['goldengate']);
    });
  });

  describe('parentheses change result vs left-to-right', () => {
    it('without parens: (.nyc | .sf) + .bridge — left to right', () => {
      const result = engine.query('.nyc | .sf + .bridge');
      expect(result.sort()).toEqual(['brooklyn', 'goldengate', 'manhattan']);
    });

    it('with parens: .nyc | (.sf + .bridge) — different result', () => {
      // all nyc items PLUS (sf AND bridge = goldengate)
      const result = engine.query('.nyc | (.sf + .bridge)');
      expect(result.sort()).toEqual([
        'bluebottle', 'brooklyn', 'centralpark',
        'goldengate', 'highline', 'manhattan',
      ]);
    });
  });

  describe('nested parentheses', () => {
    it('double nesting', () => {
      // ((.nyc + .bridge) | .car) - .germany
      // nyc bridges + cars, minus germany = brooklyn, manhattan, miata
      const result = engine.query('((.nyc + .bridge) | .car) - .germany');
      expect(result.sort()).toEqual(['brooklyn', 'manhattan', 'miata']);
    });

    it('nested subtraction inside OR', () => {
      // (.nyc - .landmark) | (.sf - .coffee)
      // nyc without landmarks: bluebottle, manhattan, centralpark
      // sf without coffee: goldengate, dolores
      const result = engine.query('(.nyc - .landmark) | (.sf - .coffee)');
      expect(result.sort()).toEqual([
        'bluebottle', 'centralpark', 'dolores', 'goldengate', 'manhattan',
      ]);
    });
  });

  describe('parentheses with mixed operand types', () => {
    it('item ID inside parentheses with class', () => {
      const result = engine.query('(aqus | .car) - .germany');
      expect(result.sort()).toEqual(['aqus', 'miata']);
    });

    it('macro combined with parenthesized expression', () => {
      // @cars is vwbug, bmwe36 — then OR with (sf bridges)
      const result = engine.query('@cars | (.sf + .bridge)');
      expect(result.sort()).toEqual(['bmwe36', 'goldengate', 'vwbug']);
    });
  });

  describe('parentheses with commas', () => {
    it('comma-separated segments where one has parens', () => {
      const result = engine.query('miata, (.nyc + .bridge)');
      expect(result.sort()).toEqual(['brooklyn', 'manhattan', 'miata']);
    });

    it('both segments have parens', () => {
      const result = engine.query('(.nyc + .park), (.sf + .park)');
      expect(result.sort()).toEqual(['centralpark', 'dolores', 'highline']);
    });
  });
});
