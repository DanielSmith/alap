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
import { registerConfig, updateRegisteredConfig, getEngine } from '../../../src/ui/shared/configRegistry';
import { validateConfig } from '../../../src/core/validateConfig';
import type { AlapConfig, AlapLink, GenerateHandler } from '../../../src/core/types';

/**
 * Covers the 3.2 extension that lets the web-component / Alpine / Astro
 * registry path pass handlers alongside the config — the equivalent of
 * `new AlapEngine(config, { handlers })` for framework adapters that
 * register configs globally instead of owning an engine directly.
 */

const baseConfig = (): AlapConfig =>
  validateConfig({
    allLinks: {
      local: { url: 'https://example.com/local', label: 'Local', tags: ['stuff'] },
    },
  });

const generated: AlapLink[] = [
  { url: 'https://generated.example/a', label: 'A' },
  { url: 'https://generated.example/b', label: 'B' },
];

describe('configRegistry handlers support', () => {
  it('passes handlers through when given as a single options arg', async () => {
    const handler: GenerateHandler = async () => generated;
    registerConfig(baseConfig(), { name: 'reg-test-1', handlers: { gen: handler } });

    const engine = getEngine('reg-test-1');
    expect(engine).toBeDefined();
    const out = await engine!.resolveAsync(':gen:');
    expect(out.map((r) => r.label)).toEqual(['A', 'B']);
  });

  it('passes handlers through when name is positional', async () => {
    const handler: GenerateHandler = async () => generated;
    registerConfig(baseConfig(), 'reg-test-2', { handlers: { gen: handler } });

    const engine = getEngine('reg-test-2');
    expect(engine).toBeDefined();
    const out = await engine!.resolveAsync(':gen:');
    expect(out).toHaveLength(2);
  });

  it('updateRegisteredConfig swaps config without re-registering handlers on an existing engine', () => {
    const handler: GenerateHandler = async () => generated;
    registerConfig(baseConfig(), 'reg-test-3', { handlers: { gen: handler } });

    const engineBefore = getEngine('reg-test-3')!;
    // Second call with handlers — must NOT throw even though the engine already
    // has `gen` registered; existing engine keeps its handlers, config swaps.
    expect(() =>
      updateRegisteredConfig(baseConfig(), 'reg-test-3', { handlers: { gen: handler } }),
    ).not.toThrow();
    const engineAfter = getEngine('reg-test-3');
    expect(engineAfter).toBe(engineBefore);
  });

  it('updateRegisteredConfig with no prior engine wires handlers on fresh registration', async () => {
    const handler: GenerateHandler = async () => generated;
    updateRegisteredConfig(baseConfig(), 'reg-test-4', { handlers: { gen: handler } });

    const engine = getEngine('reg-test-4')!;
    const out = await engine.resolveAsync(':gen:');
    expect(out).toHaveLength(2);
  });
});
