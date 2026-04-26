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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlapEngine } from '../../src/core/AlapEngine';
import type { AlapConfig, AlapLink, GenerateHandler, ProtocolHandlerRegistry } from '../../src/core/types';

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
    // Data only — handlers are passed separately to the engine.
    web: {
      keys: {
        bridges: { url: 'https://api.example.com/bridges' },
      },
    },
    // time has no data — filter-only protocol; its handler lives in mockHandlers().
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

const mockHandlers = (): ProtocolHandlerRegistry => ({
  web: mockGenerate,
  time: {
    filter: (segments, link) => {
      const ts = link.createdAt ? new Date(link.createdAt as string).getTime() : 0;
      if (!ts) return false;
      const duration = parseInt(segments[0]) * DAY;
      return (now - ts) <= duration;
    },
  },
});

describe('Tier 23: Generate Protocols', () => {
  let config: AlapConfig;
  let engine: AlapEngine;

  beforeEach(() => {
    config = baseConfig();
    engine = new AlapEngine(config, { handlers: mockHandlers() });
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
      const customGenerate: GenerateHandler = async (segments) => {
        receivedSegments = segments;
        return [{ label: 'Test', url: 'https://example.com' }];
      };
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), web: customGenerate } });
      await engine.resolveAsync(':web:bridges:borough=brooklyn:limit=5:');
      expect(receivedSegments).toEqual(['bridges', 'borough=brooklyn', 'limit=5']);
    });
  });

  describe('temp ID lifecycle', () => {
    it('retains temp IDs after resolveAsync so progressive renderers can continue to use them', async () => {
      await engine.resolveAsync(':web:bridges:');
      // Temp IDs now live in the engine's overlay (no longer mutated into
      // the caller's config). A subsequent sync resolve of the same token
      // still returns the generated items — that's the contract renderers rely on.
      const resolved = engine.resolve(':web:bridges:');
      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved.every((r) => r.id.startsWith('__alap_gen_web_'))).toBe(true);
    });

    it('clearGenerated removes all injected temp IDs', async () => {
      await engine.resolveAsync(':web:bridges:');
      engine.clearGenerated();
      const allIds = Object.keys(config.allLinks);
      expect(allIds).toEqual(['localBridge']);
    });

    it('temp IDs do not leak into subsequent sync queries (tag mismatch)', async () => {
      await engine.resolveAsync(':web:bridges:');
      // Generated items don't carry the `.bridge` tag, so a .bridge query
      // sees only the local tagged item.
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
      engine = new AlapEngine(config, {
        handlers: { ...mockHandlers(), failing: throwingGenerate },
      });
      const results = await engine.resolveAsync(':failing:anything:');
      expect(results).toHaveLength(0);
    });

    it('caps results at MAX_GENERATED_LINKS', async () => {
      engine = new AlapEngine(config, {
        handlers: { ...mockHandlers(), bulk: bulkGenerate },
      });
      const results = await engine.resolveAsync(':bulk:all:');
      expect(results).toHaveLength(200);
    });

    it('emits a louder warning when a handler returns >10× the cap (Surface 4-2)', async () => {
      // Simulate a misbehaving/hostile handler that ignores the cap and
      // returns 3000 links. Engine still slice-caps to 200; the operator
      // gets an alarming warning so they can notice.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const floodGenerate: GenerateHandler = async () => {
        const links = [];
        for (let i = 0; i < 3000; i++) {
          links.push({ label: `flood-${i}`, url: `https://example.com/${i}` });
        }
        return links;
      };
      engine = new AlapEngine(config, {
        handlers: { ...mockHandlers(), flood: floodGenerate },
      });
      const results = await engine.resolveAsync(':flood:anything:');
      expect(results).toHaveLength(200);
      const warnings = warnSpy.mock.calls.map((c) => String(c[0]));
      expect(warnings.some((w) => w.includes('>10×') && w.includes('3000'))).toBe(true);
      warnSpy.mockRestore();
    });

    it('uses the quieter warning for modest overruns (just over the cap)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const slightOverGenerate: GenerateHandler = async () => {
        const links = [];
        for (let i = 0; i < 250; i++) {
          links.push({ label: `item-${i}`, url: `https://example.com/${i}` });
        }
        return links;
      };
      engine = new AlapEngine(config, {
        handlers: { ...mockHandlers(), slight: slightOverGenerate },
      });
      await engine.resolveAsync(':slight:anything:');
      const warnings = warnSpy.mock.calls.map((c) => String(c[0]));
      expect(warnings.some((w) => w.includes('capped at 200') && !w.includes('>10×'))).toBe(true);
      warnSpy.mockRestore();
    });
  });

  describe('caching', () => {
    it('caches generate results by default', async () => {
      let callCount = 0;
      const countingGenerate: GenerateHandler = async () => {
        callCount++;
        return [{ label: 'Cached', url: 'https://example.com/cached' }];
      };
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), web: countingGenerate } });

      await engine.resolveAsync(':web:bridges:');
      await engine.resolveAsync(':web:bridges:');
      expect(callCount).toBe(1);
    });

    it('respects cache: 0 (no caching)', async () => {
      let callCount = 0;
      config.protocols!.web!.cache = 0;
      const freshGenerate: GenerateHandler = async () => {
        callCount++;
        return [{ label: 'Fresh', url: 'https://example.com/fresh' }];
      };
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), web: freshGenerate } });

      await engine.resolveAsync(':web:bridges:');
      await engine.resolveAsync(':web:bridges:');
      expect(callCount).toBe(2);
    });

    it('clearCache forces refetch', async () => {
      let callCount = 0;
      const countingGenerate: GenerateHandler = async () => {
        callCount++;
        return [{ label: 'Fresh', url: 'https://example.com/fresh' }];
      };
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), web: countingGenerate } });

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


  describe('protocol-injected link sanitization (security-pass 3.2)', () => {
    it('strips javascript: from injected link.url, image, thumbnail', async () => {
      const xssGenerate: GenerateHandler = async () => [
        {
          label: 'trap',
          url: 'javascript:alert(document.cookie)',
          image: 'javascript:alert(1)',
          thumbnail: 'javascript:alert(2)',
        },
      ];
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), xss: xssGenerate } });
      const resolved = await engine.resolveAsync(':xss:');
      expect(resolved.length).toBe(1);
      expect(resolved[0].url).toBe('about:blank');
      expect(resolved[0].image).toBe('about:blank');
      expect(resolved[0].thumbnail).toBe('about:blank');
    });

    it('strips javascript: from injected meta.*Url fields', async () => {
      const xssGenerate: GenerateHandler = async () => [
        {
          label: 'trap',
          url: 'https://safe.example.com/',
          meta: {
            photoCreditUrl: 'javascript:alert(document.cookie)',
            authorUrl: 'javascript:void(0)',
            plainNote: 'javascript:not-a-url-key-so-untouched',
          },
        },
      ];
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), xss: xssGenerate } });
      const resolved = await engine.resolveAsync(':xss:');
      expect(resolved.length).toBe(1);
      const meta = resolved[0].meta as Record<string, unknown>;
      expect(meta.photoCreditUrl).toBe('about:blank');
      expect(meta.authorUrl).toBe('about:blank');
      // non-URL-suffix keys are preserved as-is (matches validateConfig behavior)
      expect(meta.plainNote).toBe('javascript:not-a-url-key-so-untouched');
    });

    it('preserves safe URLs from protocol-generated links', async () => {
      const safeGenerate: GenerateHandler = async () => [
        {
          label: 'ok',
          url: 'https://example.com/safe',
          image: 'https://example.com/img.jpg',
          meta: { profileUrl: 'https://example.com/author' },
        },
      ];
      engine = new AlapEngine(config, { handlers: { ...mockHandlers(), ok: safeGenerate } });
      const resolved = await engine.resolveAsync(':ok:');
      expect(resolved.length).toBe(1);
      expect(resolved[0].url).toBe('https://example.com/safe');
      expect(resolved[0].image).toBe('https://example.com/img.jpg');
      expect((resolved[0].meta as Record<string, unknown>).profileUrl).toBe('https://example.com/author');
    });
  });
});
