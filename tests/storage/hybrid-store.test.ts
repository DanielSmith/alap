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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHybridStore } from '../../src/storage/HybridStore';
import type { ConfigStore, ConfigEntry } from '../../src/storage/ConfigStore';
import type { AlapConfig } from '../../src/core/types';

const testConfig: AlapConfig = {
  allLinks: {
    item1: { label: 'Item One', url: 'https://one.com', tags: ['a'] },
  },
};

const testConfig2: AlapConfig = {
  allLinks: {
    item2: { label: 'Item Two', url: 'https://two.com', tags: ['b'] },
  },
};

const testEntry: ConfigEntry = {
  config: testConfig,
  meta: { createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
};

const testEntry2: ConfigEntry = {
  config: testConfig2,
  meta: { createdAt: '2026-03-10T00:00:00Z', updatedAt: '2026-03-12T12:00:00Z' },
};

function mockStore(data: Record<string, ConfigEntry> = {}): ConfigStore {
  const store = { ...data };

  return {
    save: vi.fn(async (name: string, config: AlapConfig) => {
      const now = new Date().toISOString();
      store[name] = {
        config,
        meta: {
          createdAt: store[name]?.meta.createdAt ?? now,
          updatedAt: now,
        },
      };
    }),
    load: vi.fn(async (name: string) => store[name]?.config ?? null),
    loadEntry: vi.fn(async (name: string) => store[name] ?? null),
    list: vi.fn(async () => Object.keys(store).sort()),
    remove: vi.fn(async (name: string) => { delete store[name]; }),
  };
}

function failingStore(): ConfigStore {
  const err = new Error('Network error');
  return {
    save: vi.fn(async () => { throw err; }),
    load: vi.fn(async () => { throw err; }),
    loadEntry: vi.fn(async () => { throw err; }),
    list: vi.fn(async () => { throw err; }),
    remove: vi.fn(async () => { throw err; }),
  };
}

describe('HybridStore', () => {
  // --- save ---

  describe('save', () => {
    it('writes to both local and remote', async () => {
      const local = mockStore();
      const remote = mockStore();
      const hybrid = createHybridStore({ local, remote });

      await hybrid.save('demo', testConfig);

      expect(local.save).toHaveBeenCalledWith('demo', testConfig);
      expect(remote.save).toHaveBeenCalledWith('demo', testConfig);
    });

    it('saves to local even if remote fails', async () => {
      const local = mockStore();
      const remote = failingStore();
      const onRemoteError = vi.fn();
      const hybrid = createHybridStore({ local, remote, onRemoteError });

      await hybrid.save('demo', testConfig);

      expect(local.save).toHaveBeenCalledWith('demo', testConfig);
      expect(onRemoteError).toHaveBeenCalledWith('save', 'demo', expect.any(Error));
    });

    it('does not throw when remote fails', async () => {
      const local = mockStore();
      const remote = failingStore();
      const hybrid = createHybridStore({ local, remote });

      await expect(hybrid.save('demo', testConfig)).resolves.toBeUndefined();
    });
  });

  // --- load ---

  describe('load', () => {
    it('returns remote data and updates local cache', async () => {
      const local = mockStore();
      const remote = mockStore({ demo: testEntry });
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.load('demo');

      expect(result).toEqual(testConfig);
      // Should have cached to local
      expect(local.save).toHaveBeenCalledWith('demo', testConfig);
    });

    it('returns local data when remote fails', async () => {
      const local = mockStore({ demo: testEntry });
      const remote = failingStore();
      const onRemoteError = vi.fn();
      const hybrid = createHybridStore({ local, remote, onRemoteError });

      const result = await hybrid.load('demo');

      expect(result).toEqual(testConfig);
      expect(onRemoteError).toHaveBeenCalledWith('load', 'demo', expect.any(Error));
    });

    it('returns null when neither has the config', async () => {
      const local = mockStore();
      const remote = mockStore();
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.load('missing');

      expect(result).toBeNull();
    });

    it('returns local data when remote returns null', async () => {
      const local = mockStore({ demo: testEntry });
      const remote = mockStore();
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.load('demo');

      expect(result).toEqual(testConfig);
    });

    it('prefers remote data over stale local data', async () => {
      const local = mockStore({ demo: testEntry });
      const remote = mockStore({ demo: testEntry2 });
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.load('demo');

      expect(result).toEqual(testConfig2);
      expect(local.save).toHaveBeenCalledWith('demo', testConfig2);
    });
  });

  // --- loadEntry ---

  describe('loadEntry', () => {
    it('returns remote entry and updates local cache', async () => {
      const local = mockStore();
      const remote = mockStore({ demo: testEntry });
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.loadEntry('demo');

      expect(result).toEqual(testEntry);
      expect(local.save).toHaveBeenCalledWith('demo', testConfig);
    });

    it('returns local entry when remote fails', async () => {
      const local = mockStore({ demo: testEntry });
      const remote = failingStore();
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.loadEntry('demo');

      expect(result).toEqual(testEntry);
    });

    it('returns null when neither has the entry', async () => {
      const local = mockStore();
      const remote = mockStore();
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.loadEntry('missing');

      expect(result).toBeNull();
    });
  });

  // --- list ---

  describe('list', () => {
    it('merges and deduplicates local and remote names', async () => {
      const local = mockStore({ alpha: testEntry, shared: testEntry });
      const remote = mockStore({ beta: testEntry, shared: testEntry });
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.list();

      expect(result).toEqual(['alpha', 'beta', 'shared']);
    });

    it('returns local names when remote fails', async () => {
      const local = mockStore({ alpha: testEntry, beta: testEntry });
      const remote = failingStore();
      const onRemoteError = vi.fn();
      const hybrid = createHybridStore({ local, remote, onRemoteError });

      const result = await hybrid.list();

      expect(result).toEqual(['alpha', 'beta']);
      expect(onRemoteError).toHaveBeenCalledWith('list', '', expect.any(Error));
    });

    it('returns sorted results', async () => {
      const local = mockStore({ charlie: testEntry, alpha: testEntry });
      const remote = mockStore({ beta: testEntry });
      const hybrid = createHybridStore({ local, remote });

      const result = await hybrid.list();

      expect(result).toEqual(['alpha', 'beta', 'charlie']);
    });
  });

  // --- remove ---

  describe('remove', () => {
    it('removes from both local and remote', async () => {
      const local = mockStore({ demo: testEntry });
      const remote = mockStore({ demo: testEntry });
      const hybrid = createHybridStore({ local, remote });

      await hybrid.remove('demo');

      expect(local.remove).toHaveBeenCalledWith('demo');
      expect(remote.remove).toHaveBeenCalledWith('demo');
    });

    it('removes from local even if remote fails', async () => {
      const local = mockStore({ demo: testEntry });
      const remote = failingStore();
      const onRemoteError = vi.fn();
      const hybrid = createHybridStore({ local, remote, onRemoteError });

      await hybrid.remove('demo');

      expect(local.remove).toHaveBeenCalledWith('demo');
      expect(onRemoteError).toHaveBeenCalledWith('remove', 'demo', expect.any(Error));
    });

    it('does not throw when remote fails', async () => {
      const local = mockStore();
      const remote = failingStore();
      const hybrid = createHybridStore({ local, remote });

      await expect(hybrid.remove('demo')).resolves.toBeUndefined();
    });
  });

  // --- onRemoteError ---

  describe('onRemoteError callback', () => {
    it('is optional — no crash when not provided', async () => {
      const local = mockStore();
      const remote = failingStore();
      const hybrid = createHybridStore({ local, remote });

      // save writes to local even though remote fails
      await expect(hybrid.save('demo', testConfig)).resolves.toBeUndefined();
      // load reads from local (which has data from save above)
      await expect(hybrid.load('demo')).resolves.toEqual(testConfig);
      await expect(hybrid.list()).resolves.toEqual(['demo']);
      await expect(hybrid.remove('demo')).resolves.toBeUndefined();
    });
  });
});
