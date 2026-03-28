# Alap Config Server — Express + SQLite

A minimal REST API server for persisting Alap configurations. Uses Express and SQLite via `better-sqlite3`.

## API

### Config CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/configs` | List all config names → `string[]` |
| `GET` | `/configs/:name` | Load a config → `{ config, meta: { createdAt, updatedAt } }` |
| `PUT` | `/configs/:name` | Save a config (body: `AlapConfig` JSON) |
| `DELETE` | `/configs/:name` | Remove a config |

This is the contract that `alap/storage` `RemoteStore` expects.

### Search & Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?tag=coffee` | Search links across all configs by tag |
| `GET` | `/search?q=bridge` | Search links by text (label, url, description, tags) |
| `GET` | `/search?regex=wiki.*bridge` | Search links by regex |
| `POST` | `/cherry-pick` | Resolve expression against a config → subset `{ allLinks }` |
| `POST` | `/query` | Server-side expression resolution → `{ results: [...] }` |

`/cherry-pick` and `/query` require `alap` as a dependency (`npm install alap`). `/search` works without it.

## Run Locally

```bash
npm install
npm run seed     # creates alap.db with demo data
npm start        # http://localhost:3000
```

## Run with Docker / Podman

Build context needs the repo root (for the alap library build stage):

```bash
cd ../../..   # from express-sqlite/ to repo root
docker build -f examples/servers/express-sqlite/Dockerfile -t alap-server .
docker run -p 3000:3000 alap-server
```

Or with Podman (drop-in compatible):

```bash
cd ../../..
podman build -f examples/servers/express-sqlite/Dockerfile -t alap-server .
podman run -p 3000:3000 alap-server
```

The seed data is baked into the image at build time. To persist data across container restarts, mount a volume:

```bash
docker run -p 3000:3000 -v alap-data:/app/alap.db alap-server
```

## Test It

```bash
# List configs
curl http://localhost:3000/configs

# Load the demo config
curl http://localhost:3000/configs/demo

# Save a new config
curl -X PUT http://localhost:3000/configs/myconfig \
  -H "Content-Type: application/json" \
  -d '{"allLinks":{"test":{"label":"Test","url":"https://example.com","tags":["demo"]}}}'

# Delete it
curl -X DELETE http://localhost:3000/configs/myconfig
```

## Search & Query Examples

```bash
# Search all configs for links tagged "coffee"
curl http://localhost:3000/search?tag=coffee

# Search by text
curl http://localhost:3000/search?q=bridge

# Search by regex
curl "http://localhost:3000/search?regex=wiki.*bridge"

# Cherry-pick: resolve expression against a config
curl -X POST http://localhost:3000/cherry-pick \
  -H "Content-Type: application/json" \
  -d '{"source":"demo","expression":".coffee + .nyc"}'

# Server-side query resolution
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"expression":".bridge","configName":"demo"}'

# Multi-config query (merge before resolve)
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"expression":".bridge","configs":["demo","other"]}'
```

## Clean Up

```bash
rm -rf node_modules alap.db
docker rmi alap-server 2>/dev/null   # or: podman rmi alap-server
```

## Use with an Editor

Any [Alap editor](../../../editors/) can connect to this server in remote or hybrid storage mode. Point the editor to `http://localhost:3000`.

## Connect from Alap

```typescript
import { createRemoteStore } from 'alap/storage';

const store = createRemoteStore({ baseUrl: 'http://localhost:3000' });

const config = await store.load('demo');
const names = await store.list();
await store.save('myconfig', myConfig);
await store.remove('myconfig');
```
