# Writing a Protocol

**[Core Concepts](README.md):** [Expressions](expressions.md) · [Macros](macros.md) · [Search Patterns](search-patterns.md) · [Protocols](protocols.md) · **This Page** · [Refiners](refiners.md) · [Styling](styling.md)

You have a data source you want to tap into — bookmarks you keep in a SaaS tool, a JSON endpoint from a service you run, notes in a database, messages in a chat workspace. You want users to reference it from an Alap expression:

```
.team_links + :mytool:bookmarks:team:
```

Writing a protocol is how you do that. The grammar doesn't change, the parser doesn't change, the engine barely notices. You hand Alap a function that takes the arguments after the protocol name and returns links. Everything else — composition with tags, refiners, macros, `:time:` filtering, UI rendering — falls out for free.

This guide walks through the decision, the contract, and a worked example: the **Hacker News protocol, end to end**, from empty file to registered-and-tested.

> **Want to jump straight to the tutorial?** Skip to [the `:hn:` worked example](#worked-example-hn-from-scratch).

---

## Before you write one

A protocol is the right answer less often than you'd think. Five cheaper alternatives to exhaust first:

### 1. Static `allLinks`

If the URL list is small, stable, and hand-curated, put it in `config.allLinks` with tags. No code at all. You get everything — filtering, sorting, refiners, lens rendering.

```json
{ "allLinks": { "gh_rust": { "label": "Rust repo", "url": "...", "tags": ["dev", "rust"] } } }
```

### 2. A macro

If the list is an expression over existing data — "my frequently-used dev links" — a macro captures it without code:

```json
{ "macros": { "dev_core": { "linkItems": ".rust + .dev, .go + .dev" } } }
```

### 3. `:web:` with a key

If the data is behind a CORS-friendly JSON API **and you query it through named "searches"** (each search is a preset bundle of query-string params), `:web:` covers it via config alone. No handler to write — a key entry with a `url`, a `searches` map of aliases, and a lightweight `map` of fields:

```typescript
// config (data)
web: {
  keys: {
    books: {
      url: 'https://openlibrary.org/search.json',
      searches: {
        photography: { q: 'street photography film', limit: 20 },
        adams:       { q: 'douglas adams hitchhiker', limit: 10 },
      },
      map: { label: 'title', url: 'key' },
    },
  },
}

// handler (behavior)
import { webHandler } from 'alap';
const engine = new AlapEngine(config, { handlers: { web: webHandler } });
```

Expression: `:web:books:photography:` runs the `photography` search against the `books` endpoint. Best when you have a small number of canned queries against a single endpoint and you care more about *which query* than *which record*.

### 4. `:json:` with a source

`:json:` is related to `:web:` but carves a different lane. Use it when you want to turn **a JSON endpoint into a link source directly** — every record becomes a link — with explicit field mapping, URL-template positional fills, and first-class auth headers.

```typescript
// config (data)
json: {
  sources: {
    bookmarks: {
      url: 'https://api.mytool.com/bookmarks?tag=${1}',  // ${1} = first positional segment
      root: 'data.items',                                // dot-path into the response
      headers: { Authorization: 'Bearer ${TOKEN}' },
      fieldMap: {
        label: 'title',
        url:   'href',
        tags:  'tags',
        meta:  { author: 'created_by', pinned: 'is_pinned' },
      },
    },
  },
}

// handler (behavior)
import { jsonHandler } from 'alap';
const engine = new AlapEngine(config, { handlers: { json: jsonHandler } });
```

Expression: `:json:bookmarks:frontend:` fills `${1}` with `frontend`, hits the URL, walks into `data.items[]`, and maps each record through `fieldMap` into an `AlapLink`. Supports envelope metadata (pull response-level fields onto every item), header auth, credentials, custom URL-scheme allowlists, and `linkBase` for relative URLs.

**`:web:` vs `:json:` in one line:** `:web:` is for **named queries** against an endpoint (the alias picks which query to run); `:json:` is for **named data sources** (the alias picks which endpoint to hit, and every record becomes a link). If your data is "hit X, surface every row," reach for `:json:`. If it's "here are five questions I ask of X," reach for `:web:`.

### 5. The ingest-to-`allLinks` pipeline

If the data source doesn't change in real time (an RSS feed, a daily export, a CMS sync), pull it into `.md` files or JSON config at build/cron time, then query it through Alap the same way you'd query hand-written links. No protocol needed. This is how RSS works today — `scripts/feed_to_md.py` turns feeds into an Obsidian vault, then `:obsidian:core:` queries it.

### When you actually need a protocol

You need a new protocol when:

- The data source has its own query shape (not just a fixed URL and a fieldMap) — e.g., "search messages," "bookmarks in channel X, pinned by me."
- You need live freshness (per-render fetch, not a stale snapshot).
- You need to translate a foreign data model into `AlapLink` — mapping message bodies, reply counts, permalinks, stripping markup — and that logic doesn't fit a `:web:` or `:json:` field map.
- You need stateful authentication — token refresh, OAuth dance, scope-aware error messages.
- You want graceful-degradation behaviour that a generic JSON fetcher can't know about (partial auth, rate-limit backoff, pagination).

The Hacker News example below hits most of these: it has several query shapes (top stories, user submissions, Algolia search), it maps items to permalinks and preserves two URLs per item, it wants cached pulls, and Algolia's response shape is different enough from Firebase's to warrant explicit mapping — more than a `:web:` key or `:json:` source can express cleanly.

---

## The shape of a protocol expression

Every protocol expression follows one pattern:

```
:protocol:mode:arg1:arg2:etc:
```

- **`protocol`** — the protocol name registered via `new AlapEngine(config, { handlers: { [name]: fn } })`. Data (cache, searches, presets) can live alongside under `config.protocols[name]`.
- **`mode`** — the sub-mode verb. Picks which query shape to run.
- **`arg1:arg2:...`** — positional arguments, one per colon-delimited segment.
- **Named args** — a convention, not a grammar rule. Two shapes protocols commonly use:
  - `limit=5` — single segment, `=` separates key and value. `=` is safe because it's not a top-level operator.
  - `limit:5` — two segments, handler treats them as a key/value pair.
  - **Which form is up to the handler.** Both are legal at the grammar level; pick whichever fits your protocol's shape and document it. The examples below use `limit=5`.

Example decomposed:

```
:hn:user:pg:limit=10:
 │  │    │  └── named arg: limit=10
 │  │    └───── positional arg: "pg" (the username)
 │  └────────── mode: "user"
 └───────────── protocol: "hn"
```

The parser strips the `:protocol:` prefix and hands your handler a `string[]` of the remaining segments. For the above: `['user', 'pg', 'limit=10']`.

That's the entire protocol surface. Your job is to interpret those strings.

---

## The closed grammar rule

**The root principle: don't mess with the top-level tokenizer.**

Alap's expression grammar is a closed set of sigils and operators. Inside a `:protocol:...:` segment you can use any character the tokenizer *doesn't* claim as a top-level delimiter at that position. The rule has two tiers:

- **Always forbidden inside a segment body:** `:` (segment delimiter) and `|` (internal tokenizer encoding).
- **Forbidden only at a segment boundary** (right after a `:`): whitespace, `+`, `|`, `,`, `(`, `)`, `*`, `/`. These terminate the protocol expression when they appear immediately after a `:`. Inside a segment body, they pass through verbatim.

That means **commas inside a segment body are safe** — `:location:radius:40.7,-74.0:5mi:` is the established precedent. `:hn:items:8863,8845,828:` works for the same reason: the commas sit between a `:` and the next character that isn't `:`, never at a boundary.

**Hyphens are still a footgun** — `:proto:foo-bar:` is grammar-legal (hyphen inside a body) but `@favorites-stub:` would parse ambiguously in surrounding expression context. Use underscores.

Everything else in this section — `$preset` sigils, multi-word searches going through config, `key=value` vs `key:value` named args — is a consequence of this one principle. As long as your protocol's internal conventions don't collide with the tokenizer's boundary rules, you have freedom inside your segments.

Two consequences you need to internalise before you write a protocol:

### 1. No spaces, no hyphens

Alap expressions are tokenised on whitespace, and `-` is the WITHOUT operator (`@favorites - .stub`). This means:

- **No spaces inside a segment.** `:hn:search:rust edition:` is invalid — the tokenizer splits at the space.
- **No hyphens inside a segment.** `:hn:search:rust-2024:` parses as `:hn:search:rust` minus `2024:` — almost certainly not what you meant.

Use **underscores** when you need word separation: `rust_2024`, `creative_commons`, `bug_reports`.

### 2. Multi-word queries resolve in the config

When a user's natural query has spaces ("rust 2024 edition release"), it can't appear inline in the expression. Your protocol resolves it through a named alias in its config — the `searches` map:

```typescript
// config (data)
protocols: {
  hn: {
    searches: {
      rust_release: 'rust 2024 edition release',
      ai_papers:    'artificial intelligence papers',
    }
  }
}

// handler (behavior)
import { hnHandler } from 'alap';
const engine = new AlapEngine(config, { handlers: { hn: hnHandler } });
```

Then in the expression, the user writes one of:

```
:hn:search:$rust_release:       ← $preset sigil: always a config lookup
:hn:search:rust_release:        ← bare name: handler + slot decide
```

The distinction matters:

- **`$name` is unambiguously a lookup.** The `$` sigil tells the handler: "resolve this through your config map, regardless of what this slot normally expects." Users who don't want to think about slot semantics reach for `$` and get predictable behaviour every time.
- **Bare `name` is slot-dependent.** Some positional slots take literals (a username, an item ID), some take a search-alias key, some accept either. The handler reads the arg according to the slot's documented role. That's fine — it just means `name` without the sigil makes assumptions about which slot it's in.

**Design guidance for your protocol:** document each positional slot's role explicitly — literal, lookup, or either. Accept `$name` anywhere as a forced lookup (strip the `$` before using it). Reach for `$` in your own doc examples when the slot takes free-text, because it's the form that travels best across readers.

**Why this matters:** the user earns crisp expressions; the messiness lives in config where it belongs. The `$` sigil is their escape hatch when they don't want to reason about which slot does what.

---

## Filter vs generate

Two kinds of protocol. Pick one.

### Filter

A synchronous predicate. Alap already has some links in `config.allLinks`; your handler decides whether each one matches. Used when the protocol is testing an existing link against some dimension.

```typescript
type ProtocolHandler = (segments: string[], link: AlapLink, id: string) => boolean;
```

Examples: `:time:` (is this link recent?), `:location:` (is this link near here?).

### Generate

An async function that *produces* links from an external source. Called once per expression evaluation, before filtering and refining run. The engine pre-resolves all generate tokens, so the rest of the pipeline can stay synchronous.

```typescript
type GenerateHandler = (segments: string[], config: AlapConfig) => Promise<AlapLink[]>;
```

Examples: `:web:` (fetches JSON), `:json:` (typed JSON sources), `:atproto:` (queries Bluesky), `:obsidian:` (reads a vault), `:hn:` (our worked example).

**Most new protocols are generate.** If you're fetching from anything — an API, a file system, a socket — you want `generate`.

---

## The handler contract

### Inputs

For a generate handler:

- `segments: string[]` — the arguments after the protocol name. For `:hn:top:limit=20:` your handler receives `['top', 'limit=20']`.
- `config: AlapConfig` — the full Alap config. Use it to read your protocol's own options at `config.protocols.hn`.

### Output

Return `Promise<AlapLink[]>`. Each `AlapLink`:

```typescript
interface AlapLink {
  label?: string;        // Display text (required unless image is provided)
  url: string;           // Destination URL (required)
  tags?: string[];       // Tag-based classification
  cssClass?: string;     // CSS class for styling
  description?: string;  // Longer text, shown in lens / AI surfaces
  thumbnail?: string;    // Image URL for hover / lens
  createdAt?: string | number;   // ISO 8601 or Unix ms — lets :time: filter
  meta?: Record<string, unknown>;  // Anything else — score, author, source…
}
```

Minimum: `url`. Everything else is optional but populating what you can makes downstream features work. `createdAt` lets `:time:` filter your links; `meta.location` lets `:location:` filter them.

### Rules

1. **Return an array.** Empty is fine (`[]`). Never throw — log and degrade.
2. **Cap your output.** Import `MAX_GENERATED_LINKS` (currently 200) and truncate before returning.
3. **Warn, don't throw.** Use the `warn()` logger from `src/core/logger` for operator-facing diagnostics. One bad response shouldn't crash the page.
4. **Set a source indicator.** After you build links, stamp `cssClass` with `source_{protocol}` and `meta.source` with `'{protocol}'`. This is what lets CSS distinguish your links in mixed-source menus.

---

## Worked example: `:hn:` from scratch

Hacker News is an ideal teaching case. Zero auth, CORS-friendly, small JSON shape, stable permalinks. We'll build a protocol that supports:

```
:hn:top:                              top stories
:hn:new: *limit:20*                   newest stories (limit via refiner)
:hn:best:                             best stories
:hn:ask:                              Ask HN
:hn:show:                             Show HN
:hn:job:                              job postings
:hn:user:pg:                          user's submissions
:hn:search:$ai_papers:                search via Algolia (named preset)
:hn:items:8863:121003:1:              specific items by id (zero or more)
```

<details>
<summary><strong>Step 1 — design the sub-modes</strong> — Lock the argument signatures before any code — what each sub-mode accepts.</summary>


Before writing code, fix the argument signatures. Every sub-mode has a rigid shape — segment counts and positions don't shift.

| Sub-mode | Positional args | Named args | API |
|----------|----------------|-----------|-----|
| `top` | *(none)* | `limit` | Firebase `topstories.json` |
| `new` | *(none)* | `limit` | Firebase `newstories.json` |
| `best` | *(none)* | `limit` | Firebase `beststories.json` |
| `ask` | *(none)* | `limit` | Firebase `askstories.json` |
| `show` | *(none)* | `limit` | Firebase `showstories.json` |
| `job` | *(none)* | `limit` | Firebase `jobstories.json` |
| `user` | 1 (username) | `limit` | Firebase `user/{id}.json` |
| `search` | 1 (`$preset`) | `limit` | Algolia `search` |
| `items` | N (each id its own positional, zero or more) | — | `item/{id}.json` × N |

Any free-text positional must be a `$preset`. For `:hn:`, only `search` takes free text — usernames (`pg`, `dang`) and item IDs (`8863`) are single-word and safe to pass inline. The `items` sub-mode uses the grammar's native colon separation (one id per positional segment) instead of inventing a separator character inside a single segment — cleaner, and works through both the tokenizer and the pre-resolve scanner without any special handling.
</details>
<details>
<summary><strong>Step 2 — config shape</strong> — What the user puts in their `protocols.hn` block.</summary>


```typescript
// config (data) — passed as the first arg to new AlapEngine.
// The handler moves to the second arg; see Step 13.
protocols: {
  hn: {
    cache: 10,                    // minutes; HN front page doesn't change fast
    searches: {
      ai_papers:    'artificial intelligence papers',
      rust_release: 'rust 2024 edition release',
    },
    defaults: {
      limit: 20,
    },
  },
}
```

Nothing unusual. No token (HN is public), fixed origins (Firebase + Algolia), modest cache.
</details>
<details>
<summary><strong>Step 3 — file layout</strong> — Split across `types` / `fetch` / `mapping` / `handler` — anything beyond trivial earns a directory.</summary>


Trivial protocols can live in a single file (`:atproto:` does). Anything with a few distinct concerns — types, fetch, mapping, handler — reads better split across a directory, following the `:json:` and `:obsidian:` pattern. HN gets the split because its response mappers and dispatch logic are worth isolating for testing.

```
src/protocols/hn/
├── index.ts          ← one-line public re-exports
├── types.ts          ← HnItem, HnUser, AlgoliaHit, HnProtocolConfig
├── fetch.ts          ← bounded fetchJson helper
├── mapping.ts        ← truncate, mapItem, mapAlgoliaHit (pure, testable)
└── handler.ts        ← parseSegments, sub-mode handlers, hnHandler
tests/core/tier{N}-hn-protocol.test.ts  ← tests
```

Each step below notes which file its code lands in. Nothing technically depends on this split — the whole thing could be one file — but the boundaries make testing and reading easier.
</details>
<details>
<summary><strong>Step 4 — the skeleton</strong> — Stub the files and exports so everything compiles before logic lands.</summary>


Every generate protocol starts the same way. `hn/handler.ts` holds the main entry point and the internal constants used only by dispatch:

```typescript
// src/protocols/hn/handler.ts
import type { AlapConfig, AlapLink, GenerateHandler } from '../../core/types';
import { MAX_GENERATED_LINKS } from '../../constants';
import { warn } from '../../core/logger';
import { fetchJson } from './fetch';
import { mapAlgoliaHit, mapItem } from './mapping';
import type { HnItem, HnUser, AlgoliaHit } from './types';

const FIREBASE_BASE = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';
const DEFAULT_LIMIT = 20;

export const hnHandler: GenerateHandler = async (segments, config) => {
  // 1. Parse segments → { command, positional, named }
  // 2. Dispatch to a sub-mode handler
  // 3. Stamp source indicators
  // 4. Return
  return [];
};
```

Four responsibilities, clearly separated. Now fill them in.

Paths are two levels deep (`../../core/types`) because `hn/` is a subdirectory of `src/protocols/`. Single-file protocols would use `../core/types` instead.
</details>
<details>
<summary><strong>Step 5 — segment parsing</strong> — Strip the sub-mode verb; separate positional from `key=value` args. Same pattern for every protocol.</summary>


This pattern is shared across protocols; copy it. Strip the sub-mode off the front; split the rest into positional args (no `=`) and named args (`key=value`).

```typescript
const parseSegments = (segments: string[]): {
  command: string;
  positional: string[];
  named: Record<string, string>;
} => {
  const command = segments[0];
  const positional: string[] = [];
  const named: Record<string, string> = {};

  for (const seg of segments.slice(1)) {
    if (seg.includes('=')) {
      const eq = seg.indexOf('=');
      named[seg.slice(0, eq)] = seg.slice(eq + 1);
    } else {
      positional.push(seg);
    }
  }

  return { command, positional, named };
};
```

For `:hn:user:pg:limit=5:`, the engine gives you `segments = ['user', 'pg', 'limit=5']`. After parsing: `command='user'`, `positional=['pg']`, `named={limit:'5'}`.

A second housekeeping helper in the same file centralises the limit resolution, so the sub-mode handlers don't each repeat the precedence logic. Named arg wins over config default wins over built-in default:

```typescript
// src/protocols/hn/handler.ts (continued)
const DEFAULT_LIMIT = 20;

const resolveLimit = (named: Record<string, string>, config: AlapConfig): number => {
  const fromNamed = named.limit ? parseInt(named.limit, 10) : NaN;
  if (Number.isFinite(fromNamed) && fromNamed > 0) return fromNamed;

  const defaults = config.protocols?.hn?.defaults as { limit?: number } | undefined;
  if (defaults?.limit && defaults.limit > 0) return defaults.limit;

  return DEFAULT_LIMIT;
};
```

The main dispatch calls this once and passes the resolved `number` to every sub-mode handler — simpler signatures downstream and one place to audit the precedence rules.
</details>
<details>
<summary><strong>Step 6 — the fetch helper</strong> — One bounded HTTP helper with timeout, size cap, and graceful failure. Shared by every sub-mode.</summary>


Every generate protocol needs a bounded HTTP helper. Timeouts, size caps, content-type sanity checks, graceful degradation on network errors. Copy this pattern too. It lives in its own file so the handler and any protocol-specific endpoint shims can share it:

```typescript
// src/protocols/hn/fetch.ts
import { MAX_WEB_RESPONSE_BYTES, WEB_FETCH_TIMEOUT_MS } from '../../constants';
import { warn } from '../../core/logger';

export const fetchJson = async (url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEB_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      warn(`:hn: HTTP ${response.status} for ${url}`);
      return null;
    }

    const contentType = response.headers?.get?.('content-type');
    if (contentType && !contentType.includes('application/json')) {
      warn(`:hn: unexpected content-type: ${contentType}`);
      return null;
    }

    const contentLength = response.headers?.get?.('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_WEB_RESPONSE_BYTES) {
      warn(`:hn: response too large: ${contentLength} bytes`);
      return null;
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    const label = err instanceof DOMException && err.name === 'AbortError'
      ? `timeout after ${WEB_FETCH_TIMEOUT_MS}ms`
      : msg;
    warn(`:hn: network error: ${label}`);
    return null;
  }
};
```

`credentials: 'omit'` is load-bearing — you're fetching from a third-party origin and have no business sending the user's cookies. The 10 s timeout and 1 MB cap come from constants shared across all generate protocols.
</details>
<details>
<summary><strong>Step 7 — map an item to an AlapLink</strong> — Turn an HN item into an `AlapLink` — filter dead/deleted, strip body HTML, pick the right URL.</summary>


HN items come in several types (`story`, `comment`, `job`, `poll`, `pollopt`, `ask`). We only build links for the ones that have a user-facing destination. Response types go in `types.ts`; the mappers go in `mapping.ts` — they're pure functions, worth isolating so tests can run them with fixture data and no fetch mocks.

```typescript
// src/protocols/hn/types.ts
export interface HnItem {
  id: number;
  type?: 'story' | 'comment' | 'job' | 'poll' | 'pollopt' | 'ask';
  by?: string;
  time?: number;           // Unix seconds
  title?: string;
  text?: string;           // HTML for Ask HN / Show HN / job posts
  url?: string;            // External URL for link-type stories
  score?: number;
  descendants?: number;    // Comment count
  kids?: number[];
  dead?: boolean;
  deleted?: boolean;
}

export interface HnUser {
  id: string;
  submitted?: number[];
  karma?: number;
  created?: number;
  about?: string;
}

export interface AlgoliaHit {
  objectID: string;
  title?: string;
  url?: string;
  story_text?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at_i?: number;   // Unix seconds
  _tags?: string[];
}

/** Optional config-shape type, exported so consumers can type their config. */
export interface HnProtocolConfig {
  searches?: Record<string, string>;
  defaults?: { limit?: number };
}
```

And the mappers:

```typescript
// src/protocols/hn/mapping.ts
import type { AlapLink } from '../../core/types';
import { stripHtml } from '../shared';
import type { AlgoliaHit, HnItem } from './types';

const HN_WEB = 'https://news.ycombinator.com';
const LABEL_MAX_LENGTH = 80;
const HTTP_URL_RE = /^https?:\/\//;

export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max - 1) + '\u2026';

export const hnItemUrl = (id: number | string): string =>
  `${HN_WEB}/item?id=${id}`;

export const mapItem = (item: HnItem | null | undefined): AlapLink | null => {
  if (!item || typeof item.id !== 'number') return null;
  if (item.dead || item.deleted) return null;
  if (item.type === 'comment' || item.type === 'pollopt') return null;
  // Skip items without a title — nothing meaningful to display in a menu.
  // Catches edge cases: partial records, unknown types, API glitches.
  if (!item.title || typeof item.title !== 'string') return null;

  const title = item.title;
  const discussionUrl = hnItemUrl(item.id);
  // External links get the external URL; self-posts get the HN permalink.
  const url = item.url && HTTP_URL_RE.test(item.url) ? item.url : discussionUrl;

  const link: AlapLink = {
    label: truncate(title, LABEL_MAX_LENGTH),
    url,
    tags: ['hn', item.type ?? 'story'],
    meta: {
      id: item.id,
      author: item.by,
      score: item.score,
      comments: item.descendants,
      hnUrl: discussionUrl,      // Always preserve the HN discussion URL
    },
  };

  if (item.text) link.description = stripHtml(item.text);
  if (typeof item.time === 'number') link.createdAt = item.time * 1000;

  return link;
};
```

Five things worth calling out:

1. **Two URLs per item.** Stories have an external link *and* an HN discussion page. We set `url` to the external link (what most users want) and keep `meta.hnUrl` for the comments page. A renderer could expose both via the lens "option of choice" pattern. `hnItemUrl` is factored out because the Algolia mapper below wants it too.
2. **`createdAt` in ms.** HN returns Unix seconds; Alap's `:time:` protocol expects ms (or ISO 8601). Multiply. This is the difference between "composes with `:time:`" and "silently ignored by `:time:`."
3. **Filter dead/deleted.** Moderated-out stories still appear in the feed with `dead: true`; genuinely removed ones come through with `deleted: true`. Neither has a user-facing destination, so we skip.
4. **Filter untitled items.** Return `null` for anything without a string `title`. Partial records, unknown types, and API glitches all surface as items with no title; rendering them as "(untitled)" is noise. Skip them so the menu only contains real entries.
5. **Shared `stripHtml`.** The `src/protocols/shared` module exports a well-tested `stripHtml` that handles more entities than an inline regex (`&apos;`, `&nbsp;`, numeric entities). Reuse it — don't ship your own.
</details>
<details>
<summary><strong>Step 8 — the listing sub-modes</strong> — `top` / `new` / `best` / `ask` / `show` / `job` — fetch IDs, hydrate the first N in parallel.</summary>


`top`, `new`, `best`, `ask`, `show`, `job` all have the same shape: fetch a list of item IDs, then fetch each item in parallel. The sub-mode handlers take a pre-computed `limit` (from `resolveLimit` above) rather than reparsing named args themselves:

```typescript
// src/protocols/hn/handler.ts (continued)
const fetchItems = async (ids: number[], limit: number): Promise<AlapLink[]> => {
  // Firebase is typed as number[] but at runtime could return garbage.
  // Filter to real numbers so we never fire a fetch for a non-numeric id.
  const numeric = ids.filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  const cap = Math.min(limit, MAX_GENERATED_LINKS);
  const capped = numeric.slice(0, cap);
  const items = await Promise.all(
    capped.map((id) => fetchJson(`${FIREBASE_BASE}/item/${id}.json`) as Promise<HnItem | null>)
  );
  return items.map(mapItem).filter((link): link is AlapLink => link !== null);
};

const LISTING_ENDPOINTS: Record<string, string> = {
  top:  'topstories',
  new:  'newstories',
  best: 'beststories',
  ask:  'askstories',
  show: 'showstories',
  job:  'jobstories',
};

const handleListing = async (
  command: string,
  limit: number,
): Promise<AlapLink[]> => {
  const endpoint = LISTING_ENDPOINTS[command];
  if (!endpoint) return [];

  const ids = await fetchJson(`${FIREBASE_BASE}/${endpoint}.json`) as number[] | null;
  if (!Array.isArray(ids)) return [];

  return fetchItems(ids, limit);
};
```

N+1 fetches are fine here — the fan-out is bounded by `limit` (and by `MAX_GENERATED_LINKS`), and both Firebase and Algolia are CDN-cached. The numeric filter in `fetchItems` is a small security defense: even though the response is typed, a malformed or unexpected response could include non-numbers, and skipping them is safer than firing garbage fetches.
</details>
<details>
<summary><strong>Step 9 — user submissions</strong> — `GET /user/{id}`, then fan out across `user.submitted[]`.</summary>


One more fetch to turn a username into an ID list. `HnUser` is already in `types.ts` (shown in Step 7); this code goes back in `handler.ts`:

```typescript
// src/protocols/hn/handler.ts (continued)
const handleUser = async (
  positional: string[],
  limit: number,
): Promise<AlapLink[]> => {
  const username = positional[0];
  if (!username) {
    warn(':hn: user command requires a username — :hn:user:pg:');
    return [];
  }

  const user = await fetchJson(`${FIREBASE_BASE}/user/${encodeURIComponent(username)}.json`) as HnUser | null;
  if (!user || !Array.isArray(user.submitted)) return [];

  return fetchItems(user.submitted, limit);
};
```

`encodeURIComponent` on any argument you concatenate into a URL. Always.
</details>
<details>
<summary><strong>Step 10 — search via Algolia</strong> — POST to Algolia with `tags=story`; `$preset` resolves multi-word queries from config.</summary>


Here's where `$preset` matters. Multi-word queries (`artificial intelligence papers`) can't live in the expression; they live in `config.protocols.hn.searches` and the expression references them by name. `AlgoliaHit` is already in `types.ts`; `mapAlgoliaHit` goes in `mapping.ts` alongside `mapItem`:

```typescript
// src/protocols/hn/mapping.ts (continued)
export const mapAlgoliaHit = (hit: AlgoliaHit | null | undefined): AlapLink | null => {
  if (!hit || !hit.objectID) return null;
  // objectID is user-facing URL material. HN's Algolia always returns
  // numeric item IDs as strings; reject anything else so a malformed
  // or unexpected response can't inject characters into the URL template.
  if (!/^\d+$/.test(hit.objectID)) return null;
  // Skip hits without a title — same rule as mapItem.
  if (!hit.title || typeof hit.title !== 'string') return null;
  const id = hit.objectID;
  const discussionUrl = hnItemUrl(id);
  const url = hit.url && HTTP_URL_RE.test(hit.url) ? hit.url : discussionUrl;

  const link: AlapLink = {
    label: truncate(hit.title ?? '(untitled)', LABEL_MAX_LENGTH),
    url,
    tags: ['hn', 'search'],
    meta: {
      id,
      author: hit.author,
      score: hit.points,
      comments: hit.num_comments,
      hnUrl: discussionUrl,
    },
  };

  if (hit.story_text) link.description = stripHtml(hit.story_text);
  if (typeof hit.created_at_i === 'number') link.createdAt = hit.created_at_i * 1000;

  return link;
};
```

And the dispatch piece in `handler.ts`. The sigil-stripping lives inside `resolveSearchAlias` — one helper, one responsibility:

```typescript
// src/protocols/hn/handler.ts (continued)
const resolveSearchAlias = (raw: string, config: AlapConfig): string => {
  // Accept both `$name` (preferred) and bare `name`. Strip the sigil
  // and look up the key. If it's not in the map, return it as a
  // literal search term so single-word queries still work.
  const key = raw.startsWith('$') ? raw.slice(1) : raw;
  const searches = config.protocols?.hn?.searches as Record<string, string> | undefined;
  if (searches && key in searches) return searches[key];
  return key;
};

const handleSearch = async (
  positional: string[],
  limit: number,
  config: AlapConfig,
): Promise<AlapLink[]> => {
  const raw = positional[0];
  if (!raw) {
    warn(':hn: search requires a query preset — :hn:search:$ai_papers:');
    return [];
  }

  const query = resolveSearchAlias(raw, config);
  const hitsPerPage = Math.min(limit, MAX_GENERATED_LINKS);

  const url = new URL(`${ALGOLIA_BASE}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('hitsPerPage', String(hitsPerPage));

  const data = await fetchJson(url.toString()) as { hits?: AlgoliaHit[] } | null;
  if (!data || !Array.isArray(data.hits)) return [];

  return data.hits.map(mapAlgoliaHit).filter((l): l is AlapLink => l !== null);
};
```

Two things:

1. **Sigil stripping lives in `resolveSearchAlias`.** It accepts both `$ai_papers` (preferred) and `ai_papers` (bare name, also works). Protocol handlers are consistently lenient here — the preference lives in docs, not in the parser.
2. **`URL` + `searchParams`.** Never template a query string by hand. `URL` handles encoding for you and rejects malformed inputs.
</details>
<details>
<summary><strong>Step 11 — specific items (zero or more)</strong> — Explicit ids via `:hn:items:8863:121003:` — each id is its own positional segment.</summary>


Fetch an explicit list of items by id. Each id is its own positional segment — the grammar's native separator:

```
:hn:items:                 → no-op ([])
:hn:items:8863:            → one item
:hn:items:8863:8845:828:   → three items
```

Every generate protocol has a `positional: string[]` after `parseSegments`. Here we treat each element as an id — no inner separator needed, and no divergence between the tokenizer and the pre-resolve scanner:

```typescript
// src/protocols/hn/handler.ts (continued)
// Each id is a separate round-trip — HN's API has no batch endpoint.
// Cap the list to keep per-render fan-out bounded.
const HN_ITEMS_MAX = 6;

const handleItems = async (positional: string[]): Promise<AlapLink[]> => {
  if (positional.length === 0) return [];  // :hn:items: — explicit no-op

  const ids = positional
    .filter((s) => /^\d+$/.test(s))
    .map((s) => parseInt(s, 10));

  if (ids.length === 0) {
    warn(`:hn:items: requires numeric ids as positional args — got non-numeric [${positional.join(', ')}]`);
    return [];
  }

  if (ids.length > HN_ITEMS_MAX) {
    warn(`:hn:items: received ${ids.length} ids; capping at ${HN_ITEMS_MAX} to avoid rate-limit pressure.`);
  }
  const capped = ids.slice(0, HN_ITEMS_MAX);

  return fetchItems(capped, capped.length);
};
```

Three things to note:

1. **Use the grammar's native separator.** Ids are positional segments (colon-separated at the grammar level), not a comma-joined string inside one segment. This keeps the protocol consistent with how the rest of the grammar works — and avoids the subtle mismatch where the main tokenizer handles in-segment commas but the pre-resolve scanner doesn't.
2. **Empty input is a no-op.** `:hn:items:` returns `[]` without a warning so it can serve as an empty placeholder (e.g., a macro that conditionally expands to something that yields no ids).
3. **Per-sub-mode fan-out cap.** `HN_ITEMS_MAX = 6` is tight because each id is a separate fetch — no batch endpoint. This is **in addition to** the global `MAX_GENERATED_LINKS` cap; some sub-modes warrant stricter limits than the default. Any protocol that translates one segment into N network calls should think about this explicitly.
</details>
<details>
<summary><strong>Step 12 — dispatch</strong> — The command table that ties all the sub-modes together.</summary>


Tie it together.

```typescript
// src/protocols/hn/handler.ts (continued)
export const hnHandler: GenerateHandler = async (segments, config) => {
  const { command, positional, named } = parseSegments(segments);
  const limit = resolveLimit(named, config);

  let links: AlapLink[] = [];
  if (command in LISTING_ENDPOINTS) {
    links = await handleListing(command, limit);
  } else if (command === 'user') {
    links = await handleUser(positional, limit);
  } else if (command === 'search') {
    links = await handleSearch(positional, limit, config);
  } else if (command === 'items') {
    links = await handleItems(positional);
  } else {
    warn(`:hn: unknown command "${command}". Available: top, new, best, ask, show, job, user, search, items`);
    return [];
  }

  // Source indicator — appended, not replaced, so any existing cssClass survives.
  for (const link of links) {
    link.cssClass = link.cssClass ? `${link.cssClass} source_hn` : 'source_hn';
    if (!link.meta) link.meta = {};
    link.meta.source = 'hn';
  }

  // Belt-and-suspenders final cap. fetchItems already caps its fan-out,
  // but this guards any future sub-mode that forgets to.
  return links.slice(0, MAX_GENERATED_LINKS);
};
```

Three idioms worth calling out:

1. **Limit resolved once, passed down.** `resolveLimit` runs at the top; every sub-handler takes a pre-computed `number`. One place to audit precedence, no duplicated `parseInt` calls.
2. **Source indicator is appended, not replaced.** `link.cssClass ? \`${link.cssClass} source_hn\` : 'source_hn'` — never clobber an existing class.
3. **Final `MAX_GENERATED_LINKS` cap on the return.** Defense in depth; catches any future sub-mode that skips the `fetchItems` path.
</details>
<details>
<summary><strong>Step 13 — register</strong> — Re-export, wire into config, stamp source indicators on every link.</summary>


First, re-export from the protocol's own `index.ts` — the public surface for the directory:

```typescript
// src/protocols/hn/index.ts
export { hnHandler } from './handler';
export type { HnProtocolConfig } from './types';
```

Then wire it into the top-level protocols barrel:

```typescript
// src/protocols/index.ts
export { hnHandler } from './hn';
export type { HnProtocolConfig } from './hn';
```

Users wire it at engine construction — config stays data only (so it
freezes cleanly, round-trips through storage, and has a stable trust
boundary); the handler is passed separately:

```typescript
import { AlapEngine, hnHandler } from 'alap';

const config: AlapConfig = {
  allLinks: { /* ... */ },
  protocols: {
    hn: {
      // Data only: no `generate` here. The handler lives on the second
      // argument to new AlapEngine, which keeps config serializable and
      // lets validateConfig deep-freeze the whole object.
      cache: 10,
      searches: {
        ai_papers:    'artificial intelligence papers',
        rust_release: 'rust 2024 edition release',
      },
    },
  },
};

const engine = new AlapEngine(config, { handlers: { hn: hnHandler } });
```

And start writing expressions:

```
:hn:top: *limit:10*
.tech + :hn:user:pg:
(:hn:search:$ai_papers: *limit:5*) | @favorites
:hn:new: + :time:6h:                     ← stories in the last 6 hours
```

---
</details>
<details>
<summary><strong>Testing</strong> — Mock `fetch`, call the handler, assert on the shape. The pattern every protocol shares.</summary>


Every protocol gets its own tier test file. The pattern is the same across all of them: mock `fetch`, construct a minimal config, call the handler, assert on the returned shape.

```typescript
// tests/core/tier{N}-hn-protocol.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { hnHandler } from '../../src/protocols/hn';
import type { AlapConfig } from '../../src/core/types';

// The tests call `hnHandler` directly (no engine), so the config
// needs only the data half — no `generate` field.
const mockConfig = (overrides?: Record<string, unknown>): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: {
    hn: { cache: 10, ...overrides },
  },
  allLinks: {},
});

const mockFetch = (data: unknown, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(data),
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe(':hn: top stories', () => {
  it('fetches top IDs then hydrates each item', async () => {
    const topIds = [1001, 1002, 1003];
    const items = new Map([
      [1001, { id: 1001, type: 'story', title: 'First',  url: 'https://ex/1', time: 1700000000, by: 'a', score: 42, descendants: 5 }],
      [1002, { id: 1002, type: 'story', title: 'Second', url: 'https://ex/2', time: 1700000100, by: 'b', score: 17, descendants: 2 }],
      [1003, { id: 1003, type: 'story', title: 'Third',  url: 'https://ex/3', time: 1700000200, by: 'c', score:  9, descendants: 0 }],
    ]);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('topstories.json')) return Promise.resolve({
        ok: true, headers: { get: () => 'application/json' },
        json: () => Promise.resolve(topIds),
      });
      const match = url.match(/item\/(\d+)\.json/);
      if (match) return Promise.resolve({
        ok: true, headers: { get: () => 'application/json' },
        json: () => Promise.resolve(items.get(parseInt(match[1], 10))),
      });
      return Promise.reject(new Error(`unexpected URL ${url}`));
    });

    const links = await hnHandler(['top'], mockConfig());
    expect(links).toHaveLength(3);
    expect(links[0].label).toBe('First');
    expect(links[0].url).toBe('https://ex/1');
    expect(links[0].meta?.source).toBe('hn');
    expect(links[0].cssClass).toContain('source_hn');
  });
});

describe(':hn: search', () => {
  it('resolves $preset through the searches map', async () => {
    global.fetch = mockFetch({ hits: [
      { objectID: '42', title: 'A paper', url: 'https://ex/paper', author: 'x', points: 10, created_at_i: 1700000000 },
    ]});

    const links = await hnHandler(
      ['search', '$ai_papers'],
      mockConfig({ searches: { ai_papers: 'artificial intelligence papers' } }),
    );
    expect(links).toHaveLength(1);
    expect((global.fetch as any).mock.calls[0][0]).toContain('query=artificial+intelligence+papers');
  });

  it('warns when query is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const links = await hnHandler(['search'], mockConfig());
    expect(links).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe(':hn: graceful degradation', () => {
  it('returns [] on HTTP error, does not throw', async () => {
    global.fetch = mockFetch(null, false, 500);
    const links = await hnHandler(['top'], mockConfig());
    expect(links).toEqual([]);
  });

  it('returns [] on malformed response', async () => {
    global.fetch = mockFetch('not an array');
    const links = await hnHandler(['top'], mockConfig());
    expect(links).toEqual([]);
  });
});
```

Always test:

- **Happy path** per sub-mode.
- **Empty / missing args** (warn + return `[]`).
- **HTTP error** (warn + return `[]`, *never* throw).
- **Malformed response** (warn + return `[]`).
- **Source indicator present** on every link.
- **Named arg passthrough** (`limit=5` actually limits).
- **`$preset` resolution** (both `$name` and bare `name` forms).

---
</details>

## Security baseline

Even for a zero-auth public API, you have a security surface. Run through this checklist:

1. **Bounded output.** Cap returned links at `MAX_GENERATED_LINKS`. A misbehaving or untrusted endpoint shouldn't be able to flood the menu.
2. **Bounded fetches.** Timeout (`WEB_FETCH_TIMEOUT_MS`) and size cap (`MAX_WEB_RESPONSE_BYTES`) every request. Shared constants exist for a reason.
3. **`credentials: 'omit'`** on every `fetch` to a third-party origin. Never send the user's cookies to `hn.algolia.com`.
4. **URL safety.** Use `URL` + `searchParams` for query strings. `encodeURIComponent` anything you concatenate into a path. Never template user input into a raw URL.
5. **Content-type sanity.** Reject responses that aren't `application/json` (or whatever your protocol expects). An HTML error page masquerading as JSON will blow up your parser.
6. **Validate IDs.** `/^\d+$/` for numeric IDs, `/^[a-z0-9_-]+$/i` for usernames, etc. Only as strict as the target API.
7. **Graceful degradation, never throw.** Log via `warn()` and return `[]`. The engine is synchronous downstream; an exception from your handler can cascade.
8. **Strip incoming HTML.** If your source embeds user-generated content in fields you map to `label` or `description`, strip tags before surfacing. The rendered label is never trusted HTML.

### Protocols that need more

The above is the floor. If your protocol does any of the following, you need additional defenses — see [Security](../api-reference/security.md) and the [Threat model](../security/threat-model.md):

- **Accepts user-supplied URLs** → SSRF guard (block private IPs, cloud metadata).
- **Reads the filesystem** → path safety (canonicalize, confine to a root, reject symlink escapes).
- **Requires authentication tokens** → server-side only, env-var default, redact in logs, graceful on auth rejection.
- **Talks to localhost** → localhost guard (strict `127.x` / `::1`).
- **Evaluates user-supplied regex** → `validateRegex` before `new RegExp()`.

---

## Universal vs Node-only

Hacker News ships as a **universal** protocol: both Firebase and Algolia serve CORS headers, so the browser can call them directly. Same for `:atproto:` (Bluesky public API) and `:web:` when the endpoints permit it.

A protocol needs to be **Node-only** when:

- **It holds a bearer secret.** Tokens must never ship in browser bundles. `:obsidian:rest:`.
- **It reads the filesystem.** Browsers can't. `:obsidian:core:`.
- **It needs self-signed TLS handling.** Only Node's `https` agent can relax cert checks safely on loopback.
- **Its transitive deps pull in sizeable Node-only libraries.**

For Node-only protocols, put them in a subdirectory (`src/protocols/myprotocol/`) and export via the subpath export pattern:

```json
// package.json exports
"./protocols/myprotocol": {
  "import": "./dist/protocols/myprotocol/index.js",
  "types": "./dist/protocols/myprotocol/index.d.ts"
}
```

Users import explicitly (`import { myHandler } from 'alap/protocols/myprotocol'`). This keeps your Node-only code out of the default `alap` bundle.

---

## When to split into sub-modes

If your data source has two materially different access paths, split the protocol rather than the sub-mode dispatch. Examples:

- `:obsidian:core:` (reads the filesystem, Node-only) vs `:obsidian:rest:` (HTTP to the Local REST API plugin). Different transports, different security postures, different capabilities.

Split when:

- **The auth model differs** (anonymous vs token).
- **The transport differs** (filesystem vs HTTP).
- **The capability set differs** enough that documenting them as one protocol creates confusion.

Don't split when it's just different queries over the same endpoint — those are sub-modes, not sub-protocols.

---

## Documenting your protocol

If the protocol is going into the Alap repo, update:

1. **[protocols.md](protocols.md)** — add a section describing the protocol, its sub-modes, and expression examples. Keep it to shipped behaviour only; planned sub-modes live in design docs.
2. **`README.md`** — a one-line mention under "Built-in protocols" if the list is maintained.
3. **A worked example** under `examples/sites/` showing a real config + rendered menu.
4. **Type exports** in `src/core/types.ts` if your protocol has a custom config shape worth naming.

If the protocol is third-party (someone else's repo), document the config shape, the sub-modes, and the expression examples in that project's README. The contract is your public surface.

---

## Cross-language parity

Alap has ports in Ruby, Python, PHP, Java, Rust, and Go (see `src/other-languages/`). They implement the same grammar with the same built-in protocols, so expressions are portable across server stacks. The wiring patterns for each port — handler registration, request/response shape, server framework integration — are documented in [api-reference/servers.md](../api-reference/servers.md).

If you're writing a protocol in the TypeScript core, you don't have to port it. Most custom protocols stay TS-only. Port only when:

- **Multi-language users need server-side resolution.** A SSG built with Hugo (Go) or Jekyll (Ruby) needs the protocol to run wherever its resolver runs.
- **The protocol is foundational.** `:time:` and `:location:` are ported because every port needs them. Niche protocols like `:hn:` probably don't warrant six implementations.

When in doubt: ship TS first, port on demand.

---

## Cheat sheet

A rough order of operations when starting a new protocol:

1. **Decide it's a protocol.** Not `allLinks`, not a macro, not `:web:`, not `:json:`, not an ingest pipeline.
2. **Fix the expression shape.** List every sub-mode with its positional and named args.
3. **Design the config.** Token? Searches map? Defaults? Cache TTL?
4. **Stub the handler skeleton** (four responsibilities: parse, dispatch, map, stamp).
5. **Implement segment parsing.** Copy the `parseSegments` helper.
6. **Implement the fetch helper.** Copy the bounded `fetchJson` pattern. Add auth headers if needed.
7. **Implement one sub-mode.** Wire it through, verify it returns `AlapLink[]`.
8. **Map response → AlapLink.** `label`, `url`, `createdAt` (in ms!), `meta`, `tags`.
9. **Stamp source indicators.** `cssClass: source_{protocol}`, `meta.source: '{protocol}'`.
10. **Add the remaining sub-modes.** One at a time.
11. **Write tests.** Happy path + empty args + HTTP error + malformed response + source indicator.
12. **Register.** Export from `src/protocols/index.ts`.
13. **Document.** Update [protocols.md](protocols.md), add a worked example.
14. **Security pass.** Run the checklist above.
15. **Decide on universal vs Node-only.** Subpath-export if needed.

If you can do all of that, you have a protocol that composes cleanly with everything else Alap already does — tags, refiners, macros, `:time:`, `:location:`, lens rendering, cross-framework adapters. The grammar didn't grow; the engine didn't change. A new data source is a new file, not a new feature.

## Next steps

- [Expressions](expressions.md) — the full query language
- [Protocols](protocols.md) — built-in protocol reference
- [Refiners](refiners.md) — how `*sort*`, `*limit*`, `*shuffle*` compose with your protocol
- [Types](../api-reference/types.md) — `AlapProtocol`, `GenerateHandler`, `ProtocolHandler`
- [Security](../api-reference/security.md) — the full security model for external fetches
- [Design: Protocol Boundaries](../../../docs/design-protocol-boundaries.md) — why the grammar is closed and what that means for protocol design
