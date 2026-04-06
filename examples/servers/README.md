# Server Examples

10 REST API servers implementing the same Alap Config API contract. Swap backends without changing client code — editors, web apps, and `RemoteStore` work with any of them.

The point: Alap is language-agnostic. The same 7 endpoints work whether you prefer Node, Python, PHP, Go, Rust, Java, or Bun.

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
| [java-spring](java-spring/) | Java 21 + Spring Boot 3.4 | SQLite | No | Yes (Java port) |
| [fastapi-postgres](fastapi-postgres/) | Python + FastAPI | PostgreSQL | Yes (Postgres 16) | Yes (Python port) |

All 10 servers implement all 7 endpoints. Python, PHP, Go, Rust, and Java servers include native ports of the Alap expression parser — no Node.js sidecar required.

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

### Docker / Podman

**Node servers** use a pre-built library tarball (no compilation inside Docker):

```bash
# From repo root — builds the library tarball automatically, then the container
pnpm docker:express   # Express + SQLite
pnpm docker:bun       # Bun + SQLite
pnpm docker:hono      # Hono + SQLite
podman run -p 3000:3000 alap-express
```

**Go, Rust, Java** — build from repo root (they need their parser sources):

```bash
podman build -t alap-gin -f examples/servers/gin-sqlite/Dockerfile .
podman build -t alap-axum -f examples/servers/axum-sqlite/Dockerfile .
podman build -t alap-java-spring -f examples/servers/java-spring/Dockerfile .
podman run -p 3000:3000 alap-gin
```

**Python** — build from `examples/servers/` (they need `shared/`):

```bash
podman build -t alap-flask -f flask-sqlite/Dockerfile examples/servers/
podman build -t alap-django -f django-sqlite/Dockerfile examples/servers/
podman run -p 3000:3000 alap-flask
```

**PHP** — self-contained:

```bash
podman build -t alap-laravel examples/servers/laravel-sqlite/
podman run -p 3000:3000 alap-laravel
```

**FastAPI + PostgreSQL** — needs Postgres via compose:

```bash
cd examples/servers/fastapi-postgres
podman compose up
# → http://localhost:3000
```

### Local development (without Docker)

```bash
cd express-sqlite && npm install && node seed.js && node server.js
cd hono-sqlite && npm install && node seed.js && node server.js
cd bun-sqlite && bun run seed.ts && bun run server.ts
cd flask-sqlite && pip install -r requirements.txt && python seed.py && python server.py
cd django-sqlite && pip install -r requirements.txt && python manage.py migrate --run-syncdb && python seed.py && python manage.py runserver 0.0.0.0:3000
cd laravel-sqlite && composer install && php artisan migrate --seed && php artisan serve --port=3000
cd gin-sqlite && go run seed.go && go run main.go
cd axum-sqlite && cargo run --bin seed && cargo run
cd java-spring && mvn spring-boot:run
```

**Prerequisites:** On macOS, Podman needs a Linux VM running before you can build or run containers:

```bash
podman machine start   # creates + starts the VM (run `podman machine init` first if needed)
```

On Linux, Podman is daemonless and works out of the box.

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
./smoke-test.sh all                # test all 10 sequentially
DOCKER=podman ./smoke-test.sh all  # use Podman instead of Docker
```

## Seed Data

All servers ship with the same demo config: 12 links (cars, NYC, SF, coffee) and 2 macros (`@cars`, `@nycbridges`). Every server includes an interactive demo page at `/`.
