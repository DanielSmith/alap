# Other Language Ports

Server-side ports of the Alap expression parser for non-JavaScript environments.

The canonical implementation lives in `src/core/` (TypeScript). These ports cover the server-side subset: expression parsing, config merging, regex validation, and URL sanitization. They do **not** include browser-side rendering, DOM handling, or menu UI — those are handled by the JavaScript client.

| Language | Directory | Repo | Package |
|----------|-----------|------|---------|
| Python   | [python/](python/) | [alap-python](https://github.com/DanielSmith/alap-python) | `pip install alap` |
| PHP      | [php/](php/)       | [alap-php](https://github.com/DanielSmith/alap-php) | `composer require danielsmith/alap` |
| Go       | [go/](go/)         | [alap-go](https://github.com/DanielSmith/alap-go) | `go get github.com/DanielSmith/alap-go` |
| Rust     | [rust/](rust/)     | [alap-rust](https://github.com/DanielSmith/alap-rust) | `cargo add alap` |

All ports implement the same recursive descent parser and pass the same expression grammar:

- Item IDs, `.tag` queries, `@macro` expansion
- `+` (AND/intersection), `|` (OR/union), `-` (WITHOUT/subtraction)
- Parenthesized grouping
- `/regex/` search with field options
- Config merging
- URL sanitization (`javascript:`, `data:`, `vbscript:`, `blob:` blocked)

Each port includes a test suite (Python: pytest, PHP: PHPUnit, Go: `go test`, Rust: `cargo test`). See each directory's README for usage and testing instructions.
