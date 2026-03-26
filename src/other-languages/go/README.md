# Alap Expression Parser — Go

[Alap](https://github.com/DanielSmith/alap) is a JavaScript library that turns links into dynamic menus with multiple curated targets. This is the server-side Go port of the expression parser, enabling expression resolution in Go servers without a Node.js sidecar.

## What's included

- **`alap.go`** — Recursive descent parser, macro expansion, regex search, config merging, URL sanitization, ReDoS validation — all in one file

## What's NOT included

This is the server-side subset of `alap/core`. It covers expression parsing, config merging, regex validation, and URL sanitization — everything a server needs to resolve cherry-pick and query requests.

Browser-side concerns (DOM rendering, menu positioning, event handling) are handled by the JavaScript client and are not ported here.

## Supported expression syntax

```
item1, item2              # item IDs (comma-separated)
.coffee                   # tag query
.nyc + .bridge            # AND (intersection)
.nyc | .sf                # OR (union)
.nyc - .tourist           # WITHOUT (subtraction)
(.nyc | .sf) + .open      # parenthesized grouping
@favorites                # macro expansion
/mypattern/               # regex search (by pattern key)
/mypattern/lu             # regex with field options
```

## Usage

```go
import "github.com/DanielSmith/alap-go"

config := loadConfigFromDB() // your *alap.Config

// Low-level: expression → list of IDs
parser := alap.NewParser(config)
ids := parser.Query(".nyc + .bridge", "")  // ["brooklyn", "manhattan"]

// Resolve: expression → full link objects (URLs sanitized)
results := alap.Resolve(config, ".nyc + .bridge")

// Cherry-pick: expression → map[id]Link (URLs sanitized)
subset := alap.CherryPick(config, ".car")

// Merge multiple configs
merged := alap.MergeConfigs(config1, config2)

// URL sanitization (standalone)
safe := alap.SanitizeURL(url) // "about:blank" if dangerous
```

## Tests

```bash
go test -v ./...
```

35 tests covering operands, commas, operators, chaining, macros, parentheses, edge cases, convenience functions, and URL sanitization.

## Used by

- [gin-sqlite](https://github.com/DanielSmith/alap/tree/main/examples/servers/gin-sqlite) server
