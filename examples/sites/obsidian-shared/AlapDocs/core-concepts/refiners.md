---
source: core-concepts/refiners.md
modified: '2026-04-18T02:40:42Z'
tags:
- core_concepts
title: Refiners
description: '**Core Concepts:** Expressions · Macros · Search Patterns · Protocols
  · **This Page** · Styling'
---
# Refiners

**[[core-concepts/README|Core Concepts]]:** [[core-concepts/expressions|Expressions]] · [[core-concepts/macros|Macros]] · [[core-concepts/search-patterns|Search Patterns]] · [[core-concepts/protocols|Protocols]] · **This Page** · [[core-concepts/styling|Styling]]

Everything else in the expression language — tags, operators, protocols — decides *what you're looking for*. Refiners decide *which ones you keep, and in what order*.

The distinction is row-level vs set-level. Tags and protocols ask "does this individual link qualify?" Refiners ask "given the qualified set, which ones do I keep and how do I arrange them?"

That's a different phase of the query, and it gets its own sigil: `*`.

> Live version with interactive examples: https://alap.info/core-concepts/refiners

## The syntax

A refiner is wrapped in asterisks. Arguments use `:` inside:

```
*sort*                  Sort by label (default)
*sort:label*            Sort by label (explicit)
*sort:url*              Sort by URL
*reverse*               Reverse current order
*limit:N*               Take first N results
*skip:N*                Skip first N results
*shuffle*               Randomize order
*unique:url*            Deduplicate by field
```

Refiners appear after the expression they act on:

```
.coffee *sort:label*
.coffee *shuffle* *limit:3*
.restaurant + .nyc *sort:label* *reverse* *limit:5*
```

They chain left to right. `*sort:label* *reverse* *limit:5*` means: sort alphabetically, then reverse (Z-A), then take the first 5.

## Inline refiners

Refiners can work inside parenthesized groups, not just at the end.

```
(.nyc *sort:label* *limit:3*) | (.sf *sort:label* *limit:3*)
```

This means: top 3 NYC items (alphabetically) combined with top 3 SF items.

Without inline refiners:

```
.nyc | .sf *sort:label* *limit:3*
```

That sorts and limits the *combined* set — so if NYC has more links, SF might disappear entirely. Inline refiners let each group shape its own contribution before the union merges them.

This is where refiners earn their syntax. "3 from each city" can't be expressed any other way.

## Why not just settings?

Alap has `settings.maxVisibleItems` for capping results. Why add `*limit:N*` to the expression?

Because settings apply globally. Refiners apply per-expression — or even per-group within an expression.

A settings-based limit says "never show more than 10 items." A refiner says "show 3 from *this* set." That's a different kind of control, and it lives where the intent is expressed: in the query itself.

## Pagination

`*skip*` and `*limit*` together handle pagination:

```
.coffee *sort:label* *limit:10*              → page 1
.coffee *sort:label* *skip:10* *limit:10*    → page 2
.coffee *sort:label* *skip:20* *limit:10*    → page 3
```

The engine returns a `ResolveResult` with `totalMatches` — the count *before* refiners — so the UI can show "showing 10 of 42."

## Discovery with shuffle

`*shuffle*` randomizes the result order. Paired with `*limit*`, it produces a different menu every time:

```
.restaurant *shuffle* *limit:5*
```

Five random restaurants. Refresh the page, get five different ones. Good for discovery menus, "surprise me" links, or any context where variety matters more than order.

## Deduplication

When a union pulls from overlapping sets, duplicates can appear. `*unique:field*` keeps the first occurrence per field value:

```
(.coffee | .bakery) + .nyc *unique:url* *sort:label*
```

If the same shop is tagged both `coffee` and `bakery`, it appears once. The field argument — `url`, `label`, `id` — controls what counts as a duplicate.

## Macros absorb the complexity

Refiner chains can get long in an HTML attribute. Macros compress them:

```json
{
  "macros": {
    "top5": { "linkItems": "*sort:label* *limit:5*" },
    "random3": { "linkItems": "*shuffle* *limit:3*" }
  }
}
```

```html
<alap-link query=".coffee @top5">cafes</alap-link>
<alap-link query=".restaurant @random3">eat somewhere</alap-link>
```

The macro expands before parsing, so this works for free. Writers see `@top5`. The engine sees `*sort:label* *limit:5*`.

## The three phases

After protocols and refiners, the expression language has a clean three-phase model:

| Phase | Sigil | Level | Question |
|-------|-------|-------|----------|
| Selection | `.tag`, `+`, `\|`, `-` | Row | "What category?" |
| Gathering | `:protocol:args:` | Row | "What dimensions?" |
| Refining | `*refiner:args*` | Set | "What shape?" |

A complete expression can use all three:

```
.coffee + :location:radius:40.7,-74.0:5mi: + :time:7d: *sort:label* *limit:5*
```

"Coffee shops within 5 miles of NYC, added this week, sorted alphabetically, top 5."

Each phase is optional. Most real-world expressions use only selection — `.coffee`, `@favorites`. Gathering and refining are there when you need them, composing cleanly with everything else.

## Next steps

- [[core-concepts/expressions|Expressions]] — the full query language
- [[core-concepts/protocols|Protocols]] — the gathering phase
- [[core-concepts/macros|Macros]] — compress refiner chains into named shortcuts
