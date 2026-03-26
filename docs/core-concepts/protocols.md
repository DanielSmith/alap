# Protocol Expressions

**[Core Concepts](README.md):** [Expressions](expressions.md) · [Macros](macros.md) · [Search Patterns](search-patterns.md) · **This Page** · [Refiners](refiners.md) · [Styling](styling.md) | [All docs](../README.md)

Tags are categories. A link is either tagged `coffee` or it isn't. That works for most queries — but some questions don't fit into categories:

- "What was added this week?"
- "What's within walking distance?"
- "What costs less than $20?"

These are range queries over continuous data. You can't tag your way to "added in the last 30 days" without someone updating tags every morning.

Protocol expressions solve this. They filter by dimensions — time, location, price, anything with a range — using the same syntax that already works for tags.

> Live version with interactive examples: https://alap.info/core-concepts/protocols

## The syntax

A protocol expression is wrapped in colons:

```
:time:30d:
:loc:40.7,-74.0:5mi:
:price:10:50:
```

The first segment is the protocol name. Everything after is arguments — the protocol handler decides what they mean.

`:time:30d:` means "links from the last 30 days." The `time` handler parses `30d` as a relative duration and checks each link's timestamp.

`:loc:40.7,-74.0:5mi:` means "links within 5 miles of this point." The `loc` handler parses coordinates and a radius.

The parser doesn't understand `30d` or `5mi`. It just splits on colons and hands the strings to the handler. This means new protocols — `:rating:4:5:`, `:lang:en:`, `:author:daniel:` — don't require parser changes. You register a handler and you're done.

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

## The handler contract

There are two kinds of protocol handlers:

**Filter** — a predicate that tests whether an existing link matches:

```typescript
type ProtocolHandler = (segments: string[], link: AlapLink, id: string) => boolean;
```

The handler doesn't know about the parser, the engine, or the UI. It receives raw strings and a link object, and says "yes, this link matches" or "no, it doesn't." A `:time:` handler checks `link.createdAt`. A `:price:` handler checks `link.meta.price`. Each is a few lines of code.

**Generate** — an async function that fetches external data and returns new links:

```typescript
type GenerateHandler = (segments: string[], config: AlapConfig) => Promise<AlapLink[]>;
```

A generate handler receives the segments and the full config. It returns an array of links. The engine assigns temporary IDs, and the links become part of the result set — composable with tags, filters, and other protocols.

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

Filter protocols run synchronously during expression evaluation. Generate protocols resolve asynchronously *before* the parser runs — the engine pre-resolves all generate tokens, injects their results, then evaluates the expression synchronously. The parser never goes async.

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
        "location": [40.6892, -73.9838],
        "price": 5
      }
    }
  }
}
```

Tags say what a link *is*. Meta says what a link *measures*. The `:time:` handler reads `meta.timestamp`. The `:loc:` handler reads `meta.location`. Each handler documents which fields it expects.

The `createdAt` field that already exists on every link gives `:time:` a bootstrap path — existing configs get time filtering for free, no `meta` required.

## Where the data comes from

There are two separate ideas here:

**Source chain** — where the Alap config data itself lives. Your `allLinks`, your `macros`, your `settings` — that data can be loaded from a static JSON file, from IndexedDB, or from a remote API that serves Alap config. The data is already in Alap's format. The source chain controls where to look:

```javascript
protocols: {
  time: {
    sources: ['config', 'idb', 'api']
  }
}
```

The engine iterates sources in order, runs the handler against links from each source, and merges results:

- Start with `sources: ['config']` — everything works with a static JSON file
- Add `'idb'` for local persistence
- Add `'api'` for a shared backend that serves Alap-formatted data

The expressions don't change. The HTML doesn't change. Only the config evolves.

Handlers are registered separately — see [The handler contract](#the-handler-contract). The config names protocols and declares their sources, but contains no executable code.

**External data** — data from outside that isn't in Alap's format at all. A city data API, a bookmarks service, a CMS — these return their own JSON. A generate handler fetches that data and transforms it into Alap links.

This is entirely optional. An Alap config can be a static JSON file with a handful of links and no protocols at all. But when you need dynamic content, the same expression syntax handles it.

### The `:web:` protocol

Alap ships a built-in `:web:` generate handler. The config maps keys to API endpoints:

```javascript
protocols: {
  web: {
    generate: webHandler,
    allowedOrigins: ["https://openlibrary.org", "https://api.example.com"],
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
      },
      bridges: {
        url: "https://api.example.com/bridges",
        map: {
          label: "name",
          url: "wiki",
          meta: { year: "year" }
        }
      },
      intranet: {
        url: "https://internal.corp/api/resources",
        credentials: true
      }
    }
  }
}
```

The config is just data — URLs, field mappings, search aliases. The handler is registered once and never needs to change. Adding a new API source is adding lines to the config, not writing code. This is the kind of thing an Alap editor can manage visually.

**Security options:** `allowedOrigins` restricts which domains `:web:` can fetch from. `credentials: true` on a key sends the user's browser session (cookies, HTTP auth) with the request — useful for intranet or subscription APIs. Credentials are omitted by default. Fetches time out after 10 seconds and responses larger than 1 MB are rejected. See [Security](../api-reference/security.md) for full details.

### How arguments flow

The parser splits on `:` and hands all segments to the handler. For `:web:books:architecture:limit=5:`:

```
segments: ['books', 'architecture', 'limit=5']
```

1. `books` — the key. The handler looks up the key config to get the base URL.
2. `architecture` — a search alias. The handler looks it up in `searches` and gets `{ q: "urban frank gehry", limit: 10 }`.
3. `limit=5` — a named argument that overrides the search default.

The handler builds: `https://openlibrary.org/search.json?q=urban+frank+gehry&limit=5`

The HTML stays clean:

```html
<a class="alap" data-alap-linkitems=":web:books:architecture:limit=5:">architecture</a>
```

Nobody reading the markup needs to know the actual search is "urban frank gehry." That's a config concern, not a content concern.

### Field mapping

The `map` object tells the handler which API fields become which Alap link fields. Dot paths reach into nested structures — `author_name.0` gets the first element of an array.

If no `map` is provided, the handler tries common field names: `name`/`title` for label, `url`/`html_url`/`href` for URL.

Many APIs return relative paths instead of full URLs — Open Library returns `key: "/works/OL17199486W"`, not a complete link. The `linkBase` field handles this: it's prepended to any mapped URL that doesn't start with `http`. URLs that are already absolute are left alone.

An API that returns:

```json
{
  "docs": [
    { "title": "Experimental Architecture",  "key": "/works/OL17199486W",  "author_name": ["Frank Gehry"],  "first_publish_year": 1999 },
    { "title": "Urban Design Handbook",      "key": "/works/OL12345W",     "author_name": ["Jane Jacobs"],   "first_publish_year": 1961 }
  ]
}
```

The handler maps each object: `title` becomes `label`, the URL template fills in `key`, `author_name.0` becomes `meta.author`, `first_publish_year` becomes `meta.year`. Items without a URL are skipped. The handler finds the array automatically — whether it's the top-level response, nested in `docs`, `items`, or `results`.

### Composition

Generated links compose like anything else:

```
:web:books:photography:limit=5:                     → photography books
:web:books:adams: + :time:1y:                       → Douglas Adams books published this year
:web:bridges:borough=brooklyn: + :time:1900:1910:   → Brooklyn bridges built 1900–1910
```

### Caching

Generate protocols cache results by default (5 minutes). Override per key:

```javascript
books: { url: "...", cache: 60 }    // cache for 1 hour
bridges: { url: "...", cache: 0 }   // always refetch
```

No `cache` key means use the default. `cache: 0` means no caching.

### The difference

Source chain gets Alap data from different storage layers — your `allLinks` loaded from a file, from IndexedDB, or from a remote store. The data is already in Alap's format.

External protocols bring in non-Alap data and transform it into links. A city API, a book search, a CMS feed — the handler does the mapping.

Both produce sets. Both compose the same way. The expression doesn't know which is which.

## Built-in protocols

Alap ships with two:

**`:time:`** — filter by when a link was created or last updated.

```
:time:30d:                → last 30 days
:time:today:              → today
:time:2025-01-01:         → since January 1, 2025
:time:30d:60d:            → between 30 and 60 days ago (a range)
```

**`:loc:`** — filter by geographic proximity.

```
:loc:40.7,-74.0:5mi:          → within 5 miles of a point
:loc:40.7,-74.0:40.8,-73.9:   → inside a bounding box
```

Custom protocols follow the same pattern. Register a handler, document the segments it accepts, and it works everywhere `:time:` and `:loc:` work.

## Mixing everything

Every operand type — tags, item IDs, macros, regex search, filter protocols, generate protocols — returns the same thing: a set of links. They compose freely. Here are examples that mix them.

### Local data only

Tags, regex search, filter protocols — all against `allLinks`:

```
.coffee + .nyc + :price:0:10: + :time:7d: + :loc:40.7,-74.0:1mi:
```

"Cheap coffee in NYC, added this week, within a mile of here." Five filters composed in one expression.

```
/bridge/ + :loc:40.7,-74.0:5mi:
```

"Links matching 'bridge' that are within 5 miles of this point." Regex search narrowed by a location protocol.

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

### Mixing local and external

```
@my_bookmarks | (:web:books:photography: *sort:label* *limit:3*)
```

"My saved bookmarks, plus the top 3 photography books sorted by title." The macro expands from `allLinks`. The parenthesized group fetches from an API, sorts, and limits — all scoped within the parentheses. The union merges both sets.

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

Without protocols, Alap's expression language covers categories. With protocols, it covers dimensions. Tags for "what kind," protocols for "how much, how far, how recent." Generate protocols add a third axis: "from where."

A static config with a few links in `allLinks` works. Adding tags and filter protocols makes it queryable. Adding `:web:` makes it dynamic. Each layer is optional — you use what you need.

The grammar doesn't grow. The engine barely changes. A new API source is a config entry, not a new feature.

## Next steps

- [Expressions](expressions.md) — the full query language
- [Refiners](refiners.md) — shape protocol results with sort, limit, shuffle
- [Configuration](../getting-started/configuration.md) — protocol registration in the config object
- [Types](../api-reference/types.md) — `AlapProtocol` and `ProtocolHandler` interfaces
