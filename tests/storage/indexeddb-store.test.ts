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

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createIndexedDBStore } from '../../src/storage/IndexedDBStore';
import type { ConfigStore } from '../../src/storage/ConfigStore';
import type { AlapConfig } from '../../src/core/types';

const testConfig: AlapConfig = {
  settings: { listType: 'ul' },
  allLinks: {
    item1: { label: 'Item One', url: 'https://one.com', tags: ['a'] },
    item2: { label: 'Item Two', url: 'https://two.com', tags: ['b'] },
  },
};

const testConfig2: AlapConfig = {
  allLinks: {
    item3: { label: 'Item Three', url: 'https://three.com', tags: ['c'] },
  },
};

// Use unique DB names per test to avoid cross-contamination
let dbCounter = 0;
function uniqueDbName(): string {
  return `test-alap-${Date.now()}-${dbCounter++}`;
}

describe('IndexedDBStore', () => {
  let store: ConfigStore;

  beforeEach(async () => {
    store = await createIndexedDBStore(uniqueDbName());
  });

  it('starts with an empty list', async () => {
    const names = await store.list();
    expect(names).toEqual([]);
  });

  it('saves and loads a config', async () => {
    await store.save('demo', testConfig);
    const loaded = await store.load('demo');
    expect(loaded).toEqual(testConfig);
  });

  it('returns null for a missing config', async () => {
    const loaded = await store.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('lists saved config names', async () => {
    await store.save('alpha', testConfig);
    await store.save('beta', testConfig2);
    const names = await store.list();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    expect(names).toHaveLength(2);
  });

  it('overwrites an existing config', async () => {
    await store.save('demo', testConfig);
    await store.save('demo', testConfig2);
    const loaded = await store.load('demo');
    expect(loaded).toEqual(testConfig2);
  });

  it('removes a config', async () => {
    await store.save('demo', testConfig);
    await store.remove('demo');
    const loaded = await store.load('demo');
    expect(loaded).toBeNull();
    const names = await store.list();
    expect(names).toEqual([]);
  });

  it('remove is a no-op for missing config', async () => {
    await expect(store.remove('nonexistent')).resolves.toBeUndefined();
  });

  it('loadEntry returns config with metadata', async () => {
    await store.save('demo', testConfig);
    const entry = await store.loadEntry('demo');
    expect(entry).not.toBeNull();
    expect(entry!.config).toEqual(testConfig);
    expect(entry!.meta.createdAt).toBeDefined();
    expect(entry!.meta.updatedAt).toBeDefined();
  });

  it('loadEntry returns null for missing config', async () => {
    const entry = await store.loadEntry('nonexistent');
    expect(entry).toBeNull();
  });

  it('preserves createdAt on overwrite, updates updatedAt', async () => {
    await store.save('demo', testConfig);
    const entry1 = await store.loadEntry('demo');

    // Small delay to ensure timestamps differ
    await new Promise(r => setTimeout(r, 10));

    await store.save('demo', testConfig2);
    const entry2 = await store.loadEntry('demo');

    expect(entry2!.meta.createdAt).toBe(entry1!.meta.createdAt);
    expect(entry2!.meta.updatedAt).not.toBe(entry1!.meta.updatedAt);
  });

  it('handles configs with macros', async () => {
    const configWithMacros: AlapConfig = {
      macros: {
        faves: { linkItems: 'item1, item2' },
      },
      allLinks: {
        item1: { label: 'One', url: 'https://one.com' },
        item2: { label: 'Two', url: 'https://two.com' },
      },
    };
    await store.save('macros', configWithMacros);
    const loaded = await store.load('macros');
    expect(loaded!.macros!.faves.linkItems).toBe('item1, item2');
  });

  it('handles empty allLinks', async () => {
    const empty: AlapConfig = { allLinks: {} };
    await store.save('empty', empty);
    const loaded = await store.load('empty');
    expect(loaded).toEqual(empty);
  });

  it('stores multiple independent configs', async () => {
    await store.save('a', testConfig);
    await store.save('b', testConfig2);

    const a = await store.load('a');
    const b = await store.load('b');
    expect(a).toEqual(testConfig);
    expect(b).toEqual(testConfig2);

    await store.remove('a');
    expect(await store.load('a')).toBeNull();
    expect(await store.load('b')).toEqual(testConfig2);
  });

  // Regression: Surface 5-1 from the 2026-04-22 security pass. IndexedDB
  // persists configs across tabs and reloads. Without revalidation on load,
  // a prior-page XSS or a sibling tab on the same origin could poison
  // IndexedDB with a config that has a dangerous href or exotic keys, and
  // the next page load would drink it in. RemoteStore.load already validates;
  // IndexedDBStore.load now matches that contract.

  it('sanitizes dangerous URLs from stored configs on load', async () => {
    // Write raw (bypassing save) to simulate a poisoned record from a
    // different writer (prior XSS, sibling tab, manual devtools injection).
    const poisoned: AlapConfig = {
      allLinks: {
        evil: {
          label: 'Click me',
          url: 'javascript:alert(1)' as unknown as string,
          tags: ['phishing'],
        },
      },
    };
    await store.save('poisoned', poisoned);

    const loaded = await store.load('poisoned');
    expect(loaded).not.toBeNull();
    expect(loaded!.allLinks.evil.url).toBe('about:blank');
  });

  it('strips prototype-pollution keys from stored configs on load', async () => {
    const polluted = {
      allLinks: {
        good: { label: 'Good', url: 'https://example.com', tags: [] },
        __proto__: { label: 'Bad', url: 'https://evil.com', tags: [] },
      },
    } as unknown as AlapConfig;
    await store.save('polluted', polluted);

    const loaded = await store.load('polluted');
    expect(loaded).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(loaded!.allLinks, '__proto__')).toBe(false);
    expect(loaded!.allLinks.good).toBeDefined();
  });

  it('loadEntry applies the same validation as load', async () => {
    const poisoned: AlapConfig = {
      allLinks: {
        evil: {
          label: 'Click me',
          url: 'vbscript:msgbox(1)' as unknown as string,
          tags: [],
        },
      },
    };
    await store.save('entry_poisoned', poisoned);

    const entry = await store.loadEntry('entry_poisoned');
    expect(entry).not.toBeNull();
    expect(entry!.config.allLinks.evil.url).toBe('about:blank');
  });
});
