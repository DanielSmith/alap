# Protocol Expressions

**[Core Concepts](README.md):** [Expressions](expressions.md) · [Macros](macros.md) · [Search Patterns](search-patterns.md) · **This Page** · [Refiners](refiners.md) · [Styling](styling.md)

Tags are categories. A link is either tagged `coffee` or it isn't. That works for most queries — but some questions don't fit into categories:

- "What was added this week?"
- "What's within walking distance?"
- "What books match this topic?"
- "What are people posting about on Bluesky?"

These are range queries over continuous data, or live queries against external APIs. You can't tag your way to "added in the last 30 days" without someone updating tags every morning.

Protocol expressions solve this. They filter by dimensions — time, location — or fetch live data from external sources, using the same syntax that already works for tags.

> Live version with interactive examples: https://docs.alap.info/core-concepts/protocols

## The syntax

A protocol expression is wrapped in colons:

```
:time:30d:
:location:radius:40.7,-74.0:5mi:
:web:books:photography:limit=5:
:atproto:feed:nature.com:limit=5:
```

The first segment is the protocol name. Everything after is arguments — the protocol handler decides what they mean.

`:time:30d:` means "links from the last 30 days." The `time` handler parses `30d` as a relative duration and checks each link's timestamp.

`:location:radius:40.7,-74.0:5mi:` means "links within 5 miles of this point." The `location` handler dispatches on the `radius` sub-mode and parses the coordinates and distance.

The parser doesn't understand `30d` or `5mi`. It just splits on colons and hands the strings to the handler.

## How it composes

Protocol expressions are operands, just like tags. They return a set of links, and that set participates in the boolean algebra:

```
.coffee + :time:30d:                          → coffee added this month
.restaurant + :location:radius:40.7,-74.0:1mi:    → restaurants within a mile
.coffee + :time:7d: + :location:bbox:40.7,-74.1:40.8,-73.9:   → coffee in NYC, added this week
```

Group with parentheses, combine with macros, subtract tags:

```
(.coffee + :time:30d:) | (.bakery + :location:radius:40.7,-74.0:1mi:)
@favorites - :time:365d:
```

The parser doesn't care where a set came from — tag, macro, regex search, or protocol. It applies the operators the same way.

## Two kinds of protocol

**Filter** — a predicate that tests whether an existing link matches. Runs synchronously during expression evaluation:

```typescript
type ProtocolHandler = (segments: string[], link: AlapLink, id: string) => boolean;
```

`:time:` and `:location:` are filter protocols. They check each link in `allLinks` and return true or false.

**Generate** — an async function that fetches external data and returns new links:

```typescript
type GenerateHandler = (segments: string[], config: AlapConfig) => Promise<AlapLink[]>;
```

`:web:` and `:atproto:` are generate protocols. They call external APIs, transform the results into AlapLink objects, and inject them into the result set. The engine pre-resolves all generate tokens *before* the parser runs — so the expression evaluates synchronously.

A protocol's **data** — cache TTLs, named keys, search presets — lives
under `config.protocols[name]`. Its **behavior** — the `generate` /
`filter` functions — is passed separately at engine construction:

```typescript
// Data shape (in config).
interface AlapProtocol {
  cache?: number;       // TTL in minutes for generate results (0 = no cache, default: 5)
  keys?: Record<string, WebKeyConfig>;
  sources?: string[];
  // no generate, no filter — handlers live elsewhere
}

// Handler shape (passed to new AlapEngine(config, { handlers })).
interface ProtocolHandlerEntry {
  generate?: GenerateHandler;
  filter?: ProtocolHandler;
}
```

If you're upgrading from 3.1, see
[migration-3_2-handlers-out-of-config.md](../migration-3_2-handlers-out-of-config.md).

## The meta field

Links have an optional `meta` field — a bag of key-value pairs that protocol handlers read:

```json
{
  "allLinks": {
    "devocion": {
      "label": "Devocion",
      "url": "https://www.devocion.com",
      "tags": ["coffee", "nyc"],
      "meta": {
        "timestamp": "2026-03-01T12:00:00Z",
        "location": [40.6892, -73.9838]
      }
    }
  }
}
```

Tags say what a link *is*. Meta says what a link *measures*. The `:time:` handler reads `meta.timestamp` (falling back to `createdAt`). The `:location:` handler reads `meta.location`. Each handler documents which fields it expects.

The `createdAt` field that already exists on every link gives `:time:` a bootstrap path — existing configs get time filtering for free, no `meta` required.

> I'm not a security expert, and Alap hasn't had a third-party audit — it's a single-maintainer open source project. Please do your own due diligence before deploying, especially when wiring up protocols on servers with local network access. How you deploy this is your responsibility.

## Built-in protocols

### `:time:` — filter by recency

Filter links by when they were created or last updated. Checks `meta.timestamp` first, then `createdAt`.

```
:time:7d:                        → within the last 7 days
:time:24h:                       → within the last 24 hours
:time:2w:                        → within the last 2 weeks
:time:today:                     → since midnight (local time)
:time:7d:30d:                    → between 7 and 30 days ago (a range)
:time:2025-01-01:               → on or after this date
:time:2025-01-01:2025-12-31:    → within date range (inclusive)
```

Two arguments always means a range. Timestamps are compared in UTC milliseconds.

### `:location:` — filter by geography

Filter links by geographic location. Reads `meta.location` (a `[lat, lng]` tuple). Dispatches on a sub-mode verb so each query shape has a clear name and a fixed argument signature:

```
:location:                                  → has any location metadata (existence)
:location:radius:40.7,-74.0:5mi:            → within 5 miles of a point
:location:radius:40.7,-74.0:10km:           → within 10 kilometers
:location:bbox:40.7,-74.0:40.8,-73.9:       → inside a bounding box (any corner order)
```

| Sub-mode | Args | Notes |
|----------|------|-------|
| *(none)* | 0 | True if `meta.location` is present |
| `radius` | point, distance | Haversine; `mi` and `km` units |
| `bbox` | corner, corner | Min/max normalized; either corner order works |

Sub-modes leave room for richer queries (region containment, route buffers) to land later without breaking existing expressions.

### `:web:` — fetch from external JSON APIs

A generate protocol that fetches JSON from any API and maps results to AlapLink objects. The config maps keys to API endpoints — no code, just data:

```javascript
// config (data)
protocols: {
  web: {
    allowedOrigins: ["https://openlibrary.org"],
    keys: {
      books: {
        url: "https://openlibrary.org/search.json",
        linkBase: "https://openlibrary.org",
        searches: {
          architecture: { q: "urban frank gehry", limit: 10 },
          photography:  { q: "street photography film", limit: 20 },
          adams:        { q: "douglas adams hitchhiker", limit: 10 }
        },
        map: {
          label: "title",
          url: "key",
          meta: { author: "author_name.0", year: "first_publish_year" }
        },
        cache: 60
      }
    }
  }
}

// handler (behavior)
import { webHandler } from 'alap';
const engine = new AlapEngine(config, { handlers: { web: webHandler } });
```

Adding a new API source is adding lines to the config, not writing code.

**In expressions:**

```
:web:books:photography:limit=5:   → 5 photography books
:web:books:adams:                 → Douglas Adams books
:web:books:adams: + :time:1y:    → Adams books published this year
```

**How arguments flow.** For `:web:books:architecture:limit=5:`, the parser splits on `:` and hands segments to the handler:

```
segments: ['books', 'architecture', 'limit=5']
```

1. `books` — the key. The handler looks up the key config to get the base URL.
2. `architecture` — a search alias. The handler looks it up in `searches` and gets `{ q: "urban frank gehry", limit: 10 }`.
3. `limit=5` — a named argument that overrides the search default.

The handler builds: `https://openlibrary.org/search.json?q=urban+frank+gehry&limit=5`

**Field mapping.** The `map` object tells the handler which API fields become which AlapLink fields. Dot paths reach into nested structures — `author_name.0` gets the first element of an array. If no `map` is provided, the handler tries common field names: `name`/`title` for label, `url`/`html_url`/`href` for URL.

Many APIs return relative paths instead of full URLs — Open Library returns `key: "/works/OL17199486W"`, not a complete link. The `linkBase` field handles this: it's prepended to any mapped URL that doesn't start with `http`.

**Security posture.** Outbound URLs are checked against the private-address blocklist (loopback, RFC 1918, link-local, IPv6 equivalents) before fetch and again at socket-open time, so DNS resolution changes between check and connect can't slip past. `allowedOrigins` restricts which domains `:web:` can fetch from; when set, it becomes the authoritative gate and the socket-level re-check yields to it (so a configured dev host like `http://localhost:3000` still works). `credentials: true` on a key sends the user's browser session with the request — useful for intranet APIs; credentials are omitted by default. Fetches time out after 10 seconds, responses larger than 1 MB are rejected, and only `application/json` responses are accepted. Returned links are sanitized at the strict tier (`http`, `https`, `mailto`); output is capped at `MAX_GENERATED_LINKS` (200). See [Security](../api-reference/security.md) for full details.

**Caching.** Generate protocols cache results by default (5 minutes). Override per key:

```javascript
books: { url: "...", cache: 60 }    // cache for 1 hour
bridges: { url: "...", cache: 0 }   // always refetch
```

See the [external-data example](https://examples.alap.info/external-data/) (`examples/sites/external-data/`).

### `:atproto:` — live data from Bluesky

A generate protocol that fetches data from the AT Protocol network (Bluesky). Profiles, feeds, people search, and post search mapped to AlapLink objects.

```
:atproto:profile:eff.org:             → profile with Option of Choice destinations
:atproto:feed:nature.com:limit=5:     → recent posts from an account
:atproto:people:atproto:limit=5:      → search for accounts by keyword
:atproto:search:accessibility:limit=5: → search posts (requires auth)
```

Multi-word queries use named aliases defined in the protocol config's `searches` map:

```typescript
// config (data)
protocols: {
  atproto: {
    cache: 5,
    searches: {
      open_source: 'open source',
      creative_commons: 'creative commons',
    },
  },
}

// handler (behavior)
import { atprotoHandler } from 'alap';
const engine = new AlapEngine(config, { handlers: { atproto: atprotoHandler } });
```

Then use the alias in expressions: `:atproto:people:open_source:limit=5:`. Single-word queries work directly.

**Security posture.** `:atproto:` fetches run through the engine's standard async lifecycle — timeout, response size cap, concurrency cap — and use `credentials: 'omit'` by default. Authenticated searches (`:atproto:search:`) require app-password credentials configured server-side; the unauthenticated sub-modes (`profile`, `feed`, `people`) hit only public AT Protocol endpoints. See [Security](../api-reference/security.md) for the full async lifecycle and tier model.

A single expression can mix static `allLinks`, `:web:` results, and `:atproto:` data into one menu — see the [bluesky-atproto combined page](https://examples.alap.info/bluesky-atproto/combined.html) for a live demo.

### `:hn:` — live data from Hacker News

A generate protocol that maps Hacker News into `AlapLink[]`. Zero auth, zero server — both backends (Firebase for listings/items/users, Algolia for search) serve CORS headers, so the browser calls them directly.

```
:hn:top:                          → front-page top stories
:hn:new:limit=5:                  → newest stories (5)
:hn:best:                         → best stories (rolling window)
:hn:ask:                          → Ask HN threads
:hn:show:                         → Show HN launches
:hn:job:                          → YC job postings
:hn:user:pg:limit=10:             → a user's recent submissions
:hn:search:$ai_papers:limit=10:   → Algolia search (via named preset)
:hn:items:8863:121003:1:          → specific items by id (each a positional segment, capped at 6)
```

Multi-word search queries use named aliases in the protocol config's `searches` map — the tokenizer splits on whitespace, so free-text can't live inline:

```typescript
import { hnHandler } from 'alap';

// config (data)
config.protocols.hn = {
  cache: 10,
  searches: {
    ai_papers:    'artificial intelligence papers',
    rust_release: 'rust 2024 edition release',
  },
  defaults: { limit: 10 },
};

// handler (behavior)
const engine = new AlapEngine(config, { handlers: { hn: hnHandler } });
```

Then reference them with `$preset` (or bare name — both work; `$` is the preferred form because it makes the config lookup explicit):

```
:hn:search:$ai_papers:
:hn:search:$rust_release:limit=5:
```

Link mapping keeps two URLs per item: `url` is the external link when the story has one (so clicks go to the article); `meta.hnUrl` is always the HN discussion page. Self-posts (Ask HN, Show HN) set `url` to the discussion page since there's no external target. `meta.timestamp` (ms) is populated from the item's `time` field so `:hn:` composes with `:time:` filtering:

```
:hn:new:limit=30: + :time:6h:     → stories submitted in the last 6 hours
:hn:top:limit=20: + :time:today:  → top stories posted today
```

Limit precedence: named arg (`limit=N`) > `config.protocols.hn.defaults.limit` > built-in default (20). All sub-modes are capped at `MAX_GENERATED_LINKS` regardless.

See the [hn example](https://examples.alap.info/hn/) (`examples/sites/hn/`) for a complete page demonstrating every sub-mode plus composition with tags, macros, and `:time:`.

### `:obsidian:core:` — search a local Obsidian vault

A generate protocol that turns an Obsidian vault on disk into a link source. Queries match against note titles, tags (frontmatter), bodies, and paths; each resolved link points at an `obsidian://open?vault=…&file=…` URI that opens the note in the desktop app.

```
:obsidian:core:bridges:              → notes mentioning "bridges"
:obsidian:core:music:$meta:          → titles/tags only, via a named preset
:obsidian:core:daily:fields=path:    → scope search to path component
```

Because it reads the filesystem, **`:obsidian:core:` is Node-only** and not bundled into `alap` or `alap/slim`. Import it explicitly from the subpath export:

```typescript
import { obsidianHandler } from 'alap/protocols/obsidian';

// config (data)
config.protocols.obsidian = {
  vault: 'MyVault',
  vaultPath: '/Users/me/Documents/MyVault',
  // Optional named presets referenced from expressions via $name
  searches: {
    meta:  { fields: 'title;tags' },
    small: { maxFiles: 20 },
  },
};

// handler (behavior)
const engine = new AlapEngine(config, { handlers: { obsidian: obsidianHandler } });
```

Register it on a server (Express, Sinatra, Hono…) and expose a `/query` endpoint; the browser posts expression segments and receives resolved links. The vault path and any REST credentials stay server-side — the client sees only the resulting `AlapLink[]`.

**`$preset` vs `@macro`:** the two sigils have distinct roles and don't overlap. `@macro` expands to expression text (link IDs, tags, operators) at the whole-expression level. `$preset` expands inside a protocol segment to argument bundles — the handler decides what each key means. Same principle as `/pattern/` for regex atoms: the tokenizer hands each domain its own bracketed region.

**Security posture.** The handler keeps filesystem access bounded: symlink-escape rejection, path-traversal guard, per-file read cap (256 KiB), file-count cap, and ignore globs for `.obsidian/`, `.trash/`, and `node_modules/`. For the fuller hardening picture — REST-mode specifics, server-side considerations, and auditing an existing install — see [obsidian-hardening.md](../cookbook/obsidian-hardening.md).

See the [obsidian example](https://examples.alap.info/obsidian/) (`examples/sites/obsidian/`) for a complete Node-server + browser page, including a `/vault-media/` route for rendering note images in lens/lightbox.

### Source indicators

`:web:`, `:atproto:`, `:hn:`, and `:obsidian:` all tag every link they produce:

- **`cssClass`** — `source_web`, `source_atproto`, `source_hn`, or `source_obsidian` is appended to each link's CSS class. Static `allLinks` items carry no source class.
- **`meta.source`** — set to `'web'`, `'atproto'`, `'hn'`, or `'obsidian'` for programmatic access.

This lets you visually distinguish where each menu item came from in mixed-source menus:

```css
.alapListElem.source_web     { border-left: 3px solid #f0a050; }
.alapListElem.source_atproto { border-left: 3px solid #66cc88; }
.alapListElem.source_hn      { border-left: 3px solid #ff6600; }
.alapListElem.source_obsidian { border-left: 3px solid #7c4dff; }
```

The `meta.source` field is also available in hooks like `onItemHover` for displaying provenance tooltips.

See the [bluesky-atproto example](https://examples.alap.info/bluesky-atproto/) (`examples/sites/bluesky-atproto/`).

## Custom protocols

Custom protocols follow the same pattern. Register a handler in `config.protocols`, document the segments it accepts, and it works everywhere the built-in protocols work — composing with tags, operators, macros, parentheses, and refiners. No parser changes required.

## Mixing everything

Every operand type — tags, item IDs, macros, regex search, filter protocols, generate protocols — returns the same thing: a set of links. They compose freely.

### Local data only

Tags, regex search, filter protocols — all against `allLinks`:

```
.coffee + .nyc + :time:7d: + :location:radius:40.7,-74.0:1mi:
```

"Coffee in NYC, added this week, within a mile of here." Four filters composed in one expression.

```
/bridge/ + :location:radius:40.7,-74.0:5mi:
```

"Links matching 'bridge' that are within 5 miles." Regex search narrowed by a location protocol.

```
(:time:30d: + .restaurant *sort:label* *limit:10*) | @favorites
```

"10 recently added restaurants sorted alphabetically, plus my favorites." The parenthesized group has its own refiners — the sort and limit apply only to the restaurant results, not to the favorites.

### External data

Generate protocols bring in links from APIs:

```
:web:books:photography:limit=5:
```

"5 photography books from the Open Library API."

```
:web:books:adams: + :time:1y:
```

"Douglas Adams books published in the last year." The `:web:` handler fetches from the API, then `:time:` filters the results by their `meta.year`. Two different protocol types composed in one expression.

```
:atproto:feed:nature.com:limit=5: + :atproto:people:open_source:limit=3:
```

"Recent posts from Nature plus 3 open source accounts from Bluesky."

### Mixing local and external

```
@my_bookmarks | (:web:books:photography: *sort:label* *limit:3*)
```

"My saved bookmarks, plus the top 3 photography books sorted by title." The macro expands from `allLinks`. The parenthesized group fetches from an API, sorts, and limits — all scoped within the parentheses.

```
(.nyc + .landmark *sort:label*), (:web:bridges:borough=brooklyn: *limit:5*)
```

"NYC landmarks sorted by name, then Brooklyn bridges from the API." Comma-separated — two independent result sets, each with their own scope.

```
(:web:books:gardening: *limit:10*) - /indoor/
```

"Gardening books from the API, excluding any whose label matches 'indoor'." External data filtered by a local regex pattern.

### Scoping

Parentheses control where refiners apply:

```
@my_bookmarks | :web:books:photography: *limit:10*               → limit the whole result to 10
@my_bookmarks | (:web:books:photography: *sort:label* *limit:3*) → only the books are sorted and limited
```

The first expression limits everything — bookmarks and books together, capped at 10. The second sorts and limits only the books inside the parentheses; the bookmarks pass through untouched.

This is the same scoping behavior that works with tags and filter protocols. Generate protocols don't change the rules — once the engine pre-resolves the external data, the links are just links.

## Why this matters

Without protocols, Alap's expression language covers categories. With protocols, it covers dimensions. Tags for "what kind," filter protocols for "how recent, how close." Generate protocols add a third axis: "from where" — external APIs, the AT Protocol network, any data source that returns JSON.

A static config with a few links in `allLinks` works. Adding tags and filter protocols makes it queryable. Adding `:web:` or `:atproto:` makes it dynamic. Each layer is optional — you use what you need.

The grammar doesn't grow. The engine barely changes. A new API source is a config entry, not a new feature.

## Next steps

- [Expressions](expressions.md) — the full query language
- [Refiners](refiners.md) — shape protocol results with sort, limit, shuffle
- [Configuration](../getting-started/configuration.md) — protocol registration in the config object
- [Types](../api-reference/types.md) — `AlapProtocol` and `ProtocolHandler` interfaces
- [Security](../api-reference/security.md) — `:web:` origin allowlists, credential isolation, fetch limits
