# Macros

**[Core Concepts](README.md):** [Expressions](expressions.md) · **This Page** · [Search Patterns](search-patterns.md) · [Protocols](protocols.md) · [Refiners](refiners.md) · [Styling](styling.md) | [All docs](../README.md)

A macro is a named query. You define it once in your config, and use it anywhere with `@`.

> Live version with interactive examples: https://alap.info/core-concepts/macros

```json
{
  "macros": {
    "nyc_bridges": { "linkItems": ".nyc + .bridge" },
    "sf_coffee":   { "linkItems": ".coffee + .sf" }
  }
}
```

```html
<alap-link query="@nyc_bridges">bridges</alap-link>
<alap-link query="@sf_coffee">cafes</alap-link>
```

That's the whole feature. But the consequences are worth spelling out.

## Change once, update everywhere

Without macros, if you use `.nyc + .bridge` on five different pages, you maintain five copies of that expression. Decide to exclude toll bridges? You edit five attributes.

With `@nyc_bridges`, you edit the macro definition. Every link using it picks up the change. Same principle as CSS classes, database views, or any "name it, reuse it" pattern.

## Queries get a vocabulary

Raw expressions are precise but opaque. `.nyc + .bridge - .toll` is clear enough if you wrote it. Less clear if someone else is reading your HTML six months later.

Macros let you name your intent:

```html
<alap-link query="@free_nyc_bridges">bridges</alap-link>
```

The HTML reads like a sentence. The expression lives in the config where the complexity is expected.

## Macros compose with everything

A macro expands to its expression before parsing. After that, it's just tokens — the parser doesn't know it came from a macro. This means macros work anywhere an expression works:

```
@nyc_bridges, @sf_bridges       → combine two macros with a comma
@nyc_bridges | .landmark         → union a macro with a tag
(@nyc_bridges) - .toll           → group and subtract
```

You can also use macros inside other macros:

```json
{
  "macros": {
    "nyc_bridges": { "linkItems": ".nyc + .bridge" },
    "sf_bridges":  { "linkItems": ".sf + .bridge" },
    "all_bridges": { "linkItems": "@nyc_bridges, @sf_bridges" }
  }
}
```

Cycle protection prevents infinite recursion. The engine limits macro expansion to 10 levels.

## The bare `@`

If a trigger element has a DOM `id`, bare `@` expands to a macro matching that ID:

```html
<a id="favorites" class="alap" data-alap-linkitems="@">my links</a>
```

This looks up the macro named `favorites`. Useful when the element's identity and its macro naturally share a name — navigation items, user-specific menus, section-specific link sets.

## The Markdown escape hatch

Markdown links break when expressions contain spaces:

```markdown
[bridges](alap:.nyc + .bridge)     ← broken: parser chokes on spaces
```

Macros solve this completely:

```markdown
[bridges](alap:@nyc_bridges)       ← works: no spaces, no ambiguity
```

The macro name is a single token — no spaces, no operators, no special characters. It passes through any Markdown parser cleanly. This makes macros essential for Alap's [Markdown integration](../cookbook/markdown.md). Simple queries like `.coffee` work fine. The moment you need an operator, a macro is the way to get there.

## When you don't need them

If an expression is used in exactly one place and it's short, a macro adds indirection for no benefit. `.coffee` on a single link is perfectly fine. Macros earn their keep when the same query appears in multiple places, or when the expression is complex enough that naming it makes the HTML clearer.

## Next steps

- [Expressions](expressions.md) — the full query language
- [Configuration](../getting-started/configuration.md) — macro syntax in the config object
