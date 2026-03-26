# Alap

## Version 3, Daniel Smith - March 2026

**Turn any link into a curated menu of destinations.**

A traditional link is a demand — one URL, chosen by the author. An Alap link is an invitation — a set of options, chosen by the reader.

Instead of cluttering your writing with three separate links:

> "You can visit the **Brooklyn Bridge**, the **Manhattan Bridge**, or the **High Line**."

You write naturally:

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

One config, many menus. Update a URL once, every menu reflects it. Add a tag to an item, it appears in every expression that matches.



## What's Included

- **Full accessibility** — ARIA roles, keyboard nav, focus management, screen reader support
- **Event hooks** — hover previews, context menus, custom actions on menu items
- **Image menus** — photos instead of text labels
- **Viewport adjustment** — menus flip to stay on-screen
- **Regex search** — `/pattern/` syntax for content-aware filtering
- **Security hardened** — URL sanitization, ReDoS protection, config validation
- **Storage layer** — IndexedDB, REST API client, offline-resilient hybrid
- **7 server examples** — Node, Bun, Python, PHP backends
- **7 visual editors** — React, Vue, Svelte, Solid, Astro, Alpine builds
- **Markdown support** — `[text](alap:query)` via remark plugin
- **Astro & Eleventy integrations** — zero-config framework packages
- **CDN / IIFE build** — `<script>` tag usage for WordPress, static sites, and zero-build setups (30.4 KB / 9.1 KB gzip)

## Next Steps

| Where to go | What you'll find |
|-------------|-----------------|
| **[Cookbooks](docs/cookbooks/)** | Role-based guides for developers, writers, designers, and editors |
| **[Examples](examples/)** | 17 demo sites + 7 server backends |
| **[Architecture](docs/architecture.md)** | Layered design, expression language, extension points |
| **[API Reference](docs/api.md)** | Every type, function, component, attribute, CSS hook, and event |
| **[Full Documentation](docs/)** | Adapters, search, storage, testing, security |
| **[FAQ](docs/FAQ.md)** | Common questions and answers |
| **[alap.info](https://alap.info)** | Project website |

## License

Apache-2.0
