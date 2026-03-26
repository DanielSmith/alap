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
 * alap/astro — Astro adapter for Alap.
 *
 * Provides two Astro components:
 *
 *   <AlapSetup config={myConfig} />   — registers config + defines <alap-link>
 *   <AlapLink query=".coffee" />      — type-safe wrapper around <alap-link>
 *
 * Usage:
 *   import { AlapSetup, AlapLink } from 'alap/astro';
 *
 * Note: The raw <alap-link> web component also works directly in Astro
 * without this adapter — this package adds TypeScript props and
 * simplified setup.
 */

// Re-export core types for convenience
export type { AlapConfig, AlapLink, AlapMacro, AlapSettings } from '../../core/types';

// Re-export web component registration functions for advanced usage
export { registerConfig, updateRegisteredConfig, defineAlapLink } from '../web-component/AlapLinkElement';
