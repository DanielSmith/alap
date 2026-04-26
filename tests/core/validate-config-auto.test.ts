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
import { AlapEngine } from '../../src/core/AlapEngine';
import { validateConfig } from '../../src/core/validateConfig';
import { getProvenance, isAuthorTier, isStorageTier } from '../../src/core/linkProvenance';

/**
 * Phase 6 Step 1 — auto-validate + WeakSet short-circuit.
 *
 * The design intent: hand-written configs (the 95% case) pass straight
 * into AlapEngine/AlapUI without boilerplate and get `author`-tier stamps
 * for loose rendering. Storage-loaded configs arrive pre-stamped and
 * re-validation must not clobber their `storage:*` stamps.
 */

describe('AlapEngine auto-validates raw configs', () => {
  it('stamps raw allLinks as author-tier on construction', () => {
    const config = {
      allLinks: {
        home: { url: '/', label: 'Home' },
      },
    };
    const engine = new AlapEngine(config as Parameters<typeof validateConfig>[0] as Parameters<typeof AlapEngine>[0]);
    const resolved = engine.resolve('home');
    expect(resolved).toHaveLength(1);
    expect(isAuthorTier(resolved[0])).toBe(true);
  });

  it('accepts explicit provenance override in constructor options', () => {
    const config = {
      allLinks: {
        cached: { url: 'https://example.com/', label: 'Cached' },
      },
    };
    const engine = new AlapEngine(config as Parameters<typeof AlapEngine>[0], {
      provenance: 'storage:remote',
    });
    const resolved = engine.resolve('cached');
    expect(resolved).toHaveLength(1);
    expect(getProvenance(resolved[0])).toBe('storage:remote');
    expect(isStorageTier(resolved[0])).toBe(true);
  });

  it('preserves pre-stamped storage tier when given a validated config', () => {
    // Simulates a storage adapter: validateConfig runs with storage tier,
    // then the caller hands the resulting config to new AlapEngine(). The
    // engine's internal auto-validate must short-circuit and keep stamps.
    const validated = validateConfig(
      { allLinks: { stored: { url: 'https://example.com/', label: 'stored' } } },
      { provenance: 'storage:local' },
    );
    const engine = new AlapEngine(validated);
    const resolved = engine.resolve('stored');
    expect(getProvenance(resolved[0])).toBe('storage:local');
    // Even if the caller passed a different provenance option, the WeakSet
    // short-circuit wins because the input was already validated.
    const overridden = new AlapEngine(validated, { provenance: 'author' });
    const r2 = overridden.resolve('stored');
    expect(getProvenance(r2[0])).toBe('storage:local');
  });
});

describe('engine.updateConfig auto-validates', () => {
  it('stamps raw rebuild configs as author-tier', () => {
    const engine = new AlapEngine({
      allLinks: { initial: { url: '/', label: 'i' } },
    });
    engine.updateConfig({
      allLinks: { rebuilt: { url: '/rebuilt', label: 'r' } },
    });
    const resolved = engine.resolve('rebuilt');
    expect(isAuthorTier(resolved[0])).toBe(true);
  });

  it('preserves stamps on pre-validated configs passed to updateConfig', () => {
    const engine = new AlapEngine({ allLinks: { a: { url: '/a' } } });
    const newCfg = validateConfig(
      { allLinks: { loaded: { url: '/loaded' } } },
      { provenance: 'storage:remote' },
    );
    engine.updateConfig(newCfg);
    const resolved = engine.resolve('loaded');
    expect(getProvenance(resolved[0])).toBe('storage:remote');
  });
});

describe('validateConfig WeakSet short-circuit', () => {
  it('returns the same frozen reference on repeated calls', () => {
    const first = validateConfig({ allLinks: { a: { url: '/a' } } });
    const second = validateConfig(first);
    expect(second).toBe(first);
  });

  it('short-circuit keeps original stamp even when caller passes a different provenance option', () => {
    const stored = validateConfig(
      { allLinks: { a: { url: '/a' } } },
      { provenance: 'storage:local' },
    );
    const maybe = validateConfig(stored, { provenance: 'author' });
    expect(maybe).toBe(stored);
    expect(getProvenance(stored.allLinks.a)).toBe('storage:local');
  });

  it('does not short-circuit fresh raw inputs that happen to be structurally identical', () => {
    // Two separate raw objects → two separate validation runs → two distinct
    // results. No cross-contamination from the WeakSet.
    const a = validateConfig({ allLinks: { x: { url: '/x' } } });
    const b = validateConfig({ allLinks: { x: { url: '/x' } } });
    expect(a).not.toBe(b);
    expect(a.allLinks.x).not.toBe(b.allLinks.x);
  });
});
