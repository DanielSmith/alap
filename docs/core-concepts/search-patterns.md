# Search Patterns

**[Core Concepts](README.md):** [Expressions](expressions.md) · [Macros](macros.md) · **This Page** · [Protocols](protocols.md) · [Refiners](refiners.md) · [Styling](styling.md) | [All docs](../README.md)

Tags work when you know what you're looking for — you tagged things deliberately, and you query those tags by name. But sometimes you want to ask a different kind of question: "what in my library matches this pattern?"

That's regex search. It sits alongside tags, item IDs, and macros as a first-class part of the expression language.

> Live version with interactive examples: https://alap.info/core-concepts/search-patterns

## How it works

Define named search patterns in your config:

```json
{
  "searchPatterns": {
    "bridges": "bridge",
    "recent_coffee": {
      "pattern": "coffee|cafe",
      "options": { "fields": "lt", "age": "30d", "sort": "newest", "limit": 10 }
    }
  }
}
```

Then reference them in expressions with slashes:

```html
<alap-link query="/bridges/">find bridges</alap-link>
<alap-link query="/recent_coffee/">new cafes</alap-link>
```

Note: `/bridges/` is a **lookup key**, not an inline regex. It references the `"bridges"` entry in `searchPatterns`, which holds the actual pattern and options. This is the same idea as `@macro` — a name that points to a definition in the config. The expression stays clean and readable; the regex complexity lives in the config where it belongs, not in the middle of an HTML attribute.

The engine runs the pattern against your link library and returns whatever matches. No tags required. No manual curation. The pattern does the work.

> **Try it**
> Live search patterns from this site's config:
> <alap-link query="/bridges/">find bridges</alap-link> ·
> <alap-link query="/coffee_shops/">find coffee shops</alap-link> ·
> <alap-link query="/parks/">find parks</alap-link>

## Searching specific fields

By default, a pattern searches everything — labels, URLs, tags, descriptions, IDs. Narrow it with field codes:

| Code | Searches |
|------|----------|
| `l` | Label |
| `u` | URL |
| `t` | Tags |
| `d` | Description |
| `k` | ID (key) |
| `a` | All fields (default) |

Combine them: `lt` searches labels and tags. `ud` searches URLs and descriptions.

Set this in the config (`"fields": "lt"`) or inline in the expression (`/bridges/lt`).

## Filtering and sorting

Search patterns support options that tags don't need:

**`age`** — Only return items created within a time window. `"30d"` means the last 30 days. `"24h"` means the last 24 hours. Useful for "what's new" menus.

**`sort`** — Order results by `alpha`, `newest`, or `oldest`. Tags return items in config order; search results can be sorted by relevance to time or alphabet.

**`limit`** — Cap the results. `"limit": 5` means "the five best matches." Useful when a broad pattern could return dozens of hits.

## It composes with everything

Regex search returns a set of links, just like `.tag` does. That means it works with operators:

```
/bridges/ + .nyc          → bridges in NYC
/coffee/ | .tea           → pattern matches plus everything tagged tea
/bridges/ - .toll         → bridges, excluding toll bridges
(@favorites) | /recent/   → your curated list plus whatever's new
```

Group with parentheses, combine with macros, subtract tags. The parser doesn't care where the set came from — it applies the operators the same way.

## A spectrum of precision

**Item IDs are the most deliberate.** You're pointing at a specific entry by name — `golden`, `devocion`. No ambiguity, no matching.

**Tags are deliberate too**, but broader. Someone decided this item is about coffee and labeled it so. A `.coffee` query returns a curated set.

**Search is discovery.** The pattern scans across fields you might not have thought to tag. An item whose *description* mentions "bridge" shows up in a bridge search even if nobody tagged it that way.

IDs for precision, tags for structure, search for serendipity. And because all three return the same thing — a set of link IDs — they mix freely in the same expression.

## Next steps

- [Expressions](expressions.md) — the full query language
- [Configuration](../getting-started/configuration.md) — `searchPatterns` in the config object
- [Security](../api-reference/security.md) — regex validation and ReDoS protection
