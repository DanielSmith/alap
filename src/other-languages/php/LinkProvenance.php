<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap;

/**
 * Provenance tier stamping — PHP port of src/core/linkProvenance.ts.
 *
 * Links carry a provenance tier (where they came from) so downstream
 * sanitizers can apply strictness matched to the source's trustworthiness.
 *
 * Tiers, loosest to strictest:
 *   - "author"          — link came from the developer's hand-written config
 *   - "storage:local"   — loaded from a local storage adapter
 *   - "storage:remote"  — loaded from a remote config server
 *   - "protocol:<name>" — returned by a protocol handler
 *
 * TypeScript stores the stamp in a WeakMap keyed on runtime object
 * identity so an attacker-writable `.provenance` field on an incoming
 * link cannot pre-stamp itself for free. PHP arrays have no identity
 * (they are value-typed and compared structurally), so this port
 * stamps a reserved `_provenance` key on the link array directly.
 * The safety property is preserved through the whitelist in
 * `Alap\ValidateConfig`: each link is built from a fixed set of known
 * field names, and `_provenance` is stamped *after* the whitelist step.
 * An incoming config carrying its own `_provenance` field is filtered
 * out by the whitelist before stamping.
 *
 * API note: methods return the updated array rather than mutating by
 * reference — matches PHP's value-typed array convention.
 */
final class LinkProvenance
{
    public const PROVENANCE_KEY = '_provenance';

    /**
     * Return a copy of `$link` stamped with `$tier`. Overwrites any
     * existing stamp.
     */
    public static function stamp(array $link, string $tier): array
    {
        if (! self::isValidTier($tier)) {
            throw new \InvalidArgumentException(
                "LinkProvenance::stamp — invalid tier " . var_export($tier, true) .
                '. Must be one of "author", "storage:local", "storage:remote", or "protocol:<name>".'
            );
        }
        $link[self::PROVENANCE_KEY] = $tier;
        return $link;
    }

    /** Read a link's provenance tier, or `null` if unstamped. */
    public static function get(array $link): ?string
    {
        $prov = $link[self::PROVENANCE_KEY] ?? null;
        return is_string($prov) ? $prov : null;
    }

    public static function isAuthorTier(array $link): bool
    {
        return ($link[self::PROVENANCE_KEY] ?? null) === 'author';
    }

    public static function isStorageTier(array $link): bool
    {
        $prov = $link[self::PROVENANCE_KEY] ?? null;
        return $prov === 'storage:local' || $prov === 'storage:remote';
    }

    public static function isProtocolTier(array $link): bool
    {
        $prov = $link[self::PROVENANCE_KEY] ?? null;
        return is_string($prov) && str_starts_with($prov, 'protocol:');
    }

    /**
     * Return a copy of `$dest` with `$src`'s provenance stamp copied in.
     * No-op if `$src` is unstamped.
     */
    public static function cloneTo(array $src, array $dest): array
    {
        $prov = $src[self::PROVENANCE_KEY] ?? null;
        if (is_string($prov)) {
            $dest[self::PROVENANCE_KEY] = $prov;
        }
        return $dest;
    }

    private static function isValidTier(string $tier): bool
    {
        if (in_array($tier, ['author', 'storage:local', 'storage:remote'], true)) {
            return true;
        }
        return str_starts_with($tier, 'protocol:') && strlen($tier) > 9;
    }
}
