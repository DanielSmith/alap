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

describe('Tier 5: Mixed Operand Types with Operators', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  it('item ID OR class', () => {
    const result = engine.query('aqus | .coffee');
    expect(result.sort()).toEqual(['acre', 'aqus', 'bluebottle']);
  });

  it('item ID AND class — item has the class', () => {
    // bmwe36 has tag "car", so AND should keep it
    const result = engine.query('bmwe36 + .car');
    expect(result).toEqual(['bmwe36']);
  });

  it('item ID AND class — item lacks the class', () => {
    // bmwe36 does not have tag "coffee"
    const result = engine.query('bmwe36 + .coffee');
    expect(result).toEqual([]);
  });

  it('class WITHOUT item ID', () => {
    const result = engine.query('.car - bmwe36');
    expect(result.sort()).toEqual(['miata', 'vwbug']);
  });

  it('comma: item ID then class expression', () => {
    const result = engine.query('bmwe36, .nyc + .park');
    expect(result.sort()).toEqual(['bmwe36', 'centralpark', 'highline']);
  });

  it('comma: class expression then item ID', () => {
    const result = engine.query('.sf + .bridge, miata');
    expect(result.sort()).toEqual(['goldengate', 'miata']);
  });

  it('item ID OR item ID', () => {
    const result = engine.query('vwbug | bmwe36');
    expect(result.sort()).toEqual(['bmwe36', 'vwbug']);
  });

  it('multiple item IDs with operator and class', () => {
    const result = engine.query('aqus | bluebottle | .car');
    expect(result.sort()).toEqual(['aqus', 'bluebottle', 'bmwe36', 'miata', 'vwbug']);
  });
});
