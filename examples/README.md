# Examples

Self-contained demos of the Alap library — browser examples and REST API servers.

## What's Here

| Directory | What | Count |
|-----------|------|-------|
| [sites/](sites/) | Browser demos — adapters, theming, advanced features | 13 |
| [servers/](servers/) | REST API servers — same contract, 7 language/framework combos | 7 |
| `index.html` | Examples index page (served by `pnpm dev` from the repo root) |
| `styles.css` | Shared stylesheet for site examples |
| `img/` | Shared photo assets |

## Running Examples

Each site and server has its own `serve.sh` or startup instructions in its README. Start with one that interests you — there's no need to install everything at once.

## Disk Space Warning

These examples can consume significant disk space:

- **Site examples** share the root `node_modules` (~200MB installed once). Running `./serve.sh` from individual directories uses the same install — no extra cost.

- **Server examples** each have their own dependencies. Running all 7 locally means installing Node, Python, PHP, Bun, and their respective packages. Budget ~100–500MB per server depending on the stack.

- **Docker/Podman** images are much larger. Each server pulls a base image (Node, Python, PHP, Bun) plus dependencies. Running all 7 as containers can easily consume **2–5GB** of disk for images. First builds are slow; subsequent runs use cached layers.

**Recommendations:**
- Try one or two servers locally, not all 7 at once
- Use `docker system prune` or `podman system prune` to reclaim space after testing
- The smoke test (`servers/smoke-test.sh all`) builds and tears down containers sequentially, but cached images persist

## Resource Usage

Site examples are lightweight — each is a single Vite dev server process.

Server containers use more resources. The FastAPI + PostgreSQL compose server runs two containers (app + database). Avoid running all 9 servers simultaneously unless you have the RAM for it.

Port assignments are unique across all examples to avoid conflicts if you do run multiple at once. See the README in each subdirectory for the specific port.
