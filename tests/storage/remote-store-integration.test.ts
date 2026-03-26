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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fork } from 'child_process';
import { resolve } from 'path';
import { createRemoteStore } from '../../src/storage/RemoteStore';
import type { ConfigStore } from '../../src/storage/ConfigStore';
import type { AlapConfig } from '../../src/core/types';

const SERVER_DIR = resolve(__dirname, '../../examples/servers/express-sqlite');
const PORT = 3847; // unusual port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;

// Unique prefix so tests never collide with seed data or parallel runs
const PREFIX = `_test_${Date.now()}_`;

const configA: AlapConfig = {
  allLinks: {
    bridge: { label: 'Brooklyn Bridge', url: 'https://example.com/brooklyn', tags: ['nyc', 'bridge'] },
    coffee: { label: 'Blue Bottle', url: 'https://example.com/bb', tags: ['nyc', 'coffee'] },
  },
  macros: {
    favorites: { linkItems: 'bridge, coffee' },
  },
  settings: { listType: 'ul' },
};

const configB: AlapConfig = {
  allLinks: {
    gg: { label: 'Golden Gate', url: 'https://example.com/gg', tags: ['sf', 'bridge'] },
  },
};

let serverProcess: ReturnType<typeof fork>;

async function waitForServer(url: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/configs`);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

/** All test config names get a unique prefix so they never collide with seed data */
function name(n: string) {
  return `${PREFIX}${n}`;
}

describe('RemoteStore ↔ Express integration', () => {
  let store: ConfigStore;

  beforeAll(async () => {
    serverProcess = fork(resolve(SERVER_DIR, 'server.js'), [], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore',
    });

    await waitForServer(BASE_URL);
    store = createRemoteStore({ baseUrl: BASE_URL });
  }, 10_000);

  afterAll(async () => {
    // Clean up all test configs
    const names = await store.list();
    for (const n of names.filter(n => n.startsWith(PREFIX))) {
      await store.remove(n);
    }
    if (serverProcess) serverProcess.kill();
  });

  // --- save + load round-trip ---

  it('save then load returns the same config', async () => {
    await store.save(name('nyc'), configA);
    const loaded = await store.load(name('nyc'));
    expect(loaded).toEqual(configA);
  });

  it('save then loadEntry returns config with metadata', async () => {
    const entry = await store.loadEntry(name('nyc'));
    expect(entry).not.toBeNull();
    expect(entry!.config).toEqual(configA);
    expect(entry!.meta.createdAt).toBeTruthy();
    expect(entry!.meta.updatedAt).toBeTruthy();
  });

  // --- list reflects saves ---

  it('list includes saved configs', async () => {
    await store.save(name('sf'), configB);
    const names = await store.list();
    expect(names).toContain(name('nyc'));
    expect(names).toContain(name('sf'));
  });

  it('list returns names in sorted order', async () => {
    const names = await store.list();
    expect(names).toEqual([...names].sort());
  });

  // --- update overwrites ---

  it('save overwrites existing config', async () => {
    const updated: AlapConfig = {
      ...configA,
      allLinks: {
        ...configA.allLinks,
        newItem: { label: 'New Spot', url: 'https://example.com/new', tags: ['nyc'] },
      },
    };
    await store.save(name('nyc'), updated);

    const loaded = await store.load(name('nyc'));
    expect(loaded!.allLinks).toHaveProperty('newItem');
    expect(loaded!.allLinks).toHaveProperty('bridge');
  });

  // --- load missing config ---

  it('load returns null for non-existent config', async () => {
    const loaded = await store.load(name('does-not-exist'));
    expect(loaded).toBeNull();
  });

  it('loadEntry returns null for non-existent config', async () => {
    const entry = await store.loadEntry(name('does-not-exist'));
    expect(entry).toBeNull();
  });

  // --- remove ---

  it('remove deletes a config', async () => {
    await store.save(name('to-delete'), configB);
    expect(await store.load(name('to-delete'))).not.toBeNull();

    await store.remove(name('to-delete'));
    expect(await store.load(name('to-delete'))).toBeNull();
  });

  it('remove non-existent config does not throw', async () => {
    await expect(store.remove(name('never-existed'))).resolves.toBeUndefined();
  });

  // --- URL encoding ---

  it('handles config names with spaces', async () => {
    await store.save(name('my library'), configB);
    const loaded = await store.load(name('my library'));
    expect(loaded).toEqual(configB);

    await store.remove(name('my library'));
    expect(await store.load(name('my library'))).toBeNull();
  });

  it('handles config names with special characters', async () => {
    await store.save(name('v2+beta'), configB);
    const loaded = await store.load(name('v2+beta'));
    expect(loaded).toEqual(configB);

    await store.remove(name('v2+beta'));
  });
});
