# Expressions

**[Core Concepts](README.md):** **This Page** · [Expression Spec](../api-reference/spec.md) · [Macros](macros.md) · [Search Patterns](search-patterns.md) · [Protocols](protocols.md) · [Refiners](refiners.md) · [Styling](styling.md)

Every Alap link has a query — a short expression that says which menu items to show. Expressions go in the `query` attribute of an `<alap-link>` (or `data-alap-linkitems` for vanilla mode).

> Live version with interactive examples: https://alap.info/core-concepts/expressions

## Syntax at a glance

| Syntax | Meaning | Example |
|--------|---------|---------|
| `item_id` | Direct item reference | `golden_gate` |
| `.tag` | All items with that tag | `.coffee` |
| `@macro` | Expand a named macro | `@favorites` |
| `@` | Expand macro matching the anchor's DOM ID | `@` |
| `,` | Separator (concatenate results) | `golden_gate, brooklyn` |
| `+` | AND (intersection) | `.nyc + .bridge` |
| `\|` | OR (union) | `.nyc \| .sf` |
| `-` | WITHOUT (subtraction) | `.nyc - .tourist` |
| `(...)` | Grouping | `(.nyc + .bridge) \| .sf` |
| `/key/` | Search pattern lookup | `/bridges/` |
| `/key/opts` | Search with field overrides | `/bridges/lt` |
| `:protocol:args:` | Protocol query | `:time:30d:` |
| `*refiner:args*` | Result refiner | `*sort:label*`, `*limit:5*` |

## Tags are the key idea

Every link in your library can have **tags** — simple labels like `coffee`, `sf`, `nyc`, `bridge`. One link can have many tags. Many links can share the same tag.

If you've used CSS classes, you already understand this. A CSS class groups elements so you can style them together. An Alap tag groups links so you can summon them together.

```
.coffee    → every link tagged "coffee"
.sf        → every link tagged "sf"
.bridge    → every link tagged "bridge"
```

The dot is intentional — it looks like a CSS class selector because it works like one.

## Operators

Operators combine sets of links:

| Operator | Meaning | Example | Result |
|----------|---------|---------|--------|
| `+` | AND | `.coffee + .sf` | Coffee shops in SF |
| `\|` | OR | `.nyc \| .sf` | Anything in NYC or SF |
| `-` | WITHOUT | `.nyc - .tourist` | NYC spots, minus tourist traps |

These read naturally. `.coffee + .sf` isn't code — it's a sentence: "things that are coffee *and* SF."

> **Try it**
> <alap-link query=".nyc + .bridge">NYC bridges</alap-link> (AND) ·
> <alap-link query=".nyc | .sf">NYC or SF</alap-link> (OR) ·
> <alap-link query=".nyc - .tourist">NYC without tourist spots</alap-link> (WITHOUT)

```html
<!-- Intersection: items tagged both "nyc" AND "bridge" -->
<alap-link query=".nyc + .bridge">NYC bridges</alap-link>

<!-- Union: items tagged "nyc" OR "sf" -->
<alap-link query=".nyc | .sf">NYC or SF</alap-link>

<!-- Subtraction: NYC items, excluding tourist spots -->
<alap-link query=".nyc - .tourist">local NYC</alap-link>
```

## Left-to-right evaluation

Operators evaluate strictly left-to-right. There is no precedence — `+` does not bind tighter than `|`.

```
.nyc | .sf - .tourist
```

This means `(.nyc | .sf) - .tourist`, not `.nyc | (.sf - .tourist)`. If you need different grouping, use parentheses.

## Parentheses

Parentheses override left-to-right evaluation. They nest up to 32 levels deep.

```html
<!-- Without parens: (.nyc | .sf) - .tourist -->
<alap-link query=".nyc | .sf - .tourist">cities (no tourists)</alap-link>

<!-- With parens: .nyc | (.sf - .tourist) -->
<alap-link query=".nyc | (.sf - .tourist)">NYC + non-tourist SF</alap-link>
```

A practical example — bridges in either NYC or SF:

```html
<alap-link query="(.nyc + .bridge) | (.sf + .bridge)">bridges</alap-link>
```

Without parentheses, `.nyc + .bridge | .sf + .bridge` would evaluate as `(((.nyc + .bridge) | .sf) + .bridge)` — probably not what you want.

## Commas

Commas separate independent expressions. Each segment is evaluated on its own, and the results are concatenated:

```html
<!-- Three specific items -->
<alap-link query="brooklyn, golden_gate, highline">picks</alap-link>

<!-- Mix direct IDs with tag queries -->
<alap-link query="brooklyn, .coffee + .nyc">bridge + NYC cafes</alap-link>
```

## A real example

Say you run a travel site. Your link library has 200 entries, each tagged by city, category, and vibe. A single expression can carve out exactly the menu you want:

```
(.nyc + .food) | (.sf + .food) - .chain
```

"Food in NYC or SF, but not chain restaurants." That's one attribute on one HTML element, producing a curated menu from a library of hundreds.

## Grammar reference

The formal grammar the parser implements:

```
query   = segment (',' segment)*
segment = term (op term)*
op      = '+' | '|' | '-'
term    = '(' segment ')' | atom
atom    = ITEM_ID | CLASS | REGEX | MACRO | PROTOCOL | REFINER
```

Every expression is one or more comma-separated segments. Each segment is a chain of terms joined by operators. A term is either a parenthesized sub-expression or a single atom.

For the full formal specification with operator semantics and worked input/output examples, see the [Expression Spec](../api-reference/spec.md).

## Beyond selection

Expressions can also include [protocol filters](protocols.md) for dimensional queries (time, location, price) and [refiners](refiners.md) for shaping results (sort, limit, shuffle). Together, the three phases — selection, gathering, and refining — give you full control over what appears and in what order.

## Next steps

- [Macros](macros.md) — name and reuse expressions
- [Search Patterns](search-patterns.md) — regex-based discovery
- [Protocols](protocols.md) — time, location, and custom dimensions
- [Refiners](refiners.md) — sort, limit, shuffle results
