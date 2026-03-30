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

import type { Plugin } from 'vite';

export interface AlapPluginOptions {
  /**
   * Path to the config file (default export must be an AlapConfig object).
   * Resolved relative to the project root.
   * @default undefined — no config auto-loaded; use docs-config.js in public/ instead
   */
  config?: string;

  /**
   * Named config identifier. Use when registering multiple configs.
   * @default undefined (uses the default config slot)
   */
  configName?: string;

  /**
   * Validate the config at build time using `validateConfig()` from `alap/core`.
   * Logs warnings for invalid URLs, dangerous regex patterns, and structural issues.
   * Does not fail the build — only warns.
   * @default true
   */
  validate?: boolean;
}

/**
 * Vite plugin for VitePress projects using Alap.
 *
 * Does three things:
 * 1. Tells Vue's template compiler that `<alap-link>` is a custom element (not a Vue component)
 * 2. Injects the web component registration script into every page
 * 3. Optionally loads and registers an Alap config file
 *
 * @example
 * ```js
 * // .vitepress/config.mjs
 * import { alapPlugin } from 'vitepress-alap';
 *
 * export default defineConfig({
 *   vite: {
 *     plugins: [alapPlugin()],
 *   },
 * });
 * ```
 *
 * Then use `<alap-link>` anywhere in your markdown:
 * ```md
 * Check out these <alap-link query=".coffee">cafes</alap-link>.
 * ```
 *
 * For the config, either:
 * - Put `alap.iife.js` and a config script in `public/` and add them to `head` in VitePress config
 * - Or pass `config: './path/to/config.ts'` to auto-inject
 */
export function alapPlugin(options: AlapPluginOptions = {}): Plugin[] {
  const plugins: Plugin[] = [];

  // Plugin 1: Tell Vue that <alap-link> is a custom element
  plugins.push({
    name: 'vitepress-alap:custom-element',
    config() {
      return {
        vue: {
          template: {
            compilerOptions: {
              isCustomElement: (tag: string) => tag === 'alap-link',
            },
          },
        },
      } as Record<string, unknown>;
    },
  });

  // Plugin 2: If a config path is provided, inject setup script
  if (options.config) {
    const configPath = options.config;
    const configName = options.configName;
    const shouldValidate = options.validate !== false;

    const registerCall = configName
      ? `registerConfig(config, ${JSON.stringify(configName)});`
      : `registerConfig(config);`;

    const validateSnippet = shouldValidate
      ? `
      import('alap/core').then(({ validateConfig }) => {
        try { validateConfig(config); } catch (e) {
          console.warn('[vitepress-alap] Config validation warning:', e.message);
        }
      });
    `
      : '';

    const setupScript = `
      import { registerConfig, defineAlapLink } from 'alap';
      import config from '${configPath}';
      defineAlapLink();
      ${registerCall}
      ${validateSnippet}
    `;

    plugins.push({
      name: 'vitepress-alap:inject-config',
      transformIndexHtml(html) {
        const scriptTag = `<script type="module">${setupScript}</script>`;
        return html.replace('</head>', `${scriptTag}</head>`);
      },
    });
  }

  return plugins;
}

export default alapPlugin;
