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

describe('Tier 6: Macros', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  it('expands a macro with item IDs', () => {
    // @cars → "vwbug, bmwe36"
    const result = engine.query('@cars');
    expect(result.sort()).toEqual(['bmwe36', 'vwbug']);
  });

  it('expands a macro containing an expression', () => {
    // @nycbridges → ".nyc + .bridge"
    const result = engine.query('@nycbridges');
    expect(result.sort()).toEqual(['brooklyn', 'manhattan']);
  });

  it('expands a macro with OR expression', () => {
    // @everything → ".nyc | .sf"
    const result = engine.query('@everything');
    expect(result.sort()).toEqual([
      'aqus', 'bluebottle', 'brooklyn', 'centralpark',
      'dolores', 'goldengate', 'highline', 'manhattan',
    ]);
  });

  it('returns empty for a nonexistent macro', () => {
    const result = engine.query('@nonexistent');
    expect(result).toEqual([]);
  });

  it('macro result can be combined with operators', () => {
    // @cars | .coffee
    const result = engine.query('@cars | .coffee');
    expect(result.sort()).toEqual(['acre', 'aqus', 'bluebottle', 'bmwe36', 'vwbug']);
  });

  it('macro result can be intersected', () => {
    // @everything + .bridge — items in (nyc | sf) that are also bridges
    const result = engine.query('@everything + .bridge');
    expect(result.sort()).toEqual(['brooklyn', 'goldengate', 'manhattan']);
  });

  it('macro result can be subtracted from', () => {
    // @everything - .coffee
    const result = engine.query('@everything - .coffee');
    expect(result.sort()).toEqual([
      'brooklyn', 'centralpark', 'dolores',
      'goldengate', 'highline', 'manhattan',
    ]);
  });

  it('bare @ uses provided anchor ID', () => {
    // @ with anchorId "cars" should expand macro "cars"
    const result = engine.query('@', 'cars');
    expect(result.sort()).toEqual(['bmwe36', 'vwbug']);
  });

  it('bare @ with no matching macro returns empty', () => {
    const result = engine.query('@', 'nonexistent');
    expect(result).toEqual([]);
  });
});
