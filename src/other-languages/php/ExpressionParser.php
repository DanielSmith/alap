<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Alap expression parser — PHP port of src/core/ExpressionParser.ts.
 *
 * Recursive descent parser for Alap's expression grammar:
 *
 *   query   = segment (',' segment)*
 *   segment = term (op term)*
 *   op      = '+' | '|' | '-'
 *   term    = '(' segment ')' | atom
 *   atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
 *   refiner = '*' name (':' arg)* '*'
 *
 * Supports: item IDs, .tag queries, @macro expansion, /regex/ search,
 * :protocol:args: expressions, *refiner:args* pipelines,
 * parenthesized grouping, + (AND/intersection), | (OR/union), - (WITHOUT/subtraction).
 */

namespace Alap;

class ExpressionParser
{
    // Constants (mirrors src/constants.ts)
    private const MAX_DEPTH = 32;
    private const MAX_TOKENS = 1024;
    private const MAX_MACRO_EXPANSIONS = 10;
    private const MAX_REGEX_QUERIES = 5;
    private const MAX_SEARCH_RESULTS = 100;
    private const REGEX_TIMEOUT_MS = 20;
    private const MAX_REFINERS = 10;
    private const PCRE_BACKTRACK_LIMIT = 10000;

    private array $config;
    private int $depth = 0;
    private int $regexCount = 0;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function updateConfig(array $config): void
    {
        $this->config = $config;
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Parse an expression and return matching item IDs (deduplicated).
     */
    public function query(string $expression, ?string $anchorId = null): array
    {
        $expr = trim($expression);
        if ($expr === '') return [];

        $allLinks = $this->config['allLinks'] ?? null;
        if (! is_array($allLinks)) return [];

        $expanded = $this->expandMacros($expr, $anchorId);
        if ($expanded === '') return [];

        $tokens = $this->tokenize($expanded);
        if (empty($tokens)) return [];
        if (count($tokens) > self::MAX_TOKENS) return [];

        $this->depth = 0;
        $this->regexCount = 0;
        $pos = 0;
        $ids = $this->parseQuery($tokens, $pos);

        return array_values(array_unique($ids));
    }

    /**
     * Find all item IDs carrying a given tag.
     */
    public function searchByClass(string $className): array
    {
        $allLinks = $this->config['allLinks'] ?? [];
        $result = [];

        foreach ($allLinks as $id => $link) {
            if (! is_array($link)) continue;
            $tags = $link['tags'] ?? [];
            if (is_array($tags) && in_array($className, $tags, true)) {
                $result[] = (string) $id;
            }
        }

        return $result;
    }

    /**
     * Search allLinks using a named regex from config.searchPatterns.
     */
    public function searchByRegex(string $patternKey, ?string $fieldOpts = null): array
    {
        $this->regexCount++;
        if ($this->regexCount > self::MAX_REGEX_QUERIES) return [];

        $patterns = $this->config['searchPatterns'] ?? null;
        if (! is_array($patterns) || ! isset($patterns[$patternKey])) return [];

        $entry = $patterns[$patternKey];
        if (is_string($entry)) {
            $spec = ['pattern' => $entry];
        } else {
            $spec = $entry;
        }

        $patternStr = $spec['pattern'] ?? '';
        $regex = '/' . str_replace('/', '\/', $patternStr) . '/i';

        if (@preg_match($regex, '') === false) return [];

        $opts = $spec['options'] ?? [];
        $fields = $this->parseFieldCodes($fieldOpts ?: ($opts['fields'] ?? 'a') ?: 'a');

        $allLinks = $this->config['allLinks'] ?? [];
        if (empty($allLinks)) return [];

        $nowMs = microtime(true) * 1000;
        $maxAge = isset($opts['age']) ? $this->parseAge($opts['age']) : 0;
        $limit = min($opts['limit'] ?? self::MAX_SEARCH_RESULTS, self::MAX_SEARCH_RESULTS);
        $start = microtime(true);

        $result = [];

        foreach ($allLinks as $id => $link) {
            if (! is_array($link)) continue;

            // Timeout guard
            $elapsedMs = (microtime(true) - $start) * 1000;
            if ($elapsedMs > self::REGEX_TIMEOUT_MS) break;

            // Age filter
            if ($maxAge > 0) {
                $ts = $this->toTimestamp($link['createdAt'] ?? null);
                if ($ts === 0 || ($nowMs - $ts) > $maxAge) continue;
            }

            // Field matching
            if ($this->matchesFields($regex, (string) $id, $link, $fields)) {
                $ts = isset($link['createdAt']) ? $this->toTimestamp($link['createdAt']) : 0;
                $result[] = ['id' => (string) $id, 'createdAt' => $ts];
                if (count($result) >= self::MAX_SEARCH_RESULTS) break;
            }
        }

        // Sort
        $sort = $opts['sort'] ?? null;
        if ($sort === 'alpha') {
            usort($result, fn($a, $b) => strcmp($a['id'], $b['id']));
        } elseif ($sort === 'newest') {
            usort($result, fn($a, $b) => $b['createdAt'] <=> $a['createdAt']);
        } elseif ($sort === 'oldest') {
            usort($result, fn($a, $b) => $a['createdAt'] <=> $b['createdAt']);
        }

        return array_map(fn($r) => $r['id'], array_slice($result, 0, $limit));
    }

    // ------------------------------------------------------------------
    // Field helpers
    // ------------------------------------------------------------------

    private function parseFieldCodes(string $codes): array
    {
        $codes = preg_replace('/[\s,]/', '', $codes);
        $fields = [];
        $map = ['l' => 'label', 'u' => 'url', 't' => 'tags', 'd' => 'description', 'k' => 'id'];
        $all = ['label', 'url', 'tags', 'description', 'id'];

        for ($i = 0; $i < strlen($codes); $i++) {
            $ch = $codes[$i];
            if ($ch === 'a') {
                $fields = array_merge($fields, $all);
            } elseif (isset($map[$ch])) {
                $fields[] = $map[$ch];
            }
        }

        return array_unique($fields) ?: $all;
    }

    private function matchesFields(string $regex, string $id, array $link, array $fields): bool
    {
        if (in_array('id', $fields) && preg_match($regex, $id)) return true;
        if (in_array('label', $fields) && preg_match($regex, $link['label'] ?? '')) return true;
        if (in_array('url', $fields) && preg_match($regex, $link['url'] ?? '')) return true;
        if (in_array('description', $fields) && preg_match($regex, $link['description'] ?? '')) return true;
        if (in_array('tags', $fields) && is_array($link['tags'] ?? null)) {
            foreach ($link['tags'] as $tag) {
                if (preg_match($regex, $tag)) return true;
            }
        }

        return false;
    }

    private function parseAge(string $age): int
    {
        if (! preg_match('/^(\d+)\s*([dhwm])$/i', $age, $m)) return 0;
        $n = (int) $m[1];

        return match (strtolower($m[2])) {
            'h' => $n * 3600000,
            'd' => $n * 86400000,
            'w' => $n * 604800000,
            'm' => $n * 2592000000,
            default => 0,
        };
    }

    private function toTimestamp(mixed $value): int
    {
        if ($value === null) return 0;
        if (is_int($value) || is_float($value)) return (int) $value;
        $ts = strtotime((string) $value);

        return $ts !== false ? $ts * 1000 : 0;
    }

    // ------------------------------------------------------------------
    // Macro expansion
    // ------------------------------------------------------------------

    private function expandMacros(string $expr, ?string $anchorId): string
    {
        $result = $expr;

        for ($round = 0; $round < self::MAX_MACRO_EXPANSIONS; $round++) {
            if (strpos($result, '@') === false) break;
            $before = $result;

            $macros = $this->config['macros'] ?? [];
            $result = preg_replace_callback('/@(\w*)/', function ($m) use ($anchorId, $macros) {
                $name = $m[1] !== '' ? $m[1] : ($anchorId ?? '');
                if ($name === '') return '';
                $macro = $macros[$name] ?? null;
                if (! is_array($macro) || ! is_string($macro['linkItems'] ?? null)) return '';

                return $macro['linkItems'];
            }, $result);

            if ($result === $before) break;
        }

        return $result;
    }

    // ------------------------------------------------------------------
    // Tokenizer
    // ------------------------------------------------------------------

    private function tokenize(string $expr): array
    {
        $tokens = [];
        $i = 0;
        $n = strlen($expr);

        while ($i < $n) {
            $ch = $expr[$i];

            if (ctype_space($ch)) { $i++; continue; }

            if ($ch === '+') { $tokens[] = ['type' => 'PLUS', 'value' => '+']; $i++; continue; }
            if ($ch === '|') { $tokens[] = ['type' => 'PIPE', 'value' => '|']; $i++; continue; }
            if ($ch === '-') { $tokens[] = ['type' => 'MINUS', 'value' => '-']; $i++; continue; }
            if ($ch === ',') { $tokens[] = ['type' => 'COMMA', 'value' => ',']; $i++; continue; }
            if ($ch === '(') { $tokens[] = ['type' => 'LPAREN', 'value' => '(']; $i++; continue; }
            if ($ch === ')') { $tokens[] = ['type' => 'RPAREN', 'value' => ')']; $i++; continue; }

            // Class: .word (supports hyphens between word characters)
            if ($ch === '.') {
                $i++;
                $word = '';
                while ($i < $n) {
                    if (ctype_alnum($expr[$i]) || $expr[$i] === '_') {
                        $word .= $expr[$i];
                        $i++;
                    } elseif ($expr[$i] === '-' && ($i + 1) < $n && (ctype_alnum($expr[$i + 1]) || $expr[$i + 1] === '_')) {
                        $word .= $expr[$i];
                        $i++;
                    } else {
                        break;
                    }
                }
                if ($word !== '') $tokens[] = ['type' => 'CLASS', 'value' => $word];
                continue;
            }

            // DOM ref: #word
            if ($ch === '#') {
                $i++;
                $word = '';
                while ($i < $n && (ctype_alnum($expr[$i]) || $expr[$i] === '_')) {
                    $word .= $expr[$i];
                    $i++;
                }
                if ($word !== '') $tokens[] = ['type' => 'DOM_REF', 'value' => $word];
                continue;
            }

            // Regex search: /patternKey/options
            if ($ch === '/') {
                $i++; // skip opening /
                $key = '';
                while ($i < $n && $expr[$i] !== '/') {
                    $key .= $expr[$i];
                    $i++;
                }
                $opts = '';
                if ($i < $n && $expr[$i] === '/') {
                    $i++; // skip closing /
                    while ($i < $n && strpos('lutdka', $expr[$i]) !== false) {
                        $opts .= $expr[$i];
                        $i++;
                    }
                }
                if ($key !== '') {
                    $value = $opts !== '' ? "{$key}|{$opts}" : $key;
                    $tokens[] = ['type' => 'REGEX', 'value' => $value];
                }
                continue;
            }

            // Protocol: :name:arg1:arg2:
            if ($ch === ':') {
                $i++; // skip opening :
                $segments = '';
                while ($i < $n && $expr[$i] !== ':') {
                    $segments .= $expr[$i];
                    $i++;
                }
                // Collect remaining segments
                while ($i < $n && $expr[$i] === ':') {
                    $i++; // skip :
                    if ($i >= $n || preg_match('/[\s+|,()\\*\\/]/', $expr[$i])) break; // trailing : ends the protocol
                    $segments .= '|';
                    while ($i < $n && $expr[$i] !== ':') {
                        $segments .= $expr[$i];
                        $i++;
                    }
                }
                if ($segments !== '') {
                    $tokens[] = ['type' => 'PROTOCOL', 'value' => $segments];
                }
                continue;
            }

            // Refiner: *name* or *name:arg*
            if ($ch === '*') {
                $i++; // skip opening *
                $content = '';
                while ($i < $n && $expr[$i] !== '*') {
                    $content .= $expr[$i];
                    $i++;
                }
                if ($i < $n && $expr[$i] === '*') {
                    $i++; // skip closing *
                }
                if ($content !== '') {
                    $tokens[] = ['type' => 'REFINER', 'value' => $content];
                }
                continue;
            }

            // Bare word: item ID (supports hyphens between word characters)
            if (ctype_alnum($ch) || $ch === '_') {
                $word = '';
                while ($i < $n) {
                    if (ctype_alnum($expr[$i]) || $expr[$i] === '_') {
                        $word .= $expr[$i];
                        $i++;
                    } elseif ($expr[$i] === '-' && ($i + 1) < $n && (ctype_alnum($expr[$i + 1]) || $expr[$i + 1] === '_')) {
                        // Hyphen followed by word char — part of identifier
                        $word .= $expr[$i];
                        $i++;
                    } else {
                        break;
                    }
                }
                if ($word !== '') {
                    $tokens[] = ['type' => 'ITEM_ID', 'value' => $word];
                }
                continue;
            }

            // Unknown — skip
            $i++;
        }

        return $tokens;
    }

    // ------------------------------------------------------------------
    // Parser
    // ------------------------------------------------------------------

    private function parseQuery(array $tokens, int &$pos): array
    {
        $result = $this->parseSegment($tokens, $pos);

        while ($pos < count($tokens) && $tokens[$pos]['type'] === 'COMMA') {
            $pos++; // skip comma
            if ($pos >= count($tokens)) break;
            $next = $this->parseSegment($tokens, $pos);
            $result = array_merge($result, $next);
        }

        return $result;
    }

    private function parseSegment(array $tokens, int &$pos): array
    {
        if ($pos >= count($tokens)) return [];

        $startPos = $pos;
        $result = $this->parseTerm($tokens, $pos);
        $hasInitialTerm = $pos > $startPos;

        while ($pos < count($tokens)) {
            $type = $tokens[$pos]['type'];
            if ($type !== 'PLUS' && $type !== 'PIPE' && $type !== 'MINUS') break;

            $op = $type;
            $pos++; // skip operator

            if ($pos >= count($tokens)) break;

            $right = $this->parseTerm($tokens, $pos);

            if (! $hasInitialTerm) {
                $result = $right;
                $hasInitialTerm = true;
            } elseif ($op === 'PLUS') {
                $rightSet = array_flip($right);
                $result = array_filter($result, fn($id) => isset($rightSet[$id]));
                $result = array_values($result);
            } elseif ($op === 'PIPE') {
                $seen = array_flip($result);
                foreach ($right as $id) {
                    if (! isset($seen[$id])) {
                        $result[] = $id;
                        $seen[$id] = true;
                    }
                }
            } elseif ($op === 'MINUS') {
                $rightSet = array_flip($right);
                $result = array_filter($result, fn($id) => ! isset($rightSet[$id]));
                $result = array_values($result);
            }
        }

        // Collect trailing refiners
        $refiners = [];
        while ($pos < count($tokens) && $tokens[$pos]['type'] === 'REFINER') {
            if (count($refiners) >= self::MAX_REFINERS) {
                $pos++;
                continue;
            }
            $refiners[] = $tokens[$pos];
            $pos++;
        }

        if (! empty($refiners)) {
            $result = $this->applyRefiners($result, $refiners);
        }

        return $result;
    }

    private function parseTerm(array $tokens, int &$pos): array
    {
        if ($pos >= count($tokens)) return [];

        // Parenthesized group
        if ($tokens[$pos]['type'] === 'LPAREN') {
            $this->depth++;
            if ($this->depth > self::MAX_DEPTH) {
                $pos = count($tokens);

                return [];
            }
            $pos++; // skip (
            $inner = $this->parseSegment($tokens, $pos);
            if ($pos < count($tokens) && $tokens[$pos]['type'] === 'RPAREN') {
                $pos++; // skip )
            }
            $this->depth--;

            return $inner;
        }

        return $this->parseAtom($tokens, $pos);
    }

    private function parseAtom(array $tokens, int &$pos): array
    {
        if ($pos >= count($tokens)) return [];

        $token = $tokens[$pos];

        switch ($token['type']) {
            case 'ITEM_ID':
                $allLinks = $this->config['allLinks'] ?? [];
                $link = $allLinks[$token['value']] ?? null;
                $pos++;

                return ($link && is_array($link)) ? [$token['value']] : [];

            case 'CLASS':
                $pos++;

                return $this->searchByClass($token['value']);

            case 'REGEX':
                $pos++;
                if (str_contains($token['value'], '|')) {
                    [$patternKey, $fOpts] = explode('|', $token['value'], 2);
                } else {
                    $patternKey = $token['value'];
                    $fOpts = null;
                }

                return $this->searchByRegex($patternKey, $fOpts);

            case 'PROTOCOL':
                $pos++;

                return $this->resolveProtocol($token['value']);

            case 'DOM_REF':
                $pos++;

                return []; // reserved

            default:
                return []; // don't consume
        }
    }

    // ------------------------------------------------------------------
    // Protocol resolution
    // ------------------------------------------------------------------

    /**
     * Resolve a protocol expression against the link registry.
     *
     * Looks up the handler in config['protocols'][$name], runs the predicate
     * against every link, returns matching IDs.
     */
    private function resolveProtocol(string $value): array
    {
        $segments = explode('|', $value);
        $protocolName = $segments[0];
        $args = array_slice($segments, 1);

        $protocol = $this->config['protocols'][$protocolName] ?? null;
        if ($protocol === null || ! is_callable($protocol)) {
            // Protocol not found
            return [];
        }

        $allLinks = $this->config['allLinks'] ?? [];
        if (empty($allLinks)) return [];

        $result = [];
        foreach ($allLinks as $id => $link) {
            if (! is_array($link)) continue;
            try {
                if ($protocol($args, $link, (string) $id)) {
                    $result[] = (string) $id;
                }
            } catch (\Throwable) {
                // Handler threw — skip this item
            }
        }

        return $result;
    }

    // ------------------------------------------------------------------
    // Refiner pipeline
    // ------------------------------------------------------------------

    /**
     * Parse a refiner token value (e.g. "sort:label") into name + args.
     */
    private static function parseRefinerStep(string $value): array
    {
        $parts = explode(':', $value);

        return ['name' => $parts[0], 'args' => array_slice($parts, 1)];
    }

    /**
     * Apply refiners to a set of IDs. Resolves IDs to link objects,
     * applies each refiner step, returns refined ID list.
     */
    private function applyRefiners(array $ids, array $refiners): array
    {
        if (empty($refiners)) return $ids;

        $allLinks = $this->config['allLinks'] ?? [];

        // Resolve IDs to link objects with 'id' key
        $links = [];
        foreach ($ids as $id) {
            $link = $allLinks[$id] ?? null;
            if ($link !== null && is_array($link)) {
                $links[] = array_merge(['id' => $id], $link);
            }
        }

        // Apply each refiner
        foreach ($refiners as $refinerToken) {
            $step = self::parseRefinerStep($refinerToken['value']);

            switch ($step['name']) {
                case 'sort':
                    $field = $step['args'][0] ?? 'label';
                    usort($links, function (array $a, array $b) use ($field) {
                        $aVal = $field === 'id' ? $a['id'] : (string) ($a[$field] ?? '');
                        $bVal = $field === 'id' ? $b['id'] : (string) ($b[$field] ?? '');

                        return strcmp($aVal, $bVal);
                    });
                    break;

                case 'reverse':
                    $links = array_reverse($links);
                    break;

                case 'limit':
                    $n = (int) ($step['args'][0] ?? 0);
                    if ($n >= 0) {
                        $links = array_slice($links, 0, $n);
                    }
                    break;

                case 'skip':
                    $n = (int) ($step['args'][0] ?? 0);
                    if ($n > 0) {
                        $links = array_slice($links, $n);
                    }
                    break;

                case 'shuffle':
                    shuffle($links);
                    break;

                case 'unique':
                    $field = $step['args'][0] ?? 'url';
                    $seen = [];
                    $links = array_values(array_filter($links, function (array $link) use ($field, &$seen) {
                        $val = $field === 'id' ? $link['id'] : (string) ($link[$field] ?? '');
                        if (isset($seen[$val])) return false;
                        $seen[$val] = true;

                        return true;
                    }));
                    break;

                default:
                    // Unknown refiner — skip
                    break;
            }
        }

        return array_map(fn(array $link) => $link['id'], $links);
    }

    // ------------------------------------------------------------------
    // URL sanitization
    // ------------------------------------------------------------------

    /**
     * Sanitize a URL to prevent XSS via dangerous URI schemes.
     *
     * Allows: http, https, mailto, tel, relative URLs, empty string.
     * Blocks: javascript, data, vbscript, blob (and case/whitespace variations).
     */
    public static function sanitizeUrl(string $url): string
    {
        if ($url === '') return $url;

        $normalized = trim(preg_replace('/[\x00-\x1f\x7f]/', '', $url));

        if (preg_match('/^(javascript|data|vbscript|blob)\s*:/i', $normalized)) {
            return 'about:blank';
        }

        return $url;
    }

    /**
     * Return a copy of a link array with its URL sanitized.
     */
    private static function sanitizeLink(array $link): array
    {
        $url = $link['url'] ?? null;
        if (is_string($url) && $url !== '') {
            $safe = self::sanitizeUrl($url);
            if ($safe !== $url) {
                $link['url'] = $safe;
            }
        }

        return $link;
    }

    // ------------------------------------------------------------------
    // Static convenience methods (mirror Python's module-level helpers)
    // ------------------------------------------------------------------

    /**
     * Resolve expression → subset of allLinks keyed by ID.
     */
    public static function cherryPick(array $config, string $expression): array
    {
        $parser = new self($config);
        $ids = $parser->query($expression);
        $allLinks = $config['allLinks'] ?? [];
        $result = [];

        foreach ($ids as $id) {
            if (isset($allLinks[$id]) && is_array($allLinks[$id])) {
                $result[$id] = self::sanitizeLink($allLinks[$id]);
            }
        }

        return $result;
    }

    /**
     * Resolve expression → array of link objects with 'id' key.
     */
    public static function resolve(array $config, string $expression): array
    {
        $parser = new self($config);
        $ids = $parser->query($expression);
        $allLinks = $config['allLinks'] ?? [];
        $results = [];

        foreach ($ids as $id) {
            if (isset($allLinks[$id]) && is_array($allLinks[$id])) {
                $results[] = array_merge(['id' => $id], self::sanitizeLink($allLinks[$id]));
            }
        }

        return $results;
    }

    /**
     * Shallow-merge multiple Alap configs. Later configs win on collision.
     */
    public static function mergeConfigs(array ...$configs): array
    {
        $blocked = ['__proto__', 'constructor', 'prototype'];
        $settings = [];
        $macros = [];
        $allLinks = [];
        $searchPatterns = [];
        $protocols = [];

        foreach ($configs as $cfg) {
            foreach ($cfg['settings'] ?? [] as $k => $v) {
                if (! in_array($k, $blocked)) $settings[$k] = $v;
            }
            foreach ($cfg['macros'] ?? [] as $k => $v) {
                if (! in_array($k, $blocked)) $macros[$k] = $v;
            }
            foreach ($cfg['allLinks'] ?? [] as $k => $v) {
                if (! in_array($k, $blocked)) $allLinks[$k] = $v;
            }
            foreach ($cfg['searchPatterns'] ?? [] as $k => $v) {
                if (! in_array($k, $blocked)) $searchPatterns[$k] = $v;
            }
            foreach ($cfg['protocols'] ?? [] as $k => $v) {
                if (! in_array($k, $blocked)) $protocols[$k] = $v;
            }
        }

        $merged = ['allLinks' => $allLinks];
        if (! empty($settings)) $merged['settings'] = $settings;
        if (! empty($macros)) $merged['macros'] = $macros;
        if (! empty($searchPatterns)) $merged['searchPatterns'] = $searchPatterns;
        if (! empty($protocols)) $merged['protocols'] = $protocols;

        return $merged;
    }

    // ------------------------------------------------------------------
    // Config validation
    // ------------------------------------------------------------------

    /**
     * Validate and sanitize an Alap config loaded from an untrusted source
     * (e.g., a remote server or imported JSON file).
     *
     * - Verifies structural shape (allLinks is an object, links have url strings)
     * - Sanitizes all URLs (link.url, link.image) via sanitizeUrl()
     * - Validates and removes dangerous regex search patterns
     * - Filters prototype-pollution keys (__proto__, constructor, prototype)
     * - Rejects hyphens in item IDs, macro names, tag names, search pattern keys
     *
     * Returns a sanitized copy of the config. Does not mutate the input.
     * Throws \InvalidArgumentException if the config is structurally invalid.
     *
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     * @throws \InvalidArgumentException
     */
    public static function validateConfig(array $config): array
    {
        // Object injection defense: PHP type hint enforces array, but callers
        // bypassing the type system (e.g., via mixed) could pass an object.
        // This guard is intentionally redundant for defense-in-depth.
        if (is_object($config)) {
            throw new \InvalidArgumentException(
                'Config must be an associative array. Use json_decode($json, true) to decode JSON.'
            );
        }

        $blocked = ['__proto__', 'constructor', 'prototype'];
        $allowedLinkFields = [
            'url', 'label', 'tags', 'cssClass', 'image', 'altText',
            'targetWindow', 'description', 'thumbnail', 'hooks',
            'guid', 'createdAt',
        ];

        // --- allLinks (required) ---
        if (! isset($config['allLinks']) || ! is_array($config['allLinks'])) {
            throw new \InvalidArgumentException(
                'Invalid config: allLinks must be a non-null associative array'
            );
        }

        if (array_is_list($config['allLinks'])) {
            throw new \InvalidArgumentException(
                'Invalid config: allLinks must be an associative array, not a sequential list'
            );
        }

        $sanitizedLinks = [];

        foreach ($config['allLinks'] as $key => $link) {
            $key = (string) $key;

            if (in_array($key, $blocked, true)) {
                continue;
            }

            if (str_contains($key, '-')) {
                trigger_error(
                    "validateConfig: skipping allLinks[\"{$key}\"] — hyphens are not allowed in item IDs. "
                    . 'Use underscores instead. The "-" character is the WITHOUT operator in expressions.',
                    E_USER_WARNING
                );
                continue;
            }

            if (! is_array($link) || array_is_list($link)) {
                trigger_error(
                    "validateConfig: skipping allLinks[\"{$key}\"] — not a valid link object",
                    E_USER_WARNING
                );
                continue;
            }

            // url is required and must be a string
            if (! isset($link['url']) || ! is_string($link['url'])) {
                trigger_error(
                    "validateConfig: skipping allLinks[\"{$key}\"] — missing or invalid url",
                    E_USER_WARNING
                );
                continue;
            }

            // Sanitize URLs
            $sanitizedUrl = self::sanitizeUrl($link['url']);
            $sanitizedImage = isset($link['image']) && is_string($link['image'])
                ? self::sanitizeUrl($link['image'])
                : null;

            // Validate tags
            $tags = null;
            if (array_key_exists('tags', $link)) {
                if (is_array($link['tags']) && array_is_list($link['tags'])) {
                    $tags = [];
                    foreach ($link['tags'] as $tag) {
                        if (! is_string($tag)) {
                            continue;
                        }
                        if (str_contains($tag, '-')) {
                            trigger_error(
                                "validateConfig: allLinks[\"{$key}\"] — stripping tag \"{$tag}\" "
                                . '(hyphens not allowed in tags). Use underscores instead.',
                                E_USER_WARNING
                            );
                            continue;
                        }
                        $tags[] = $tag;
                    }
                } else {
                    trigger_error(
                        "validateConfig: allLinks[\"{$key}\"].tags is not an array — ignoring",
                        E_USER_WARNING
                    );
                }
            }

            // Build sanitized link with whitelisted fields only
            $sanitized = ['url' => $sanitizedUrl];

            if (isset($link['label']) && is_string($link['label'])) {
                $sanitized['label'] = $link['label'];
            }
            if ($tags !== null) {
                $sanitized['tags'] = $tags;
            }
            if (isset($link['cssClass']) && is_string($link['cssClass'])) {
                $sanitized['cssClass'] = $link['cssClass'];
            }
            if ($sanitizedImage !== null) {
                $sanitized['image'] = $sanitizedImage;
            }
            if (isset($link['altText']) && is_string($link['altText'])) {
                $sanitized['altText'] = $link['altText'];
            }
            if (isset($link['targetWindow']) && is_string($link['targetWindow'])) {
                $sanitized['targetWindow'] = $link['targetWindow'];
            }
            if (isset($link['description']) && is_string($link['description'])) {
                $sanitized['description'] = $link['description'];
            }
            if (isset($link['thumbnail']) && is_string($link['thumbnail'])) {
                $sanitized['thumbnail'] = $link['thumbnail'];
            }
            if (isset($link['hooks']) && is_array($link['hooks'])) {
                $sanitized['hooks'] = array_values(array_filter(
                    $link['hooks'],
                    fn($h) => is_string($h)
                ));
            }
            if (isset($link['guid']) && is_string($link['guid'])) {
                $sanitized['guid'] = $link['guid'];
            }
            if (array_key_exists('createdAt', $link)) {
                $sanitized['createdAt'] = $link['createdAt'];
            }

            $sanitizedLinks[$key] = $sanitized;
        }

        // --- settings (optional) ---
        $settings = null;
        if (isset($config['settings']) && is_array($config['settings']) && ! array_is_list($config['settings'])) {
            $settings = [];
            foreach ($config['settings'] as $k => $v) {
                if (! in_array((string) $k, $blocked, true)) {
                    $settings[$k] = $v;
                }
            }
        }

        // --- macros (optional) ---
        $macros = null;
        if (isset($config['macros']) && is_array($config['macros']) && ! array_is_list($config['macros'])) {
            $macros = [];
            foreach ($config['macros'] as $k => $v) {
                $k = (string) $k;
                if (in_array($k, $blocked, true)) {
                    continue;
                }
                if (str_contains($k, '-')) {
                    trigger_error(
                        "validateConfig: skipping macro \"{$k}\" — hyphens are not allowed in macro names. "
                        . 'Use underscores instead. The "-" character is the WITHOUT operator in expressions.',
                        E_USER_WARNING
                    );
                    continue;
                }
                if (is_array($v) && isset($v['linkItems']) && is_string($v['linkItems'])) {
                    $macros[$k] = $v;
                } else {
                    trigger_error(
                        "validateConfig: skipping macro \"{$k}\" — invalid shape",
                        E_USER_WARNING
                    );
                }
            }
        }

        // --- searchPatterns (optional) ---
        $searchPatterns = null;
        if (isset($config['searchPatterns']) && is_array($config['searchPatterns']) && ! array_is_list($config['searchPatterns'])) {
            $searchPatterns = [];
            foreach ($config['searchPatterns'] as $k => $v) {
                $k = (string) $k;
                if (in_array($k, $blocked, true)) {
                    continue;
                }
                if (str_contains($k, '-')) {
                    trigger_error(
                        "validateConfig: skipping searchPattern \"{$k}\" — hyphens are not allowed in pattern keys. "
                        . 'Use underscores instead. The "-" character is the WITHOUT operator in expressions.',
                        E_USER_WARNING
                    );
                    continue;
                }

                // String shorthand
                if (is_string($v)) {
                    $validation = self::validateRegex($v);
                    if ($validation['safe']) {
                        $searchPatterns[$k] = $v;
                    } else {
                        trigger_error(
                            "validateConfig: removing searchPattern \"{$k}\" — {$validation['reason']}",
                            E_USER_WARNING
                        );
                    }
                    continue;
                }

                // Object form
                if (is_array($v) && isset($v['pattern']) && is_string($v['pattern'])) {
                    $validation = self::validateRegex($v['pattern']);
                    if ($validation['safe']) {
                        $searchPatterns[$k] = $v;
                    } else {
                        trigger_error(
                            "validateConfig: removing searchPattern \"{$k}\" — {$validation['reason']}",
                            E_USER_WARNING
                        );
                    }
                    continue;
                }

                trigger_error(
                    "validateConfig: skipping searchPattern \"{$k}\" — invalid shape",
                    E_USER_WARNING
                );
            }
        }

        // --- Build result ---
        $result = ['allLinks' => $sanitizedLinks];
        if ($settings !== null && ! empty($settings)) {
            $result['settings'] = $settings;
        }
        if ($macros !== null && ! empty($macros)) {
            $result['macros'] = $macros;
        }
        if ($searchPatterns !== null && ! empty($searchPatterns)) {
            $result['searchPatterns'] = $searchPatterns;
        }

        return $result;
    }

    /**
     * Validate a regex pattern for syntax errors and ReDoS risk.
     *
     * Returns ['safe' => true] or ['safe' => false, 'reason' => '...'].
     *
     * PHP's PCRE engine uses backtracking and is vulnerable to catastrophic
     * backtracking on patterns with nested quantifiers. This method:
     *   1. Checks syntax via preg_match()
     *   2. Detects nested quantifiers via character-by-character scanning
     */
    public static function validateRegex(string $pattern): array
    {
        // 1. Syntax check
        $regex = '/' . str_replace('/', '\/', $pattern) . '/';
        @preg_match($regex, '');
        if (preg_last_error() !== PREG_NO_ERROR) {
            return ['safe' => false, 'reason' => 'Invalid regex syntax'];
        }

        // 2. Nested quantifier detection
        $quantifierAfterRe = '/^(?:[?*+]|\{\d+(?:,\d*)?\})/';
        $quantifierInBodyRe = '/[?*+]|\{\d+(?:,\d*)?\}/';

        $groupStarts = [];
        $len = strlen($pattern);
        $i = 0;

        while ($i < $len) {
            $ch = $pattern[$i];

            // Skip escaped characters
            if ($ch === '\\') {
                $i += 2;
                continue;
            }

            // Skip character classes [...]
            if ($ch === '[') {
                $i++;
                if ($i < $len && $pattern[$i] === '^') $i++;
                if ($i < $len && $pattern[$i] === ']') $i++;
                while ($i < $len && $pattern[$i] !== ']') {
                    if ($pattern[$i] === '\\') $i++;
                    $i++;
                }
                $i++;
                continue;
            }

            if ($ch === '(') {
                $groupStarts[] = $i;
                $i++;
                continue;
            }

            if ($ch === ')') {
                if (empty($groupStarts)) {
                    $i++;
                    continue;
                }
                $start = array_pop($groupStarts);
                $afterGroup = substr($pattern, $i + 1);
                if (preg_match($quantifierAfterRe, $afterGroup)) {
                    $body = substr($pattern, $start + 1, $i - $start - 1);
                    $stripped = self::stripEscapesAndClasses($body);
                    if (preg_match($quantifierInBodyRe, $stripped)) {
                        return [
                            'safe' => false,
                            'reason' => 'Nested quantifier detected — potential ReDoS',
                        ];
                    }
                }
                $i++;
                continue;
            }

            $i++;
        }

        return ['safe' => true];
    }

    /**
     * Strip escaped characters and character classes from a pattern body
     * so that quantifier detection is not confused by \+ or [*].
     */
    private static function stripEscapesAndClasses(string $body): string
    {
        $result = '';
        $len = strlen($body);
        $i = 0;

        while ($i < $len) {
            if ($body[$i] === '\\') {
                $i += 2;
                continue;
            }
            if ($body[$i] === '[') {
                $i++;
                if ($i < $len && $body[$i] === '^') $i++;
                if ($i < $len && $body[$i] === ']') $i++;
                while ($i < $len && $body[$i] !== ']') {
                    if ($body[$i] === '\\') $i++;
                    $i++;
                }
                $i++;
                continue;
            }
            $result .= $body[$i];
            $i++;
        }

        return $result;
    }

    /**
     * Execute a regex match with a reduced pcre.backtrack_limit as a
     * circuit breaker. If the syntactic ReDoS check misses an edge case,
     * this prevents the server from hanging.
     *
     * Returns the preg_match result (0 or 1), or false on error.
     */
    public static function safeRegexMatch(string $pattern, string $subject): int|false
    {
        $oldLimit = ini_get('pcre.backtrack_limit');
        ini_set('pcre.backtrack_limit', (string) self::PCRE_BACKTRACK_LIMIT);

        $regex = '/' . str_replace('/', '\/', $pattern) . '/';
        $result = @preg_match($regex, $subject);

        ini_set('pcre.backtrack_limit', $oldLimit);

        return $result;
    }

    // ------------------------------------------------------------------
    // SSRF guard (port of src/protocols/ssrf-guard.ts)
    // ------------------------------------------------------------------

    /**
     * Private and reserved IPv4 CIDR ranges: [networkAddress, prefixBits].
     *
     * Covers loopback, RFC 1918, link-local / cloud metadata, "this" network,
     * CGN (RFC 6598), IETF protocol assignments, documentation ranges
     * (TEST-NET-1/2/3), multicast, and reserved.
     */
    private const PRIVATE_RANGES = [
        [0x7F000000,  8],  // 127.0.0.0/8    — Loopback
        [0x0A000000,  8],  // 10.0.0.0/8     — RFC 1918
        [0xAC100000, 12],  // 172.16.0.0/12  — RFC 1918
        [0xC0A80000, 16],  // 192.168.0.0/16 — RFC 1918
        [0xA9FE0000, 16],  // 169.254.0.0/16 — Link-local / cloud metadata
        [0x00000000,  8],  // 0.0.0.0/8      — "This" network
        [0x64400000, 10],  // 100.64.0.0/10  — Shared address space (CGN)
        [0xC0000000, 24],  // 192.0.0.0/24   — IETF protocol assignments
        [0xC0000200, 24],  // 192.0.2.0/24   — Documentation (TEST-NET-1)
        [0xC6336400, 24],  // 198.51.100.0/24 — Documentation (TEST-NET-2)
        [0xCB007100, 24],  // 203.0.113.0/24 — Documentation (TEST-NET-3)
        [0xE0000000,  4],  // 224.0.0.0/4    — Multicast
        [0xF0000000,  4],  // 240.0.0.0/4    — Reserved
    ];

    /**
     * Check if a URL's hostname points to a private or reserved address.
     *
     * This is a **syntactic** check — it inspects the hostname string, not DNS.
     * It catches direct IP usage (e.g. `http://169.254.169.254/`) and known
     * private patterns. It does NOT protect against DNS rebinding attacks where
     * a public hostname resolves to a private IP.
     *
     * For full protection, combine with DNS resolution validation at the
     * network layer (e.g. a custom stream wrapper that checks resolved IPs).
     *
     * Port of TypeScript `src/protocols/ssrf-guard.ts`.
     *
     * @param string $url The URL to inspect.
     * @return bool True if the host is private/reserved or the URL is malformed.
     */
    public static function isPrivateHost(string $url): bool
    {
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['host'])) {
            return true; // Malformed — fail closed
        }

        $host = $parts['host'];

        // Strip IPv6 brackets
        if (str_starts_with($host, '[') && str_ends_with($host, ']')) {
            $host = substr($host, 1, -1);
        }

        // localhost variants
        if ($host === 'localhost' || str_ends_with($host, '.localhost')) {
            return true;
        }

        // --- IPv4 ---
        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            // PHP's FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE catches
            // most private/reserved ranges. If the IP passes the first filter
            // but fails the second, it is private.
            if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return true;
            }

            // Ranges that PHP's filter may not fully cover:
            // 0.0.0.0/8 ("this" network) and 100.64.0.0/10 (CGN / RFC 6598).
            $num = ip2long($host);
            if ($num !== false) {
                $num = $num & 0xFFFFFFFF; // unsigned 32-bit

                foreach (self::PRIVATE_RANGES as [$network, $prefix]) {
                    $mask = (0xFFFFFFFF << (32 - $prefix)) & 0xFFFFFFFF;
                    if (($num & $mask) === ($network & $mask)) {
                        return true;
                    }
                }
            }

            return false;
        }

        // --- IPv6 ---
        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            $lower = strtolower($host);

            // Loopback
            if ($lower === '::1') return true;

            // Link-local, unique-local
            if (str_starts_with($lower, 'fe80:')) return true;
            if (str_starts_with($lower, 'fc00:')) return true;
            if (str_starts_with($lower, 'fd00:')) return true;

            // IPv4-mapped IPv6 (::ffff:x.x.x.x)
            if (preg_match('/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i', $lower, $m)) {
                return self::isPrivateHost('http://' . $m[1] . '/');
            }

            return false;
        }

        return false;
    }
}
