# Hacker News Example

Demonstrates the `:hn:` generate protocol — Hacker News as a live link source.

## Two data modes

1. **Static (`allLinks`)** — a handful of hand-curated HN-adjacent links (PG essays, HN guidelines, API docs) so the composition demos have something to intersect / union with the live data.

2. **Dynamic (`:hn:` protocol)** — live API calls to Firebase (listings, items, users) and Algolia (full-text search). Zero auth, zero server — both endpoints serve CORS headers, so the browser calls them directly.

## Running

```bash
bash serve.sh
```

Or from any directory:

```bash
cd /path/to/alap/examples/sites/hn && ./serve.sh
```

Opens automatically at `http://localhost:9180/sites/hn/`. The dev server lives one level up at `examples/` and handles all sites from the gallery.

## What's shown

Every sub-mode of `:hn:`:

- **Listings** — `:hn:top:`, `:hn:new:`, `:hn:best:`, `:hn:ask:`, `:hn:show:`, `:hn:job:`
- **User submissions** — `:hn:user:pg:` (and `:hn:user:dang:`)
- **Search** (via Algolia) — `:hn:search:$ai_papers:` using a named preset
- **Single item** — `:hn:item:8863:` (numeric id required)
- **Composition** — `:hn:` mixed with tags, macros, and `:time:` filtering

## Notes

- **No auth required.** Both Firebase (`hacker-news.firebaseio.com`) and Algolia (`hn.algolia.com`) serve CORS headers.
- **Named presets for search.** Multi-word queries can't live inline in expressions (the tokenizer splits on whitespace), so they're aliased in `config.protocols.hn.searches` and referenced as `$preset`. See `config.ts`.
- **Source indicator.** Every `:hn:` link gets `source_hn` on its `cssClass` and `meta.source: 'hn'`. The orange left-border in the menu styling is that class.
- **`:time:` composition.** `mapItem` converts HN's Unix seconds to milliseconds for `createdAt`, so `:hn:new: + :time:6h:` works out of the box.
- **Progressive rendering.** Generate protocols are async. As of 3.2 the renderer opens immediately with a `Loading…` placeholder and re-renders in place when the fetch lands — `main.ts` doesn't need to call `preResolve()` up front. (It's still available as a public API for callers that want to warm the cache, e.g. on `mouseenter`.)

## Security notes

`:hn:` inherits a fixed defense floor that isn't surfaced in the page config — SSRF guard on every fetch, 10 s timeout via `AbortController`, 1 MiB response cap, JSON-only content type, `credentials: 'omit'`, and a 6-id cap on `:hn:items:` to keep fan-out bounded against HN's per-item endpoint.

See [Cookbook — Hacker News](../../../docs/cookbook/hn.md) for the full floor, the list of blocked network ranges, and the operator-visible warning catalog.

## Related

- Writing your own protocol: [docs/core-concepts/writing-protocols.md](../../../docs/core-concepts/writing-protocols.md) — this example is the end-to-end worked case.
- Protocol reference: [docs/core-concepts/protocols.md](../../../docs/core-concepts/protocols.md) — the `:hn:` section.
- Security model: [docs/cookbook/hn.md](../../../docs/cookbook/hn.md) — defense floor, SSRF guard, warning catalog.
