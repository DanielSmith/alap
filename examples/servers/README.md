# Server Examples

9 REST API servers implementing the same Alap Config API contract. Swap backends without changing client code — editors, web apps, and `RemoteStore` work with any of them.

The point: Alap is language-agnostic. The same 7 endpoints work whether you prefer Node, Python, PHP, Go, or Bun.

## Server Matrix

| Server | Language | Database | External DB? | Cherry-pick/Query |
|--------|----------|----------|-------------|-------------------|
| [express-sqlite](express-sqlite/) | Node.js + Express | SQLite | No | Yes |
| [hono-sqlite](hono-sqlite/) | Node.js + Hono | SQLite | No | Yes |
| [bun-sqlite](bun-sqlite/) | Bun (TypeScript) | SQLite | No | Yes |
| [laravel-sqlite](laravel-sqlite/) | PHP + Laravel 12 | SQLite | No | Yes (PHP port) |
| [gin-sqlite](gin-sqlite/) | Go + Gin | SQLite | No | Yes (Go port) |
| [flask-sqlite](flask-sqlite/) | Python + Flask | SQLite | No | Yes (Python port) |
| [django-sqlite](django-sqlite/) | Python + Django 5.1 | SQLite | No | Yes (Python port) |
| [axum-sqlite](axum-sqlite/) | Rust + Axum | SQLite | No | Yes (Rust port) |
| [fastapi-postgres](fastapi-postgres/) | Python + FastAPI | PostgreSQL | Yes (Postgres 16) | Yes (Python port) |

All 9 servers implement all 7 endpoints. Python, PHP, Go, and Rust servers include native ports of the Alap expression parser — no Node.js sidecar required.

## API Contract

All servers expose the same 7 endpoints on port **3000**:

```
GET    /configs           → list config names
GET    /configs/:name     → load config + metadata
PUT    /configs/:name     → save/update config (upsert)
DELETE /configs/:name     → delete config
GET    /search            → cross-config search (tag, q, regex, fields, limit)
POST   /cherry-pick       → resolve expression → { allLinks }
POST   /query             → resolve expression → { results }
```

Full contract details: [Servers API reference](../../docs/api-reference/servers.md)

## Running

**SQLite servers** (no external database):
```bash
cd express-sqlite && npm install && node seed.js && node server.js
cd hono-sqlite && npm install && node seed.js && node server.js
cd bun-sqlite && bun run seed.ts && bun run server.ts
cd flask-sqlite && pip install -r requirements.txt && python seed.py && python server.py
# or, with uv: cd flask-sqlite && uv pip install -r requirements.txt && python seed.py && python server.py
cd django-sqlite && pip install -r requirements.txt && python manage.py migrate --run-syncdb && python seed.py && python manage.py runserver 0.0.0.0:3000
cd laravel-sqlite && composer install && php artisan migrate --seed && php artisan serve --port=3000
cd gin-sqlite && go run seed.go && go run main.go
cd axum-sqlite && cargo run --bin seed && cargo run
```

**Compose servers** (database runs in a container alongside the app — run from `servers/`):
```bash
docker compose -f fastapi-postgres/docker-compose.yml up
```

**Every server also has a Dockerfile** — you can skip local installs entirely. Build from the repo root (Node/Bun servers use multi-stage builds to compile alap from source; Go and Rust servers need their parser crates):

```bash
# From repo root — Node, Bun, Go, and Rust servers need repo root as build context
docker build -f examples/servers/express-sqlite/Dockerfile -t alap-express . && docker run -p 3000:3000 alap-express
docker build -f examples/servers/hono-sqlite/Dockerfile -t alap-hono . && docker run -p 3000:3000 alap-hono
docker build -f examples/servers/bun-sqlite/Dockerfile -t alap-bun . && docker run -p 3000:3000 alap-bun
docker build -f examples/servers/gin-sqlite/Dockerfile -t alap-gin . && docker run -p 3000:3000 alap-gin
docker build -f examples/servers/axum-sqlite/Dockerfile -t alap-axum . && docker run -p 3000:3000 alap-axum

# From servers/ directory — Python servers use shared/ only
cd examples/servers
docker build -f flask-sqlite/Dockerfile -t alap-flask . && docker run -p 3000:3000 alap-flask
docker build -f django-sqlite/Dockerfile -t alap-django . && docker run -p 3000:3000 alap-django

# Self-contained — build from its own directory
cd examples/servers/laravel-sqlite && docker build -t alap-laravel . && docker run -p 8000:8000 alap-laravel
```

Podman: replace `docker` with `podman` (or `podman-compose` for compose servers).

**Prerequisites:** On macOS, Docker and Podman both need a Linux VM running before you can build or run containers:

```bash
# Docker Desktop — start the app, or:
docker info          # check if the daemon is running

# Podman — start the machine:
podman machine start # creates + starts the VM (run `podman machine init` first if needed)
```

On Linux, Docker requires the daemon (`sudo systemctl start docker`). Podman is daemonless and works out of the box.

**Note:** When running in containers, the database is transient. Any changes you make from an editor or the demo page are lost when the container stops. This is fine for experimenting — the seed data is rebuilt on each run. To persist data, mount a volume (see each server's README for details).

## Scripts

**`run-server.sh`** — build and run any server. Auto-detects Docker/Podman and the server from your current directory:

```bash
./run-server.sh express-sqlite        # build + run
./run-server.sh -p axum-sqlite        # prune everything first, then build + run
./run-server.sh -e docker flask-sqlite  # force Docker runtime
cd bun-sqlite && ../run-server.sh     # auto-detect from cwd
./run-server.sh --help                # full usage
```

**`smoke-test.sh`** — functional API validation. Builds each server, runs 10 assertions (CRUD lifecycle, search, cherry-pick, query, 404 handling), and reports pass/fail:

```bash
./smoke-test.sh express-sqlite     # test one (10 assertions)
./smoke-test.sh all                # test all 9 sequentially
DOCKER=podman ./smoke-test.sh all  # use Podman instead of Docker
```

## Seed Data

All servers ship with the same demo config: 12 links (cars, NYC, SF, coffee) and 2 macros (`@cars`, `@nycbridges`). Every server includes an interactive demo page at `/`.
