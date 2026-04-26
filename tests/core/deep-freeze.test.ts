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
import { deepFreeze } from '../../src/core/deepFreeze';

describe('deepFreeze', () => {
  it('passes primitives through unchanged', () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('hi')).toBe('hi');
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it('freezes the top-level object — writes throw in strict mode', () => {
    const o = deepFreeze({ a: 1 });
    expect(Object.isFrozen(o)).toBe(true);
    expect(() => { (o as Record<string, unknown>).a = 2; }).toThrow(TypeError);
    expect(() => { (o as Record<string, unknown>).b = 3; }).toThrow(TypeError);
  });

  it('freezes nested objects', () => {
    const o = deepFreeze({ a: { b: { c: 1 } } });
    expect(Object.isFrozen(o.a)).toBe(true);
    expect(Object.isFrozen(o.a.b)).toBe(true);
    expect(() => { (o.a.b as Record<string, unknown>).c = 99; }).toThrow(TypeError);
  });

  it('freezes arrays — push and index writes throw', () => {
    const o = deepFreeze({ tags: ['a', 'b'] });
    expect(Object.isFrozen(o.tags)).toBe(true);
    expect(() => { (o.tags as string[]).push('c'); }).toThrow(TypeError);
    expect(() => { (o.tags as string[])[0] = 'z'; }).toThrow(TypeError);
  });

  it('handles cycles by short-circuiting on already-frozen nodes', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(() => deepFreeze(a)).not.toThrow();
    expect(Object.isFrozen(a)).toBe(true);
  });
});
