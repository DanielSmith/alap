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
import { createRemoteStore } from '../../src/storage/RemoteStore';
import type { ConfigStore, ConfigEntry } from '../../src/storage/ConfigStore';
import type { AlapConfig } from '../../src/core/types';

const BASE_URL = 'https://api.example.com';

const testConfig: AlapConfig = {
  allLinks: {
    item1: { label: 'Item One', url: 'https://one.com', tags: ['a'] },
  },
};

const testEntry: ConfigEntry = {
  config: testConfig,
  meta: { createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-12T00:00:00Z' },
};

function mockFetch(response: { status?: number; body?: unknown; ok?: boolean }) {
  const status = response.status ?? 200;
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? (status >= 200 && status < 300),
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : 'Error',
    json: () => Promise.resolve(response.body),
  });
}

describe('RemoteStore', () => {
  let store: ConfigStore;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = createRemoteStore({ baseUrl: BASE_URL });
  });

  // --- save ---

  it('save sends PUT with JSON body', async () => {
    const fetch = mockFetch({ status: 200 });
    vi.stubGlobal('fetch', fetch);

    await store.save('demo', testConfig);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/configs/demo`);
    expect(opts.method).toBe('PUT');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual(testConfig);
  });

  it('save throws on non-OK response', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 500 }));
    await expect(store.save('demo', testConfig)).rejects.toThrow('Failed to save');
  });

  // --- load ---

  it('load returns config on success', async () => {
    vi.stubGlobal('fetch', mockFetch({ body: testEntry }));

    const loaded = await store.load('demo');
    expect(loaded).toEqual(testConfig);
  });

  it('load returns null on 404', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 404, ok: false }));

    const loaded = await store.load('missing');
    expect(loaded).toBeNull();
  });

  it('load throws on non-404 error', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 500, ok: false }));
    await expect(store.load('demo')).rejects.toThrow('Failed to load');
  });

  // --- loadEntry ---

  it('loadEntry returns full entry on success', async () => {
    vi.stubGlobal('fetch', mockFetch({ body: testEntry }));

    const entry = await store.loadEntry('demo');
    expect(entry).toEqual(testEntry);
  });

  it('loadEntry returns null on 404', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 404, ok: false }));

    const entry = await store.loadEntry('missing');
    expect(entry).toBeNull();
  });

  // --- list ---

  it('list returns array of names', async () => {
    vi.stubGlobal('fetch', mockFetch({ body: ['alpha', 'beta'] }));

    const names = await store.list();
    expect(names).toEqual(['alpha', 'beta']);
  });

  it('list throws on error', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 500, ok: false }));
    await expect(store.list()).rejects.toThrow('Failed to list');
  });

  // --- remove ---

  it('remove sends DELETE', async () => {
    const fetch = mockFetch({ status: 204 });
    vi.stubGlobal('fetch', fetch);

    await store.remove('demo');

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/configs/demo`);
    expect(opts.method).toBe('DELETE');
  });

  it('remove treats 404 as success', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 404, ok: false }));
    await expect(store.remove('missing')).resolves.toBeUndefined();
  });

  it('remove throws on other errors', async () => {
    vi.stubGlobal('fetch', mockFetch({ status: 500, ok: false }));
    await expect(store.remove('demo')).rejects.toThrow('Failed to remove');
  });

  // --- auth ---

  it('sends Authorization header when token is provided', async () => {
    const fetch = mockFetch({ body: ['a'] });
    vi.stubGlobal('fetch', fetch);

    const authedStore = createRemoteStore({ baseUrl: BASE_URL, token: 'my-token' });
    await authedStore.list();

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-token');
  });

  it('sends extra headers when provided', async () => {
    const fetch = mockFetch({ body: ['a'] });
    vi.stubGlobal('fetch', fetch);

    const customStore = createRemoteStore({
      baseUrl: BASE_URL,
      headers: { 'X-Custom': 'value' },
    });
    await customStore.list();

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers['X-Custom']).toBe('value');
  });

  // --- URL encoding ---

  it('encodes config names in URLs', async () => {
    const fetch = mockFetch({ body: testEntry });
    vi.stubGlobal('fetch', fetch);

    await store.load('my library');
    const [url] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/configs/my%20library`);
  });

  it('strips trailing slashes from baseUrl', async () => {
    const fetch = mockFetch({ body: ['a'] });
    vi.stubGlobal('fetch', fetch);

    const slashStore = createRemoteStore({ baseUrl: 'https://api.example.com///' });
    await slashStore.list();

    const [url] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/configs');
  });
});
