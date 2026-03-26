# Gin + SQLite

Go REST API server using Gin and SQLite, implementing the Alap 7-endpoint config API contract.

## Run Locally

```bash
go run seed.go                       # seed demo config
go run main.go                       # http://localhost:3000
```

## Run with Docker

```bash
docker build -t alap-gin .
docker run -p 3000:3000 alap-gin
```

Podman:
```bash
podman build -t alap-gin .
podman run -p 3000:3000 alap-gin
```

## API Endpoints

All 7 endpoints fully functional. Expression resolution (cherry-pick, query) uses the native Go port of the Alap expression parser.

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
../smoke-test.sh gin-sqlite
```

## Clean Up

```bash
rm -f alap_configs.db server
docker rmi alap-gin 2>/dev/null    # or: podman rmi alap-gin
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Key Files

- `main.go` — Gin server with all endpoints
- `seed.go` — inserts demo config into SQLite
- `go.mod` / `go.sum` — Go module dependencies
- `Dockerfile` — single container, no external DB
- `public/index.html` — interactive demo page
