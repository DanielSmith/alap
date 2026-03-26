# API Reference

Types, methods, and contracts — the dry details.

| Page | What it covers |
|------|----------------|
| [Engine](engine.md) | `AlapEngine`, `ExpressionParser`, `mergeConfigs`, `validateConfig`, `sanitizeUrl`, shared utilities |
| [Types](types.md) | `AlapConfig`, `AlapLink`, `AlapSettings`, `AlapMacro`, `AlapSearchPattern`, `AlapProtocol`, constants |
| [Storage](storage.md) | `ConfigStore` interface, `createIndexedDBStore`, `createRemoteStore`, `createHybridStore` |
| [Events](events.md) | Event types, delivery by adapter, keyboard navigation, hook filtering, dismiss behavior |
| [Security](security.md) | URL sanitization, ReDoS protection, config validation, parser resource limits |
| [Servers](servers.md) | REST API contract (7 endpoints), 9 server examples, OpenAPI spec, quick start |

## See also

- [Types](types.md) is the reference companion to [Configuration](../getting-started/configuration.md)
- [Events](events.md) applies to every [Framework Guide](../framework-guides/)
- [Security](security.md) is especially relevant when loading configs from [Storage](storage.md) or [Servers](servers.md)
- [Full documentation index](../README.md)
