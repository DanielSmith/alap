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

describe('Tier 4: Chained Operators', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(testConfig);
  });

  it('OR then WITHOUT — left to right', () => {
    // (.nyc | .sf) - .landmark
    const result = engine.query('.nyc | .sf - .landmark');
    expect(result.sort()).toEqual([
      'aqus', 'bluebottle', 'centralpark', 'dolores', 'manhattan',
    ]);
  });

  it('chained subtraction', () => {
    // (.bridge - .nyc) - .london = goldengate
    const result = engine.query('.bridge - .nyc - .london');
    expect(result).toEqual(['goldengate']);
  });

  it('AND then OR', () => {
    // (.nyc + .bridge) | .coffee
    const result = engine.query('.nyc + .bridge | .coffee');
    expect(result.sort()).toEqual([
      'acre', 'aqus', 'bluebottle', 'brooklyn', 'manhattan',
    ]);
  });

  it('OR then AND', () => {
    // (.nyc | .sf) + .bridge
    const result = engine.query('.nyc | .sf + .bridge');
    expect(result.sort()).toEqual(['brooklyn', 'goldengate', 'manhattan']);
  });

  it('AND then WITHOUT', () => {
    // (.nyc + .bridge) - .landmark = manhattan
    const result = engine.query('.nyc + .bridge - .landmark');
    expect(result).toEqual(['manhattan']);
  });

  it('WITHOUT then OR', () => {
    // (.nyc - .bridge) | .car
    const result = engine.query('.nyc - .bridge | .car');
    expect(result.sort()).toEqual([
      'bluebottle', 'bmwe36', 'centralpark', 'highline', 'miata', 'vwbug',
    ]);
  });
});
