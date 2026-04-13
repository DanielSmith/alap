# Getting Started — Creators

This guide is for people who use Alap, not build it. You want to understand what Alap does, how the expression language works, and where to manage your links.

For install instructions, framework setup, and API details, see [START-Dev.md](START-Dev.md).


## What Alap Does

Alap turns a single link into a menu of destinations. Instead of choosing one URL for your reader, you write an expression that describes what kind of links to show — and the reader picks.

A link like this:

> "There are several great **landmarks** within walking distance."

```html
<alap-link query=".nyc + .landmark">landmarks</alap-link>
```

...opens a menu when clicked. The expression `.nyc + .landmark` selects every item in your library tagged with both "nyc" and "landmark." Your sentence stays clean. The reader gets choices. You can use plain HTML anchor tags too — there's an [example further on](#how-youll-write-alap-links).

To see this in action, run the basic example — it demonstrates item IDs, tag queries, operators, parentheses, macros, and existing URL preservation in one page:

```bash
cd examples/sites/basic
npx vite
```

---

## The Expression Language

Every Alap link has an expression — a short query that selects items from your link library.

### Tags

Items in the library have tags. An expression starting with `.` selects all items with that tag:

```
.bridge         → all items tagged "bridge"
.coffee         → all items tagged "coffee"
.nyc            → all items tagged "nyc"
```

### Operators

Combine tags to narrow or widen your selection:

```
.nyc + .bridge              items tagged BOTH "nyc" AND "bridge"
.nyc | .sf                  items tagged "nyc" OR "sf"
.nyc - .tourist             items tagged "nyc" BUT NOT "tourist"
(.nyc + .bridge) | .sf      parentheses control grouping
```

### Macros

A macro is a saved expression. Your editor or developer defines them, and you reference them with `@`:

```
@favorites                  whatever "favorites" expands to
@nycBridges                 expands to ".nyc + .bridge"
```

Macros are useful when an expression is complex or when you want to use spaces/operators in markdown (where `alap:.nyc + .bridge` would break the URL syntax, but `alap:@nycBridges` works).

### Regex Search

When tags aren't enough, you can search across item IDs, labels, URLs, and descriptions using named patterns:

```
/196\d/                     matches items with "1960", "1961", ... "1969" anywhere
/car_.*/                    matches item IDs like car_toyota, car_nissan, car_bmw
```

Patterns are defined in the config — you reference them by name. See [Search Patterns](docs/core-concepts/search-patterns.md) for more.

### Item IDs

You can also reference specific items by their ID:

```
golden, brooklyn            two specific items
golden, .coffee             one specific item plus all coffee items
```

### There's More

The expression language also supports [protocols](docs/core-concepts/protocols.md) that gather data dynamically — filtering by time, location, or pulling live results from external APIs and Bluesky — and [refiners](docs/core-concepts/refiners.md) that sort, limit, and shuffle results. You don't need these to get started, but they're there when your queries outgrow tags.

---

## How You'll Write Alap Links

The exact syntax depends on how your developer set up the site.

**Web component:**
```html
<alap-link query=".bridge">bridges</alap-link>
```

**Plain anchor tags** — if you prefer standard `<a>` elements, Alap works with those too. Your existing `href` isn't lost — it becomes the first item in the menu:
```html
<a href="https://en.wikipedia.org/wiki/Brooklyn_Bridge" class="alap" data-alap-linkitems=".bridge">bridges</a>
```
The link still works as a normal link for anyone without Alap. With Alap, the original URL appears in the menu alongside the other matches.

**In Markdown** (with remark-alap):
```md
Check out the [best bridges](alap:@nycBridges) in the city.
Here are some [great cafes](alap:.coffee) nearby.
```

**In a rich-text editor** (with Tiptap integration):
Use the Alap button or `Mod-Shift-A` to insert a link, then type your expression.

**In WordPress:**
```
[alap query=".bridge"]bridges[/alap]
```

These are just the most common entry points. Alap also works with htmx, Hugo shortcodes, MDX, Astro components, and more. If your environment can render HTML, chances are very good it can handle an Alap link. See [START-Dev.md](START-Dev.md#integrations) for the full list.

---

## The Editors

Alap includes proof-of-concept visual editors for managing your link library — adding items, tagging them, creating macros, and testing expressions.

Your developer might have a specific editor in mind depending on their tech stack. They all look and function the same way — React, React + shadcn/ui, Vue, Svelte, Solid, Alpine, and Astro. Every editor includes:

- **Item management** — add, edit, clone, delete items
- **Tag editing** — add and remove tags on each item
- **Macro editor** — create and manage saved expressions
- **Query tester** — type an expression and see what it resolves to, live
- **Drag-and-drop** — drag a URL from your browser to add it (metadata auto-fetched)
- **Import/export** — save and load configs as JSON files

### Storage Modes

Editors can store data locally (in the browser), on a remote server, or both:

- **Local** — fast, offline-capable, tied to one machine
- **Remote** — shared across machines, requires a running server
- **Hybrid** — writes to both, reads local first

---

## Cookbooks

Each cookbook covers a specific topic:

| Cookbook | What it covers |
|---------|---------------|
| [Accessibility](docs/cookbook/accessibility.md) | Keyboard navigation, ARIA, screen readers |
| [Editors](docs/cookbook/editors.md) | Setting up and using the visual editors |
| [Existing URLs](docs/cookbook/existing-urls.md) | Preserving `href` when Alap enhances a link |
| [Images & Media](docs/cookbook/images-and-media.md) | Image items, thumbnails, media in menus |
| [Markdown & CMS Content](docs/cookbook/markdown.md) | Alap in markdown, MDX, and HTML from headless CMSs |
| [Rich-Text Editors](docs/cookbook/rich-text.md) | Tiptap/ProseMirror integration |
| [Placement](docs/cookbook/placement.md) | Compass-based menu positioning |
| [Language Ports](docs/cookbook/language-ports.md) | Server-side ports in Rust, Python, Go, PHP |

---

## Tips

- **Tag consistently.** Lowercase, singular, underscored: `.french_roast`, not `.French-Roasts`.
- **Test your expressions.** The query tester in the editor shows exactly what matches.
- **Use macros for complex expressions.** Especially in markdown, where spaces break URL syntax.
- **One URL, one item.** Don't create duplicate items pointing to the same URL with different IDs.
- **Tags are the backbone.** The more thoughtfully you tag, the more powerful expressions become.
