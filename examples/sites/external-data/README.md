# External Data

Demonstrates the `:web:` generate protocol — fetching data from APIs and composing it with local links.

## What it shows

- **Local only** — tags, macros, time filters against `allLinks`
- **External only** — `:web:books:photography:` fetching from the Open Library API
- **Mixed** — local bookmarks merged with API results in one expression
- **Scoping** — refiners inside parentheses don't leak to outer expressions

## Config highlights

```javascript
// config (data only)
protocols: {
  web: {
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

// handler (passed at engine construction)
import { AlapUI, webHandler } from "alap";
new AlapUI(config, { handlers: { web: webHandler } });
```

## How it works

The `:web:` protocol is async. As of 3.2 the renderer opens immediately with a `Loading…` placeholder and re-renders in place when the fetch settles — no pre-resolve step is required. `main.ts` can still call `engine.preResolve()` to warm the cache up front (e.g. on `mouseenter`, or once the page is otherwise idle), but it's optional.

## Run

```bash
./serve.sh    # http://localhost:9160
```
