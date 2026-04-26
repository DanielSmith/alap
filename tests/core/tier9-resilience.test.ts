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
import type { AlapConfig } from '../../src/core/types';

describe('Tier 9: Resilience Against Bad Config and Input', () => {

  describe('missing or broken allLinks', () => {
    // 3.2+ contract: AlapEngine auto-validates on construction, so structurally
    // bad configs fail loudly and early instead of silently returning empty at
    // query time. An engine that has no allLinks to reason about isn't something
    // the library can usefully represent — better to halt than to pretend.

    it('throws when allLinks is missing', () => {
      expect(() => new AlapEngine({} as AlapConfig)).toThrow(/allLinks must be a non-null object/);
    });

    it('throws when allLinks is null', () => {
      expect(() => new AlapEngine({ allLinks: null } as unknown as AlapConfig))
        .toThrow(/allLinks must be a non-null object/);
    });

    it('throws when allLinks is a string', () => {
      expect(() => new AlapEngine({ allLinks: 'oops' } as unknown as AlapConfig))
        .toThrow(/allLinks must be a non-null object/);
    });

    it('throws when allLinks is an array', () => {
      expect(() => new AlapEngine({ allLinks: [] } as unknown as AlapConfig))
        .toThrow(/allLinks must be a non-null object/);
    });
  });

  describe('broken link entries', () => {
    it('skips link entries where tags is a string instead of array', () => {
      const engine = new AlapEngine({
        allLinks: {
          good: { url: '#', tags: ['coffee'] },
          bad: { url: '#', tags: 'coffee' as unknown as string[] },
        },
      });
      const result = engine.query('.coffee');
      expect(result).toEqual(['good']);
    });

    it('skips link entries where tags is null', () => {
      const engine = new AlapEngine({
        allLinks: {
          good: { url: '#', tags: ['coffee'] },
          bad: { url: '#', tags: null as unknown as string[] },
        },
      });
      const result = engine.query('.coffee');
      expect(result).toEqual(['good']);
    });

    it('skips link entries where tags is undefined', () => {
      const engine = new AlapEngine({
        allLinks: {
          good: { url: '#', tags: ['coffee'] },
          notags: { url: '#' },
        },
      });
      const result = engine.query('.coffee');
      expect(result).toEqual(['good']);
    });

    it('handles link entry that is null', () => {
      const engine = new AlapEngine({
        allLinks: {
          good: { url: '#', tags: ['coffee'] },
          bad: null as unknown as { url: string },
        },
      });
      expect(engine.query('.coffee')).toEqual(['good']);
      expect(engine.query('bad')).toEqual([]);
    });
  });

  describe('broken macros', () => {
    it('handles macro with linkItems as number', () => {
      const engine = new AlapEngine({
        allLinks: { a: { url: '#', tags: ['x'] } },
        macros: { bad: { linkItems: 123 as unknown as string } },
      });
      expect(engine.query('@bad')).toEqual([]);
    });

    it('handles macro with linkItems as null', () => {
      const engine = new AlapEngine({
        allLinks: { a: { url: '#', tags: ['x'] } },
        macros: { bad: { linkItems: null as unknown as string } },
      });
      expect(engine.query('@bad')).toEqual([]);
    });

    it('handles circular macros without infinite loop', () => {
      const engine = new AlapEngine({
        allLinks: { a: { url: '#', tags: ['x'] } },
        macros: {
          loop1: { linkItems: '@loop2' },
          loop2: { linkItems: '@loop1' },
        },
      });
      // Should terminate and return empty, not hang
      expect(engine.query('@loop1')).toEqual([]);
    });

    it('handles self-referencing macro', () => {
      const engine = new AlapEngine({
        allLinks: { a: { url: '#', tags: ['x'] } },
        macros: {
          myself: { linkItems: '@myself' },
        },
      });
      expect(engine.query('@myself')).toEqual([]);
    });

    it('handles missing macros section', () => {
      const engine = new AlapEngine({
        allLinks: { a: { url: '#', tags: ['x'] } },
      });
      expect(engine.query('@anything')).toEqual([]);
    });
  });

  describe('bad expression input', () => {
    it('handles null expression', () => {
      const engine = new AlapEngine({ allLinks: {} });
      expect(engine.query(null as unknown as string)).toEqual([]);
    });

    it('handles undefined expression', () => {
      const engine = new AlapEngine({ allLinks: {} });
      expect(engine.query(undefined as unknown as string)).toEqual([]);
    });

    it('handles numeric expression', () => {
      const engine = new AlapEngine({ allLinks: {} });
      expect(engine.query(42 as unknown as string)).toEqual([]);
    });

    it('handles unmatched open paren', () => {
      const engine = new AlapEngine({
        allLinks: {
          a: { url: '#', tags: ['x'] },
          b: { url: '#', tags: ['x'] },
        },
      });
      // (.x without closing — parser should handle gracefully
      const result = engine.query('(.x');
      expect(result.sort()).toEqual(['a', 'b']);
    });

    it('handles unmatched close paren', () => {
      const engine = new AlapEngine({
        allLinks: {
          a: { url: '#', tags: ['x'] },
        },
      });
      // .x) — extra close paren should be ignored
      const result = engine.query('.x)');
      expect(result).toEqual(['a']);
    });

    it('handles dangling operator at end', () => {
      const engine = new AlapEngine({
        allLinks: {
          a: { url: '#', tags: ['x'] },
        },
      });
      const result = engine.query('.x +');
      expect(result).toEqual(['a']);
    });

    it('handles consecutive operators', () => {
      const engine = new AlapEngine({
        allLinks: {
          a: { url: '#', tags: ['x'] },
          b: { url: '#', tags: ['y'] },
        },
      });
      // .x + | .y — the + sees no right operand (| is not a term),
      // so it should handle gracefully
      const result = engine.query('.x | | .y');
      expect(result.sort()).toEqual(['a', 'b']);
    });

    it('handles only operators', () => {
      const engine = new AlapEngine({ allLinks: {} });
      expect(engine.query('+ | -')).toEqual([]);
    });

    it('handles special characters in expression', () => {
      const engine = new AlapEngine({ allLinks: {} });
      expect(engine.query('!@#$%^&')).toEqual([]);
    });
  });
});
