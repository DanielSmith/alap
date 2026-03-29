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
import { withAlap } from '../src/config';

// --- Component re-exports ---

describe('next-alap — exports', () => {
  it('exports AlapProvider', async () => {
    const mod = await import('../src/components');
    expect(mod.AlapProvider).toBeDefined();
    expect(typeof mod.AlapProvider).toBe('function');
  });

  it('exports AlapLink', async () => {
    const mod = await import('../src/components');
    expect(mod.AlapLink).toBeDefined();
    expect(typeof mod.AlapLink).toBe('function');
  });

  it('exports useAlap', async () => {
    const mod = await import('../src/components');
    expect(mod.useAlap).toBeDefined();
    expect(typeof mod.useAlap).toBe('function');
  });

  it('exports AlapLayout', async () => {
    const mod = await import('../src/layout');
    expect(mod.AlapLayout).toBeDefined();
    expect(typeof mod.AlapLayout).toBe('function');
  });

  it('main index re-exports all components', async () => {
    const mod = await import('../src/index');
    expect(mod.AlapProvider).toBeDefined();
    expect(mod.AlapLink).toBeDefined();
    expect(mod.useAlap).toBeDefined();
    expect(mod.AlapLayout).toBeDefined();
  });
});

// --- withAlap config wrapper ---

describe('withAlap()', () => {
  it('returns config unchanged when no options', () => {
    const config = { reactStrictMode: true };
    const result = withAlap(config);
    expect(result).toEqual(config);
  });

  it('returns config unchanged when markdown is false', () => {
    const config = { reactStrictMode: true };
    const result = withAlap(config, { markdown: false });
    expect(result).toEqual(config);
  });

  it('disables mdxRs when markdown is true', () => {
    const config = { reactStrictMode: true };
    const result = withAlap(config, { markdown: true });
    expect(result.experimental).toBeDefined();
    expect((result.experimental as Record<string, unknown>).mdxRs).toBe(false);
  });

  it('preserves existing experimental options', () => {
    const config = {
      reactStrictMode: true,
      experimental: { serverActions: true },
    };
    const result = withAlap(config, { markdown: true });
    const exp = result.experimental as Record<string, unknown>;
    expect(exp.serverActions).toBe(true);
    expect(exp.mdxRs).toBe(false);
  });

  it('preserves all other config keys', () => {
    const config = {
      reactStrictMode: true,
      images: { domains: ['example.com'] },
      env: { CUSTOM: 'value' },
    };
    const result = withAlap(config, { markdown: true });
    expect(result.reactStrictMode).toBe(true);
    expect(result.images).toEqual({ domains: ['example.com'] });
    expect(result.env).toEqual({ CUSTOM: 'value' });
  });

  it('handles empty config', () => {
    const result = withAlap({}, { markdown: true });
    expect((result.experimental as Record<string, unknown>).mdxRs).toBe(false);
  });

  it('does not mutate the original config', () => {
    const config = { reactStrictMode: true, experimental: { serverActions: true } };
    const original = JSON.parse(JSON.stringify(config));
    withAlap(config, { markdown: true });
    expect(config).toEqual(original);
  });
});

// --- Security: config wrapper does not inject code ---

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
    expect(serialized).not.toContain('require');
  });

  it('does not modify headers or redirects', () => {
    const result = withAlap({}, { markdown: true }) as Record<string, unknown>;
    expect(result.headers).toBeUndefined();
    expect(result.redirects).toBeUndefined();
    expect(result.rewrites).toBeUndefined();
  });
});
