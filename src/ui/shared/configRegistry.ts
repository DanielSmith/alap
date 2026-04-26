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
import type { AlapConfig, AlapEngineOptions } from '../../core/types';

/**
 * Global registry of AlapEngine instances keyed by config name.
 * All web components (<alap-link>, <alap-lightbox>, <alap-lens>)
 * share a single registry so the same config feeds every renderer.
 * The default config (unnamed) uses the key '_default'.
 */
const engineRegistry = new Map<string, AlapEngine>();
const configRegistry = new Map<string, AlapConfig>();

const DEFAULT_CONFIG_KEY = '_default';

type RegisterOptions = { name?: string } & AlapEngineOptions;

/**
 * Register a config so that web components can use it.
 *
 *   registerConfig(myConfig);                               // registers as '_default'
 *   registerConfig(myConfig, 'secondary');                  // named
 *   registerConfig(myConfig, { handlers: { web: fn } });    // default name + handlers
 *   registerConfig(myConfig, 'secondary', { handlers });    // named + handlers
 *
 * The handlers registry (3.2+) is passed through to AlapEngine so async
 * protocols work from the registry path — not just from `new AlapEngine(...)`.
 */
export function registerConfig(config: AlapConfig, options?: RegisterOptions): void;
export function registerConfig(config: AlapConfig, name: string, options?: AlapEngineOptions): void;
export function registerConfig(
  config: AlapConfig,
  nameOrOptions?: string | RegisterOptions,
  options?: AlapEngineOptions,
): void {
  const { name, engineOptions } = normalizeArgs(nameOrOptions, options);
  configRegistry.set(name, config);
  engineRegistry.set(name, new AlapEngine(config, engineOptions));
}

/**
 * Update a previously registered config.
 *
 * If an engine is already registered under this name, swap its config —
 * handlers stay attached to the existing engine. If there's no prior
 * engine, fall through to `registerConfig` (handlers honored there).
 */
export function updateRegisteredConfig(config: AlapConfig, options?: RegisterOptions): void;
export function updateRegisteredConfig(config: AlapConfig, name: string, options?: AlapEngineOptions): void;
export function updateRegisteredConfig(
  config: AlapConfig,
  nameOrOptions?: string | RegisterOptions,
  options?: AlapEngineOptions,
): void {
  const { name, engineOptions } = normalizeArgs(nameOrOptions, options);
  const engine = engineRegistry.get(name);
  if (engine) {
    engine.updateConfig(config);
    configRegistry.set(name, config);
    return;
  }
  // No prior engine — fresh registration path, where handlers apply.
  registerConfig(config, name, engineOptions);
}

function normalizeArgs(
  nameOrOptions: string | RegisterOptions | undefined,
  options: AlapEngineOptions | undefined,
): { name: string; engineOptions: AlapEngineOptions | undefined } {
  if (typeof nameOrOptions === 'string') {
    return { name: nameOrOptions, engineOptions: options };
  }
  if (nameOrOptions && typeof nameOrOptions === 'object') {
    const { name = DEFAULT_CONFIG_KEY, ...engineOptions } = nameOrOptions;
    return { name, engineOptions };
  }
  return { name: DEFAULT_CONFIG_KEY, engineOptions: undefined };
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
