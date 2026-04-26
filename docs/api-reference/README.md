# API Reference

Types, methods, and contracts — the dry details.

## Core

| Page | What it covers |
|------|----------------|
| [Engine](engine.md) | `AlapEngine`, `ExpressionParser`, `mergeConfigs`, `validateConfig`, `sanitizeUrl`, shared utilities |
| [Types](types.md) | `AlapConfig`, `AlapLink`, `AlapSettings`, `AlapMacro`, `AlapSearchPattern`, `AlapProtocol`, constants |
| [Config Registry](config-registry.md) | `registerConfig`, `updateRegisteredConfig`, `getEngine`, `getConfig`, named configs |

## Renderers

| Page | What it covers |
|------|----------------|
| [Lightbox](lightbox.md) | `AlapLightbox`, `<alap-lightbox>`, options, CSS custom properties, `::part()` selectors |
| [Lens](lens.md) | `AlapLens`, `<alap-lens>`, options, transitions, meta fields, CSS custom properties, `::part()` selectors |
| [Embeds](embeds.md) | `createEmbed`, providers (YouTube, Vimeo, Spotify, CodePen, CodeSandbox), consent management |
| [Placement](placement.md) | `computePlacement`, `parsePlacement`, strategies (place/flip/clamp), fallback order, DOM helpers |
| [Coordinators](coordinators.md) | `RendererCoordinator` (transitions, View Transitions API), `InstanceCoordinator` (cross-instance dismiss) |

## Infrastructure

| Page | What it covers |
|------|----------------|
| [Events](events.md) | Event types, delivery by adapter, keyboard navigation, hook filtering, dismiss behavior |
| [Storage](storage.md) | `ConfigStore` interface, `createIndexedDBStore`, `createRemoteStore`, `createHybridStore` |
| [Security](security.md) | URL sanitization, ReDoS protection, config validation, parser resource limits |
| [Servers](servers.md) | REST API contract (7 endpoints), 11 server examples, [OpenAPI spec](openapi.yaml), quick start |

## See also

- [Types](types.md) is the reference companion to [Configuration](../getting-started/configuration.md)
- [Events](events.md) applies to every [Framework Guide](../framework-guides/)
- [Security](security.md) is especially relevant when loading configs from [Storage](storage.md) or [Servers](servers.md)
- [Full documentation index](../README.md)
