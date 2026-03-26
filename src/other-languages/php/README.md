# Alap Expression Parser — PHP

[Alap](https://github.com/DanielSmith/alap) is a JavaScript library that turns links into dynamic menus with multiple curated targets. This is the server-side PHP port of the expression parser, enabling expression resolution in PHP servers without a Node.js sidecar.

## What's included

- **`ExpressionParser.php`** — Recursive descent parser for the Alap expression grammar, macro expansion, regex search, config merging, ReDoS validation

## What's NOT included

This is the server-side subset of `alap/core`. It covers expression parsing, config merging, and regex validation — everything a server needs to resolve cherry-pick and query requests.

Browser-side concerns (DOM rendering, menu positioning, event handling, URL sanitization) are handled by the JavaScript client and are not ported here.

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

```php
use App\Alap\ExpressionParser;

$config = [
    'allLinks' => [
        'item1' => ['label' => 'Example', 'url' => 'https://example.com', 'tags' => ['demo']],
        'item2' => ['label' => 'Other',   'url' => 'https://other.com',   'tags' => ['demo', 'test']],
    ],
    'macros' => [
        'all' => ['linkItems' => '.demo'],
    ],
];

// Low-level: get matching IDs
$parser = new ExpressionParser($config);
$ids = $parser->query('.demo');              // ['item1', 'item2']
$ids = $parser->query('.demo - .test');      // ['item1']

// Cherry-pick: expression -> [id => link] associative array
$subset = ExpressionParser::cherryPick($config, '.test');
// ['item2' => ['label' => 'Other', ...]]

// Resolve: expression -> array of link objects with 'id' key
$results = ExpressionParser::resolve($config, '.demo');
// [['id' => 'item1', 'label' => 'Example', ...], ['id' => 'item2', ...]]

// Merge multiple configs
$merged = ExpressionParser::mergeConfigs($config1, $config2);
```

## Installation

Copy `ExpressionParser.php` into your project (update the namespace as needed), or install via Composer:

```bash
composer require danielsmith/alap
```

## Used by

- [laravel-sqlite](https://github.com/DanielSmith/alap/tree/main/examples/servers/laravel-sqlite) server
