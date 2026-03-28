# Axum + SQLite

Rust REST API server using Axum and SQLite, implementing the Alap 7-endpoint config API contract.

## Run Locally

```bash
cargo run --bin seed                 # seed demo config
cargo run --bin server               # http://localhost:3000
```

## Run with Docker

Build context needs the repo root (for `src/other-languages/rust/`):

```bash
cd ../../..   # from axum-sqlite/ to repo root
docker build -t alap-axum -f examples/servers/axum-sqlite/Dockerfile .
docker run -p 3000:3000 alap-axum
```

Podman:
```bash
cd ../../..
podman build -t alap-axum -f examples/servers/axum-sqlite/Dockerfile .
podman run -p 3000:3000 alap-axum
```

## API Endpoints

All 7 endpoints fully functional. Expression resolution (cherry-pick, query) uses the native Rust port of the Alap expression parser.

```
GET    /configs           → list config names
GET    /configs/:name     → load config + metadata
PUT    /configs/:name     → save/update config
DELETE /configs/:name     → delete config
GET    /search            → cross-config search
POST   /cherry-pick       → resolve expression → subset of allLinks
POST   /query             → resolve expression → results array
```

## Seed Data

Demo config with 12 links (cars, NYC, SF, coffee) and 2 macros (`@cars`, `@nycbridges`).

## Smoke Test

```bash
../smoke-test.sh axum-sqlite
```

## Clean Up

```bash
rm -f alap.db
docker rmi alap-axum 2>/dev/null    # or: podman rmi alap-axum
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Key Files

- `src/main.rs` — Axum server with all endpoints
- `src/bin/seed.rs` — inserts demo config into SQLite
- `Cargo.toml` — Rust dependencies
- `Dockerfile` — multi-stage build, no external DB
- `public/index.html` — interactive demo page
