# Alap

## Version 3, Daniel Smith - March 2026

**Turn any link into a curated menu of destinations.**

A traditional link is a demand — one URL, chosen by the author. An Alap link is an invitation — a set of options, chosen by the reader.

Instead of cluttering your writing with many separate links:

> "You can visit the **Brooklyn Bridge**, the **Manhattan Bridge**, the **High Line**, or **this park**, or **this other place**."

You can write naturally:

> "There are several great **landmarks** within walking distance."

When the reader clicks "landmarks," they get a menu. Your sentence stays clean. The reader chooses what matters to them.

<!-- TODO: screenshot of an Alap menu here -->


## Get Started

| You are... | Start here |
|------------|-----------|
| A **developer** building with Alap | [START-Dev.md](START-Dev.md) — install, framework setup, configuration, storage |
| A **writer, editor, or designer** using Alap | [START-Creators.md](START-Creators.md) — concepts, expression language, editors, cookbooks |

## The Expression Language

Tags, macros, and operators compose into a query language for your link library:

```
.nyc                        all items tagged "nyc"
.nyc + .bridge              AND — items with both tags
.nyc | .sf                  OR — items with either tag
.nyc - .tourist             WITHOUT — subtract matches
(.nyc + .bridge) | .sf      parentheses for grouping
@favorites                  expand a saved macro
golden, brooklyn            specific items by ID
```

Protocols gather data dynamically. Refiners filter and order the results:

```
:time:30d:                  items added in the last 30 days
:loc:40.7,-74.0:5mi:        items within 5 miles of a point
:atproto:feed:with-alap:    live posts from a Bluesky feed
.coffee + :time:7d:         combine with tags and operators
*sort:label* *limit:5*      sort, limit, shuffle, paginate
```

One config, many menus. Update a URL once, every menu reflects it. Add a tag to an item, it appears in every expression that matches.



## What's Included

- **Full accessibility** — ARIA roles, keyboard nav, focus management, screen reader support
- **Event hooks** — hover previews, context menus, custom actions on menu items
- **Image menus** — photos instead of text labels
- **Viewport adjustment** — menus flip to stay on-screen
- **Regex search** — `/pattern/` syntax for content-aware filtering
- **Security hardened** — URL sanitization, ReDoS protection, config validation
- **Storage layer** — IndexedDB, REST API client, offline-resilient hybrid
- **10 server examples** — Node, Bun, Python, Go, Rust, PHP, Java backends
- **8 visual editors** — React, Vue, Svelte, Solid, Astro, Alpine builds
- **Markdown, MDX & CMS support** — remark, rehype, and MDX plugins for any content pipeline
- **Next.js, Nuxt, Astro, Eleventy, Hugo, Qwik City & VitePress integrations** — zero-config framework packages
- **WordPress plugin** — `[alap]` shortcode, SQLite containers, instant demo
- **CDN / IIFE build** — `<script>` tag usage for static sites and zero-build setups
- **AT Protocol / Bluesky** — `:atproto:` protocol for live feeds, profiles, and search
- **htmx** — zero-framework HTML-over-the-wire; web components auto-initialize after swaps

## Development

This is a pnpm workspace with [Turborepo](https://turborepo.dev) for build orchestration.

```bash
pnpm install          # install all workspace packages

# Root library only
pnpm build            # ESM + CJS + IIFE + type declarations
pnpm test             # 990+ tests across core, UI adapters, storage, plugins

# Entire workspace (via Turborepo)
pnpm build:all        # build root library, then all editors/integrations/plugins/examples in parallel
pnpm test:all         # run tests across all workspace packages
pnpm typecheck:all    # type-check everything

# Filtered builds
pnpm turbo run build --filter=alap-editor-react...   # one editor + its dependencies
pnpm turbo run build --filter=./integrations/*        # all integrations
pnpm turbo run test --filter=./plugins/*              # tests for plugins only

# Docker (Node server examples — pre-builds library tarball automatically)
pnpm docker:express   # Express + SQLite
pnpm docker:bun       # Bun + SQLite
pnpm docker:hono      # Hono + SQLite

# Docker (other languages — self-contained, build from repo root or servers/)
podman build -t alap-axum -f examples/servers/axum-sqlite/Dockerfile .
podman build -t alap-gin -f examples/servers/gin-sqlite/Dockerfile .
podman build -t alap-flask -f flask-sqlite/Dockerfile examples/servers/
podman build -t alap-django -f django-sqlite/Dockerfile examples/servers/
podman build -t alap-laravel examples/servers/laravel-sqlite/
podman build -t alap-java-spring -f examples/servers/java-spring/Dockerfile .
cd examples/servers/fastapi-postgres && podman compose up -d  # needs Postgres

# Run a server (example: Axum on port 3000)
podman run -d -p 3000:3000 --name alap-axum alap-axum

# Stop a running server
podman stop alap-axum

# Remove a stopped container
podman rm alap-axum
```

Turborepo caches build outputs — a second run with no changes completes in under a second.

`pnpm install` will show warnings about `pnpm.overrides` in editors, plugins, and server packages. These are expected — each sub-package carries its own dependency overrides for standalone use outside the workspace. The root `package.json` overrides take precedence in workspace mode; the per-package copies are harmless.

## Next Steps

| Where to go | What you'll find |
|-------------|-----------------|
| **[Cookbook](docs/cookbook/)** | Language ports, editors, markdown, rich-text, accessibility, placement |
| **[Examples](examples/)** | 29 demo sites + 10 server backends |
| **[Framework Guides](docs/framework-guides/)** | 9 adapters + integrations for Eleventy, Next.js, Nuxt, Hugo, WordPress, htmx, and more |
| **[API Reference](docs/api-reference/)** | Every type, function, component, attribute, CSS hook, and event |
| **[Full Documentation](docs/)** | Adapters, search, storage, testing, security |
| **[FAQ](docs/FAQ.md)** | Common questions and answers |
| **[alap.info](https://alap.info)** | Project website |

## License

Apache-2.0
