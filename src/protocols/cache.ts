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

import type { AlapLink } from '../core/types';
import { DEFAULT_GENERATE_CACHE_TTL, MAX_CACHE_ENTRIES } from '../constants';

interface CacheEntry {
  links: AlapLink[];
  expiry: number;
}

/**
 * Simple in-memory TTL cache for generate protocol results.
 */
export class ProtocolCache {
  private entries = new Map<string, CacheEntry>();
  private defaultTTL: number;

  constructor(defaultTTL = DEFAULT_GENERATE_CACHE_TTL) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached links for a key, or null if missing/expired.
   */
  get(key: string): AlapLink[] | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.entries.delete(key);
      return null;
    }
    return entry.links;
  }

  /**
   * Cache links for a key with a TTL in minutes.
   * Pass 0 to skip caching entirely.
   */
  set(key: string, links: AlapLink[], ttlMinutes?: number): void {
    const ttl = ttlMinutes ?? this.defaultTTL;
    if (ttl <= 0) return;

    // Evict oldest entry if at capacity
    if (this.entries.size >= MAX_CACHE_ENTRIES && !this.entries.has(key)) {
      let oldestKey: string | undefined;
      let oldestExpiry = Infinity;
      for (const [k, entry] of this.entries) {
        if (entry.expiry < oldestExpiry) {
          oldestExpiry = entry.expiry;
          oldestKey = k;
        }
      }
      if (oldestKey) this.entries.delete(oldestKey);
    }

    this.entries.set(key, {
      links,
      expiry: Date.now() + ttl * 60 * 1000,
    });
  }

  clear(): void {
    this.entries.clear();
  }
}
