# hugo-alap

Hugo module for [Alap](https://alap.info) multi-target link menus. Provides an `alap` shortcode that emits `<alap-link>` web components — the full expression language (tags, macros, operators, regex search, protocols, refiners) works out of the box.

For a working site, see the [Hugo example](https://examples.alap.info/hugo/) (`examples/sites/hugo/`).

## Install

### Option A: Hugo Module (recommended)

Add the module to your `hugo.toml`:

```toml
[module]
  [[module.imports]]
    path = "github.com/DanielSmith/alap/integrations/hugo-alap"
```

Then initialize modules in your project:

```bash
hugo mod init github.com/yourname/yoursite
hugo mod get github.com/DanielSmith/alap/integrations/hugo-alap
```

### Option B: Copy the Shortcode

Copy `layouts/shortcodes/alap.html` into your project's `layouts/shortcodes/` directory. Copy `layouts/partials/alap-head.html` into `layouts/partials/`. No Go modules needed.

## Setup

### 1. Add the Alap runtime

Copy `alap.iife.js` (from the [npm package](https://www.npmjs.com/package/alap) or CDN) into `static/js/`:

```bash
curl -o static/js/alap.iife.js https://cdn.jsdelivr.net/npm/alap@3/dist/alap.iife.js
```

### 2. Add your config

Create `static/js/alap-config.js` with your link library:

```javascript
var alapConfig = {
  settings: { listType: "ul", menuTimeout: 5000 },
  macros: {
    favorites: { linkItems: ".coffee | .park" }
  },
  allLinks: {
    bluebottle: {
      label: "Blue Bottle Coffee",
      url: "https://bluebottlecoffee.com",
      tags: ["coffee", "sf"]
    },
    stumptown: {
      label: "Stumptown Coffee",
      url: "https://stumptowncoffee.com",
      tags: ["coffee", "portland"]
    }
  }
};
```

### 3. Include the partial

Add to your `layouts/_default/baseof.html` (or wherever your `<head>` lives):

```html
<head>
  ...
  {{ partial "alap-head.html" . }}
</head>
```

## Usage

Use the `alap` shortcode in any content file:

```markdown
Check out some {{</* alap ".coffee" */>}}coffee spots{{</* /alap */>}}.

Only the {{</* alap ".nyc + .bridge" */>}}NYC bridges{{</* /alap */>}}.

Everything except tourist spots:
{{</* alap ".nyc - .tourist" */>}}local NYC{{</* /alap */>}}.

A macro: {{</* alap "@favorites" */>}}my favorites{{</* /alap */>}}.
```

### Named parameters

```markdown
{{</* alap query=".coffee" */>}}cafes{{</* /alap */>}}
{{</* alap query=".tutorial" config="docs" */>}}tutorials{{</* /alap */>}}
```

The `config` attribute selects a named config for multi-config setups.

## Styling

Style the web component with `::part()` selectors in your site CSS:

```css
alap-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
}

alap-link::part(menu) {
  background: #2240a8;
  border-color: #4470cc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

alap-link::part(link) {
  color: #f0f2ff;
  border-radius: 6px;
}

alap-link::part(link):hover {
  background: #3360d0;
  color: #ffd666;
}
```

## How it works

The shortcode is a thin wrapper — it passes the query expression through to the `<alap-link>` web component unchanged. All parsing and menu rendering happens client-side via the Alap IIFE build. This means every Alap feature works: tag queries, set operators (`+`, `|`, `-`), macros (`@name`), regex search (`/pattern/`), protocols (`:proto:`), refiners (`*name*`), and any future syntax additions.

## Why not build-time resolution?

Hugo shortcodes are Go templates, not Go code. While Alap has a [full Go parser](../cookbook/language-ports.md) (source: `src/other-languages/go/`), Hugo's template engine can't call arbitrary Go functions. A custom Hugo build or a Go template reimplementation of the parser would be fragile and incomplete. The web component approach guarantees full feature access with zero maintenance burden.

If Hugo adds a Go plugin API in the future, the parser is ready to go.
