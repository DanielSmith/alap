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

describe('Tier 2: Comma Separation', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  it('combines multiple item IDs', () => {
    const result = engine.query('vwbug, bmwe36');
    expect(result.sort()).toEqual(['bmwe36', 'vwbug']);
  });

  it('combines multiple class queries', () => {
    const result = engine.query('.car, .coffee');
    expect(result.sort()).toEqual(['acre', 'aqus', 'bluebottle', 'bmwe36', 'miata', 'vwbug']);
  });

  it('mixes item ID and class query', () => {
    const result = engine.query('bmwe36, .coffee');
    expect(result.sort()).toEqual(['acre', 'aqus', 'bluebottle', 'bmwe36']);
  });

  it('deduplicates when same item appears in multiple segments', () => {
    const result = engine.query('bmwe36, bmwe36');
    expect(result).toEqual(['bmwe36']);
  });

  it('deduplicates when item ID also matches a class', () => {
    const result = engine.query('aqus, .coffee');
    expect(result.sort()).toEqual(['acre', 'aqus', 'bluebottle']);
  });

  it('handles three comma-separated segments', () => {
    const result = engine.query('vwbug, aqus, goldengate');
    expect(result.sort()).toEqual(['aqus', 'goldengate', 'vwbug']);
  });
});
