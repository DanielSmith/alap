# Full Experience — Lightbox, Lens, and Beyond

**[Getting Started](README.md):** [Installation](installation.md) · [Quick Start](quick-start.md) · [Configuration](configuration.md) · [Bare Minimum](bare-minimum.md) · [With a Framework](with-framework.md) · **This Page**

Menus are the starting point. The full Alap build adds three more renderers — lightbox, lens, and embed — plus the AT Protocol for live feeds. This guide shows how to wire them up.

## What you're adding

| Renderer | What it does | Use case |
|----------|-------------|----------|
| **Lightbox** | Full-screen overlay with image zoom, keyboard nav, set browsing | Photo galleries, curated collections |
| **Lens** | Detail panel alongside the trigger with metadata, tags, image zoom | Research, exploration, rich link previews |
| **Embed** | Inline iframe rendering with consent management | YouTube, Vimeo, Spotify, SoundCloud, Bandcamp |

All three use the same config and expression engine as menus. The difference is how they present the resolved links.

## Install

```bash
npm install alap
```

Import from the full entry point (not `alap/slim`):

```typescript
import { AlapUI, AlapLightbox, AlapLens } from 'alap';
import 'alap/lightbox.css';
import 'alap/lens.css';
```

## Lightbox

The lightbox takes a set of resolved links and renders them as a full-screen overlay with image display, keyboard navigation, and set browsing.

```typescript
import { AlapLightbox } from 'alap';
import 'alap/lightbox.css';

const config = {
  allLinks: {
    golden_gate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['bridge', 'sf'],
      image: '/images/golden-gate.jpg',
      description: 'Iconic suspension bridge spanning the Golden Gate strait.',
    },
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['bridge', 'nyc'],
      image: '/images/brooklyn-bridge.jpg',
      description: 'Historic hybrid cable-stayed/suspension bridge.',
    },
    tower: {
      label: 'Tower Bridge',
      url: 'https://en.wikipedia.org/wiki/Tower_Bridge',
      tags: ['bridge', 'london'],
      image: '/images/tower-bridge.jpg',
      description: 'Combined bascule and suspension bridge over the Thames.',
    },
  },
};

// Lightbox for elements with class="alap"
const lightbox = new AlapLightbox(config, { selector: '.alap' });
```

```html
<a class="alap" data-alap-linkitems=".bridge">Famous bridges</a>
```

Click the link and a full-screen lightbox opens with all three bridges. Arrow keys or swipe to navigate. Escape to close.

### Lightbox features

- **Set navigation** — counter shows "1 / 3", arrow keys move between items
- **Image zoom** — click the image to zoom, click again to reset
- **Keyboard** — Left/Right arrows, Escape to close, Home/End for first/last
- **Description** — shown below the image when the link has a `description` field
- **Responsive** — adapts to viewport, no horizontal scroll

## Lens

The lens is a detail panel that opens alongside the trigger, showing metadata, tags, and a larger image. Think of it as an expanded preview.

```typescript
import { AlapLens } from 'alap';
import 'alap/lens.css';

const lens = new AlapLens(config, { selector: '.alap-lens' });
```

```html
<a class="alap-lens" data-alap-linkitems=".bridge">Explore bridges</a>
```

Click and a panel opens showing the first bridge's image, description, tags, and a link to the URL. Navigate through the set with the built-in counter.

### Lens features

- **Clickable tags** — click a tag in the lens to filter the set to items with that tag
- **Tag toggle-off** — click the active tag again to restore the original set
- **Set navigation** — same counter and keyboard nav as lightbox
- **Image zoom** — click to zoom
- **Placement** — configurable position relative to trigger (compass directions)

## Coordinator — menu to lightbox to lens

The three renderers can work together. Open a menu, click through to lightbox, then switch to lens — each transition is smooth and the back stack remembers where you were.

```typescript
import { AlapUI, AlapLightbox, AlapLens, RendererCoordinator } from 'alap';
import 'alap/lightbox.css';
import 'alap/lens.css';

const menu = new AlapUI(config);
const lightbox = new AlapLightbox(config, { selector: '.alap' });
const lens = new AlapLens(config, { selector: '.alap-lens' });

const coordinator = new RendererCoordinator();
coordinator.register(menu);
coordinator.register(lightbox);
coordinator.register(lens);
coordinator.bindKeyboard();
```

Now Escape walks back through the stack: lens → lightbox → menu → closed. The coordinator handles the transitions and remembers which item was active at each level.

## Web Components

Every renderer has a web component wrapper for zero-framework usage:

```html
<script src="https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/alap@3/dist/lightbox.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/alap@3/dist/lens.css">

<script>
  Alap.defineAlapLink();
  Alap.defineAlapLightbox();
  Alap.defineAlapLens();
  Alap.registerConfig({ allLinks: { ... } });
</script>

<alap-link query=".coffee">coffee (menu)</alap-link>
<alap-lightbox query=".bridge">bridges (lightbox)</alap-lightbox>
<alap-lens query=".bridge">bridges (lens)</alap-lens>
```

Web component renderers use shadow DOM and `::part()` for styling. See [Web Component guide](../framework-guides/web-component.md) for the full parts list.

## Embed

The embed module renders iframes for supported providers with consent management:

```typescript
import { createEmbed, grantConsent } from 'alap';
import 'alap/embed.css';

// Grant consent for specific providers
grantConsent('youtube');
grantConsent('spotify');

// Create an embed from a URL
const container = document.getElementById('embed-target');
const embed = createEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
  target: container,
  width: 640,
  height: 360,
});
```

Supported providers: YouTube, Vimeo, Spotify, SoundCloud, Bandcamp. Embeds work standalone or inside lightbox/lens views when a link's URL matches a supported provider.

## AT Protocol — live feeds

The `:atproto:` protocol pulls live posts and profile links from Bluesky:

```typescript
import { AlapUI, atprotoHandler } from 'alap';

const config = {
  allLinks: {},
  protocols: {
    atproto: { handler: atprotoHandler },
  },
};

const ui = new AlapUI(config);
```

```html
<a class="alap" data-alap-linkitems=":atproto:feed:eff.org:limit=5:">EFF posts</a>
<a class="alap" data-alap-linkitems=":atproto:profile:archive.org:">Internet Archive</a>
```

The menu populates at runtime with live data from the network. Static config items and live protocol results can be mixed in the same expression:

```html
<a class="alap" data-alap-linkitems=".coffee | :atproto:feed:eff.org:limit=3:">
  Coffee spots + EFF posts
</a>
```

## Putting it all together

A page with all four renderers, live feeds, and coordinated transitions:

```typescript
import {
  AlapUI, AlapLightbox, AlapLens,
  RendererCoordinator, atprotoHandler,
  webHandler, jsonHandler,
} from 'alap';
import 'alap/lightbox.css';
import 'alap/lens.css';

const config = {
  allLinks: {
    golden_gate: { label: 'Golden Gate Bridge', url: '...', tags: ['bridge', 'sf'], image: '...' },
    brooklyn:    { label: 'Brooklyn Bridge',     url: '...', tags: ['bridge', 'nyc'], image: '...' },
    bluebottle:  { label: 'Blue Bottle Coffee',  url: '...', tags: ['coffee', 'sf'] },
  },
  protocols: {
    atproto: { handler: atprotoHandler },
  },
};

const menu = new AlapUI(config, { selector: '.alap-menu' });
const lightbox = new AlapLightbox(config, { selector: '.alap-lightbox' });
const lens = new AlapLens(config, { selector: '.alap-lens' });

const coordinator = new RendererCoordinator();
coordinator.register(menu);
coordinator.register(lightbox);
coordinator.register(lens);
coordinator.bindKeyboard();
```

```html
<!-- Menu: quick list -->
<a class="alap-menu" data-alap-linkitems=".coffee">coffee spots</a>

<!-- Lightbox: full-screen gallery -->
<a class="alap-lightbox" data-alap-linkitems=".bridge">bridge gallery</a>

<!-- Lens: detail view -->
<a class="alap-lens" data-alap-linkitems=".bridge + .sf">SF bridges (detail)</a>

<!-- Live feed -->
<a class="alap-menu" data-alap-linkitems=":atproto:feed:nature.com:limit=5:">Nature posts</a>
```

## Build sizes

| Entry | ESM (gzip) | What's in it |
|-------|-----------|--------------|
| `alap/slim` | 8.8 KB | Engine, menus, web/json protocols, coordinator |
| `alap` (full) | 22.6 KB | Everything above + lightbox, lens, embed, atproto |
| IIFE (CDN) | 35.5 KB | Full build as a single script tag |

The jump from slim to full is ~14 KB gzipped — the renderers, embed, and atproto protocol.

## Next

- [Configuration](configuration.md) — the full config object
- [Expressions](../core-concepts/expressions.md) — the query language
- [Framework Guides](../framework-guides/) — use renderers with Vue, React, Svelte, etc.

## API reference

- [Lightbox API](../api-reference/lightbox.md) — full options, CSS custom properties, `::part()` selectors
- [Lens API](../api-reference/lens.md) — full options, transitions, meta fields
- [Embeds API](../api-reference/embeds.md) — providers, consent management
- [Coordinators API](../api-reference/coordinators.md) — transitions, back stack, View Transitions
