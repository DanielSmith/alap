---
title: "Coffee"
---

## Coffee

We're serious about coffee. Browse {{< alap "@coffee" >}}all our picks{{< /alap >}},
or narrow it down to {{< alap ".coffee + .sf" >}}SF roasters{{< /alap >}} if you're on the West Coast.

There's great coffee in {{< alap ".coffee + .nyc" >}}New York{{< /alap >}},
{{< alap ".coffee + .portland" >}}Portland{{< /alap >}}, and
{{< alap ".coffee + .seattle" >}}Seattle{{< /alap >}} too.
And if you're in wine country, check out the
{{< alap ".coffee + .sonoma" >}}Sonoma County roasters{{< /alap >}}.

## After Coffee

Grab your cup and walk. In New York, the {{< alap "@nyc_parks" >}}parks{{< /alap >}} are
steps from most coffee shops. In SF, pick up a coffee and head to
{{< alap ".sf + .park | .sf + .landmark" >}}a park or landmark{{< /alap >}} and watch the city go by.

## Everything Except Coffee

Sometimes you just want to explore. Here's
{{< alap ".nyc | .sf - .coffee" >}}everything in NYC and SF that isn't coffee{{< /alap >}}.

## Expressions

The shortcode passes expressions straight through to the web component. Here are some
ways to query coffee:

<div class="example">
<div class="source">
<pre><code>All picks:       {{</* alap "@coffee" */>}}all our picks{{</* /alap */>}}
SF roasters:     {{</* alap ".coffee + .sf" */>}}SF roasters{{</* /alap */>}}
New York:        {{</* alap ".coffee + .nyc" */>}}New York{{</* /alap */>}}
Portland:        {{</* alap ".coffee + .portland" */>}}Portland{{</* /alap */>}}
Seattle:         {{</* alap ".coffee + .seattle" */>}}Seattle{{</* /alap */>}}
Sonoma:          {{</* alap ".coffee + .sonoma" */>}}Sonoma County roasters{{</* /alap */>}}</code></pre>
</div>
<div class="result">

All picks: {{< alap "@coffee" >}}all our picks{{< /alap >}}

SF roasters: {{< alap ".coffee + .sf" >}}SF roasters{{< /alap >}}

New York: {{< alap ".coffee + .nyc" >}}New York{{< /alap >}}

Portland: {{< alap ".coffee + .portland" >}}Portland{{< /alap >}}

Seattle: {{< alap ".coffee + .seattle" >}}Seattle{{< /alap >}}

Sonoma: {{< alap ".coffee + .sonoma" >}}Sonoma County roasters{{< /alap >}}

</div>
</div>
