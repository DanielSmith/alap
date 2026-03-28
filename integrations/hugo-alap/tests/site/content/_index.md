---
title: "Tests"
---

<!-- TEST: positional-param -->
{{< alap ".coffee" >}}cafes{{< /alap >}}

<!-- TEST: named-param -->
{{< alap query=".coffee" >}}cafes{{< /alap >}}

<!-- TEST: named-with-config -->
{{< alap query=".coffee" config="docs" >}}cafes{{< /alap >}}

<!-- TEST: complex-intersection -->
{{< alap ".nyc + .bridge" >}}NYC bridges{{< /alap >}}

<!-- TEST: complex-union -->
{{< alap ".nyc | .sf" >}}NYC or SF{{< /alap >}}

<!-- TEST: complex-subtraction -->
{{< alap ".nyc - .bridge" >}}NYC without bridges{{< /alap >}}

<!-- TEST: complex-combined -->
{{< alap ".nyc | .sf - .tourist" >}}NYC or SF minus tourist{{< /alap >}}

<!-- TEST: macro -->
{{< alap "@favorites" >}}my links{{< /alap >}}

<!-- TEST: regex -->
{{< alap "/bridge/l" >}}regex search{{< /alap >}}

<!-- TEST: protocol -->
{{< alap ":web:api.example.com:" >}}protocol{{< /alap >}}

<!-- TEST: refiner -->
{{< alap ".coffee *top3*" >}}refined{{< /alap >}}

<!-- TEST: empty-query -->
{{< alap "" >}}just text{{< /alap >}}

<!-- TEST: inner-html -->
{{< alap ".coffee" >}}coffee <em>spots</em>{{< /alap >}}

<!-- TEST: xss-query-script -->
{{< alap "<script>alert(1)</script>" >}}xss attempt{{< /alap >}}

<!-- TEST: xss-query-attribute -->
{{< alap "\" onmouseover=\"alert(1)\"" >}}attr injection{{< /alap >}}

<!-- TEST: xss-query-event -->
{{< alap "' onclick='alert(1)'" >}}event injection{{< /alap >}}
