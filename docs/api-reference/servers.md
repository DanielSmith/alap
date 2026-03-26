# Servers

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · **This Page** | [All docs](../README.md)

9 server examples implementing the same REST API contract. Swap backends without code changes — clients (editors, web apps, `RemoteStore`) work with any of them.

> Live version: https://alap.info/api-reference/servers

## API contract

Canonical spec: `examples/servers/openapi.yaml` (OpenAPI 3.1)

All servers expose 7 endpoints:

```
GET    /configs              → ["demo", "work-links", ...]
GET    /configs/:name        → { config: AlapConfig, meta: { createdAt, updatedAt } }
PUT    /configs/:name        → body is AlapConfig JSON → 204
DELETE /configs/:name        → 204
GET    /search               → cross-config search
POST   /cherry-pick          → { source, expression } → { allLinks }
POST   /query                → { expression, configName?, configs? } → { results }
```

### Search query parameters

| Param | Description |
|-------|-------------|
| `tag` | Match links with this tag |
| `q` | Case-insensitive substring match across fields |
| `regex` | Regex match across fields |
| `fields` | Comma-separated: `label,url,tags,description,id` (default: all) |
| `config` | Regex pattern to filter config names |
| `limit` | Max results (default 100, max 1000) |

### Cherry-pick and query

These endpoints resolve Alap expressions server-side. Node/Bun servers use `AlapEngine` from `alap/core`. Python, PHP, Go, and Rust servers use native ports of the expression parser. All servers sanitize URLs in responses.

## Server matrix

| Server | Language | Framework | Database | Dependencies |
|--------|----------|-----------|----------|-------------|
| Express + SQLite | Node.js | Express | SQLite | 3 |
| Hono + SQLite | Node.js | Hono | SQLite | 3 |
| Bun + SQLite | TypeScript | Bun built-in | SQLite | 0 |
| Laravel + SQLite | PHP | Laravel 12 | SQLite | Composer |
| Flask + SQLite | Python | Flask | SQLite | 2 |
| Django + SQLite | Python | Django 5.1 | SQLite | 2 |
| FastAPI + PostgreSQL | Python | FastAPI | PostgreSQL | 4 |
| Gin + SQLite | Go | Gin | SQLite | 3 |
| Axum + SQLite | Rust | Axum | SQLite | 4 |

All servers default to port 3000. All include Dockerfiles (Podman-compatible).

## Quick start

### SQLite servers (no external database)

```bash
cd examples/servers/express-sqlite
npm install
node seed.js
node server.js
# → http://localhost:3000
```

### FastAPI + PostgreSQL

```bash
cd examples/servers/fastapi-postgres
docker compose up
# → http://localhost:3000
```

### Docker (any server)

```bash
cd examples/servers/express-sqlite
docker build -t alap-express .
docker run -p 3000:3000 alap-express
```

## Using with `RemoteStore`

```typescript
import { createRemoteStore } from 'alap/storage';

const store = createRemoteStore({ baseUrl: 'http://localhost:3000' });
const config = await store.load('demo');
```

Any of the 9 servers works as the backend. Pick the language and framework that fits your stack.
