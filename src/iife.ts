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
 * IIFE entry point for script-tag usage.
 *
 * Exposes `window.Alap` with everything: engine, menus (DOM + WC),
 * renderers (lightbox, lens), embed, protocols, coordinators.
 *
 * @example
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
 * <script>
 *   Alap.defineAlapLink();
 *   Alap.registerConfig({ allLinks: { ... }, macros: { ... } });
 * </script>
 * <alap-link query=".coffee">cafes</alap-link>
 * ```
 */

// --- Core ---
export { AlapEngine } from './core/AlapEngine';
export { ExpressionParser } from './core/ExpressionParser';
export { mergeConfigs } from './core/mergeConfigs';
export { validateConfig } from './core/validateConfig';

// --- DOM menu ---
export { AlapUI } from './ui/dom/AlapUI';

// --- Web component menu ---
export { AlapLinkElement, registerConfig, updateRegisteredConfig, defineAlapLink } from './ui/web-component/AlapLinkElement';
export { getEngine, getConfig } from './ui/shared';

// --- Lightbox ---
export { AlapLightbox } from './ui-lightbox/AlapLightbox';
export { AlapLightboxElement, defineAlapLightbox } from './ui-lightbox/AlapLightboxElement';

// --- Lens ---
export { AlapLens } from './ui-lens/AlapLens';
export { AlapLensElement, defineAlapLens } from './ui-lens/AlapLensElement';

// --- Embed ---
export { createEmbed, matchProvider, transformUrl, isAllowlisted, getEmbedHeight, shouldLoadEmbed, grantConsent, revokeConsent, hasConsent } from './ui-embed';

// --- Protocols ---
export { webHandler } from './protocols/web';
export { jsonHandler } from './protocols/json';
export { atprotoHandler, parseAtUri, atUriToDestinations } from './protocols/atproto';
export { ProtocolCache } from './protocols/cache';

// --- Coordinators ---
export { getInstanceCoordinator } from './ui/shared/instanceCoordinator';
export { RendererCoordinator } from './ui/shared/rendererCoordinator';
export { RENDERER_MENU, RENDERER_LIGHTBOX, RENDERER_LENS } from './ui/shared/coordinatedRenderer';
