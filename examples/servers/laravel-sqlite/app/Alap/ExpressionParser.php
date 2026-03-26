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
 *   atom    = ITEM_ID | CLASS | DOM_REF | REGEX
 *
 * Supports: item IDs, .tag queries, @macro expansion, /regex/ search,
 * parenthesized grouping, + (AND/intersection), | (OR/union), - (WITHOUT/subtraction).
 */

namespace App\Alap;

class ExpressionParser
{
    // Constants (mirrors src/constants.ts)
    private const MAX_DEPTH = 32;
    private const MAX_TOKENS = 1024;
    private const MAX_MACRO_EXPANSIONS = 10;
    private const MAX_REGEX_QUERIES = 5;
    private const MAX_SEARCH_RESULTS = 100;
    private const REGEX_TIMEOUT_MS = 20;

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

            // Class: .word
            if ($ch === '.') {
                $i++;
                $word = '';
                while ($i < $n && (ctype_alnum($expr[$i]) || $expr[$i] === '_')) {
                    $word .= $expr[$i];
                    $i++;
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

            // Bare word: item ID
            if (ctype_alnum($ch) || $ch === '_') {
                $word = '';
                while ($i < $n && (ctype_alnum($expr[$i]) || $expr[$i] === '_')) {
                    $word .= $expr[$i];
                    $i++;
                }
                $tokens[] = ['type' => 'ITEM_ID', 'value' => $word];
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

            case 'DOM_REF':
                $pos++;

                return []; // reserved

            default:
                return []; // don't consume
        }
    }

    // ------------------------------------------------------------------
    // URL sanitization
    // ------------------------------------------------------------------

    /**
     * Sanitize a URL to prevent XSS via dangerous URI schemes.
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
        }

        $merged = ['allLinks' => $allLinks];
        if (! empty($settings)) $merged['settings'] = $settings;
        if (! empty($macros)) $merged['macros'] = $macros;
        if (! empty($searchPatterns)) $merged['searchPatterns'] = $searchPatterns;

        return $merged;
    }
}
