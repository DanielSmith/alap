---
title: "Bridges"
---

## By City

New York's {{< alap "@nyc_bridges" >}}bridge collection{{< /alap >}} is hard to beat,
but San Francisco's {{< alap ".sf + .landmark" >}}landmarks{{< /alap >}} are in a league of their own.

See {{< alap "@all_bridges" >}}all bridges{{< /alap >}} if you can't decide.

## Expressions

The shortcode passes expressions straight through to the web component.
Here are some ways to query:

<div class="example">
<div class="source">
<pre><code>Tag query:       {{</* alap ".bridge" */>}}all bridges{{</*/* /alap */>}}
Intersection:    {{</* alap ".nyc + .bridge" */>}}NYC bridges{{</*/* /alap */>}}
Union:           {{</* alap ".bridge | .park" */>}}bridges or parks{{</*/* /alap */>}}
Subtraction:     {{</* alap ".bridge - .nyc" */>}}non-NYC bridges{{</*/* /alap */>}}
Combined:        {{</* alap ".nyc | .sf - .coffee" */>}}NYC+SF minus coffee{{</*/* /alap */>}}
Macro:           {{</* alap "@nyc_bridges" */>}}NYC bridges (via macro){{</*/* /alap */>}}
Item ID:         {{</* alap "brooklyn" */>}}Brooklyn Bridge{{</*/* /alap */>}}</code></pre>
</div>
<div class="result">

Tag query: {{< alap ".bridge" >}}all bridges{{< /alap >}}

Intersection: {{< alap ".nyc + .bridge" >}}NYC bridges{{< /alap >}}

Union: {{< alap ".bridge | .park" >}}bridges or parks{{< /alap >}}

Subtraction: {{< alap ".bridge - .nyc" >}}non-NYC bridges{{< /alap >}}

Combined: {{< alap ".nyc | .sf - .coffee" >}}NYC+SF minus coffee{{< /alap >}}

Macro: {{< alap "@nyc_bridges" >}}NYC bridges (via macro){{< /alap >}}

Item ID: {{< alap "brooklyn" >}}Brooklyn Bridge{{< /alap >}}

</div>
</div>
