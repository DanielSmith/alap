# FastAPI + PostgreSQL

Python REST API server using FastAPI and PostgreSQL with JSONB, implementing the Alap 7-endpoint config API contract.

## Run Locally

Requires a running PostgreSQL instance.

```bash
pip install -r requirements.txt
# or, with uv (recommended):
# uv pip install -r requirements.txt

python seed.py                                        # seed demo config
uvicorn server:app --host 0.0.0.0 --port 3000         # http://localhost:3000
```

Environment variables for DB connection:
- `POSTGRES_HOST` (default: `localhost`)
- `POSTGRES_PORT` (default: `5432`)
- `POSTGRES_DB` (default: `alap`)
- `POSTGRES_USER` (default: `postgres`)
- `POSTGRES_PASSWORD` (default: `postgres`)

## Run with Docker Compose

Run from the `servers/` parent directory (shared Python modules live there):

```bash
cd ..   # from fastapi-postgres/ to servers/
docker compose -f fastapi-postgres/docker-compose.yml up
```

Podman:
```bash
cd ..
podman compose -f fastapi-postgres/docker-compose.yml up
```

Two containers: app (port 3000) + PostgreSQL 16 (port 5432).

## API Endpoints

All 7 endpoints fully functional. Expression resolution (cherry-pick, query) uses a native Python port of the Alap expression parser.

```
GET    /configs           → list config names
GET    /configs/:name     → load config + metadata
PUT    /configs/:name     → save/update config
DELETE /configs/:name     → delete config
GET    /search            → cross-config search
POST   /cherry-pick       → resolve expression → subset of allLinks
POST   /query             → resolve expression → results array
```

Config is stored as native PostgreSQL `JSONB` — supports indexing, containment queries, and operators.

## Seed Data

Demo config with 12 links (cars, NYC, SF, coffee) and 2 macros (`@cars`, `@nycbridges`).

## Smoke Test

```bash
../smoke-test.sh fastapi-postgres
```

## Clean Up

```bash
rm -rf __pycache__
docker compose down -v 2>/dev/null   # or: podman compose down -v
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Key Files

- `server.py` — FastAPI app with all endpoints, `psycopg` v3 for PostgreSQL
- `seed.py` — creates table + inserts demo config
- `requirements.txt` — `fastapi`, `uvicorn`, `psycopg`, `pydantic`
- `docker-compose.yml` — app + PostgreSQL 16
- `public/index.html` — interactive demo page
