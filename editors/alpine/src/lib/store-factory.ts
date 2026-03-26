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

import { createIndexedDBStore, createRemoteStore, createHybridStore } from 'alap/storage';
import type { ConfigStore } from 'alap/storage';
import type { StorageMode } from '../store/editor';

// For production, use HTTPS (e.g., 'https://api.example.com'). HTTP is for local dev only.
const DEFAULT_API_URL = 'http://localhost:3000';

export async function createStore(
  mode: StorageMode,
  apiUrl = DEFAULT_API_URL,
  onRemoteError?: (operation: string, name: string, error: unknown) => void,
): Promise<ConfigStore> {
  switch (mode) {
    case 'local':
      return createIndexedDBStore();

    case 'remote':
      return createRemoteStore({ baseUrl: apiUrl });

    case 'hybrid': {
      const local = await createIndexedDBStore();
      const remote = createRemoteStore({ baseUrl: apiUrl });
      return createHybridStore({ local, remote, onRemoteError });
    }
  }
}
