# Examples

Self-contained demos of the Alap library — browser examples and REST API servers.

## What's Here

| Directory | What | Count |
|-----------|------|-------|
| [sites/](sites/) | Browser demos — adapters, theming, advanced features | 29 |
| [servers/](servers/) | REST API servers — same contract, 10 language/framework combos | 10 |
| `index.html` | Examples index page (served by `pnpm dev` from the repo root) |
| `styles.css` | Shared stylesheet for site examples |
| `img/` | Shared photo assets |

## Running Examples

Each site and server has its own `serve.sh` or startup instructions in its README. Start with one that interests you — there's no need to install everything at once.

## Disk Space Warning

These examples can consume significant disk space:

- **Site examples** share the root `node_modules` (~200MB installed once). Running `./serve.sh` from individual directories uses the same install — no extra cost.

- **Server examples** each have their own dependencies. Running all locally means installing Node, Python, PHP, Bun, Go, Rust, Java, and their respective packages. Budget ~100–500MB per server depending on the stack.

- **Docker/Podman** images are much larger. Each server pulls a base image (Node, Python, PHP, Bun) plus dependencies. Running all as containers can easily consume **2–5GB** of disk for images. First builds can be quite slow to assemble (this has to do with the enviroment being downloaded or compiled); subsequent runs use cached layers.

**Recommendations:**
- Try one or two servers locally, not all 10 at once
- Use `docker system prune` or `podman system prune` to reclaim space after testing
- The smoke test (`servers/smoke-test.sh all`) builds and tears down containers sequentially, but cached images persist

## Resource Usage

Site examples are lightweight — each is a single Vite dev server process.

Server containers use more resources. The FastAPI + PostgreSQL compose server runs two containers (app + database). All servers default to port 3000, so run one at a time.
