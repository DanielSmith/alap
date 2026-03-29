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
import { createAlapPlugin, withAlap } from '../src/index';

// --- Exports ---

describe('nuxt-alap — exports', () => {
  it('exports AlapProvider', async () => {
    const mod = await import('../src/index');
    expect(mod.AlapProvider).toBeDefined();
  });

  it('exports AlapLink', async () => {
    const mod = await import('../src/index');
    expect(mod.AlapLink).toBeDefined();
  });

  it('exports useAlap', async () => {
    const mod = await import('../src/index');
    expect(typeof mod.useAlap).toBe('function');
  });

  it('exports createAlapPlugin', () => {
    expect(typeof createAlapPlugin).toBe('function');
  });

  it('exports withAlap', () => {
    expect(typeof withAlap).toBe('function');
  });
});

// --- createAlapPlugin ---

describe('createAlapPlugin()', () => {
  it('returns a function', () => {
    const plugin = createAlapPlugin({ config: { allLinks: {} } });
    expect(typeof plugin).toBe('function');
  });

  it('does not throw when called in Node (no window)', () => {
    const plugin = createAlapPlugin({ config: { allLinks: {} } });
    expect(() => plugin()).not.toThrow();
  });
});

// --- withAlap config wrapper ---

describe('withAlap()', () => {
  it('returns config unchanged when no options', () => {
    const config = { devtools: { enabled: true } };
    const result = withAlap(config);
    expect(result).toEqual(config);
  });

  it('returns config unchanged when markdown is false', () => {
    const config = { devtools: { enabled: true } };
    const result = withAlap(config, { markdown: false });
    expect(result).toEqual(config);
  });

  it('adds remark-alap to content.markdown.remarkPlugins', () => {
    const result = withAlap({}, { markdown: true });
    const content = result.content as Record<string, unknown>;
    const markdown = content.markdown as Record<string, unknown>;
    const plugins = markdown.remarkPlugins as Record<string, unknown>;
    expect(plugins['remark-alap']).toEqual({});
  });

  it('preserves existing content config', () => {
    const config = {
      content: {
        documentDriven: true,
        markdown: {
          toc: { depth: 3 },
        },
      },
    };
    const result = withAlap(config, { markdown: true });
    const content = result.content as Record<string, unknown>;
    expect(content.documentDriven).toBe(true);
    const markdown = content.markdown as Record<string, unknown>;
    expect(markdown.toc).toEqual({ depth: 3 });
  });

  it('preserves existing remark plugins', () => {
    const config = {
      content: {
        markdown: {
          remarkPlugins: { 'remark-gfm': {} },
        },
      },
    };
    const result = withAlap(config, { markdown: true });
    const content = result.content as Record<string, unknown>;
    const markdown = content.markdown as Record<string, unknown>;
    const plugins = markdown.remarkPlugins as Record<string, unknown>;
    expect(plugins['remark-gfm']).toEqual({});
    expect(plugins['remark-alap']).toEqual({});
  });

  it('preserves all other config keys', () => {
    const config = {
      devtools: { enabled: true },
      css: ['~/assets/main.css'],
      modules: ['@nuxt/content'],
    };
    const result = withAlap(config, { markdown: true });
    expect(result.devtools).toEqual({ enabled: true });
    expect(result.css).toEqual(['~/assets/main.css']);
    expect(result.modules).toEqual(['@nuxt/content']);
  });

  it('does not mutate the original config', () => {
    const config = { devtools: { enabled: true }, content: { documentDriven: true } };
    const original = JSON.parse(JSON.stringify(config));
    withAlap(config, { markdown: true });
    expect(config).toEqual(original);
  });
});

// --- Security ---

describe('withAlap() — security', () => {
  it('does not add webpack plugins', () => {
    const result = withAlap({}, { markdown: true }) as Record<string, unknown>;
    expect(result.webpack).toBeUndefined();
  });

  it('does not add scripts or eval', () => {
    const result = withAlap({}, { markdown: true });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('eval');
    expect(serialized).not.toContain('Function');
  });

  it('does not modify hooks or middleware', () => {
    const result = withAlap({}, { markdown: true }) as Record<string, unknown>;
    expect(result.hooks).toBeUndefined();
    expect(result.serverMiddleware).toBeUndefined();
    expect(result.routeRules).toBeUndefined();
  });
});
