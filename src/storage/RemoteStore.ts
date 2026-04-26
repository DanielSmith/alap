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
import { validateConfig } from '../core/validateConfig';
import { deepCloneData } from '../core/deepCloneData';

export interface RemoteStoreOptions {
  /** Base URL of the config API (e.g. "https://api.example.com") */
  baseUrl: string;

  /** Optional auth token — sent as Bearer token in Authorization header */
  token?: string;

  /** Optional extra headers merged into every request */
  headers?: Record<string, string>;
}

/**
 * Remote config persistence over a REST API.
 *
 * Expects the server to implement:
 *   GET    /configs          → string[]  (list of names)
 *   GET    /configs/:name    → ConfigEntry | 404
 *   PUT    /configs/:name    → void  (body: AlapConfig)
 *   DELETE /configs/:name    → void
 *
 * See docs/servers.md for reference server implementations.
 */
export function createRemoteStore(options: RemoteStoreOptions): ConfigStore {
  const { baseUrl, token, headers: extraHeaders } = options;

  function headers(contentType?: string): Record<string, string> {
    const h: Record<string, string> = { ...extraHeaders };
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (contentType) h['Content-Type'] = contentType;
    return h;
  }

  function url(name?: string): string {
    const base = baseUrl.replace(/\/+$/, '');
    return name != null
      ? `${base}/configs/${encodeURIComponent(name)}`
      : `${base}/configs`;
  }

  return {
    async save(name: string, config: AlapConfig): Promise<void> {
      const res = await fetch(url(name), {
        method: 'PUT',
        headers: headers('application/json'),
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        throw new Error(`Failed to save config "${name}": ${res.status} ${res.statusText}`);
      }
    },

    async load(name: string): Promise<AlapConfig | null> {
      const res = await fetch(url(name), { headers: headers() });
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Failed to load config "${name}": ${res.status} ${res.statusText}`);
      }
      const entry: ConfigEntry = await res.json();
      return validateConfig(deepCloneData(entry.config), { provenance: 'storage:remote' });
    },

    async loadEntry(name: string): Promise<ConfigEntry | null> {
      const res = await fetch(url(name), { headers: headers() });
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Failed to load config "${name}": ${res.status} ${res.statusText}`);
      }
      const entry: ConfigEntry = await res.json();
      return { ...entry, config: validateConfig(deepCloneData(entry.config), { provenance: 'storage:remote' }) };
    },

    async list(): Promise<string[]> {
      const res = await fetch(url(), { headers: headers() });
      if (!res.ok) {
        throw new Error(`Failed to list configs: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    },

    async remove(name: string): Promise<void> {
      const res = await fetch(url(name), {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to remove config "${name}": ${res.status} ${res.statusText}`);
      }
    },
  };
}
