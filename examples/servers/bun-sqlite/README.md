# Bun + SQLite

Zero-dependency REST API server using Bun's built-in HTTP server and SQLite driver, implementing the Alap 7-endpoint config API contract.

## Run Locally

Requires [Bun](https://bun.sh/) installed.

```bash
bun run seed.ts     # seed demo config
bun run server.ts   # http://localhost:3000
```

No `npm install` needed — zero external dependencies.

## Run with Docker

Build from the `servers/` parent directory (the shared `validate-regex.js` lives there):

```bash
cd ..   # from bun-sqlite/ to servers/
docker build -f bun-sqlite/Dockerfile -t alap-bun .
docker run -p 3000:3000 alap-bun
```

Podman:
```bash
cd ..
podman build -f bun-sqlite/Dockerfile -t alap-bun .
podman run -p 3000:3000 alap-bun
```

## API Endpoints

All 7 endpoints supported — including cherry-pick and query (uses `alap/core`).

```
GET    /configs           → list config names
GET    /configs/:name     → load config + metadata
PUT    /configs/:name     → save/update config
DELETE /configs/:name     → delete config
GET    /search            → cross-config search
POST   /cherry-pick       → resolve expression → allLinks
POST   /query             → resolve expression → results array
```

## Seed Data

Demo config with 12 links (cars, NYC, SF, coffee) and 2 macros (`@cars`, `@nycbridges`).

## Smoke Test

```bash
../smoke-test.sh bun-sqlite
```

## Clean Up

```bash
rm -rf node_modules alap.db
docker rmi alap-bun 2>/dev/null      # or: podman rmi alap-bun
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Key Files

- `server.ts` — Bun HTTP server with manual routing, CORS, SQLite
- `seed.ts` — inserts demo config
- `Dockerfile` — single container, no external DB
- `public/index.html` — interactive demo page
