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
import type { ConfigStore, ConfigEntry } from './ConfigStore';

export interface HybridStoreOptions {
  /** Local store (e.g. IndexedDB) — always available, used as cache */
  local: ConfigStore;

  /** Remote store (e.g. REST API) — may be unavailable */
  remote: ConfigStore;

  /**
   * Called when a remote operation fails.
   * Useful for showing a toast or logging.
   * The hybrid store continues working from local on failure.
   */
  onRemoteError?: (operation: string, name: string, error: unknown) => void;
}

/**
 * Write-through hybrid store combining local and remote persistence.
 *
 * - **save**: writes to local AND remote (remote failure is non-fatal)
 * - **load**: reads from local first (instant), then refreshes from remote in background
 * - **loadEntry**: same as load but returns full entry with metadata
 * - **list**: merges local and remote lists (deduplicates)
 * - **remove**: removes from both local and remote
 *
 * If the remote is unavailable, the store gracefully degrades to local-only.
 * When the remote comes back, the next save/load will sync automatically.
 */
export function createHybridStore(options: HybridStoreOptions): ConfigStore {
  const { local, remote, onRemoteError } = options;

  function reportError(operation: string, name: string, error: unknown) {
    if (onRemoteError) {
      onRemoteError(operation, name, error);
    }
  }

  return {
    async save(name: string, config: AlapConfig): Promise<void> {
      // Always write to local first (fast, reliable)
      await local.save(name, config);

      // Then write to remote (best-effort)
      try {
        await remote.save(name, config);
      } catch (err) {
        reportError('save', name, err);
      }
    },

    async load(name: string): Promise<AlapConfig | null> {
      // Read from local first (instant)
      const localConfig = await local.load(name);

      // Try to refresh from remote
      try {
        const remoteEntry = await remote.loadEntry(name);
        if (remoteEntry) {
          // Update local cache with remote data
          await local.save(name, remoteEntry.config);
          return remoteEntry.config;
        }
      } catch (err) {
        reportError('load', name, err);
      }

      return localConfig;
    },

    async loadEntry(name: string): Promise<ConfigEntry | null> {
      // Read from local first
      const localEntry = await local.loadEntry(name);

      // Try to refresh from remote
      try {
        const remoteEntry = await remote.loadEntry(name);
        if (remoteEntry) {
          await local.save(name, remoteEntry.config);
          return remoteEntry;
        }
      } catch (err) {
        reportError('loadEntry', name, err);
      }

      return localEntry;
    },

    async list(): Promise<string[]> {
      // Get both lists
      const localNames = await local.list();
      let remoteNames: string[] = [];

      try {
        remoteNames = await remote.list();
      } catch (err) {
        reportError('list', '', err);
      }

      // Merge and deduplicate
      const all = new Set([...localNames, ...remoteNames]);
      return [...all].sort();
    },

    async remove(name: string): Promise<void> {
      // Remove from both
      await local.remove(name);

      try {
        await remote.remove(name);
      } catch (err) {
        reportError('remove', name, err);
      }
    },
  };
}
