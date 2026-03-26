# Storage

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · **This Page** · [Events](events.md) · [Security](security.md) · [Servers](servers.md) | [All docs](../README.md)

Persistent config storage with local, remote, and hybrid strategies.

> Live version: https://alap.info/api-reference/storage

```typescript
import {
  createIndexedDBStore,
  createRemoteStore,
  createHybridStore,
} from 'alap/storage';
```

## `ConfigStore` interface

All store implementations share this contract. One store manages many named configs.

| Method | Signature | Description |
|--------|-----------|-------------|
| `save()` | `(name: string, config: AlapConfig) => Promise<void>` | Save or overwrite a config |
| `load()` | `(name: string) => Promise<AlapConfig \| null>` | Load by name. `null` if not found. |
| `loadEntry()` | `(name: string) => Promise<ConfigEntry \| null>` | Load config + metadata |
| `list()` | `() => Promise<string[]>` | List all saved config names |
| `remove()` | `(name: string) => Promise<void>` | Delete by name. No-op if not found. |

```typescript
const store = await createIndexedDBStore();

await store.save('news-page', newsConfig);
await store.save('docs-page', docsConfig);

const names = await store.list();
// → ['docs-page', 'news-page']

const docs = await store.load('docs-page');

const entry = await store.loadEntry('docs-page');
console.log(`Last saved: ${entry.meta.updatedAt}`);

await store.remove('news-page');
```

## `createIndexedDBStore()`

Browser-local persistence. Requires `idb` peer dependency.

```bash
npm install idb
```

```typescript
const store = await createIndexedDBStore();
await store.save('myconfig', config);
const loaded = await store.load('myconfig');
```

## `createRemoteStore(options)`

REST API client. Works in both browser and Node.js (uses `fetch`).

```typescript
const store = createRemoteStore({
  baseUrl: 'http://localhost:3000',
  token: 'optional-bearer-token',
  headers: { 'X-Custom': 'value' },
});
```

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | `string` | API server URL |
| `token` | `string` | Bearer token for `Authorization` header |
| `headers` | `Record<string, string>` | Extra headers on every request |

### REST endpoints

| Operation | HTTP | URL |
|-----------|------|-----|
| save | `PUT /configs/:name` | Body: JSON config |
| load | `GET /configs/:name` | Response: JSON config |
| list | `GET /configs` | Response: string array |
| remove | `DELETE /configs/:name` | |

## `createHybridStore(options)`

Write-through local + remote. Reads from local first, syncs remote in background.

```typescript
const local = await createIndexedDBStore();
const remote = createRemoteStore({ baseUrl: '...' });
const store = createHybridStore({
  local,
  remote,
  onRemoteError: (op, name, err) => console.warn(`${op} failed for ${name}`, err),
});
```

| Option | Type | Description |
|--------|------|-------------|
| `local` | `ConfigStore` | Local store (e.g. IndexedDB) |
| `remote` | `ConfigStore` | Remote store (e.g. REST API) |
| `onRemoteError` | `(op, name, err) => void` | Error callback. Store continues from local on failure. |

```typescript
// Offline-resilient config loading
const store = createHybridStore({
  local: await createIndexedDBStore(),
  remote: createRemoteStore({ baseUrl: 'https://api.example.com' }),
  onRemoteError: (op, name, err) => {
    showToast(`Offline — using cached "${name}"`);
  },
});

// First load: fetches from remote, caches locally
// Subsequent loads: instant from IndexedDB, background sync
const config = await store.load('main');
```
