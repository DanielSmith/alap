# External Data

Demonstrates the `:web:` generate protocol — fetching data from APIs and composing it with local links.

## What it shows

- **Local only** — tags, macros, time filters against `allLinks`
- **External only** — `:web:books:photography:` fetching from the Open Library API
- **Mixed** — local bookmarks merged with API results in one expression
- **Scoping** — refiners inside parentheses don't leak to outer expressions

## Config highlights

```javascript
protocols: {
  web: {
    generate: webHandler,
    keys: {
      books: {
        url: "https://openlibrary.org/search.json",
        searches: {
          photography:  { q: "street photography film", limit: 8 },
          adams:        { q: "douglas adams hitchhiker", limit: 8 },
        },
        map: { label: "title", url: "key", meta: { author: "author_name.0" } },
        cache: 60
      }
    }
  }
}
```

## How it works

The `:web:` protocol is async — it fetches from APIs before the parser runs. The `main.ts` scans the page for `:web:` expressions, pre-resolves them all in parallel, then initializes the UI. After that, menus open instantly from cache.

## Run

```bash
./serve.sh    # http://localhost:9160
```
