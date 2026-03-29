# Alap + htmx

Zero framework, zero build step. HTML fragments swap in via htmx. `<alap-link>` web components self-initialize after every swap — no re-init call needed.

**Port:** 9220

## What it shows

A tabbed page where each tab fetches an HTML fragment via `hx-get`. The fragments contain `<alap-link>` web components with different queries — tags, macros, intersections, subtractions. After htmx swaps the content, the web components come alive automatically.

This demonstrates:
- **Zero JS framework** — no React, Vue, Svelte, or any SPA
- **HTML over the wire** — the server (or static files) sends HTML, htmx swaps it
- **Web component auto-registration** — `<alap-link>` is a custom element; the browser's custom element registry handles initialization, including for dynamically inserted elements
- **No hydration** — there's nothing to hydrate. The HTML is the UI.

## How it works

1. `alap.iife.js` and the config load once in the page
2. `Alap.registerConfig()` + `Alap.defineAlapLink()` register the web component
3. htmx fetches HTML fragments on tab click
4. Fragments contain `<alap-link query="...">` elements
5. The browser's custom element registry auto-upgrades them — no Alap-specific init

This is the same mechanism that makes `<alap-link>` work in any HTML page, SSR framework, or CMS output. htmx just makes it visible — you can watch new Alap links appear and become interactive without any JavaScript orchestration.

## Running

```bash
./serve.sh
# → http://localhost:9220/
```

Uses Python's built-in HTTP server (no Node, no npm, no build step).

## Files

```
htmx/
  index.html              Main page with htmx nav
  config.js               Alap link library
  style.css               Layout and menu styling
  serve.sh                Python HTTP server
  fragments/
    coffee.html           Coffee spots content
    bridges.html          Bridges content
    city-guide.html       City guide with complex expressions
    cars.html             Classic cars content
```

## For your own project

```html
<!-- Load once -->
<script src="alap.iife.js"></script>
<script src="config.js"></script>
<script>
  Alap.registerConfig(alapConfig);
  Alap.defineAlapLink();
</script>
<script src="https://unpkg.com/htmx.org@2/dist/htmx.min.js"></script>

<!-- htmx swaps fragments into #content -->
<button hx-get="/api/page" hx-target="#content">Load</button>
<div id="content"></div>

<!-- Fragments contain alap-link — they just work -->
<!-- /api/page returns: -->
<p>Visit <alap-link query=".coffee">cafes</alap-link>.</p>
```

No special htmx extensions, no mutation observers, no lifecycle hooks. The web component standard handles it.

## See also

- [CDN example](../cdn/) — similar zero-build approach, no htmx
- [Web Component guide](../../../docs/framework-guides/web-component.md) — `<alap-link>` in depth
- [WordPress plugin](../../../plugins/wordpress/) — another zero-framework integration
