# Flask + SQLite

Python REST API server using Flask and SQLite, implementing the Alap 7-endpoint config API contract.

## Run Locally

```bash
pip install -r requirements.txt
# or, with uv (recommended):
# uv pip install -r requirements.txt

python seed.py                        # seed demo config
flask run --host=0.0.0.0 --port=3000  # http://localhost:3000
```

Or:
```bash
python server.py                      # http://localhost:3000
```

## Run with Docker / Podman

Build from the `servers/` parent directory (shared Python modules live there):

```bash
cd ..   # from flask-sqlite/ to servers/
docker build -f flask-sqlite/Dockerfile -t alap-flask .
docker run -p 3000:3000 alap-flask
```

Or with Podman:

```bash
cd ..
podman build -f flask-sqlite/Dockerfile -t alap-flask .
podman run -p 3000:3000 alap-flask
```

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

## Seed Data

Demo config with 12 links (cars, NYC, SF, coffee) and 2 macros (`@cars`, `@nycbridges`).

## Smoke Test

```bash
../smoke-test.sh flask-sqlite
```

## Clean Up

```bash
rm -rf __pycache__ alap.db
docker rmi alap-flask 2>/dev/null    # or: podman rmi alap-flask
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Key Files

- `server.py` — Flask app with all endpoints
- `seed.py` — inserts demo config into SQLite
- `requirements.txt` — `flask`, `flask-cors`
- `Dockerfile` — single container, no external DB
- `public/index.html` — interactive demo page
