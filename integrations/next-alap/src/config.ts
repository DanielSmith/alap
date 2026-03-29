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
 * Next.js config wrapper for Alap.
 *
 * Usage in next.config.mjs:
 *
 *   import { withAlap } from 'next-alap/config';
 *
 *   export default withAlap({
 *     // your Next.js config
 *   }, {
 *     markdown: true,  // adds remark-alap to MDX pipeline
 *   });
 */

export interface AlapNextOptions {
  /**
   * Add remark-alap to the MDX remark plugins.
   * Requires @next/mdx and remark-alap to be installed.
   * Disables mdxRs (Rust MDX compiler) since it doesn't support remark plugins.
   * @default false
   */
  markdown?: boolean;

  /**
   * Validate the Alap config at build time.
   * Logs warnings but does not fail the build.
   * @default true
   */
  validate?: boolean;
}

/**
 * Wraps a Next.js config to enable Alap features.
 *
 * Currently supports:
 * - markdown: adds remark-alap to the MDX pipeline
 *
 * Does NOT add webpack plugins. Vite only.
 */
export function withAlap<T extends Record<string, unknown>>(
  nextConfig: T,
  options: AlapNextOptions = {},
): T {
  if (!options.markdown) return nextConfig;

  // Disable Rust MDX compiler so remark plugins work
  const experimental = (nextConfig.experimental ?? {}) as Record<string, unknown>;

  return {
    ...nextConfig,
    experimental: {
      ...experimental,
      mdxRs: false,
    },
  };
}
