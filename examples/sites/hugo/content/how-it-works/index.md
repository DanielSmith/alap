---
title: "How It Works"
---

## The Shortcode

One shortcode, one job: wrap your text in an `<alap-link>` web component.

<div class="example">
<div class="source">
<pre><code>{{</* alap ".coffee" */>}}cafes{{</*/* /alap */>}}</code></pre>
</div>
<div class="result">

becomes: `<alap-link query=".coffee">cafes</alap-link>`

</div>
</div>

The web component handles everything else — parsing the expression, looking up matching links, rendering the menu, keyboard navigation, dismissal.

## Named Parameters

For multi-config setups, pass `query` and `config` as named parameters:

<div class="example">
<div class="source">
<pre><code>{{</* alap query=".coffee" config="docs" */>}}cafes{{</*/* /alap */>}}</code></pre>
</div>
<div class="result">

becomes: `<alap-link query=".coffee" config="docs">cafes</alap-link>`

</div>
</div>

## Full Expression Language

Every Alap feature works because the shortcode doesn't interpret the query — it passes it through. Tags, macros, operators, regex search, protocols, refiners, future syntax additions — all handled client-side.

| Syntax | Example | What it does |
|--------|---------|-------------|
| `.tag` | {{< alap ".bridge" >}}.bridge{{< /alap >}} | All items with this tag |
| `id` | {{< alap "brooklyn" >}}brooklyn{{< /alap >}} | A specific item |
| `@macro` | {{< alap "@cars" >}}@cars{{< /alap >}} | Expand a named macro |
| `.a + .b` | {{< alap ".nyc + .bridge" >}}.nyc + .bridge{{< /alap >}} | Intersection |
| `.a | .b` | {{< alap ".nyc | .sf" >}}.nyc | .sf{{< /alap >}} | Union |
| `.a - .b` | {{< alap ".bridge - .nyc" >}}.bridge - .nyc{{< /alap >}} | Subtraction |

## Setup

Two files in `static/js/`:

**1. The runtime** — `alap.iife.js` from npm or CDN

**2. Your config** — `alap-config.js` with your link library

Then include the `alap-head` partial in your base template:

```html
{{ partial "alap-head.html" . }}
```

That's it. No build step, no npm in your Hugo project.
