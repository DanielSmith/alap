# Configuration

**[Getting Started](README.md):** [Installation](installation.md) · [Quick Start](quick-start.md) · **This Page** | [All docs](../README.md)

Every Alap instance starts with a config object. At minimum you need `allLinks` — a dictionary of your links. Everything else is optional.

> Live version with interactive examples: https://alap.info/getting-started/configuration

## Config shape

```typescript
interface AlapConfig {
  allLinks: Record<string, AlapLink>;                          // required
  settings?: AlapSettings;
  macros?: Record<string, AlapMacro>;
  searchPatterns?: Record<string, AlapSearchPattern | string>;
  protocols?: Record<string, AlapProtocol>;
}
```

## `allLinks` — your link library

The traditional web model: each link knows its destination. One `<a>` tag, one `href`.

Alap flips this. You build a **library of links** — a single collection of everything you might want to link to — and then your links *query into it*.

```typescript
allLinks: {
  golden_gate: {
    url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
    label: 'Golden Gate Bridge',
    tags: ['bridge', 'sf', 'landmark'],
  },
  brooklyn: {
    url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
    label: 'Brooklyn Bridge',
    tags: ['bridge', 'nyc', 'landmark'],
  },
  bluebottle: {
    url: 'https://bluebottlecoffee.com',
    label: 'Blue Bottle Coffee',
    tags: ['coffee', 'sf'],
  },
}
```

Each entry has an ID (the key), a URL, a label, and **tags**. Tags are the connective tissue — they let you describe *what a link is about* without deciding *where it should appear*. Add a new coffee shop to your library tomorrow, and every `.coffee` query picks it up automatically.

### Link fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` | Yes | Destination URL |
| `label` | `string` | No | Display text (required unless `image` is set) |
| `tags` | `string[]` | No | Tags for `.tag` queries |
| `cssClass` | `string` | No | CSS class applied to the menu item |
| `image` | `string` | No | Image URL rendered instead of text |
| `altText` | `string` | No | Alt text for `image` |
| `targetWindow` | `string` | No | `_self`, `_blank`, etc. Default: `"fromAlap"` |
| `description` | `string` | No | Used by search patterns and hooks |
| `thumbnail` | `string` | No | Preview image for hover/context events |
| `hooks` | `string[]` | No | Event hooks this item participates in |
| `guid` | `string` | No | Permanent UUID that survives renames |
| `createdAt` | `string \| number` | No | ISO 8601 or Unix ms. Used by age filters |
| `meta` | `Record<string, unknown>` | No | Arbitrary metadata for protocol queries |

## `settings` — global defaults

Settings control menu behavior. All fields are optional — omit `settings` entirely to use the defaults.

```typescript
settings: {
  listType: 'ul',
  menuTimeout: 3000,
  maxVisibleItems: 6,
  existingUrl: 'prepend',
  placement: 'S',
  placementGap: 8,
  hooks: ['item-hover'],
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `listType` | `'ul' \| 'ol'` | `'ul'` | Menu list element type |
| `menuTimeout` | `number` | `5000` | Auto-dismiss timeout (ms) after mouse leaves |
| `maxVisibleItems` | `number` | `10` | Items before the menu scrolls. `0` = no limit |
| `existingUrl` | `'prepend' \| 'append' \| 'ignore'` | `'prepend'` | How to handle an existing `href` on the trigger |
| `placement` | `'N' \| 'NE' \| 'E' \| 'SE' \| 'S' \| 'SW' \| 'W' \| 'NW' \| 'C'` | `'SE'` | Preferred menu placement relative to the trigger |
| `placementGap` | `number` | `4` | Pixel gap between trigger edge and menu edge |
| `viewportPadding` | `number` | `8` | Minimum distance the menu keeps from viewport edges |
| `viewportAdjust` | `boolean` | `true` | Enable smart placement with viewport containment |
| `hooks` | `string[]` | — | Default hooks for all items (per-link `hooks` overrides) |

### Placement

The `placement` setting controls where the menu appears relative to the trigger. Think of it as a compass:

```
     NW    N    NE
      ┌────┬────┐
   W  │ trigger │  E
      └────┴────┘
     SW    S    SE
         (C = centered over trigger)
```

The default is `SE` — below the trigger, left edge aligned with the trigger's left edge. If the preferred placement doesn't fit in the viewport, Alap tries the opposite side, then adjacent positions, then the best available fit with height clamping and scrolling. The menu never causes the page to scroll.

Per-element override: `data-alap-placement="N"` (DOM mode) or `placement="N"` (web component).

See [Placement](../cookbook/placement.md) for the full guide on placement vs. CSS styling.

## `macros` — reusable expressions

Macros name a query so you can reference it with `@`:

```typescript
macros: {
  nyc_bridges:  { linkItems: '.nyc + .bridge' },
  sf_coffee:    { linkItems: '.coffee + .sf' },
  all_bridges:  { linkItems: '@nyc_bridges | @sf_bridges' },
}
```

```html
<alap-link query="@nyc_bridges">NYC bridges</alap-link>
```

Macros can reference other macros. See [Macros](../core-concepts/macros.md) for nesting rules and cycle protection.

## `searchPatterns` — named regex searches

Define regex queries you can reference with `/name/` syntax:

```typescript
searchPatterns: {
  bridges: 'bridge|viaduct',
  recent_coffee: {
    pattern: 'coffee|cafe',
    options: { fields: 'lt', age: '30d', sort: 'newest', limit: 10 },
  },
}
```

A plain string is shorthand for `{ pattern: "..." }` with default options. See [Search Patterns](../core-concepts/search-patterns.md) for the full options reference.

## `protocols` — dimensional queries

Protocol expressions extend the query language with domain-specific filtering — time, location, price, or any custom dimension:

```typescript
protocols: {
  price: {
    handler: (segments, link) => {
      if (!link.meta?.price) return false;
      const min = parseFloat(segments[0]);
      const max = parseFloat(segments[1]);
      return link.meta.price >= min && link.meta.price <= max;
    },
  },
}
```

```html
<alap-link query=".coffee + :price:0:10:">affordable cafes</alap-link>
```

See [Protocols](../core-concepts/protocols.md) for handler contracts and source chains.

## Inline configuration

Alap's config is content — labels, URLs, tags, relationships. It can live in the document itself as a `<script type="application/json">` block:

```html
<script type="application/json" id="alap-config">
{
  "allLinks": {
    "golden":     { "url": "https://...", "label": "Golden Gate",    "tags": ["bridge", "sf"] },
    "brooklyn":   { "url": "https://...", "label": "Brooklyn Bridge", "tags": ["bridge", "nyc"] }
  }
}
</script>

<script>
  const el = document.getElementById('alap-config');
  const config = JSON.parse(el.textContent);
  Alap.registerConfig(config);
</script>
```

The browser won't execute it, but anything that reads the page — human or machine — can parse it. One artifact, two purposes: runtime configuration and a readable description of the page's link structure.

## Complete example

```typescript
const config: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
    maxVisibleItems: 8,
    existingUrl: 'prepend',
    hooks: ['item-hover'],
  },

  macros: {
    nyc_bridges:  { linkItems: '.nyc + .bridge' },
    sf_outdoors:  { linkItems: '(.sf + .park) | (.sf + .beach)' },
    staff_picks:  { linkItems: 'golden_gate, bluebottle, highline' },
  },

  searchPatterns: {
    bridges:      { pattern: 'bridge', options: { fields: 'lt', sort: 'alpha' } },
    recent_items: { pattern: '.', options: { age: '7d', sort: 'newest', limit: 5 } },
  },

  allLinks: {
    golden_gate: {
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      label: 'Golden Gate Bridge',
      tags: ['bridge', 'sf', 'landmark'],
      description: 'Iconic suspension bridge spanning the Golden Gate strait.',
      createdAt: '2026-01-15T10:30:00Z',
    },
    brooklyn: {
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      label: 'Brooklyn Bridge',
      tags: ['bridge', 'nyc', 'landmark'],
      createdAt: '2026-01-20T09:00:00Z',
    },
    bluebottle: {
      url: 'https://bluebottlecoffee.com',
      label: 'Blue Bottle Coffee',
      tags: ['coffee', 'sf'],
      createdAt: '2026-02-10T14:00:00Z',
    },
    highline: {
      url: 'https://www.thehighline.org',
      label: 'The High Line',
      tags: ['park', 'nyc', 'landmark'],
      createdAt: '2026-03-01T11:00:00Z',
    },
  },
};
```

With this config:

```html
<alap-link query="@nyc_bridges">NYC bridges</alap-link>
<alap-link query="@staff_picks">our picks</alap-link>
<alap-link query="/recent_items/">this week</alap-link>
<alap-link query=".landmark - .nyc">non-NYC landmarks</alap-link>
```

## Next steps

- [Expressions](../core-concepts/expressions.md) — the query language that makes this work
- [Types](../api-reference/types.md) — full TypeScript interface definitions
