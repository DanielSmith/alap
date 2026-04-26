/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Astro's runtime contribution for Alap is the config registry + web
 * component definitions — the `.astro` component delegates to them. This
 * demo uses the web components directly so the page runs outside of
 * Astro's build pipeline.
 */

import { registerConfig, defineAlapLink, defineAlapLens, defineAlapLightbox } from 'alap';
import { buildConfig, buildHandlers } from '../shared/buildConfig';

registerConfig(buildConfig('astro'), { handlers: buildHandlers() });
defineAlapLink();
defineAlapLens();
defineAlapLightbox();
