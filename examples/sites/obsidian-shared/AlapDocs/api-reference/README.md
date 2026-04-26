---
source: api-reference/README.md
modified: '2026-04-16T04:29:05Z'
tags:
- api_reference
title: API Reference
description: Types, methods, and contracts — the dry details.
---
# API Reference

Types, methods, and contracts — the dry details.

## Core

| Page | What it covers |
|------|----------------|
| [[api-reference/engine|Engine]] | `AlapEngine`, `ExpressionParser`, `mergeConfigs`, `validateConfig`, `sanitizeUrl`, shared utilities |
| [[api-reference/types|Types]] | `AlapConfig`, `AlapLink`, `AlapSettings`, `AlapMacro`, `AlapSearchPattern`, `AlapProtocol`, constants |
| [[api-reference/config-registry|Config Registry]] | `registerConfig`, `updateRegisteredConfig`, `getEngine`, `getConfig`, named configs |

## Renderers

| Page | What it covers |
|------|----------------|
| [[api-reference/lightbox|Lightbox]] | `AlapLightbox`, `<alap-lightbox>`, options, CSS custom properties, `::part()` selectors |
| [[api-reference/lens|Lens]] | `AlapLens`, `<alap-lens>`, options, transitions, meta fields, CSS custom properties, `::part()` selectors |
| [[api-reference/embeds|Embeds]] | `createEmbed`, providers (YouTube, Vimeo, Spotify, CodePen, CodeSandbox), consent management |
| [[api-reference/placement|Placement]] | `computePlacement`, `parsePlacement`, strategies (place/flip/clamp), fallback order, DOM helpers |
| [[api-reference/coordinators|Coordinators]] | `RendererCoordinator` (transitions, View Transitions API), `InstanceCoordinator` (cross-instance dismiss) |

## Infrastructure

| Page | What it covers |
|------|----------------|
| [[api-reference/events|Events]] | Event types, delivery by adapter, keyboard navigation, hook filtering, dismiss behavior |
| [[api-reference/storage|Storage]] | `ConfigStore` interface, `createIndexedDBStore`, `createRemoteStore`, `createHybridStore` |
| [[api-reference/security|Security]] | URL sanitization, ReDoS protection, config validation, parser resource limits |
| [[api-reference/servers|Servers]] | REST API contract (7 endpoints), 11 server examples, [OpenAPI spec](openapi.yaml), quick start |

## See also

- [[api-reference/types|Types]] is the reference companion to [[getting-started/configuration|Configuration]]
- [[api-reference/events|Events]] applies to every [Framework Guide](../framework-guides/)
- [[api-reference/security|Security]] is especially relevant when loading configs from [[api-reference/storage|Storage]] or [[api-reference/servers|Servers]]
- [[README|Full documentation index]]
