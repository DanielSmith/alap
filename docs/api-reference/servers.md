# Servers

**[API Reference](README.md):** [Engine](engine.md) · [Types](types.md) · [Config Registry](config-registry.md) · [Placement](placement.md) · [Lightbox](lightbox.md) · [Lens](lens.md) · [Embeds](embeds.md) · [Coordinators](coordinators.md) · [Storage](storage.md) · [Events](events.md) · [Security](security.md) · **This Page**

10 server examples implementing the same REST API contract. Swap backends without code changes — clients (editors, web apps, `RemoteStore`) work with any of them.

> Live version: https://alap.info/api-reference/servers

## API contract

All servers implement the same REST contract, documented below. Machine-readable version: [openapi.yaml](openapi.yaml).

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

These endpoints resolve Alap expressions server-side. Node/Bun servers use `AlapEngine` from `alap/core`. Python, PHP, Go, Rust, and Java servers use native ports of the expression parser. All servers sanitize URLs in responses.

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
| Spring Boot + SQLite | Java 21 | Spring Boot 3.4 | SQLite | 3 |

All servers default to port 3000. All include Dockerfiles (Podman-compatible).

## Quick start

### Node servers (pre-built library tarball)

```bash
pnpm docker:express   # or docker:bun, docker:hono
podman run -p 3000:3000 alap-express
# → http://localhost:3000
```

### Other languages (self-contained Dockerfiles)

```bash
# Python
podman build -t alap-flask -f flask-sqlite/Dockerfile examples/servers/
podman run -p 3000:3000 alap-flask

# Go
podman build -t alap-gin -f examples/servers/gin-sqlite/Dockerfile .
podman run -p 3000:3000 alap-gin

# Rust
podman build -t alap-axum -f examples/servers/axum-sqlite/Dockerfile .
podman run -p 3000:3000 alap-axum

# Java
podman build -t alap-java-spring -f examples/servers/java-spring/Dockerfile .
podman run -p 3000:3000 alap-java-spring

# PHP
podman build -t alap-laravel examples/servers/laravel-sqlite/
podman run -p 3000:3000 alap-laravel
```

### FastAPI + PostgreSQL

```bash
cd examples/servers/fastapi-postgres
podman compose up
# → http://localhost:3000
```

### Local development (without Docker)

```bash
cd examples/servers/express-sqlite
npm install
node seed.js
node server.js
# → http://localhost:3000
```

## Using with `RemoteStore`

```typescript
import { createRemoteStore } from 'alap/storage';

const store = createRemoteStore({ baseUrl: 'http://localhost:3000' });
const config = await store.load('demo');
```

Any of the 10 servers works as the backend. Pick the language and framework that fits your stack.
