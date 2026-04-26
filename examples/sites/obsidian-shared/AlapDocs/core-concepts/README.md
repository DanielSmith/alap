---
source: core-concepts/README.md
modified: '2026-04-18T02:40:33Z'
tags:
- core_concepts
title: Core Concepts
description: How the Alap expression language works — from simple tag queries to protocol
  filters and result refiners.
---
# Core Concepts

How the Alap expression language works — from simple tag queries to protocol filters and result refiners.

| Page | What it covers |
|------|----------------|
| [[core-concepts/expressions|Expressions]] | Tags, operators (`+` `\|` `-`), parentheses, commas — the tutorial |
| [[api-reference/spec|Expression Spec]] | Formal grammar, operator semantics, machine-friendly worked examples |
| [[core-concepts/macros|Macros]] | Named queries with `@`, nesting, the bare `@`, Markdown escape hatch |
| [[core-concepts/search-patterns|Search Patterns]] | Regex search with `/pattern/`, field codes, age/sort/limit options |
| [[core-concepts/protocols|Protocols]] | Dimensional queries (`:time:30d:`, `:location:radius:args:`), handler contract, source chains |
| [[core-concepts/refiners|Refiners]] | Set-level shaping (`*sort*`, `*limit:N*`, `*shuffle*`), inline refiners, pagination |
| [[core-concepts/styling|Styling]] | CSS custom properties, `::part()` selectors, dark mode, transitions, effects |

> **Try it**
> Live Alap links — click any to see a menu:
> <alap-link query=".bridge">bridges</alap-link> ·
> <alap-link query=".coffee">coffee</alap-link> ·
> <alap-link query=".nyc + .bridge">NYC bridges</alap-link> ·
> <alap-link query="@favorites">favorites</alap-link>

## Reading order

Start with [[core-concepts/expressions|Expressions]] — everything else builds on it. [[core-concepts/macros|Macros]] is a natural follow-up. The rest can be read in any order as you need them.

## See also

- [Getting Started](../getting-started/) — installation and first link
- [Framework Guides](../framework-guides/) — per-framework integration
- [API Reference](../api-reference/) — types, methods, contracts
- [[README|Full documentation index]]
