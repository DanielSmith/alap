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

/**
 * nuxt-alap — Nuxt 3 integration for Alap.
 *
 * Provides a Nuxt plugin factory that registers the Alap web component
 * and config on the client side, plus a composable and component re-exports
 * from `alap/vue` for use in Nuxt pages and layouts.
 *
 * Quick start:
 *
 *   // plugins/alap.client.ts
 *   import { createAlapPlugin } from 'nuxt-alap';
 *   import config from '~/alap-config';
 *
 *   export default createAlapPlugin({ config });
 *
 *   // pages/index.vue
 *   <template>
 *     <AlapProvider :config="config">
 *       <p>Visit <AlapLink query=".coffee">cafes</AlapLink>.</p>
 *     </AlapProvider>
 *   </template>
 *
 *   <script setup>
 *   import { AlapProvider, AlapLink } from 'nuxt-alap';
 *   import config from '~/alap-config';
 *   </script>
 */

import type { AlapConfig } from 'alap/core';

// Re-export Vue adapter components for convenience
export { AlapProvider, AlapLink, useAlap } from 'alap/vue';
export type { UseAlapReturn } from 'alap/vue';

export interface AlapPluginOptions {
  /** The Alap link configuration */
  config: AlapConfig;

  /** Named config identifier for multi-config setups */
  configName?: string;

  /**
   * Also register the <alap-link> web component.
   * Enables web component usage in Nuxt Content and server-rendered HTML.
   * @default true
   */
  webComponent?: boolean;
}

/**
 * Creates a Nuxt client plugin that registers Alap.
 *
 * Usage: create `plugins/alap.client.ts` in your Nuxt project:
 *
 *   import { createAlapPlugin } from 'nuxt-alap';
 *   import config from '~/alap-config';
 *   export default createAlapPlugin({ config });
 *
 * The `.client.ts` suffix ensures it only runs in the browser
 * (avoiding HTMLElement errors during SSR).
 */
export function createAlapPlugin(options: AlapPluginOptions) {
  const { config, configName, webComponent = true } = options;

  // Return a Nuxt plugin definition
  return () => {
    if (typeof window === 'undefined') return;

    // Dynamic import to avoid HTMLElement at module scope during SSR
    import('alap').then(({ registerConfig, defineAlapLink }) => {
      if (configName !== undefined) {
        registerConfig(config, configName);
      } else {
        registerConfig(config);
      }
      if (webComponent) {
        defineAlapLink();
      }
    });
  };
}

/**
 * Vite plugin for Nuxt projects that adds remark-alap to the
 * Nuxt Content markdown pipeline.
 *
 * Usage in nuxt.config.ts:
 *
 *   import { withAlap } from 'nuxt-alap';
 *
 *   export default defineNuxtConfig(withAlap({
 *     // your Nuxt config
 *   }, { markdown: true }));
 */
export interface AlapNuxtOptions {
  /**
   * Add remark-alap to the Nuxt Content markdown pipeline.
   * Requires @nuxt/content and remark-alap to be installed.
   * @default false
   */
  markdown?: boolean;
}

export function withAlap<T extends Record<string, unknown>>(
  nuxtConfig: T,
  options: AlapNuxtOptions = {},
): T {
  if (!options.markdown) return nuxtConfig;

  const content = (nuxtConfig.content ?? {}) as Record<string, unknown>;
  const markdown = (content.markdown ?? {}) as Record<string, unknown>;
  const remarkPlugins = (markdown.remarkPlugins ?? {}) as Record<string, unknown>;

  return {
    ...nuxtConfig,
    content: {
      ...content,
      markdown: {
        ...markdown,
        remarkPlugins: {
          ...remarkPlugins,
          'remark-alap': {},
        },
      },
    },
  };
}
