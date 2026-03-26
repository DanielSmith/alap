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
 * Exposes `window.Alap` with everything needed for zero-build Alap:
 *   - Web component registration + config
 *   - DOM adapter (class-based binding)
 *   - Engine (programmatic expression resolution)
 *   - Config utilities (validation, merging)
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

// Web Component
export { defineAlapLink, registerConfig, updateRegisteredConfig, AlapLinkElement } from './ui/web-component/AlapLinkElement';

// DOM Adapter
export { AlapUI } from './ui/dom/AlapUI';

// Engine
export { AlapEngine } from './core/AlapEngine';

// Config utilities
export { validateConfig } from './core/validateConfig';
export { mergeConfigs } from './core/mergeConfigs';
