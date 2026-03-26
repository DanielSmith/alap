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

import { openDB, type IDBPDatabase } from 'idb';
import type { AlapConfig } from '../core/types';
import type { ConfigStore, ConfigEntry, ConfigMeta } from './ConfigStore';

const DB_NAME = 'alap-editor';
const DB_VERSION = 1;
const STORE_NAME = 'configs';

/**
 * Browser-local config persistence backed by IndexedDB.
 *
 * Uses the `idb` library (~1KB gzipped) for a clean Promise-based API.
 * Each config is stored as a `ConfigEntry` (config + metadata) keyed by name.
 *
 * Usage:
 * ```ts
 * const store = await createIndexedDBStore();
 * await store.save('my-library', config);
 * const loaded = await store.load('my-library');
 * ```
 */
export async function createIndexedDBStore(
  dbName = DB_NAME,
): Promise<ConfigStore> {
  const db: IDBPDatabase = await openDB(dbName, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
  });

  return {
    async save(name: string, config: AlapConfig): Promise<void> {
      const existing = await db.get(STORE_NAME, name) as ConfigEntry | undefined;
      const now = new Date().toISOString();

      const meta: ConfigMeta = {
        createdAt: existing?.meta.createdAt ?? now,
        updatedAt: now,
      };

      const entry: ConfigEntry = { config, meta };
      await db.put(STORE_NAME, entry, name);
    },

    async load(name: string): Promise<AlapConfig | null> {
      const entry = await db.get(STORE_NAME, name) as ConfigEntry | undefined;
      return entry?.config ?? null;
    },

    async loadEntry(name: string): Promise<ConfigEntry | null> {
      const entry = await db.get(STORE_NAME, name) as ConfigEntry | undefined;
      return entry ?? null;
    },

    async list(): Promise<string[]> {
      return db.getAllKeys(STORE_NAME) as Promise<string[]>;
    },

    async remove(name: string): Promise<void> {
      await db.delete(STORE_NAME, name);
    },
  };
}
