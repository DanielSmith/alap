# Core Concepts

How the Alap expression language works — from simple tag queries to protocol filters and result refiners.

| Page | What it covers |
|------|----------------|
| [Expressions](expressions.md) | Tags, operators (`+` `\|` `-`), parentheses, commas — the tutorial |
| [Expression Spec](../api-reference/spec.md) | Formal grammar, operator semantics, machine-friendly worked examples |
| [Macros](macros.md) | Named queries with `@`, nesting, the bare `@`, Markdown escape hatch |
| [Search Patterns](search-patterns.md) | Regex search with `/pattern/`, field codes, age/sort/limit options |
| [Protocols](protocols.md) | Dimensional queries (`:time:30d:`, `:location:radius:args:`), handler contract, source chains |
| [Refiners](refiners.md) | Set-level shaping (`*sort*`, `*limit:N*`, `*shuffle*`), inline refiners, pagination |
| [Styling](styling.md) | CSS custom properties, `::part()` selectors, dark mode, transitions, effects |

> **Try it**
> Live Alap links — click any to see a menu:
> <alap-link query=".bridge">bridges</alap-link> ·
> <alap-link query=".coffee">coffee</alap-link> ·
> <alap-link query=".nyc + .bridge">NYC bridges</alap-link> ·
> <alap-link query="@favorites">favorites</alap-link>

## Reading order

Start with [Expressions](expressions.md) — everything else builds on it. [Macros](macros.md) is a natural follow-up. The rest can be read in any order as you need them.

## See also

- [Getting Started](../getting-started/) — installation and first link
- [Framework Guides](../framework-guides/) — per-framework integration
- [API Reference](../api-reference/) — types, methods, contracts
- [Full documentation index](../README.md)
