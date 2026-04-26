---
source: framework-guides/vue.md
modified: '2026-04-23T16:23:48Z'
tags:
- framework_guides
title: Vue
description: '**Framework Guides:** Vanilla DOM · Web Component · React · **This Page**
  · Svelte · SolidJS · Astro · Alpine.js · Eleventy'
---
# Vue

**[[framework-guides/README|Framework Guides]]:** [[framework-guides/vanilla-dom|Vanilla DOM]] · [[framework-guides/web-component|Web Component]] · [[framework-guides/react|React]] · **This Page** · [[framework-guides/svelte|Svelte]] · [[framework-guides/solid|SolidJS]] · [[framework-guides/astro|Astro]] · [[framework-guides/alpine|Alpine.js]] · [[framework-guides/eleventy|Eleventy]]

> Live version with interactive examples: https://alap.info/framework-guides/vue

## Install

```bash
npm install alap vue
```

## Setup

```vue


<template>
  <AlapProvider :config="config">
    <p>Check out <AlapLink query=".coffee">cafes</AlapLink>.</p>
  </AlapProvider>
</template>
```

## Components

Same Provider/Link/Hook pattern as React. Vue-specific differences:

- Props passed as Vue attributes (`:config`, `:query`)
- Events emitted as `@trigger-hover`, `@item-hover`, `@item-context`, etc.
- `useAlap()` is a composable (call in `

<template>
  <AlapProvider :config="config">
    <p>Check out <AlapLink query=".coffee" @item-hover="handleHover">cafes</AlapLink>.</p>
    <p>Or explore <AlapLink query=".nyc + .bridge">NYC bridges</AlapLink>.</p>
  </AlapProvider>
</template>
```
