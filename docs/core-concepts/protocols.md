# Protocol Expressions

**[Core Concepts](README.md):** [Expressions](expressions.md) · [Macros](macros.md) · [Search Patterns](search-patterns.md) · **This Page** · [Refiners](refiners.md) · [Styling](styling.md) | [All docs](../README.md)

Tags are categories. A link is either tagged `coffee` or it isn't. That works for most queries — but some questions don't fit into categories:

- "What was added this week?"
- "What's within walking distance?"
- "What books match this topic?"
- "What are people posting about on Bluesky?"

These are range queries over continuous data, or live queries against external APIs. You can't tag your way to "added in the last 30 days" without someone updating tags every morning.

Protocol expressions solve this. They filter by dimensions — time, location — or fetch live data from external sources, using the same syntax that already works for tags.

> Live version with interactive examples: https://alap.info/core-concepts/protocols

## The syntax

A protocol expression is wrapped in colons:

```
:time:30d:
:loc:40.7,-74.0:5mi:
:web:books:photography:limit=5:
:atproto:feed:nature.com:limit=5:
```

The first segment is the protocol name. Everything after is arguments — the protocol handler decides what they mean.

`:time:30d:` means "links from the last 30 days." The `time` handler parses `30d` as a relative duration and checks each link's timestamp.

`:loc:40.7,-74.0:5mi:` means "links within 5 miles of this point." The `loc` handler parses coordinates and a radius.

The parser doesn't understand `30d` or `5mi`. It just splits on colons and hands the strings to the handler.

## How it composes

Protocol expressions are operands, just like tags. They return a set of links, and that set participates in the boolean algebra:

```
.coffee + :time:30d:              → coffee added this month
.restaurant + :loc:here:1mi:      → restaurants within a mile
.coffee + :time:7d: + :loc:nyc:   → coffee in NYC, added this week
```

Group with parentheses, combine with macros, subtract tags:

```
(.coffee + :time:30d:) | (.bakery + :loc:here:1mi:)
@favorites - :time:365d:
```

The parser doesn't care where a set came from — tag, macro, regex search, or protocol. It applies the operators the same way.

## Two kinds of protocol

**Filter** — a predicate that tests whether an existing link matches. Runs synchronously during expression evaluation:

```typescript
type ProtocolHandler = (segments: string[], link: AlapLink, id: string) => boolean;
```

`:time:` and `:loc:` are filter protocols. They check each link in `allLinks` and return true or false.

**Generate** — an async function that fetches external data and returns new links:

```typescript
type GenerateHandler = (segments: string[], config: AlapConfig) => Promise<AlapLink[]>;
```

`:web:` and `:atproto:` are generate protocols. They call external APIs, transform the results into AlapLink objects, and inject them into the result set. The engine pre-resolves all generate tokens *before* the parser runs — so the expression evaluates synchronously.

A protocol declares which kind it is:

```typescript
interface AlapProtocol {
  filter?: ProtocolHandler;
  generate?: GenerateHandler;
  cache?: number;       // TTL in minutes for generate results (0 = no cache, default: 5)
  keys?: Record<string, WebKeyConfig>;
  sources?: string[];
}
```

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

Tags say what a link *is*. Meta says what a link *measures*. The `:time:` handler reads `meta.timestamp` (falling back to `createdAt`). The `:loc:` handler reads `meta.location`. Each handler documents which fields it expects.

The `createdAt` field that already exists on every link gives `:time:` a bootstrap path — existing configs get time filtering for free, no `meta` required.

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

### `:loc:` — filter by proximity

Filter links by geographic distance. Reads `meta.location` (a `[lat, lng]` tuple). Supports miles and kilometers.

```
:loc:40.7,-74.0:5mi:          → within 5 miles of a point
:loc:40.7,-74.0:10km:         → within 10 kilometers
:loc:40.7,-74.0:40.8,-73.9:   → inside a bounding box
```

Uses the Haversine formula for distance calculation.

### `:web:` — fetch from external JSON APIs

A generate protocol that fetches JSON from any API and maps results to AlapLink objects. The config maps keys to API endpoints — no code, just data:

```javascript
protocols: {
  web: {
    generate: webHandler,
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

**Security.** `allowedOrigins` restricts which domains `:web:` can fetch from. `credentials: true` on a key sends the user's browser session with the request — useful for intranet APIs. Credentials are omitted by default. Fetches time out after 10 seconds and responses larger than 1 MB are rejected. See [Security](../api-reference/security.md) for full details.

**Caching.** Generate protocols cache results by default (5 minutes). Override per key:

```javascript
books: { url: "...", cache: 60 }    // cache for 1 hour
bridges: { url: "...", cache: 0 }   // always refetch
```

See the [external-data example](../../examples/sites/external-data/) (`examples/sites/external-data/`).

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
protocols: {
  atproto: {
    generate: atprotoHandler,
    cache: 5,
    searches: {
      open_source: 'open source',
      creative_commons: 'creative commons',
    },
  },
}
```

Then use the alias in expressions: `:atproto:people:open_source:limit=5:`. Single-word queries work directly.

A single expression can mix static `allLinks`, `:web:` results, and `:atproto:` data into one menu — see the [bluesky-atproto combined page](../../examples/sites/bluesky-atproto/combined.html) for a live demo.

### Source indicators

Both `:web:` and `:atproto:` automatically tag every link they produce:

- **`cssClass`** — `source_web` or `source_atproto` is appended to each link's CSS class. Static `allLinks` items carry no source class.
- **`meta.source`** — set to `'web'` or `'atproto'` for programmatic access.

This lets you visually distinguish where each menu item came from in mixed-source menus:

```css
.alapListElem.source_web     { border-left: 3px solid #f0a050; }
.alapListElem.source_atproto { border-left: 3px solid #66cc88; }
```

The `meta.source` field is also available in hooks like `onItemHover` for displaying provenance tooltips.

See the [bluesky-atproto example](../../examples/sites/bluesky-atproto/) (`examples/sites/bluesky-atproto/`).

## Custom protocols

Custom protocols follow the same pattern. Register a handler in `config.protocols`, document the segments it accepts, and it works everywhere the built-in protocols work — composing with tags, operators, macros, parentheses, and refiners. No parser changes required.

## Mixing everything

Every operand type — tags, item IDs, macros, regex search, filter protocols, generate protocols — returns the same thing: a set of links. They compose freely.

### Local data only

Tags, regex search, filter protocols — all against `allLinks`:

```
.coffee + .nyc + :time:7d: + :loc:40.7,-74.0:1mi:
```

"Coffee in NYC, added this week, within a mile of here." Four filters composed in one expression.

```
/bridge/ + :loc:40.7,-74.0:5mi:
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
