---
source: cookbook/language-ports.md
modified: '2026-04-25T16:19:25Z'
tags:
- cookbook
title: Language Ports
description: '**Cookbook:** **This Page** · Editors · Markdown · Rich-Text · Accessibility
  · Existing URLs · Images & Media'
---
# Language Ports

**[[cookbook/README|Cookbook]]:** **This Page** · [[cookbook/editors|Editors]] · [[cookbook/markdown|Markdown]] · [[cookbook/rich-text|Rich-Text]] · [[cookbook/accessibility|Accessibility]] · [[cookbook/existing-urls|Existing URLs]] · [[cookbook/images-and-media|Images & Media]]

Native ports of the Alap expression parser for Python, PHP, Go, Rust, Ruby, and Java. These enable server-side expression resolution without a Node.js sidecar.

> Live version: https://alap.info/cookbook/language-ports

Source: `src/other-languages/`

## What's included

| Module | Python | PHP | Go | Rust | Ruby | Java |
|--------|--------|-----|-----|------|------|------|
| Expression parser | `expression_parser.py` | `ExpressionParser.php` | `alap.go` | `alap-core` crate | `expression_parser.rb` | `ExpressionParser.java` |
| Regex validator | `validate_regex.py` | Built-in | Built-in | Built-in | `validate_regex.rb` | `ValidateRegex.java` |
| URL sanitizer | `sanitize_url.py` | Built-in | Built-in | Built-in | `sanitize_url.rb` | `SanitizeUrl.java` |
| Config validator | Built-in | Built-in | Built-in | `validate_config.rs` | `validate_config.rb` | `ValidateConfig.java` |
| SSRF guard | `ssrf_guard.py` | Built-in | Built-in | `ssrf_guard.rs` | `ssrf_guard.rb` | `SsrfGuard.java` |
| Config merger | Built-in | Built-in | Built-in | Built-in | Built-in | Built-in |

All ports support the full expression grammar including:
- Item IDs, tags (`.coffee`), macros (`@favorites`)
- Operators (`+`, `|`, `-`) with left-to-right evaluation
- Parenthesized grouping (up to 32 levels)
- Regex search (`/pattern/fields`)
- Protocol expressions (`:time:30d:`, `:location:radius:args:`)
- Refiners (`*sort:label*`, `*limit:5*`)

All ports share the `\w` identifier constraint — item IDs, macro names, and tag names cannot contain hyphens (the `-` character is the WITHOUT operator).

## Security parity

All ports include the same security layers as the TypeScript implementation:

| Feature | Python | PHP | Go | Rust | Java |
|---------|--------|-----|-----|------|------|
| URL sanitization | yes | yes | yes | yes | yes |
| Prototype-pollution defense | yes (+ dunders) | yes | yes | yes | yes |
| Resource limits (depth/tokens) | yes | yes | yes | yes | yes |
| ReDoS detection | syntactic | syntactic + `pcre.backtrack_limit` | N/A (RE2) | N/A (safe engine) | syntactic |
| `validateConfig` | yes | yes | yes | yes | yes |
| SSRF guard | yes | yes | yes | yes | yes |

**Language-specific defenses:**
- **Python:** Blocks dunder keys (`__class__`, `__bases__`, `__mro__`, `__subclasses__`) in `validate_config` — keeps configs passed downstream to Jinja2 or logging formatters from carrying handles into Python internals.
- **PHP:** Rejects non-array input to `validateConfig()` (enforces `json_decode($json, true)`). Wraps regex execution with `pcre.backtrack_limit` as a circuit breaker.
- **Go:** SSRF guard handles IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) via `net.IP.To4()`.
- **Rust:** SSRF guard blocks hex/octal/integer IP obfuscation (`0x7f.0.0.1`, `0177.0.0.1`, `2130706433`).
- **Java:** SSRF guard uses `InetAddress` for resolution with loopback/link-local/site-local checks.

See [[api-reference/security|Security]] for the full cross-language matrix.

## What's NOT included

These are server-side ports. Browser-side concerns stay in the TypeScript client:

- DOM rendering, compass-based menu placement (flip/clamp/place strategies), event handling
- Viewport containment and placement fallback logic
- CSS injection, `alapelem` container management

## Python

```bash
pip install alap
# or: uv add alap
```

```python
from expression_parser import ExpressionParser, resolve_expression, cherry_pick_links, merge_configs

config = load_config_from_db()
parser = ExpressionParser(config)
ids = parser.query('.coffee + .nyc')
links = resolve_expression(config, '.coffee')
```

Tests: 50+ tests covering operands, operators, macros, parentheses, regex, protocols, refiners.

## PHP

```bash
composer require danielsmith/alap
```

```php
use Alap\ExpressionParser;

$config = json_decode(file_get_contents('config.json'), true);
$parser = new ExpressionParser($config);
$ids = $parser->query('.coffee + .nyc');
```

Tests: PHPUnit suite with 50+ tests.

## Go

```go
import "github.com/DanielSmith/alap-go"

config := loadConfig()
parser := alap.NewExpressionParser(config)
ids := parser.Query(".coffee + .nyc")
```

Tests: 50+ tests via `go test`.

## Rust

```toml
[dependencies]
alap = "0.1"
```

```rust
use alap::ExpressionParser;

let config = load_config();
let parser = ExpressionParser::new(&config);
let ids = parser.query(".coffee + .nyc");
```

Tests: Full test suite via `cargo test`. The Rust port uses edition 2024.

## Java

```java
import alap.ExpressionParser;
import alap.Config;

Config config = loadConfig();
ExpressionParser parser = new ExpressionParser(config);
List<String> ids = parser.query(".coffee + .nyc");
```

Tests: 90+ tests via JUnit.

## Used by the server examples

The language ports power expression resolution in the non-Node servers:

| Server | Parser |
|--------|--------|
| Flask, Django, FastAPI | Python port |
| Laravel | PHP port |
| Gin | Go port |
| Axum | Rust port |
| Spring Boot | Java port |
| Express, Hono, Bun | TypeScript `alap/core` |

See [[api-reference/servers|Servers]] for the full server matrix.
