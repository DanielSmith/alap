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

describe('Tier 8: Edge Cases', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  describe('empty and whitespace input', () => {
    it('empty string returns empty', () => {
      expect(engine.query('')).toEqual([]);
    });

    it('whitespace only returns empty', () => {
      expect(engine.query('   ')).toEqual([]);
    });

    it('just a comma returns empty', () => {
      expect(engine.query(',')).toEqual([]);
    });

    it('multiple commas returns empty', () => {
      expect(engine.query(',,,')).toEqual([]);
    });
  });

  describe('identity and annihilation', () => {
    it('AND with self is identity', () => {
      const result = engine.query('.nyc + .nyc');
      const expected = engine.query('.nyc');
      expect(result.sort()).toEqual(expected.sort());
    });

    it('OR with self is identity', () => {
      const result = engine.query('.nyc | .nyc');
      const expected = engine.query('.nyc');
      expect(result.sort()).toEqual(expected.sort());
    });

    it('subtract self is empty', () => {
      expect(engine.query('.nyc - .nyc')).toEqual([]);
    });
  });

  describe('whitespace tolerance', () => {
    it('extra spaces around operators', () => {
      const result = engine.query('.nyc   +   .bridge');
      expect(result.sort()).toEqual(['brooklyn', 'manhattan']);
    });

    it('no spaces around operators', () => {
      const result = engine.query('.nyc+.bridge');
      expect(result.sort()).toEqual(['brooklyn', 'manhattan']);
    });

    it('leading and trailing whitespace', () => {
      const result = engine.query('  .nyc + .bridge  ');
      expect(result.sort()).toEqual(['brooklyn', 'manhattan']);
    });

    it('spaces around commas', () => {
      const result = engine.query('vwbug ,  bmwe36');
      expect(result.sort()).toEqual(['bmwe36', 'vwbug']);
    });
  });

  describe('deduplication across segments', () => {
    it('same class in two comma segments', () => {
      const result = engine.query('.nyc, .nyc');
      const expected = engine.query('.nyc');
      expect(result.sort()).toEqual(expected.sort());
    });

    it('item appears via ID and via class', () => {
      // bluebottle is tagged "coffee" — appears by both paths
      const result = engine.query('bluebottle, .coffee');
      expect(result.sort()).toEqual(['acre', 'aqus', 'bluebottle']);
    });

    it('overlapping class queries', () => {
      // goldengate has both sf and bridge
      const result = engine.query('.sf, .bridge');
      expect(result.sort()).toEqual([
        'aqus', 'bluebottle', 'brooklyn', 'dolores',
        'goldengate', 'manhattan', 'towerbridge',
      ]);
    });
  });

  describe('operator at start of expression', () => {
    it('leading operator is ignored — treated as initial operand', () => {
      // "+ .car" — the + has nothing to intersect with, should just return .car
      const result = engine.query('+ .car');
      // Behavior TBD — could be empty (strict) or treat as .car (lenient)
      // Documenting current expectation: treat as .car
      expect(result.sort()).toEqual(['bmwe36', 'miata', 'vwbug']);
    });
  });

  describe('empty parens', () => {
    it('empty parentheses return empty', () => {
      expect(engine.query('()')).toEqual([]);
    });

    it('empty parens OR class', () => {
      const result = engine.query('() | .car');
      expect(result.sort()).toEqual(['bmwe36', 'miata', 'vwbug']);
    });
  });

  describe('guardrails', () => {
    it('deeply nested parentheses bail out instead of blowing the stack', () => {
      // 50 levels deep — exceeds MAX_DEPTH of 32
      const deep = '('.repeat(50) + '.car' + ')'.repeat(50);
      const result = engine.query(deep);
      expect(result).toEqual([]);
    });

    it('nesting within the limit still works', () => {
      // 5 levels deep — well within limit
      const nested = '(((((.car)))))';
      const result = engine.query(nested);
      expect(result.sort()).toEqual(['bmwe36', 'miata', 'vwbug']);
    });

    it('extremely long expression returns empty instead of hanging', () => {
      // Over 1024 tokens
      const items = Array.from({ length: 600 }, (_, i) => `.tag${i}`).join(' | ');
      const result = engine.query(items);
      expect(result).toEqual([]);
    });
  });

  describe('hyphens in identifiers parse as WITHOUT operator', () => {
    it('@macro-name parses as @macro minus item "name"', () => {
      // @cars expands to "vwbug, bmwe36", then - name tries to subtract "name"
      // Result is the same as @cars since "name" doesn't exist
      const withHyphen = engine.query('@cars-nonexistent');
      const withoutHyphen = engine.query('@cars');
      expect(withHyphen).toEqual(withoutHyphen);
    });

    it('item-id parses as item minus id', () => {
      // "brooklyn" exists, "bridge" does not exist as an item ID
      // so "brooklyn-bridge" = "brooklyn" minus "bridge" = ["brooklyn"]
      const result = engine.query('brooklyn-bridge');
      expect(result).toEqual(['brooklyn']);
    });

    it('.tag-name parses as .tag minus item "name"', () => {
      // .car resolves to car-tagged items, then - miata subtracts miata
      const withHyphen = engine.query('.car-miata');
      const withoutHyphen = engine.query('.car - miata');
      expect(withHyphen).toEqual(withoutHyphen);
    });
  });
});
