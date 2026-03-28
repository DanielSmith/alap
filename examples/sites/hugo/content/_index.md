---
title: "Alap + Hugo"
---

## Inline Links

The `alap` shortcode turns any text into a clickable menu trigger. Write it inline, the way you'd write a regular link.

<div class="example">
<div class="source">
<pre><code>Check out some {{</*/* alap ".coffee" */*/>}}coffee spots{{</*/* /alap */*/>}}
or famous {{</*/* alap ".bridge" */*/>}}bridges{{</*/* /alap */*/>}}.</code></pre>
</div>
<div class="result">

Check out some {{< alap ".coffee" >}}coffee spots{{< /alap >}}
or famous {{< alap ".bridge" >}}bridges{{< /alap >}}.

</div>
</div>

## Expressions

The full expression language works — intersections, unions, subtraction, macros.

<div class="example">
<div class="source">
<pre><code>Only the {{</*/* alap ".nyc + .bridge" */*/>}}NYC bridges{{</*/* /alap */*/>}},
or everything in {{</*/* alap ".nyc | .sf - .coffee" */*/>}}NYC and SF except coffee{{</*/* /alap */*/>}}.

A macro: {{</*/* alap "@cars" */*/>}}favorite cars{{</*/* /alap */*/>}}.</code></pre>
</div>
<div class="result">

Only the {{< alap ".nyc + .bridge" >}}NYC bridges{{< /alap >}},
or everything in {{< alap ".nyc | .sf - .coffee" >}}NYC and SF except coffee{{< /alap >}}.

A macro: {{< alap "@cars" >}}favorite cars{{< /alap >}}.

</div>
</div>

## Setup

<div class="example">
<pre><code># hugo.toml
[module]
  [[module.imports]]
    path = "github.com/DanielSmith/alap/integrations/hugo-alap"

# Or just copy layouts/shortcodes/alap.html into your project</code></pre>
</div>
