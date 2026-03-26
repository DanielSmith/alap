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

import type { AlapConfig } from '../core/types';

/**
 * Metadata stored alongside each config.
 */
export interface ConfigMeta {
  /** When the config was last saved (ISO 8601) */
  updatedAt: string;

  /** When the config was first created (ISO 8601) */
  createdAt: string;
}

/**
 * A stored config entry: the config itself plus metadata.
 */
export interface ConfigEntry {
  config: AlapConfig;
  meta: ConfigMeta;
}

/**
 * The persistence contract for Alap configs.
 *
 * Implementations include IndexedDB (browser-local) and REST API (remote).
 * The consumer (editor, CLI, sync layer) doesn't care which is behind this interface.
 */
export interface ConfigStore {
  /** Save a config under the given name. Creates or overwrites. */
  save(name: string, config: AlapConfig): Promise<void>;

  /** Load a config by name. Returns null if not found. */
  load(name: string): Promise<AlapConfig | null>;

  /** Load a config with its metadata. Returns null if not found. */
  loadEntry(name: string): Promise<ConfigEntry | null>;

  /** List all saved config names. */
  list(): Promise<string[]>;

  /** Remove a config by name. No-op if not found. */
  remove(name: string): Promise<void>;
}
