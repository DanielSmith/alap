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
import type { AlapConfig, AlapLink, GenerateHandler, ProtocolHandler } from '../../src/core/types';

/**
 * Handler-registry API (Phase 2 of the 3.2 security push). Config is
 * data-only; protocol handlers are passed separately via
 * `new AlapEngine(config, { handlers })` or `engine.registerProtocol()`.
 */

function baseConfig(): AlapConfig {
  return validateConfig({
    allLinks: {
      localOnly: { url: 'https://example.com/local', label: 'Local', tags: ['stuff'] },
    },
  });
}

const generatedLinks: AlapLink[] = [
  { url: 'https://generated.example/a', label: 'A' },
  { url: 'https://generated.example/b', label: 'B' },
];

describe('AlapEngine handler registry', () => {
  it('accepts a bare function via handlers shorthand (treated as generate)', async () => {
    const handler: GenerateHandler = async () => generatedLinks;
    const engine = new AlapEngine(baseConfig(), { handlers: { gen: handler } });

    const out = await engine.resolveAsync(':gen:');
    expect(out.map((r) => r.label)).toEqual(['A', 'B']);
  });

  it('accepts an object-form entry with generate and/or filter', async () => {
    const gen: GenerateHandler = async () => generatedLinks;
    const filter: ProtocolHandler = (_args, link) => link.tags?.includes('stuff') ?? false;

    const engine = new AlapEngine(baseConfig(), {
      handlers: {
        gen: { generate: gen },
        onlyStuff: { filter },
      },
    });

    const generated = await engine.resolveAsync(':gen:');
    expect(generated).toHaveLength(2);

    const filtered = engine.resolve(':onlyStuff:');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('localOnly');
  });

  it('throws when the same protocol name is registered twice', () => {
    const engine = new AlapEngine(baseConfig(), {
      handlers: { gen: (async () => generatedLinks) as GenerateHandler },
    });
    expect(() => engine.registerProtocol('gen', async () => [])).toThrow(
      /already registered/,
    );
  });

  it('registerProtocol adds a handler post-construction', async () => {
    const engine = new AlapEngine(baseConfig());
    engine.registerProtocol('late', (async () => generatedLinks) as GenerateHandler);

    const out = await engine.resolveAsync(':late:');
    expect(out).toHaveLength(2);
  });

  it('combines options.handlers with registerProtocol', async () => {
    const engine = new AlapEngine(baseConfig(), {
      handlers: { ctor: (async () => [{ url: 'https://ctor/', label: 'ctor' }]) as GenerateHandler },
    });
    engine.registerProtocol('late', (async () => [{ url: 'https://late/', label: 'late' }]) as GenerateHandler);

    const ctor = await engine.resolveAsync(':ctor:');
    const late = await engine.resolveAsync(':late:');
    expect(ctor[0].label).toBe('ctor');
    expect(late[0].label).toBe('late');
  });

  it('rejects legacy function-in-config shapes at both doors', () => {
    // Legacy shape — a function field under config.protocols[name].
    const legacyShape = {
      allLinks: {},
      protocols: { web: { generate: async () => [] } },
    } as unknown as AlapConfig;

    // Front door: validateConfig rejects directly.
    expect(() => validateConfig(legacyShape)).toThrow(/handlers must be passed via/);

    // Belt-and-suspenders: constructing an engine with a raw legacy config
    // that somehow bypassed validateConfig still fails.
    expect(() => new AlapEngine(legacyShape)).toThrow(/handlers must be passed via/);
  });

  it('preserves handler-stamped allowedSchemes through injectLinks', async () => {
    // A trusted protocol handler that emits an obsidian:// URL with
    // allowedSchemes stamped — the field must survive the engine's
    // injectLinks pass so the renderer's strict-tier sanitizer can
    // honor it (asserted at the sanitizer layer in sanitize-by-tier.test.ts).
    const obsidianLikeHandler = (async () => [
      {
        url: 'obsidian://open?vault=V&file=F',
        label: 'A note',
        allowedSchemes: ['obsidian'],
      },
    ]) as GenerateHandler;

    const engine = new AlapEngine(baseConfig(), {
      handlers: { obsidian: obsidianLikeHandler },
    });

    const out = await engine.resolveAsync(':obsidian:');
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('obsidian://open?vault=V&file=F');
    expect(out[0].allowedSchemes).toEqual(['obsidian']);
  });

  it('handler-stamped allowedSchemes are preserved verbatim — ceiling enforcement happens at render', async () => {
    // The engine doesn't filter the field; that's the sanitizer's job.
    // A handler that stamps disallowed schemes still has them on the
    // resolved link, but the library ceiling (intersected by
    // sanitizeUrlStrict) blocks the URL when the renderer goes to
    // emit it. This test asserts the engine round-trips the field so
    // the renderer-side test is exercising the realistic shape.
    const carelessHandler = (async () => [
      {
        url: 'vscode://file/etc/passwd',
        label: 'Bad',
        allowedSchemes: ['vscode', 'javascript'],
      },
    ]) as GenerateHandler;

    const engine = new AlapEngine(baseConfig(), {
      handlers: { bad: carelessHandler },
    });

    const out = await engine.resolveAsync(':bad:');
    expect(out).toHaveLength(1);
    expect(out[0].allowedSchemes).toEqual(['vscode', 'javascript']);
  });
});
