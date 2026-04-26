---
source: getting-started/configuration.md
modified: '2026-04-22T01:04:39Z'
tags:
- getting_started
title: Configuration
description: '**Getting Started:** Installation · Quick Start · **This Page**'
---
# Configuration

**[[getting-started/README|Getting Started]]:** [[getting-started/installation|Installation]] · [[getting-started/quick-start|Quick Start]] · **This Page**

Every Alap instance starts with a config object. At minimum you need `allLinks` — a dictionary of your links. Everything else is optional.

> Live version with interactive examples: https://alap.info/getting-started/configuration

## Config shape

```typescript
interface AlapConfig {
  // --- Data layer (pure JSON, serializable) ---
  allLinks: Record<string, AlapLink>;                          // required
  settings?: AlapSettings;
  macros?: Record<string, AlapMacro>;
  searchPatterns?: Record<string, AlapSearchPattern | string>;

  // --- Code layer (JavaScript only) ---
  protocols?: Record<string, AlapProtocol>;
}
```

The config has two layers:

- **Data** — `allLinks`, `macros`, `settings`, `searchPatterns`. Pure JSON. This is what editors produce, what gets saved to a database, and what can be loaded from a `


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

- [[core-concepts/expressions|Expressions]] — the query language that makes this work
- [[api-reference/types|Types]] — full TypeScript interface definitions
