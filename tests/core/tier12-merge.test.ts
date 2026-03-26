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
import { mergeConfigs } from '../../src/core/mergeConfigs';
import { AlapEngine } from '../../src/core/AlapEngine';
import type { AlapConfig } from '../../src/core/types';

const base: AlapConfig = {
  settings: { listType: 'ul', menuTimeout: 5000 },
  macros: {
    cars: { linkItems: 'vwbug, bmwe36' },
  },
  searchPatterns: {
    bridges: 'bridge',
  },
  allLinks: {
    vwbug: { label: 'VW Bug', url: 'https://example.com/vwbug', tags: ['car', 'germany'] },
    bmwe36: { label: 'BMW E36', url: 'https://example.com/bmwe36', tags: ['car', 'germany'] },
    brooklyn: { label: 'Brooklyn Bridge', url: 'https://example.com/brooklyn', tags: ['nyc', 'bridge'] },
  },
};

const page: AlapConfig = {
  settings: { menuTimeout: 3000 },
  macros: {
    favs: { linkItems: 'aqus, brooklyn' },
  },
  searchPatterns: {
    coffee: 'coffee',
  },
  allLinks: {
    aqus: { label: 'Aqus Cafe', url: 'https://example.com/aqus', tags: ['coffee', 'sf'] },
    bluebottle: { label: 'Blue Bottle', url: 'https://example.com/bluebottle', tags: ['coffee', 'nyc'] },
  },
};

describe('mergeConfigs', () => {
  it('merges allLinks from multiple configs', () => {
    const merged = mergeConfigs(base, page);
    expect(Object.keys(merged.allLinks)).toHaveLength(5);
    expect(merged.allLinks.vwbug).toBeDefined();
    expect(merged.allLinks.aqus).toBeDefined();
  });

  it('later config wins on allLinks collision', () => {
    const override: AlapConfig = {
      allLinks: {
        vwbug: { label: 'VW Beetle (updated)', url: 'https://example.com/beetle', tags: ['car'] },
      },
    };
    const merged = mergeConfigs(base, override);
    expect(merged.allLinks.vwbug.label).toBe('VW Beetle (updated)');
    expect(merged.allLinks.bmwe36).toBeDefined(); // untouched
  });

  it('shallow-merges settings (later wins)', () => {
    const merged = mergeConfigs(base, page);
    expect(merged.settings?.listType).toBe('ul'); // from base
    expect(merged.settings?.menuTimeout).toBe(3000); // overridden by page
  });

  it('shallow-merges macros (later wins)', () => {
    const merged = mergeConfigs(base, page);
    expect(merged.macros?.cars).toBeDefined(); // from base
    expect(merged.macros?.favs).toBeDefined(); // from page
  });

  it('later macro with same name overrides', () => {
    const override: AlapConfig = {
      allLinks: {},
      macros: { cars: { linkItems: 'miata' } },
    };
    const merged = mergeConfigs(base, override);
    expect(merged.macros?.cars.linkItems).toBe('miata');
  });

  it('shallow-merges searchPatterns', () => {
    const merged = mergeConfigs(base, page);
    expect(merged.searchPatterns?.bridges).toBe('bridge');
    expect(merged.searchPatterns?.coffee).toBe('coffee');
  });

  it('works with three or more configs', () => {
    const extra: AlapConfig = {
      allLinks: {
        miata: { label: 'Miata', url: 'https://example.com/miata', tags: ['car', 'japan'] },
      },
    };
    const merged = mergeConfigs(base, page, extra);
    expect(Object.keys(merged.allLinks)).toHaveLength(6);
    expect(merged.allLinks.miata).toBeDefined();
  });

  it('handles config with no optional fields', () => {
    const minimal: AlapConfig = { allLinks: { x: { label: 'X', url: '/x' } } };
    const merged = mergeConfigs(minimal);
    expect(merged.allLinks.x.label).toBe('X');
    expect(merged.settings).toBeUndefined();
    expect(merged.macros).toBeUndefined();
    expect(merged.searchPatterns).toBeUndefined();
  });

  it('does not mutate inputs', () => {
    const baseCopy = JSON.parse(JSON.stringify(base));
    const pageCopy = JSON.parse(JSON.stringify(page));
    mergeConfigs(base, page);
    expect(base).toEqual(baseCopy);
    expect(page).toEqual(pageCopy);
  });

  it('returns empty allLinks when called with no arguments', () => {
    const merged = mergeConfigs();
    expect(merged.allLinks).toEqual({});
  });

  it('merged config works with AlapEngine', () => {
    const merged = mergeConfigs(base, page);
    const engine = new AlapEngine(merged);

    // Can query links from both configs
    const cars = engine.query('.car');
    expect(cars).toContain('vwbug');
    expect(cars).toContain('bmwe36');

    const coffee = engine.query('.coffee');
    expect(coffee).toContain('aqus');
    expect(coffee).toContain('bluebottle');

    // Cross-config expression
    const nycItems = engine.query('.nyc');
    expect(nycItems).toContain('brooklyn'); // from base
    expect(nycItems).toContain('bluebottle'); // from page
  });

  // --- Prototype pollution defense (SEC-5) ---

  it('drops __proto__ key from allLinks', () => {
    const malicious: AlapConfig = {
      allLinks: JSON.parse('{"__proto__": {"label": "evil", "url": "https://evil.com"}, "safe": {"label": "Safe", "url": "/safe"}}'),
    };
    const merged = mergeConfigs(base, malicious);
    expect(merged.allLinks.safe).toBeDefined();
    // __proto__ should not exist as an own property
    expect(Object.prototype.hasOwnProperty.call(merged.allLinks, '__proto__')).toBe(false);
    // Verify Object prototype is not polluted
    const plain: Record<string, unknown> = {};
    expect((plain as any).label).toBeUndefined();
  });

  it('drops constructor key from allLinks', () => {
    const malicious: AlapConfig = {
      allLinks: JSON.parse('{"constructor": {"label": "evil", "url": "https://evil.com"}, "ok": {"label": "OK", "url": "/ok"}}'),
    };
    const merged = mergeConfigs(base, malicious);
    expect(merged.allLinks.ok).toBeDefined();
    expect(merged.allLinks.constructor).toBe(Object.prototype.constructor); // native, not overwritten
  });

  it('drops __proto__ key from settings', () => {
    const malicious: AlapConfig = {
      allLinks: {},
      settings: JSON.parse('{"__proto__": {"polluted": true}, "menuTimeout": 9999}'),
    };
    const merged = mergeConfigs(base, malicious);
    expect(merged.settings?.menuTimeout).toBe(9999);
    const plain: Record<string, unknown> = {};
    expect((plain as any).polluted).toBeUndefined();
  });

  it('drops __proto__ key from macros', () => {
    const malicious: AlapConfig = {
      allLinks: {},
      macros: JSON.parse('{"__proto__": {"linkItems": "evil"}, "legit": {"linkItems": "brooklyn"}}'),
    };
    const merged = mergeConfigs(base, malicious);
    expect(merged.macros?.legit).toBeDefined();
    const plain: Record<string, unknown> = {};
    expect((plain as any).linkItems).toBeUndefined();
  });

  it('normal keys still merge correctly alongside blocked keys', () => {
    const config: AlapConfig = {
      allLinks: JSON.parse('{"__proto__": {"label": "x", "url": "/x"}, "a": {"label": "A", "url": "/a"}, "b": {"label": "B", "url": "/b"}}'),
    };
    const merged = mergeConfigs(config);
    expect(Object.keys(merged.allLinks)).toEqual(['a', 'b']);
  });

  it('merged macros resolve against merged allLinks', () => {
    const merged = mergeConfigs(base, page);
    const engine = new AlapEngine(merged);

    // @cars macro from base still works
    const cars = engine.query('@cars');
    expect(cars).toEqual(['vwbug', 'bmwe36']);

    // @favs macro from page resolves against merged links
    const favs = engine.query('@favs');
    expect(favs).toContain('aqus'); // from page
    expect(favs).toContain('brooklyn'); // from base
  });
});
