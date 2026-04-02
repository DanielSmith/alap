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

// IndexedDB persistence for site rules and metadata snapshots.
// Sits alongside the existing 'configs' store in the 'alap-editor' database.

import { openDB, type IDBPDatabase } from 'idb';
import type { SiteRule } from './meta-rules';
import type { RawMeta } from './fetch-strategy';
import { SEED_RULES } from './seed-rules';

const DB_NAME = 'alap-editor';
const DB_VERSION = 2;
const RULES_STORE = 'siteRules';
const SNAPSHOTS_STORE = 'metaSnapshots';

export interface MetaSnapshot {
  url: string;
  raw: RawMeta;
  checksum: string;
  strategy: string;
  fetchedAt: string;
}

export interface MetaStore {
  getRulesForUrl(url: string): Promise<SiteRule[]>;
  saveRule(rule: SiteRule): Promise<void>;
  listRules(): Promise<SiteRule[]>;
  saveSnapshot(snapshot: MetaSnapshot): Promise<boolean>;
  getLatestSnapshot(url: string): Promise<MetaSnapshot | null>;
  getSnapshotHistory(url: string): Promise<MetaSnapshot[]>;
}

/**
 * Compute a checksum for raw metadata. Uses SHA-256 when available,
 * falls back to a simple string hash for HTTP contexts.
 */
export async function computeChecksum(raw: RawMeta): Promise<string> {
  const sorted = JSON.stringify(raw, Object.keys(raw).sort());

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(sorted);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash + sorted.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function createMetaStore(
  dbName = DB_NAME,
): Promise<MetaStore> {
  const db: IDBPDatabase = await openDB(dbName, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (!database.objectStoreNames.contains('configs')) {
        database.createObjectStore('configs');
      }
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains(RULES_STORE)) {
          database.createObjectStore(RULES_STORE);
        }
        if (!database.objectStoreNames.contains(SNAPSHOTS_STORE)) {
          const snapshots = database.createObjectStore(SNAPSHOTS_STORE, { autoIncrement: true });
          snapshots.createIndex('by_url', 'url');
          snapshots.createIndex('by_url_checksum', ['url', 'checksum']);
        }
      }
    },
  });

  // Seed rules if the store is empty
  const existingKeys = await db.getAllKeys(RULES_STORE);
  if (existingKeys.length === 0) {
    for (const rule of SEED_RULES) {
      await db.put(RULES_STORE, rule, rule.domain);
    }
  }

  return {
    async getRulesForUrl(url: string): Promise<SiteRule[]> {
      return db.getAll(RULES_STORE);
    },

    async saveRule(rule: SiteRule): Promise<void> {
      await db.put(RULES_STORE, rule, rule.domain);
    },

    async listRules(): Promise<SiteRule[]> {
      return db.getAll(RULES_STORE);
    },

    async saveSnapshot(snapshot: MetaSnapshot): Promise<boolean> {
      // Check for duplicate via checksum
      const existing = await db.getFromIndex(
        SNAPSHOTS_STORE, 'by_url_checksum', [snapshot.url, snapshot.checksum],
      );
      if (existing) return false;

      await db.add(SNAPSHOTS_STORE, snapshot);
      return true;
    },

    async getLatestSnapshot(url: string): Promise<MetaSnapshot | null> {
      const index = db.transaction(SNAPSHOTS_STORE).store.index('by_url');
      let latest: MetaSnapshot | null = null;

      let cursor = await index.openCursor(url, 'prev');
      while (cursor) {
        const snap = cursor.value as MetaSnapshot;
        if (!latest || snap.fetchedAt > latest.fetchedAt) {
          latest = snap;
        }
        cursor = await cursor.continue();
      }

      return latest;
    },

    async getSnapshotHistory(url: string): Promise<MetaSnapshot[]> {
      return db.getAllFromIndex(SNAPSHOTS_STORE, 'by_url', url);
    },
  };
}
