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

describe('Tier 1: Single Operands', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  it('looks up a single item ID', () => {
    const result = engine.query('bmwe36');
    expect(result).toEqual(['bmwe36']);
  });

  it('looks up another single item ID', () => {
    const result = engine.query('aqus');
    expect(result).toEqual(['aqus']);
  });

  it('looks up a single class', () => {
    const result = engine.query('.car');
    expect(result.sort()).toEqual(['bmwe36', 'miata', 'vwbug']);
  });

  it('looks up a class with one match', () => {
    const result = engine.query('.japan');
    expect(result).toEqual(['miata']);
  });

  it('returns empty for a nonexistent item ID', () => {
    const result = engine.query('doesnotexist');
    expect(result).toEqual([]);
  });

  it('returns empty for a nonexistent class', () => {
    const result = engine.query('.doesnotexist');
    expect(result).toEqual([]);
  });
});
