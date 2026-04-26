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
import { deepCloneData, ConfigCloneError } from '../../src/core/deepCloneData';

describe('deepCloneData', () => {
  describe('primitives', () => {
    it('passes string, number, boolean, null, undefined, bigint through', () => {
      expect(deepCloneData('hi')).toBe('hi');
      expect(deepCloneData(42)).toBe(42);
      expect(deepCloneData(true)).toBe(true);
      expect(deepCloneData(null)).toBe(null);
      expect(deepCloneData(undefined)).toBe(undefined);
      expect(deepCloneData(42n)).toBe(42n);
    });
  });

  describe('plain objects and arrays', () => {
    it('rebuilds plain objects fresh (not shared references)', () => {
      const input = { a: 1, b: { c: 2 } };
      const out = deepCloneData(input);
      expect(out).toEqual(input);
      expect(out).not.toBe(input);
      expect(out.b).not.toBe(input.b);
    });

    it('rebuilds arrays fresh', () => {
      const input = [1, [2, 3], { k: 4 }];
      const out = deepCloneData(input);
      expect(out).toEqual(input);
      expect(out).not.toBe(input);
      expect(out[1]).not.toBe(input[1]);
      expect(out[2]).not.toBe(input[2]);
    });
  });

  describe('rejections', () => {
    it('throws on functions', () => {
      expect(() => deepCloneData({ fn: () => 1 })).toThrow(ConfigCloneError);
      expect(() => deepCloneData({ fn: () => 1 })).toThrow(/Functions are not allowed/);
    });

    it('throws on cycles', () => {
      const a: Record<string, unknown> = { name: 'a' };
      a.self = a;
      expect(() => deepCloneData(a)).toThrow(ConfigCloneError);
      expect(() => deepCloneData(a)).toThrow(/Cycle detected/);
    });

    it('throws on depth beyond cap', () => {
      let deep: Record<string, unknown> = {};
      const root = deep;
      for (let i = 0; i < 70; i++) {
        const next: Record<string, unknown> = {};
        deep.child = next;
        deep = next;
      }
      expect(() => deepCloneData(root)).toThrow(/depth exceeds/);
    });

    it('throws on node count beyond cap', () => {
      // Each entry must be an object — primitives don't count as nodes.
      const wide: Record<string, { i: number }> = {};
      for (let i = 0; i < 10_500; i++) wide[`k${i}`] = { i };
      expect(() => deepCloneData(wide)).toThrow(/node count exceeds/);
    });

    it('throws on Date / RegExp / Map / Set / class instances', () => {
      expect(() => deepCloneData({ d: new Date() })).toThrow(/Unexpected object type.*Date/);
      expect(() => deepCloneData({ r: /hi/ })).toThrow(/Unexpected object type.*RegExp/);
      expect(() => deepCloneData({ m: new Map() })).toThrow(/Unexpected object type.*Map/);
      expect(() => deepCloneData({ s: new Set() })).toThrow(/Unexpected object type.*Set/);
      class Foo { x = 1; }
      expect(() => deepCloneData({ f: new Foo() })).toThrow(/Unexpected object type.*Foo/);
    });
  });

  describe('prototype-pollution guards', () => {
    it('drops __proto__, constructor, prototype keys', () => {
      const input = JSON.parse('{"__proto__": {"polluted": true}, "a": 1, "constructor": "nope", "prototype": "also nope"}');
      const out = deepCloneData(input) as Record<string, unknown>;
      expect(out.a).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(out, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(out, 'prototype')).toBe(false);
      expect((({}) as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});
