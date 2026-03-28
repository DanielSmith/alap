# Alap Config Server — Laravel + SQLite

A minimal REST API server for persisting Alap configurations. Uses Laravel 12 and SQLite. API-only — no Blade, no sessions, no CSRF.

## API

### Config CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/configs` | List all config names → `string[]` |
| `GET` | `/api/configs/:name` | Load a config → `{ config, meta: { createdAt, updatedAt } }` |
| `PUT` | `/api/configs/:name` | Save a config (body: `AlapConfig` JSON) |
| `DELETE` | `/api/configs/:name` | Remove a config |

This is the contract that `alap/storage` `RemoteStore` expects (with `/api` prefix).

### Search & Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search?tag=coffee` | Search links across all configs by tag |
| `GET` | `/api/search?q=bridge` | Search links by text (label, url, description, tags) |
| `GET` | `/api/search?regex=wiki.*bridge` | Search links by regex |
| `POST` | `/api/cherry-pick` | Resolve expression against a config → subset `{ allLinks }` |
| `POST` | `/api/query` | Server-side expression resolution → `{ results: [...] }` |

The PHP cherry-pick/query endpoints include a built-in expression resolver supporting item IDs, `.tag` queries, and operators (`+`, `|`, `-`). For full expression parsing (parentheses, macros, regex search), use the Node server with `alap/core`.

## Project Structure

| File | Purpose |
|------|---------|
| `composer.json` | Dependencies (Laravel 12, PHP 8.2) |
| `.env.example` | Environment config template |
| `.gitignore` | Excludes vendor/, .env, *.db |
| `bootstrap/app.php` | API-only app bootstrap |
| `public/index.php` | Laravel entry point |
| `artisan` | CLI entry point |
| `config/database.php` | SQLite connection |
| `config/app.php` | Minimal app config |
| `config/cors.php` | Open CORS for demo |
| `routes/api.php` | 4 REST routes |
| `app/Models/Config.php` | Eloquent model (string PK, JSON cast) |
| `app/Http/Controllers/ConfigController.php` | index/show/update/destroy |
| `database/migrations/2026_03_13_*` | configs table |
| `database/seeders/DatabaseSeeder.php` | Demo data (matches Express example) |
| `public/demo.html` | Interactive API test page |
| `Dockerfile` | Containerized build |
| `README.md` | Setup and usage docs |

Everything is fully contained — no global PHP/Composer changes.

## Run Locally

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed         # seeds "demo" config
php artisan serve --port=3000  # http://localhost:3000
```

Open `http://localhost:3000/demo.html` for the interactive API test page.

## Run with Docker / Podman

```bash
docker build -t alap-laravel .
docker run -p 3000:3000 alap-laravel
```

Or with Podman:

```bash
podman build -t alap-laravel .
podman run -p 3000:3000 alap-laravel
```

## Test It

```bash
# List configs
curl http://localhost:3000/api/configs

# Load the demo config
curl http://localhost:3000/api/configs/demo

# Save a new config
curl -X PUT http://localhost:3000/api/configs/myconfig \
  -H "Content-Type: application/json" \
  -d '{"allLinks":{"test":{"label":"Test","url":"https://example.com","tags":["demo"]}}}'

# Delete it
curl -X DELETE http://localhost:3000/api/configs/myconfig
```

## Clean Up

```bash
rm -rf vendor database/*.sqlite
docker rmi alap-laravel 2>/dev/null  # or: podman rmi alap-laravel
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000/api` (note the `/api` prefix).

## Connect from Alap

```typescript
import { createRemoteStore } from 'alap/storage';

const store = createRemoteStore({ baseUrl: 'http://localhost:3000/api' });

const config = await store.load('demo');
const names = await store.list();
await store.save('myconfig', myConfig);
await store.remove('myconfig');
```
