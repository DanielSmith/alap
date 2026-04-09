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

import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig } from '../../core/types';

/**
 * Global registry of AlapEngine instances keyed by config name.
 * All web components (<alap-link>, <alap-lightbox>, <alap-lens>)
 * share a single registry so the same config feeds every renderer.
 * The default config (unnamed) uses the key '_default'.
 */
const engineRegistry = new Map<string, AlapEngine>();
const configRegistry = new Map<string, AlapConfig>();

const DEFAULT_CONFIG_KEY = '_default';

/**
 * Register a config so that web components can use it.
 *
 *   registerConfig(myConfig);                // registers as '_default'
 *   registerConfig(myConfig, 'secondary');   // registers as 'secondary'
 */
export function registerConfig(config: AlapConfig, name = DEFAULT_CONFIG_KEY): void {
  configRegistry.set(name, config);
  engineRegistry.set(name, new AlapEngine(config));
}

/**
 * Update a previously registered config.
 */
export function updateRegisteredConfig(config: AlapConfig, name = DEFAULT_CONFIG_KEY): void {
  const engine = engineRegistry.get(name);
  if (engine) {
    engine.updateConfig(config);
    configRegistry.set(name, config);
  } else {
    registerConfig(config, name);
  }
}

/**
 * Look up a registered engine by config name.
 */
export function getEngine(name = DEFAULT_CONFIG_KEY): AlapEngine | undefined {
  return engineRegistry.get(name);
}

/**
 * Look up a registered config by name.
 */
export function getConfig(name = DEFAULT_CONFIG_KEY): AlapConfig | undefined {
  return configRegistry.get(name);
}
