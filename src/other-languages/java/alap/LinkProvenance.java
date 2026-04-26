// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.Map;
import java.util.Set;

/**
 * Provenance tier stamping — Java port of src/core/linkProvenance.ts.
 *
 * <p>Links carry a provenance tier (where they came from) so downstream
 * sanitizers can apply strictness matched to the source's trustworthiness.
 *
 * <p>Tiers, loosest to strictest:
 * <ul>
 *   <li>{@code "author"}          — link came from the developer's hand-written config</li>
 *   <li>{@code "storage:local"}   — loaded from a local storage adapter</li>
 *   <li>{@code "storage:remote"}  — loaded from a remote config server</li>
 *   <li>{@code "protocol:<name>"} — returned by a protocol handler</li>
 * </ul>
 *
 * <p>TypeScript stores the stamp in a WeakMap keyed on runtime object
 * identity so an attacker-writable {@code .provenance} field on an
 * incoming link cannot pre-stamp itself for free. Java Maps are
 * reference types with identity, but a WeakHashMap-based design would
 * still require downstream callers to thread an extra parameter to
 * every access. This port instead stamps a reserved {@code _provenance}
 * key on the link Map directly. The safety property is preserved
 * through the whitelist in {@code ValidateConfig}: each link is built
 * from a fixed set of known field names, and {@code _provenance} is
 * stamped <em>after</em> the whitelist step. An incoming config
 * carrying its own {@code _provenance} field is filtered out by the
 * whitelist before stamping.
 */
public final class LinkProvenance {

    /**
     * Reserved key. The whitelist in ValidateConfig intentionally
     * excludes this key so it cannot be pre-stamped from untrusted input.
     */
    public static final String PROVENANCE_KEY = "_provenance";

    private static final Set<String> VALID_SINGLETONS =
        Set.of("author", "storage:local", "storage:remote");

    private LinkProvenance() {}

    /**
     * Stamp {@code link} with its provenance tier. Mutates {@code link}
     * in place. Overwrites any existing stamp.
     */
    public static void stamp(Map<String, Object> link, String tier) {
        if (tier == null || !isValidTier(tier)) {
            throw new IllegalArgumentException(
                "LinkProvenance.stamp — invalid tier " + tier +
                ". Must be one of \"author\", \"storage:local\", " +
                "\"storage:remote\", or \"protocol:<name>\".");
        }
        link.put(PROVENANCE_KEY, tier);
    }

    /** Read a link's provenance tier, or {@code null} if unstamped. */
    public static String get(Map<String, Object> link) {
        Object v = link.get(PROVENANCE_KEY);
        return v instanceof String ? (String) v : null;
    }

    public static boolean isAuthorTier(Map<String, Object> link) {
        return "author".equals(link.get(PROVENANCE_KEY));
    }

    public static boolean isStorageTier(Map<String, Object> link) {
        Object v = link.get(PROVENANCE_KEY);
        return "storage:local".equals(v) || "storage:remote".equals(v);
    }

    public static boolean isProtocolTier(Map<String, Object> link) {
        Object v = link.get(PROVENANCE_KEY);
        return v instanceof String && ((String) v).startsWith("protocol:");
    }

    /**
     * Copy the provenance stamp from {@code src} to {@code dest}.
     * No-op if {@code src} is unstamped.
     */
    public static void cloneTo(Map<String, Object> src, Map<String, Object> dest) {
        Object v = src.get(PROVENANCE_KEY);
        if (v instanceof String) {
            dest.put(PROVENANCE_KEY, v);
        }
    }

    private static boolean isValidTier(String tier) {
        if (VALID_SINGLETONS.contains(tier)) return true;
        return tier.startsWith("protocol:") && tier.length() > "protocol:".length();
    }
}
