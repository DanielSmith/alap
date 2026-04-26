---
source: framework-guides/astro.md
modified: '2026-04-15T15:42:57Z'
tags:
- framework_guides
title: Astro
description: '**Framework Guides:** Vanilla DOM · Web Component · React · Vue · Svelte
  · SolidJS · **This Page** · Alpine.js · Eleventy'
---
# Astro

**[[framework-guides/README|Framework Guides]]:** [[framework-guides/vanilla-dom|Vanilla DOM]] · [[framework-guides/web-component|Web Component]] · [[framework-guides/react|React]] · [[framework-guides/vue|Vue]] · [[framework-guides/svelte|Svelte]] · [[framework-guides/solid|SolidJS]] · **This Page** · [[framework-guides/alpine|Alpine.js]] · [[framework-guides/eleventy|Eleventy]]

> Live version with interactive examples: https://alap.info/framework-guides/astro

## Install

```bash
npm install alap astro
```

## Setup

The Astro adapter wraps the `<alap-link>` web component with typed `.astro` components.

```astro
---
import { AlapSetup, AlapLink } from 'alap/astro';
import config from '../alap-config';
---
<AlapSetup config={config} />

<p>Check out these <AlapLink query=".coffee">cafes</AlapLink>.</p>
```

The web component (`<alap-link>`) also works directly in Astro with zero extra code — it's a custom element, so Astro treats it as static HTML with a client-side script.

## Components

### `<AlapSetup>`

| Prop | Type | Description |
|------|------|-------------|
| `config` | `AlapConfig` | The link configuration |
| `configName` | `string` | Named config slot (for multi-config) |

### `<AlapLink>`

| Prop | Type | Description |
|------|------|-------------|
| `query` | `string` | Expression to evaluate |
| `config` | `string` | Named config to use |
| Any HTML attribute | — | Passed through to `<alap-link>` (e.g. `placement="N, clamp"`) |

## Examples

**Multi-config:**

```astro
---
import { AlapSetup, AlapLink } from 'alap/astro';
import docsConfig from '../configs/docs-links';
import blogConfig from '../configs/blog-links';
---
<AlapSetup config={docsConfig} configName="docs" />
<AlapSetup config={blogConfig} configName="blog" />

<p>See the <AlapLink query=".api" config="docs">API docs</AlapLink>.</p>
<p>Or read <AlapLink query="@latest" config="blog">the latest post</AlapLink>.</p>
```

**Direct web component (no Astro adapter):**

```astro
---
import { registerConfig, defineAlapLink } from 'alap';
import config from '../alap-config';
---



<alap-link query=".coffee">cafes</alap-link>
```

## Styling

Since the Astro adapter renders `<alap-link>` web components, styling works the same way — `--alap-*` custom properties and `::part()` selectors. See [[framework-guides/web-component|Web Component]] for the full CSS reference.
