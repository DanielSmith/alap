# Bluesky / AT Protocol Example

Demonstrates Alap's integration with the AT Protocol (Bluesky) ecosystem.

## Two data modes

1. **Static (`allLinks`)** — Hand-curated entries showing Option of Choice:
   the same AT Protocol post or profile viewable through different clients
   (bsky.app, pdsls.dev inspector, raw API). Tags control which destinations
   appear in the menu.

2. **Dynamic (`:atproto:` protocol)** — Live API calls to the public Bluesky
   API, turning results into AlapLink objects at runtime. Feeds, profiles,
   people search — all composed with static data in the same expressions.

## Running

```bash
bash serve.sh
```

## Pages

- **`index.html`** (default) — AT Protocol only: static allLinks, live profiles, feeds, people search, authenticated post search, and composition of static + dynamic
- **`combined.html`** — Three sources, one menu: static allLinks + `:web:` (Open Library) + `:atproto:` (Bluesky) in a single expression. Login session carries over from the main page.

## Accounts used

This example draws from a wide range of accounts across categories:

- **Tech platforms:** AT Protocol, Bluesky, GitHub, Node.js, WordPress, Linux Foundation
- **Organizations:** EFF, Internet Archive, Creative Commons, Signal
- **Publications:** Nature, The Verge, Ars Technica, WIRED, NYT, The New Yorker, TechCrunch
- **Individuals:** Jay Graber, Paul Frazee, Dan Abramov
