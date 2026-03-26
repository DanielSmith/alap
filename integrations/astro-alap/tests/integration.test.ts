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

import { describe, it, expect, vi } from 'vitest';
import { alapIntegration } from '../src/index';

// Minimal mock of Astro's hook context
function createMockContext() {
  const injectedScripts: Array<{ stage: string; content: string }> = [];
  const configUpdates: unknown[] = [];

  return {
    injectedScripts,
    configUpdates,
    hookContext: {
      injectScript(stage: string, content: string) {
        injectedScripts.push({ stage, content });
      },
      updateConfig(config: unknown) {
        configUpdates.push(config);
      },
    },
  };
}

describe('alapIntegration', () => {
  // --- Basic structure ---

  it('returns an AstroIntegration with name "astro-alap"', () => {
    const integration = alapIntegration();
    expect(integration.name).toBe('astro-alap');
    expect(integration.hooks).toBeDefined();
    expect(integration.hooks['astro:config:setup']).toBeTypeOf('function');
  });

  // --- Script injection ---

  it('injects a page script with default config path', () => {
    const integration = alapIntegration();
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts).toHaveLength(1);
    expect(injectedScripts[0].stage).toBe('page');
    expect(injectedScripts[0].content).toContain("import config from './src/alap-config.ts'");
    expect(injectedScripts[0].content).toContain('defineAlapLink()');
    expect(injectedScripts[0].content).toContain('registerConfig(config)');
  });

  it('uses custom config path when provided', () => {
    const integration = alapIntegration({ config: './data/links.json' });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[0].content).toContain("import config from './data/links.json'");
  });

  it('registers named config when configName is provided', () => {
    const integration = alapIntegration({ configName: 'blog' });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[0].content).toContain('registerConfig(config, "blog")');
  });

  it('registers default config when configName is not provided', () => {
    const integration = alapIntegration();
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[0].content).toContain('registerConfig(config)');
    expect(injectedScripts[0].content).not.toContain('registerConfig(config, ');
  });

  // --- Markdown / remark-alap ---

  it('does not register remark plugin by default', () => {
    const integration = alapIntegration();
    const { hookContext, configUpdates } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(configUpdates).toHaveLength(0);
  });

  it('registers remark-alap plugin when markdown: true', () => {
    const integration = alapIntegration({ markdown: true });
    const { hookContext, configUpdates } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(configUpdates).toHaveLength(1);
    expect(configUpdates[0]).toEqual({
      markdown: {
        remarkPlugins: [['remark-alap', {}]],
      },
    });
  });

  it('does not register remark-alap plugin when markdown: false', () => {
    const integration = alapIntegration({ markdown: false });
    const { hookContext, configUpdates } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(configUpdates).toHaveLength(0);
  });

  // --- Multiple configs ---

  it('supports multiple integrations with different configs', () => {
    const blog = alapIntegration({ config: './src/blog-links.ts', configName: 'blog' });
    const docs = alapIntegration({ config: './src/docs-links.ts', configName: 'docs' });

    const ctx1 = createMockContext();
    const ctx2 = createMockContext();

    blog.hooks['astro:config:setup']!(ctx1.hookContext as any);
    docs.hooks['astro:config:setup']!(ctx2.hookContext as any);

    expect(ctx1.injectedScripts[0].content).toContain("'./src/blog-links.ts'");
    expect(ctx1.injectedScripts[0].content).toContain('"blog"');
    expect(ctx2.injectedScripts[0].content).toContain("'./src/docs-links.ts'");
    expect(ctx2.injectedScripts[0].content).toContain('"docs"');
  });

  // --- Default export ---

  it('exports alapIntegration as default', async () => {
    const mod = await import('../src/index');
    expect(mod.default).toBe(mod.alapIntegration);
  });

  // --- Build-time validation ---

  it('injects validateConfig by default', () => {
    const integration = alapIntegration();
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[0].content).toContain('validateConfig(config)');
  });

  it('skips validation when validate: false', () => {
    const integration = alapIntegration({ validate: false });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[0].content).not.toContain('validateConfig');
  });

  // --- Default styles ---

  it('does not inject styles by default', () => {
    const integration = alapIntegration();
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts).toHaveLength(1); // only the setup script
  });

  it('injects default styles when injectStyles: true', () => {
    const integration = alapIntegration({ injectStyles: true });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts).toHaveLength(2); // setup + styles
    expect(injectedScripts[1].content).toContain('data-alap-defaults');
    expect(injectedScripts[1].content).toContain('alap-link::part(menu)');
  });

  it('style injection is idempotent (checks for existing style tag)', () => {
    const integration = alapIntegration({ injectStyles: true });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[1].content).toContain("querySelector('style[data-alap-defaults]')");
  });

  it('default styles include dark mode', () => {
    const integration = alapIntegration({ injectStyles: true });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts[1].content).toContain('prefers-color-scheme: dark');
  });

  // --- Edge cases ---

  it('handles empty options', () => {
    const integration = alapIntegration({});
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    expect(injectedScripts).toHaveLength(1);
    expect(injectedScripts[0].content).toContain('./src/alap-config.ts');
  });

  it('escapes configName in generated script', () => {
    const integration = alapIntegration({ configName: 'my "config"' });
    const { hookContext, injectedScripts } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    // JSON.stringify handles escaping
    expect(injectedScripts[0].content).toContain('registerConfig(config, "my \\"config\\"")');
  });

  // --- All options combined ---

  it('handles all options enabled together', () => {
    const integration = alapIntegration({
      config: './data/links.ts',
      configName: 'main',
      markdown: true,
      validate: true,
      injectStyles: true,
    });
    const { hookContext, injectedScripts, configUpdates } = createMockContext();

    integration.hooks['astro:config:setup']!(hookContext as any);

    // Setup script with custom config, named registration, and validation
    expect(injectedScripts[0].content).toContain("'./data/links.ts'");
    expect(injectedScripts[0].content).toContain('"main"');
    expect(injectedScripts[0].content).toContain('validateConfig');

    // Styles injected
    expect(injectedScripts[1].content).toContain('data-alap-defaults');

    // Remark plugin registered
    expect(configUpdates).toHaveLength(1);
  });
});
