# Examples

## Tags

Find some <alap-link query=".coffee">good coffee</alap-link> or visit <alap-link query=".nyc">New York landmarks</alap-link>.

<details>
<summary>Expressions used</summary>

```html
<alap-link query=".coffee">good coffee</alap-link>
<alap-link query=".nyc">New York landmarks</alap-link>
```

`.coffee` matches all items tagged `coffee`. `.nyc` matches all items tagged `nyc`.

</details>

## Operators

<alap-link query=".nyc + .bridge">NYC bridges</alap-link> uses intersection — items tagged both `nyc` and `bridge`. <alap-link query=".nyc | .sf">NYC or SF</alap-link> uses union — items from either city. <alap-link query=".nyc - .bridge">NYC without bridges</alap-link> uses subtraction — NYC items, minus the bridges.

<details>
<summary>Expressions used</summary>

```html
<alap-link query=".nyc + .bridge">NYC bridges</alap-link>
<alap-link query=".nyc | .sf">NYC or SF</alap-link>
<alap-link query=".nyc - .bridge">NYC without bridges</alap-link>
```

- `+` (AND) — intersection: items matching both tags
- `|` (OR) — union: items matching either tag
- `-` (WITHOUT) — subtraction: remove items matching the second tag

</details>

## Macros

The <alap-link query="@cars">cars</alap-link> macro expands to all items tagged `car`.

<details>
<summary>Expressions used</summary>

```html
<alap-link query="@cars">cars</alap-link>
```

`@cars` expands the macro named `cars`, which is defined as `.car` in the config.

</details>

## Direct IDs

Pick between <alap-link query="golden, brooklyn">two bridges</alap-link> by referencing item IDs directly.

<details>
<summary>Expressions used</summary>

```html
<alap-link query="golden, brooklyn">two bridges</alap-link>
```

`golden, brooklyn` references two items by their IDs. Commas separate independent lookups.

</details>
