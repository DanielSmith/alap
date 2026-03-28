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

/**
 * Qwik adapter — engine integration and constants tests.
 *
 * Qwik v1's component$() requires the optimizer runtime to be initialized,
 * which prevents direct import of AlapProvider/AlapLink in plain Node.
 * Component-level rendering tests are deferred to the example site.
 *
 * These tests verify:
 * - The adapter's engine integration works correctly
 * - Shared constants are properly defined
 * - All expression features work through the engine layer
 */

import { describe, it, expect } from 'vitest';
import { testConfig } from '../../fixtures/links';

describe('alap/qwik — engine integration', () => {
  it('AlapEngine resolves tag queries', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const result = engine.resolve('.car');
    expect(result.length).toBeGreaterThan(0);
    expect(result.map(r => r.id)).toContain('vwbug');
  });

  it('AlapEngine handles intersection', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const result = engine.resolve('.nyc + .bridge');
    const ids = result.map(r => r.id);
    expect(ids).toContain('brooklyn');
    expect(ids).toContain('manhattan');
    expect(ids).not.toContain('goldengate');
  });

  it('AlapEngine handles subtraction', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const result = engine.resolve('.bridge - .nyc');
    const ids = result.map(r => r.id);
    expect(ids).toContain('goldengate');
    expect(ids).toContain('towerbridge');
    expect(ids).not.toContain('brooklyn');
  });

  it('AlapEngine resolves macros', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const result = engine.resolve('@cars');
    expect(result.length).toBeGreaterThan(0);
    expect(result.map(r => r.id)).toContain('vwbug');
  });

  it('AlapEngine returns empty for nonexistent query', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const result = engine.resolve('.nonexistent');
    expect(result).toHaveLength(0);
  });

  it('AlapEngine.updateConfig updates link resolution', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const before = engine.resolve('.car');
    expect(before.length).toBeGreaterThan(0);

    engine.updateConfig({ allLinks: {} });
    const after = engine.resolve('.car');
    expect(after).toHaveLength(0);
  });

  it('AlapEngine resolves single item by ID', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const result = engine.resolve('vwbug');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vwbug');
    expect(result[0].url).toBe('https://example.com/vwbug');
  });

  it('AlapEngine.query returns IDs only', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const ids = engine.query('.coffee');
    expect(ids.length).toBeGreaterThan(0);
    expect(typeof ids[0]).toBe('string');
  });

  it('AlapEngine.getLinks returns link objects by ID', async () => {
    const { AlapEngine } = await import('../../../src/core/AlapEngine');
    const engine = new AlapEngine(testConfig);

    const links = engine.getLinks(['brooklyn', 'manhattan']);
    expect(links).toHaveLength(2);
    expect(links.map(l => l.id)).toEqual(['brooklyn', 'manhattan']);
  });
});

describe('alap/qwik — constants used by adapter', () => {
  it('DEFAULT_MENU_Z_INDEX is 10', async () => {
    const { DEFAULT_MENU_Z_INDEX } = await import('../../../src/constants');
    expect(DEFAULT_MENU_Z_INDEX).toBe(10);
  });

  it('MENU_CONTAINER_CLASS is alapelem', async () => {
    const { MENU_CONTAINER_CLASS } = await import('../../../src/constants');
    expect(MENU_CONTAINER_CLASS).toBe('alapelem');
  });

  it('MENU_ITEM_CLASS is alapListElem', async () => {
    const { MENU_ITEM_CLASS } = await import('../../../src/constants');
    expect(MENU_ITEM_CLASS).toBe('alapListElem');
  });

  it('DEFAULT_LINK_TARGET is fromAlap', async () => {
    const { DEFAULT_LINK_TARGET } = await import('../../../src/constants');
    expect(DEFAULT_LINK_TARGET).toBe('fromAlap');
  });

  it('REM_PER_MENU_ITEM is defined', async () => {
    const { REM_PER_MENU_ITEM } = await import('../../../src/constants');
    expect(REM_PER_MENU_ITEM).toBe(2.25);
  });

  it('DEFAULT_MENU_TIMEOUT is defined', async () => {
    const { DEFAULT_MENU_TIMEOUT } = await import('../../../src/constants');
    expect(typeof DEFAULT_MENU_TIMEOUT).toBe('number');
    expect(DEFAULT_MENU_TIMEOUT).toBeGreaterThan(0);
  });

  it('DEFAULT_MAX_VISIBLE_ITEMS is defined', async () => {
    const { DEFAULT_MAX_VISIBLE_ITEMS } = await import('../../../src/constants');
    expect(typeof DEFAULT_MAX_VISIBLE_ITEMS).toBe('number');
    expect(DEFAULT_MAX_VISIBLE_ITEMS).toBeGreaterThan(0);
  });
});
