/**
 * Astro integration for Alap.
 *
 * Auto-injects the web component registration and config loading
 * into every page — no manual <script> tags needed.
 *
 * Usage in astro.config.mjs:
 *   import alap from './integrations/alap.mjs';
 *   export default defineConfig({
 *     integrations: [alap({ config: './src/alap-config.ts' })],
 *   });
 */
export default function alapIntegration(options = {}) {
  const configPath = options.config ?? './src/alap-config.ts';

  return {
    name: 'alap',
    hooks: {
      'astro:config:setup'({ config: astroConfig, injectScript }) {
        // Resolve the config path relative to the project root so the
        // injected virtual module can find it regardless of context.
        const resolved = new URL(configPath, astroConfig.root).pathname;

        // Injected once per page, runs before any <alap-link> renders.
        // 'page' scope = runs on every page that includes this integration.
        injectScript('page', `
          import { registerConfig, defineAlapLink } from 'alap';
          import config from '${resolved}';
          defineAlapLink();
          registerConfig(config);
        `);
      },
    },
  };
}
