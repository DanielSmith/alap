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
import type { AlapConfig, AlapLink, GenerateHandler } from '../../src/core/types';

/**
 * Tier 23: Generate protocols — tests the generate handler contract,
 * pre-resolve lifecycle, temp ID injection/cleanup, caching, and
 * composition with filter protocols and tags.
 */

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

/** A mock generate handler that returns static links */
const mockGenerate: GenerateHandler = async (segments) => {
  const key = segments[0];
  if (key === 'bridges') {
    return [
      { label: 'Brooklyn Bridge', url: 'https://example.com/brooklyn', meta: { year: 1883 } },
      { label: 'Manhattan Bridge', url: 'https://example.com/manhattan', meta: { year: 1909 } },
      { label: 'Williamsburg Bridge', url: 'https://example.com/williamsburg', meta: { year: 1903 } },
    ];
  }
  if (key === 'empty') return [];
  return [{ label: 'Fallback', url: 'https://example.com/fallback' }];
};

/** A generate handler that throws */
const throwingGenerate: GenerateHandler = async () => {
  throw new Error('Network failure');
};

/** A generate handler that returns many links (for cap testing) */
const bulkGenerate: GenerateHandler = async () => {
  const links: AlapLink[] = [];
  for (let i = 0; i < 250; i++) {
    links.push({ label: `Item ${i}`, url: `https://example.com/${i}` });
  }
  return links;
};

const baseConfig = (): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: {
    web: {
      generate: mockGenerate,
      keys: {
        bridges: { url: 'https://api.example.com/bridges' },
      },
    },
    time: {
      handler: (segments, link) => {
        const ts = link.createdAt ? new Date(link.createdAt as string).getTime() : 0;
        if (!ts) return false;
        const duration = parseInt(segments[0]) * DAY;
        return (now - ts) <= duration;
      },
    },
  },
  allLinks: {
    localBridge: {
      label: 'George Washington Bridge',
      url: 'https://example.com/gw',
      tags: ['bridge', 'nyc'],
      createdAt: new Date(now - 2 * DAY).toISOString(),
    },
  },
});

describe('Tier 23: Generate Protocols', () => {
  let config: AlapConfig;
  let engine: AlapEngine;

  beforeEach(() => {
    config = baseConfig();
    engine = new AlapEngine(config);
  });

  describe('basic generate', () => {
    it('resolves a generate protocol via resolveAsync', async () => {
      const results = await engine.resolveAsync(':web:bridges:');
      expect(results).toHaveLength(3);
      expect(results.map(r => r.label)).toEqual([
        'Brooklyn Bridge', 'Manhattan Bridge', 'Williamsburg Bridge',
      ]);
    });

    it('returns fallback for unknown key (handler decides)', async () => {
      const results = await engine.resolveAsync(':web:nonexistent:');
      // mockGenerate returns a fallback link for unrecognized keys
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Fallback');
    });

    it('returns empty for key that generates nothing', async () => {
      const results = await engine.resolveAsync(':web:empty:');
      expect(results).toHaveLength(0);
    });

    it('passes extra segments to the generate handler', async () => {
      let receivedSegments: string[] = [];
      config.protocols!.web.generate = async (segments) => {
        receivedSegments = segments;
        return [{ label: 'Test', url: 'https://example.com' }];
      };
      await engine.resolveAsync(':web:bridges:borough=brooklyn:limit=5:');
      expect(receivedSegments).toEqual(['bridges', 'borough=brooklyn', 'limit=5']);
    });
  });

  describe('temp ID lifecycle', () => {
    it('cleans up temp IDs after resolveAsync', async () => {
      await engine.resolveAsync(':web:bridges:');
      // Temp IDs should be cleaned up — allLinks should only have the original
      const allIds = Object.keys(config.allLinks);
      expect(allIds).toEqual(['localBridge']);
    });

    it('temp IDs do not leak into subsequent sync queries', async () => {
      await engine.resolveAsync(':web:bridges:');
      // Sync query should only see local links
      const results = engine.resolve('.bridge');
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('George Washington Bridge');
    });
  });

  describe('composition with filter protocols', () => {
    it('composes generate results with tags via union', async () => {
      const results = await engine.resolveAsync(':web:bridges: | .bridge');
      // 3 from generate + 1 local bridge
      expect(results).toHaveLength(4);
    });

    it('composes generate results with tags via intersection', async () => {
      // Generated links don't have tags, so intersection with .nyc should only match local
      const results = await engine.resolveAsync(':web:bridges: + .nyc');
      expect(results).toHaveLength(0); // generated links have no tags
    });

    it('composes generate with subtraction', async () => {
      // All bridges from web, minus... nothing to subtract since generated links have no overlap
      const results = await engine.resolveAsync(':web:bridges: - .nyc');
      expect(results).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    it('handles generate handler that throws', async () => {
      config.protocols!.failing = { generate: throwingGenerate };
      const results = await engine.resolveAsync(':failing:anything:');
      expect(results).toHaveLength(0);
    });

    it('caps results at MAX_GENERATED_LINKS', async () => {
      config.protocols!.bulk = { generate: bulkGenerate };
      const results = await engine.resolveAsync(':bulk:all:');
      expect(results).toHaveLength(200);
    });
  });

  describe('caching', () => {
    it('caches generate results by default', async () => {
      let callCount = 0;
      config.protocols!.web.generate = async (segments) => {
        callCount++;
        return [{ label: 'Cached', url: 'https://example.com/cached' }];
      };

      await engine.resolveAsync(':web:bridges:');
      await engine.resolveAsync(':web:bridges:');
      expect(callCount).toBe(1);
    });

    it('respects cache: 0 (no caching)', async () => {
      let callCount = 0;
      config.protocols!.web.cache = 0;
      config.protocols!.web.generate = async () => {
        callCount++;
        return [{ label: 'Fresh', url: 'https://example.com/fresh' }];
      };

      await engine.resolveAsync(':web:bridges:');
      await engine.resolveAsync(':web:bridges:');
      expect(callCount).toBe(2);
    });

    it('clearCache forces refetch', async () => {
      let callCount = 0;
      config.protocols!.web.generate = async () => {
        callCount++;
        return [{ label: 'Fresh', url: 'https://example.com/fresh' }];
      };

      await engine.resolveAsync(':web:bridges:');
      engine.clearCache();
      await engine.resolveAsync(':web:bridges:');
      expect(callCount).toBe(2);
    });
  });

  describe('scoping: generate inside parenthesized expressions', () => {
    it('(:web:bridges: *limit:2*) — refiner scoped to generated results', async () => {
      const results = await engine.resolveAsync('(:web:bridges: *limit:2*)');
      expect(results).toHaveLength(2);
    });

    it('(:web:bridges: *sort:label* *limit:2*) — sort and limit scoped to generated', async () => {
      const results = await engine.resolveAsync('(:web:bridges: *sort:label* *limit:2*)');
      expect(results).toHaveLength(2);
      expect(results[0].label).toBe('Brooklyn Bridge');
      expect(results[1].label).toBe('Manhattan Bridge');
    });

    it('.bridge | (:web:bridges: *limit:1*) — local union with limited generated', async () => {
      // .bridge matches localBridge (GW Bridge)
      // (:web:bridges: *limit:1*) returns 1 generated link
      const results = await engine.resolveAsync('.bridge | (:web:bridges: *limit:1*)');
      expect(results).toHaveLength(2);
      // One local, one generated
      const labels = results.map(r => r.label);
      expect(labels).toContain('George Washington Bridge');
    });

    it('(:web:bridges: *sort:label*) - .nyc — refiner inside parens, operator outside', async () => {
      // 3 generated bridges sorted, then subtract .nyc (which doesn't match generated links)
      const results = await engine.resolveAsync('(:web:bridges: *sort:label*) - .nyc');
      expect(results).toHaveLength(3);
      const labels = results.map(r => r.label);
      expect(labels).toEqual(['Brooklyn Bridge', 'Manhattan Bridge', 'Williamsburg Bridge']);
    });

    it('(:web:bridges: *limit:2*), .bridge — comma-separated: limited generated + local', async () => {
      const results = await engine.resolveAsync('(:web:bridges: *limit:2*), .bridge');
      // 2 from limited web + 1 local bridge
      expect(results).toHaveLength(3);
    });

    it('@cars | (:web:bridges: *sort:label* *limit:2*) — macro union with scoped generate', async () => {
      // @cars expands to "vwbug, bmwe36" — 2 local items
      // (:web:bridges: *sort:label* *limit:2*) — 2 generated, sorted, limited
      config.macros = { cars: { linkItems: 'localBridge' } };
      engine.updateConfig(config);

      const results = await engine.resolveAsync('@cars | (:web:bridges: *sort:label* *limit:2*)');
      expect(results).toHaveLength(3);
      const labels = results.map(r => r.label);
      expect(labels).toContain('George Washington Bridge');
      expect(labels).toContain('Brooklyn Bridge');
      expect(labels).toContain('Manhattan Bridge');
    });
  });

  describe('backward compatibility', () => {
    it('handler property still works as filter', () => {
      // protocolConfig uses `handler` not `filter` — should still work
      const results = engine.query(':time:7:');
      // localBridge was created 2 days ago, should match 7-day window
      expect(results).toContain('localBridge');
    });

    it('filter property takes precedence over handler', () => {
      config.protocols!.dual = {
        handler: () => true,
        filter: () => false,
      };
      const results = engine.query(':dual:');
      expect(results).toHaveLength(0); // filter wins
    });
  });
});
