# What is Alap?

**[Getting Started](README.md):** **Casual Mode** · [Installation](installation.md) · [Quick Start](quick-start.md) · [Configuration](configuration.md) | [All docs](../README.md)

## What if a link could offer <alap-link query=".coffee">choices?</alap-link>

A normal link goes to one place. Click it, you're there.

An Alap link opens a small menu of options — and the reader picks where to go.

```html
<alap-link query=".coffee">coffee spots</alap-link>
```

Click that, and instead of going to one URL, you see a menu of every coffee shop in your library.

## How it works

You build a library of links. Each link gets **tags** — simple labels that describe it:

```json
{
  "bluebottle": {
    "label": "Blue Bottle Coffee",
    "url": "https://bluebottlecoffee.com",
    "tags": ["coffee", "sf"]
  },
  "devocion": {
    "label": "Devocion",
    "url": "https://devocion.com",
    "tags": ["coffee", "nyc"]
  },
  "stumptown": {
    "label": "Stumptown Coffee",
    "url": "https://stumptowncoffee.com",
    "tags": ["coffee", "nyc"]
  }
}
```

Then in your HTML, you write a query that picks which links to show:

```html
<alap-link query=".coffee">coffee spots</alap-link>
```

The `.coffee` means "everything tagged coffee." Click it, get a menu with all three shops.

## Tags are the key idea

If you've used CSS classes, you already get it. A CSS class groups elements so you can style them together. An Alap tag groups links so you can summon them together.

Try these — click each one:

<alap-link query=".coffee">coffee</alap-link> · <alap-link query=".bridge">bridges</alap-link> · <alap-link query=".park">parks</alap-link>

One link can have many tags. Many links can share a tag.

## You can combine tags

Three operators let you narrow, widen, or exclude:

| Operator | Meaning | Try it |
|----------|---------|--------|
| `+` | AND (both tags) | <alap-link query=".nyc + .bridge" placement="S, clamp">NYC bridges</alap-link> |
| `\|` | OR (either tag) | <alap-link query=".nyc | .sf" placement="S, clamp">NYC or SF</alap-link> |
| `-` | WITHOUT (exclude) | <alap-link query=".nyc - .tourist" placement="S, clamp">NYC without tourist spots</alap-link> |

These read like sentences. `.coffee + .nyc` just means "things that are coffee *and* NYC."

## A real example

Say you write a blog about cities. You have 50 links in your library — restaurants, parks, museums, bridges — each tagged by city and category.

On your NYC page, one line of HTML:

```html
Check out some <alap-link query=".nyc + .food">great food</alap-link>
or walk across a <alap-link query=".nyc + .bridge">famous bridge</alap-link>.
```

Each link becomes a curated menu. The reader picks. You never have to choose one "best" URL — you give them options.

Here's what that looks like: Check out some <alap-link query=".food">great food</alap-link> or walk across a <alap-link query=".nyc + .bridge">famous bridge</alap-link>.

## That's it

Tags in, menu out.

Everything else Alap can do — image galleries, detail panels, live feeds, search patterns — is there when you want it. None of it is required to get started.

When you're ready for more: [Quick Start](quick-start.md) walks you through a working example in 2 minutes.
