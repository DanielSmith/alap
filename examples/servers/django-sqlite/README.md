# Django + SQLite

Python REST API server using Django 5.1 and SQLite, implementing the Alap 7-endpoint config API contract.

## Run Locally

No external database needed — SQLite is built-in.

```bash
pip install -r requirements.txt
# or, with uv (recommended):
# uv pip install -r requirements.txt

python manage.py migrate --run-syncdb   # create tables
python seed.py                          # seed demo config
python manage.py runserver 0.0.0.0:3000 # http://localhost:3000
```

## Run with Docker

Build from the `servers/` parent directory (shared Python modules live there):

```bash
cd ..   # from django-sqlite/ to servers/
docker build -f django-sqlite/Dockerfile -t alap-django-sqlite .
docker run -p 3000:3000 alap-django-sqlite
```

Podman:
```bash
cd ..
podman build -f django-sqlite/Dockerfile -t alap-django-sqlite .
podman run -p 3000:3000 alap-django-sqlite
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
../smoke-test.sh django-sqlite
```

## Clean Up

```bash
rm -rf __pycache__ configs/__pycache__ alapserver/__pycache__ alap.db
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Key Files

- `configs/views.py` — Django views with all endpoints
- `configs/urls.py` — URL routing
- `alapserver/settings.py` — Django settings, SQLite config
- `seed.py` — inserts demo config
- `public/index.html` — interactive demo page
