<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap;

/**
 * Config validation — PHP port of src/core/validateConfig.ts.
 *
 * Takes an untrusted config array and returns a sanitized,
 * provenance-stamped copy. Mirrors the 3.2 reference behaviour:
 *
 *  - deep-clones the input (rejects objects, Closures, resources,
 *    over-bound structures);
 *  - rejects callable-valued protocol handlers with
 *    `ConfigMigrationError`;
 *  - stamps each validated link with the caller-supplied provenance tier;
 *  - enforces the hooks allowlist against non-author tiers (fail-closed
 *    when `settings.hooks` is not declared);
 *  - sanitizes every URL-bearing field (`url`, `image`, `thumbnail`,
 *    and any `meta.*Url` key) through `ExpressionParser::sanitizeUrl`;
 *  - strips `__proto__`, `constructor`, `prototype` keys (plus the
 *    Python-port dunders retained for cross-port parity) from all
 *    array-shaped fields, including nested `link['meta']`;
 *  - rejects hyphens in link IDs, tag names, macro names, and
 *    searchPattern keys (`-` is the WITHOUT operator in expressions).
 *
 * Deep-freeze and idempotence-marker are intentionally skipped in the
 * PHP port: PHP arrays are value-typed (copy-on-write), so a caller's
 * mutation never propagates to another reference; and PHP arrays lack
 * runtime identity, so identity-based idempotence tracking would
 * require wrapping the return in an object and changing the API shape.
 * Neither guarantee is necessary given PHP's value semantics.
 */
final class ValidateConfig
{
    public const BLOCKED_KEYS = [
        // JS prototype-pollution set (parity with TS).
        '__proto__', 'constructor', 'prototype',
        // Python-specific dunders retained for cross-port parity; no
        // material PHP-side threat but keeps the blocklist identical
        // across ports so auditors do not need a per-language cheat sheet.
        '__class__', '__bases__', '__mro__', '__subclasses__',
    ];

    private const URL_KEY_PATTERN = '/url$/i';

    /**
     * Reject callable-valued protocol handlers in `$config`.
     */
    public static function assertNoHandlersInConfig(array $config): void
    {
        $protocols = $config['protocols'] ?? null;
        if (! is_array($protocols)) return;

        foreach ($protocols as $name => $entry) {
            if (! is_array($entry)) continue;
            foreach (['generate', 'filter', 'handler'] as $field) {
                if (isset($entry[$field]) && is_callable($entry[$field])) {
                    throw new ConfigMigrationError(
                        "config['protocols'][" . var_export($name, true) . "][" .
                        var_export($field, true) . "] is a callable — handlers " .
                        "must be registered separately via the runtime registry, " .
                        "not embedded in the config. See docs/handlers-out-of-config.md."
                    );
                }
            }
        }
    }

    /**
     * Single source of truth for URL-scheme sanitization on a link.
     *
     * Scans `url`, `image`, `thumbnail`, and any `meta` key whose name
     * ends with `url` (case-insensitive), passing each through
     * `ExpressionParser::sanitizeUrl`. Strips BLOCKED_KEYS from `meta`
     * during the pass.
     */
    public static function sanitizeLinkUrls(array $link): array
    {
        $out = $link;
        if (isset($link['url']) && is_string($link['url'])) {
            $out['url'] = ExpressionParser::sanitizeUrl($link['url']);
        }
        if (isset($link['image']) && is_string($link['image'])) {
            $out['image'] = ExpressionParser::sanitizeUrl($link['image']);
        }
        if (isset($link['thumbnail']) && is_string($link['thumbnail'])) {
            $out['thumbnail'] = ExpressionParser::sanitizeUrl($link['thumbnail']);
        }
        if (isset($link['meta']) && is_array($link['meta'])) {
            $safeMeta = [];
            foreach ($link['meta'] as $mk => $mv) {
                if (in_array($mk, self::BLOCKED_KEYS, true)) continue;
                if (is_string($mv) && preg_match(self::URL_KEY_PATTERN, (string) $mk)) {
                    $safeMeta[$mk] = ExpressionParser::sanitizeUrl($mv);
                } else {
                    $safeMeta[$mk] = $mv;
                }
            }
            $out['meta'] = $safeMeta;
        }
        return $out;
    }

    /**
     * Validate and sanitize `$config` from an untrusted source.
     *
     * Returns a sanitized copy with each link stamped with `$provenance`.
     * Raises `\InvalidArgumentException` on structural invalidity,
     * `\Alap\ConfigMigrationError` on callable handlers, or
     * `\Alap\ConfigCloneError` on non-data types or over-bound structures.
     */
    public static function call(array $config, string $provenance = 'author'): array
    {
        // Reject callable protocol handlers before any further processing
        // so the migration error surfaces at the exact field name, not
        // as a generic "object not permitted" from DeepClone.
        self::assertNoHandlersInConfig($config);

        // Detach from caller; DeepClone rejects objects, callables,
        // resources, non-String keys, and over-bound structures.
        $raw = DeepClone::call($config);

        // Hook allowlist pulled from settings up front.
        $rawSettings = $raw['settings'] ?? null;
        $hookAllowlist = null;
        if (is_array($rawSettings) && isset($rawSettings['hooks']) && is_array($rawSettings['hooks'])) {
            $hookAllowlist = array_values(array_filter($rawSettings['hooks'], 'is_string'));
        }

        // --- allLinks (required) -----------------------------------
        $rawLinks = $raw['allLinks'] ?? null;
        if (! is_array($rawLinks)) {
            throw new \InvalidArgumentException('Invalid config: allLinks must be a non-null array');
        }
        // Reject list-shaped allLinks. Empty `[]` is ambiguous in PHP
        // (could be `{}` from JSON) and accepted as empty object;
        // non-empty lists are always a shape error.
        if (count($rawLinks) > 0 && array_is_list($rawLinks)) {
            throw new \InvalidArgumentException('Invalid config: allLinks must be a keyed array (object shape), not a list');
        }

        $sanitizedLinks = [];
        foreach ($rawLinks as $key => $link) {
            if (in_array($key, self::BLOCKED_KEYS, true)) continue;

            if (str_contains($key, '-')) {
                trigger_error(
                    "validateConfig: skipping allLinks[\"{$key}\"] — hyphens are not " .
                    "allowed in item IDs. Use underscores instead. The \"-\" " .
                    "character is the WITHOUT operator in expressions.",
                    E_USER_WARNING,
                );
                continue;
            }

            if (! is_array($link)) {
                trigger_error(
                    "validateConfig: skipping allLinks[\"{$key}\"] — not a valid link object",
                    E_USER_WARNING,
                );
                continue;
            }

            if (! isset($link['url']) || ! is_string($link['url'])) {
                trigger_error(
                    "validateConfig: skipping allLinks[\"{$key}\"] — missing or invalid url",
                    E_USER_WARNING,
                );
                continue;
            }

            // Tags — strings only, reject hyphens.
            $tags = null;
            if (array_key_exists('tags', $link)) {
                if (is_array($link['tags'])) {
                    $cleanTags = [];
                    foreach ($link['tags'] as $t) {
                        if (! is_string($t)) continue;
                        if (str_contains($t, '-')) {
                            trigger_error(
                                "validateConfig: allLinks[\"{$key}\"] — stripping tag " .
                                "\"{$t}\" (hyphens not allowed in tags). Use underscores instead.",
                                E_USER_WARNING,
                            );
                            continue;
                        }
                        $cleanTags[] = $t;
                    }
                    $tags = $cleanTags;
                } else {
                    trigger_error(
                        "validateConfig: allLinks[\"{$key}\"].tags is not an array — ignoring",
                        E_USER_WARNING,
                    );
                }
            }

            // Shape via whitelist.
            $shaped = ['url' => $link['url']];
            if (isset($link['label']) && is_string($link['label'])) $shaped['label'] = $link['label'];
            if ($tags !== null) $shaped['tags'] = $tags;
            if (isset($link['cssClass']) && is_string($link['cssClass'])) $shaped['cssClass'] = $link['cssClass'];
            if (isset($link['image']) && is_string($link['image'])) $shaped['image'] = $link['image'];
            if (isset($link['altText']) && is_string($link['altText'])) $shaped['altText'] = $link['altText'];
            if (isset($link['targetWindow']) && is_string($link['targetWindow'])) $shaped['targetWindow'] = $link['targetWindow'];
            if (isset($link['description']) && is_string($link['description'])) $shaped['description'] = $link['description'];
            if (isset($link['thumbnail']) && is_string($link['thumbnail'])) $shaped['thumbnail'] = $link['thumbnail'];

            // Hooks — tier-aware allowlist enforcement.
            if (isset($link['hooks']) && is_array($link['hooks'])) {
                $stringHooks = array_values(array_filter($link['hooks'], 'is_string'));
                if ($provenance === 'author') {
                    if (count($stringHooks) > 0) $shaped['hooks'] = $stringHooks;
                } elseif ($hookAllowlist !== null) {
                    $allowed = [];
                    foreach ($stringHooks as $h) {
                        if (in_array($h, $hookAllowlist, true)) {
                            $allowed[] = $h;
                        } else {
                            trigger_error(
                                "validateConfig: allLinks[\"{$key}\"] — stripping hook " .
                                "\"{$h}\" not in settings.hooks allowlist (tier: {$provenance})",
                                E_USER_WARNING,
                            );
                        }
                    }
                    if (count($allowed) > 0) $shaped['hooks'] = $allowed;
                } elseif (count($stringHooks) > 0) {
                    trigger_error(
                        "validateConfig: allLinks[\"{$key}\"] — dropping " .
                        count($stringHooks) . " hook(s) on {$provenance}-tier link; " .
                        "declare settings.hooks to allow specific keys",
                        E_USER_WARNING,
                    );
                }
            }

            if (isset($link['guid']) && is_string($link['guid'])) $shaped['guid'] = $link['guid'];
            if (array_key_exists('createdAt', $link)) $shaped['createdAt'] = $link['createdAt'];

            // Meta — copy with nested BLOCKED_KEYS filter. (sanitizeLinkUrls
            // runs a second pass that also strips blocked keys and sanitises
            // *Url fields; this first pass makes sure $shaped['meta'] is
            // already a fresh array.)
            if (isset($link['meta']) && is_array($link['meta'])) {
                $rawMeta = $link['meta'];
                $safeMeta = [];
                foreach ($rawMeta as $mk => $mv) {
                    if (in_array($mk, self::BLOCKED_KEYS, true)) continue;
                    $safeMeta[$mk] = $mv;
                }
                $shaped['meta'] = $safeMeta;
            }

            // Single source of truth for URL-field sanitization.
            $finalLink = self::sanitizeLinkUrls($shaped);

            // Stamp provenance AFTER the whitelist pass — since shaped
            // was built from a fixed set of known keys, an incoming
            // config cannot pre-stamp itself via a forged _provenance field.
            $finalLink = LinkProvenance::stamp($finalLink, $provenance);

            $sanitizedLinks[$key] = $finalLink;
        }

        // --- settings (optional) -----------------------------------
        $settings = null;
        if (is_array($rawSettings)) {
            $settings = [];
            foreach ($rawSettings as $sk => $sv) {
                if (in_array($sk, self::BLOCKED_KEYS, true)) continue;
                $settings[$sk] = $sv;
            }
        }

        // --- macros (optional) -------------------------------------
        $macros = null;
        $rawMacros = $raw['macros'] ?? null;
        if (is_array($rawMacros)) {
            $macros = [];
            foreach ($rawMacros as $mk => $macro) {
                if (in_array($mk, self::BLOCKED_KEYS, true)) continue;
                if (str_contains((string) $mk, '-')) {
                    trigger_error(
                        "validateConfig: skipping macro \"{$mk}\" — hyphens are not " .
                        "allowed in macro names. Use underscores instead. The \"-\" " .
                        "character is the WITHOUT operator in expressions.",
                        E_USER_WARNING,
                    );
                    continue;
                }
                if (is_array($macro) && isset($macro['linkItems']) && is_string($macro['linkItems'])) {
                    $macros[$mk] = $macro;
                } else {
                    trigger_error(
                        "validateConfig: skipping macro \"{$mk}\" — invalid shape",
                        E_USER_WARNING,
                    );
                }
            }
        }

        // --- searchPatterns (optional) -----------------------------
        $searchPatterns = null;
        $rawPatterns = $raw['searchPatterns'] ?? null;
        if (is_array($rawPatterns)) {
            $searchPatterns = [];
            foreach ($rawPatterns as $pk => $entry) {
                if (in_array($pk, self::BLOCKED_KEYS, true)) continue;
                if (str_contains((string) $pk, '-')) {
                    trigger_error(
                        "validateConfig: skipping searchPattern \"{$pk}\" — hyphens are not " .
                        "allowed in pattern keys. Use underscores instead. The \"-\" " .
                        "character is the WITHOUT operator in expressions.",
                        E_USER_WARNING,
                    );
                    continue;
                }
                if (is_array($entry) && isset($entry['pattern']) && is_string($entry['pattern'])) {
                    $validation = ExpressionParser::validateRegex($entry['pattern']);
                    if ($validation['safe']) {
                        $searchPatterns[$pk] = $entry;
                    } else {
                        trigger_error(
                            "validateConfig: removing searchPattern \"{$pk}\" — {$validation['reason']}",
                            E_USER_WARNING,
                        );
                    }
                    continue;
                }
                if (is_string($entry)) {
                    $validation = ExpressionParser::validateRegex($entry);
                    if ($validation['safe']) {
                        $searchPatterns[$pk] = $entry;
                    } else {
                        trigger_error(
                            "validateConfig: removing searchPattern \"{$pk}\" — {$validation['reason']}",
                            E_USER_WARNING,
                        );
                    }
                    continue;
                }
                trigger_error(
                    "validateConfig: skipping searchPattern \"{$pk}\" — invalid shape",
                    E_USER_WARNING,
                );
            }
        }

        // --- protocols (optional, data-only since 3.2) -------------
        $protocols = null;
        $rawProtocols = $raw['protocols'] ?? null;
        if (is_array($rawProtocols)) {
            $protocols = [];
            foreach ($rawProtocols as $pk => $pv) {
                if (in_array($pk, self::BLOCKED_KEYS, true)) continue;
                $protocols[$pk] = $pv;
            }
        }

        // Assemble.
        $result = ['allLinks' => $sanitizedLinks];
        if ($settings !== null) $result['settings'] = $settings;
        if ($macros !== null) $result['macros'] = $macros;
        if ($searchPatterns !== null) $result['searchPatterns'] = $searchPatterns;
        if ($protocols !== null) $result['protocols'] = $protocols;

        return $result;
    }
}
