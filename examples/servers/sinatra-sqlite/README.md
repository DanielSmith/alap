# Sinatra + SQLite Server

Alap config server using Sinatra (Ruby) and SQLite. Drop-in replacement for the Express/Bun/Hono servers.

Uses the Ruby expression parser from `src/other-languages/ruby/` for server-side query resolution.

## Docker

```bash
podman build -t alap-sinatra -f examples/servers/sinatra-sqlite/Dockerfile .
podman run -p 3000:3000 alap-sinatra
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/configs` | List all config names |
| GET | `/configs/:name` | Load a config |
| PUT | `/configs/:name` | Save a config |
| DELETE | `/configs/:name` | Delete a config |
| GET | `/search` | Full-text search across configs |
| POST | `/query` | Server-side expression resolution |
| POST | `/cherry-pick` | Resolve expression, return matching links |

## License

Apache-2.0
