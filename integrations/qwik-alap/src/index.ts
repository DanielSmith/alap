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
   * @default './src/alap-config.ts'
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

  /**
   * Inject a minimal default stylesheet for `<alap-link>` menus.
   * Provides sensible defaults (light/dark mode) that can be overridden.
   * @default false
   */
  injectStyles?: boolean;
}

/** Minimal default styles for alap menus — light/dark mode, sensible spacing. */
const DEFAULT_STYLES = `
alap-link::part(menu) {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  min-width: 160px;
  font-family: inherit;
}
alap-link::part(link) {
  display: block;
  padding: 6px 16px;
  color: #1a1a1a;
  text-decoration: none;
  font-size: 0.9rem;
  line-height: 1.4;
}
alap-link::part(link):hover,
alap-link::part(link):focus-visible {
  background: #eff6ff;
  color: #2563eb;
}
@media (prefers-color-scheme: dark) {
  alap-link::part(menu) {
    background: #1e1e2e;
    border-color: #313244;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  alap-link::part(link) {
    color: #cdd6f4;
  }
  alap-link::part(link):hover,
  alap-link::part(link):focus-visible {
    background: #313244;
    color: #89b4fa;
  }
}
`;

/**
 * Vite plugin for Qwik City projects using Alap.
 *
 * Auto-injects the web component registration and config loading
 * into every page — no manual `<script>` tags needed.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { qwikCity } from '@builder.io/qwik-city/vite';
 * import { qwikVite } from '@builder.io/qwik/optimizer';
 * import { alapPlugin } from 'qwik-alap';
 *
 * export default defineConfig({
 *   plugins: [
 *     qwikCity(),
 *     qwikVite(),
 *     alapPlugin({ config: './src/alap-config.ts' }),
 *   ],
 * });
 * ```
 *
 * Then use `<alap-link>` anywhere in your Qwik components:
 * ```tsx
 * <alap-link query=".coffee">cafes</alap-link>
 * ```
 *
 * Or use the framework adapter for full Qwik integration:
 * ```tsx
 * import { AlapProvider, AlapLink } from 'alap/qwik';
 * ```
 */
export function alapPlugin(options: AlapPluginOptions = {}): Plugin {
  const configPath = options.config ?? './src/alap-config.ts';
  const configName = options.configName;
  const shouldValidate = options.validate !== false;

  const registerCall = configName
    ? `registerConfig(config, ${JSON.stringify(configName)});`
    : `registerConfig(config);`;

  const validateSnippet = shouldValidate
    ? `
      import('alap/core').then(({ validateConfig }) => {
        try { validateConfig(config); } catch (e) {
          console.warn('[qwik-alap] Config validation warning:', e.message);
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

  const styleTag = options.injectStyles
    ? `<style data-alap-defaults>${DEFAULT_STYLES}</style>`
    : '';

  return {
    name: 'qwik-alap',
    transformIndexHtml(html) {
      const scriptTag = `<script type="module">${setupScript}</script>`;
      return html.replace('</head>', `${styleTag}${scriptTag}</head>`);
    },
  };
}

export default alapPlugin;
