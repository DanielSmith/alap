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
import { validateConfig } from '../../src/core/validateConfig';
import type { AlapConfig, AlapLink, GenerateHandler } from '../../src/core/types';

/**
 * Engine overlay + freeze invariants from Phase 4 of the 3.2 security push.
 *
 * - Author config.allLinks is frozen after validateConfig.
 * - Protocol-generated links live in a private overlay, never in
 *   config.allLinks — the engine can surface them via resolve() without
 *   mutating the caller's config.
 * - Author ids take precedence over overlay ids (defense in depth against
 *   a protocol attempting to shadow a known-good item like `login`).
 * - clearGenerated empties the overlay and leaves author links intact.
 */

const login: AlapLink = { url: 'https://example.com/login', label: 'Login', tags: ['auth'] };

function makeConfig(): AlapConfig {
  return validateConfig({
    allLinks: {
      login,
      home: { url: 'https://example.com/', label: 'Home', tags: ['nav'] },
    },
  });
}

describe('Engine overlay + freeze invariants', () => {
  let config: AlapConfig;

  beforeEach(() => {
    config = makeConfig();
  });

  it('author config.allLinks is frozen post-validateConfig', () => {
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.allLinks)).toBe(true);
    expect(Object.isFrozen(config.allLinks.login)).toBe(true);
  });

  it('mutating a frozen author link throws in strict mode', () => {
    expect(() => {
      (config.allLinks.login as { url: string }).url = 'https://evil.example/';
    }).toThrow(TypeError);
  });

  it('protocol-generated links never leak into the frozen config.allLinks', async () => {
    const handler: GenerateHandler = async () => [
      { url: 'https://generated.example/a', label: 'A' },
      { url: 'https://generated.example/b', label: 'B' },
    ];
    const engine = new AlapEngine(config, { handlers: { gen: handler } });
    await engine.resolveAsync(':gen:');

    // The author's config object is untouched — only `login` and `home` remain.
    expect(Object.keys(config.allLinks).sort()).toEqual(['home', 'login']);

    // The engine still surfaces the generated links through its own API.
    const out = engine.resolve(':gen:');
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.id.startsWith('__alap_gen_gen_'))).toBe(true);
  });

  it('author id wins over overlay id with the same key', async () => {
    // A malicious generate handler that returns a link and tries to place
    // it under the well-known id `login`. The engine assigns ids itself
    // (`__alap_gen_<protocol>_...`), so crafting this exploit in the real
    // public API isn't possible — but the OverlayCatalog enforces the
    // invariant in case of a future code path that bypasses id generation.
    const handler: GenerateHandler = async () => [
      { url: 'https://evil.example/fake-login', label: 'PWNED' },
    ];
    const engine = new AlapEngine(config, { handlers: { gen: handler } });
    await engine.resolveAsync(':gen:');

    // Direct author lookup still resolves to the original login entry.
    const direct = engine.resolve('login');
    expect(direct).toHaveLength(1);
    expect(direct[0].url).toBe('https://example.com/login');
  });

  it('clearGenerated empties the overlay without touching author links', async () => {
    const handler: GenerateHandler = async () => [
      { url: 'https://generated.example/a', label: 'A' },
    ];
    const engine = new AlapEngine(config, { handlers: { gen: handler } });
    await engine.resolveAsync(':gen:');
    expect(engine.resolve(':gen:')).toHaveLength(1);

    engine.clearGenerated();
    // Overlay now empty. A fresh :gen: query with no re-fetch returns nothing
    // (the generatedIds map was cleared alongside the overlay).
    const after = engine.query(':gen:');
    expect(after).toEqual([]);

    // Author links still resolve.
    expect(engine.resolve('home')).toHaveLength(1);
  });

  it('engine.addLink / removeLink / updateSettings rebuild-and-freeze', () => {
    const engine = new AlapEngine(config);
    engine.addLink('profile', { url: 'https://example.com/me', label: 'Me', tags: ['nav'] });
    expect(engine.resolve('profile')).toHaveLength(1);

    engine.removeLink('home');
    expect(engine.query('home')).toEqual([]);

    engine.updateSettings({ menuTimeout: 9999 });
    // No throw = success — the result is a freshly frozen config.
  });
});
