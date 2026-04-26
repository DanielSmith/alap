<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap;

/**
 * Deep-clone for plain config data — PHP port of src/core/deepCloneData.ts.
 *
 * Detaches a config from the caller's input by recursively rebuilding
 * it, rejecting anything that is not plain data. Two reasons:
 *
 *  1. Detachment. Wrapper types (Eloquent models, Twig template
 *     objects, etc.) carry behaviour that would otherwise leak into
 *     downstream immutability and serialization steps.
 *  2. Trust boundary. Config is *data*. Handlers are registered
 *     separately via the runtime registry. A callable in config is a
 *     shape error; rejecting it here surfaces the error before any
 *     downstream step has to cope with it.
 *
 * Allowed: arrays (string-keyed assoc or zero-indexed lists), strings,
 * integers, floats, booleans, and null.
 * Rejected: objects of any kind (including Closure, Generator,
 * invokables), resources, and structures that exceed the resource
 * bounds.
 *
 * Resource bounds, matching src/core/deepCloneData.ts:
 *   - MAX_CLONE_DEPTH = 64   — rejects pathologically nested structures.
 *   - MAX_CLONE_NODES = 10000 — rejects node-count DoS bombs.
 *
 * `__proto__`, `constructor`, `prototype` keys (plus the Python-port
 * dunders retained for cross-port parity) are silently skipped during
 * clone. PHP has no prototype chain to pollute, but identical behaviour
 * across the six ports means auditors do not have to learn a
 * per-language blocklist.
 *
 * PHP arrays are value-typed and cannot contain cycles on their own;
 * the only way to build a cycle is via object references, which this
 * clone rejects outright. No cycle-detection pass is needed.
 */
final class DeepClone
{
    public const MAX_CLONE_DEPTH = 64;
    public const MAX_CLONE_NODES = 10_000;

    private const BLOCKED_KEYS = [
        '__proto__', 'constructor', 'prototype',
        '__class__', '__bases__', '__mro__', '__subclasses__',
    ];

    /**
     * Deep-clone `$value` with exotic types rejected. Raises
     * `\Alap\ConfigCloneError` on objects, resources, non-String Array
     * keys, depth over MAX_CLONE_DEPTH, or node count over MAX_CLONE_NODES.
     */
    public static function call(mixed $value): mixed
    {
        $nodeCount = 0;
        return self::cloneValue($value, 0, '', $nodeCount);
    }

    private static function cloneValue(mixed $v, int $depth, string $path, int &$nodeCount): mixed
    {
        // Primitives — no clone, no count. bool is listed explicitly
        // for readability; is_int / is_float / is_string do the
        // separation from each other.
        if ($v === null || is_bool($v) || is_int($v) || is_float($v) || is_string($v)) {
            return $v;
        }

        if (is_object($v)) {
            if (is_callable($v)) {
                throw new ConfigCloneError(
                    "deep_clone: callable not permitted in config (got " . get_class($v) .
                    " at " . self::pathOrRoot($path) . "). " .
                    "Handlers must be registered separately via the runtime registry."
                );
            }
            throw new ConfigCloneError(
                "deep_clone: object not permitted in config (got " . get_class($v) .
                " at " . self::pathOrRoot($path) . "). " .
                "Config must be plain data (array / string / int / float / bool / null)."
            );
        }

        if (is_resource($v)) {
            throw new ConfigCloneError(
                "deep_clone: resource not permitted in config (at " . self::pathOrRoot($path) . ")"
            );
        }

        if ($depth > self::MAX_CLONE_DEPTH) {
            throw new ConfigCloneError(
                "deep_clone: depth exceeds " . self::MAX_CLONE_DEPTH .
                " (at " . self::pathOrRoot($path) . ")"
            );
        }

        $nodeCount++;
        if ($nodeCount > self::MAX_CLONE_NODES) {
            throw new ConfigCloneError(
                "deep_clone: node count exceeds " . self::MAX_CLONE_NODES
            );
        }

        if (is_array($v)) {
            // List-like (JSON array): sequential integer keys from 0.
            // Rebuild as a list so downstream consumers see a uniform shape.
            if (array_is_list($v)) {
                $out = [];
                foreach ($v as $i => $item) {
                    $out[] = self::cloneValue($item, $depth + 1, "{$path}[{$i}]", $nodeCount);
                }
                return $out;
            }

            // Associative (JSON object): string keys only.
            $out = [];
            foreach ($v as $k => $val) {
                if (! is_string($k)) {
                    throw new ConfigCloneError(
                        "deep_clone: Array keys must be strings (got " . gettype($k) .
                        " at " . self::pathOrRoot($path) . ")"
                    );
                }
                if (in_array($k, self::BLOCKED_KEYS, true)) {
                    continue;
                }
                $subPath = $path === '' ? $k : "{$path}.{$k}";
                $out[$k] = self::cloneValue($val, $depth + 1, $subPath, $nodeCount);
            }
            return $out;
        }

        throw new ConfigCloneError(
            "deep_clone: unsupported type in config: " . get_debug_type($v) .
            " at " . self::pathOrRoot($path)
        );
    }

    private static function pathOrRoot(string $path): string
    {
        return $path === '' ? '<root>' : $path;
    }
}
