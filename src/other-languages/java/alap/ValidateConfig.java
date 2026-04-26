// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.logging.Logger;
import java.util.regex.Pattern;

/**
 * Config validation — Java port of src/core/validateConfig.ts.
 *
 * <p>Takes an untrusted config map and returns a deeply-immutable,
 * provenance-stamped copy. Mirrors the 3.2 reference behaviour:
 *
 * <ul>
 *   <li>deep-clones the input (rejects callables, Java arrays,
 *       custom class instances, cycles, over-bound structures);</li>
 *   <li>rejects callable-valued protocol handlers with
 *       {@link ConfigMigrationError};</li>
 *   <li>stamps each validated link with the caller-supplied provenance tier;</li>
 *   <li>enforces the hooks allowlist against non-author tiers (fail-closed
 *       when {@code settings.hooks} is not declared);</li>
 *   <li>sanitizes every URL-bearing field ({@code url}, {@code image},
 *       {@code thumbnail}, and any {@code meta.*Url} key) through
 *       {@link SanitizeUrl#sanitize(String)};</li>
 *   <li>strips {@code __proto__} / {@code constructor} / {@code prototype}
 *       keys (plus the Python-port dunders retained for cross-port
 *       parity) from all map-shaped fields, including nested
 *       {@code link.meta};</li>
 *   <li>rejects hyphens in link IDs, tag names, macro names, and
 *       searchPattern keys;</li>
 *   <li>deep-freezes the returned config via {@link Collections#unmodifiableMap}
 *       / {@link Collections#unmodifiableList};</li>
 *   <li>short-circuits when re-validating a config it has already
 *       produced (so storage-tier stamps are not overwritten to
 *       {@code "author"}).</li>
 * </ul>
 */
public final class ValidateConfig {

    private static final Logger LOG = Logger.getLogger(ValidateConfig.class.getName());

    public static final Set<String> BLOCKED_KEYS = Set.of(
        // JS prototype-pollution set (parity with TS).
        "__proto__", "constructor", "prototype",
        // Python-specific dunders retained for cross-port parity; harmless
        // in Java but the single shared blocklist means auditors do not
        // need a per-language cheat sheet.
        "__class__", "__bases__", "__mro__", "__subclasses__"
    );

    private static final Pattern URL_KEY_PATTERN =
        Pattern.compile("url$", Pattern.CASE_INSENSITIVE);

    // Idempotence tracker. IdentityHashMap so structurally-equal configs
    // do not collide; synchronized for multi-threaded safety. The entries
    // leak for the lifetime of the process, bounded by the count of
    // unique configs validated.
    private static final Map<Object, Boolean> VALIDATED =
        Collections.synchronizedMap(new IdentityHashMap<>());

    private ValidateConfig() {}

    /**
     * Reject callable-valued protocol handlers in {@code config}.
     *
     * <p>Handlers must be registered via the runtime registry, not
     * embedded in the config. Thrown loudly at the validate front door
     * so the shape mismatch surfaces with the exact field name.
     */
    public static void assertNoHandlersInConfig(Map<String, Object> config) {
        if (config == null) return;
        if (!(config.get("protocols") instanceof Map<?, ?> protocols)) return;

        for (Map.Entry<?, ?> entry : protocols.entrySet()) {
            if (!(entry.getKey() instanceof String name)) continue;
            if (!(entry.getValue() instanceof Map<?, ?> entryMap)) continue;
            for (String field : List.of("generate", "filter", "handler")) {
                Object v = entryMap.get(field);
                if (isCallable(v)) {
                    throw new ConfigMigrationError(
                        "config[\"protocols\"][\"" + name + "\"][\"" + field +
                        "\"] is a callable — handlers must be registered separately " +
                        "via the runtime registry, not embedded in the config. " +
                        "See docs/handlers-out-of-config.md.");
                }
            }
        }
    }

    private static boolean isCallable(Object v) {
        return v instanceof Runnable
            || v instanceof Function
            || v instanceof BiFunction
            || v instanceof Consumer
            || v instanceof Supplier
            || v instanceof Predicate;
    }

    /**
     * Single source of truth for URL-scheme sanitization on a link.
     *
     * <p>Scans {@code url}, {@code image}, {@code thumbnail}, and any
     * {@code meta} key whose name ends with {@code url}
     * (case-insensitive), passing each through
     * {@link SanitizeUrl#sanitize(String)}. Strips {@link #BLOCKED_KEYS}
     * from {@code meta} during the pass.
     */
    public static Map<String, Object> sanitizeLinkUrls(Map<String, Object> link) {
        Map<String, Object> out = new LinkedHashMap<>(link);
        if (link.get("url") instanceof String s) {
            out.put("url", SanitizeUrl.sanitize(s));
        }
        if (link.get("image") instanceof String s) {
            out.put("image", SanitizeUrl.sanitize(s));
        }
        if (link.get("thumbnail") instanceof String s) {
            out.put("thumbnail", SanitizeUrl.sanitize(s));
        }
        if (link.get("meta") instanceof Map<?, ?> metaMap) {
            Map<String, Object> safeMeta = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : metaMap.entrySet()) {
                if (!(e.getKey() instanceof String mk)) continue;
                if (BLOCKED_KEYS.contains(mk)) continue;
                Object mv = e.getValue();
                if (mv instanceof String mvs && URL_KEY_PATTERN.matcher(mk).find()) {
                    safeMeta.put(mk, SanitizeUrl.sanitize(mvs));
                } else {
                    safeMeta.put(mk, mv);
                }
            }
            out.put("meta", safeMeta);
        }
        return out;
    }

    /**
     * Validate and sanitize {@code raw} from an untrusted source, stamping
     * each link with {@code "author"} provenance.
     */
    public static Map<String, Object> validate(Map<String, Object> raw) {
        return validate(raw, "author");
    }

    /**
     * Validate and sanitize {@code raw}, stamping each link with
     * {@code provenance} tier.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> validate(Map<String, Object> raw, String provenance) {
        if (raw == null) {
            throw new IllegalArgumentException("config is null");
        }

        // Idempotence short-circuit.
        if (VALIDATED.containsKey(raw)) {
            return raw;
        }

        // Reject callable protocol handlers before any further processing.
        assertNoHandlersInConfig(raw);

        // Detach + validate shape via DeepClone.
        Map<String, Object> cloned = (Map<String, Object>) DeepClone.call(raw);

        // Hook allowlist pulled from settings up front.
        Set<String> hookAllowlist = null;
        if (cloned.get("settings") instanceof Map<?, ?> settingsRaw
                && settingsRaw.get("hooks") instanceof List<?> hooksList) {
            hookAllowlist = new HashSet<>();
            for (Object h : hooksList) {
                if (h instanceof String hs) hookAllowlist.add(hs);
            }
        }

        // --- allLinks (required) ---
        if (!(cloned.get("allLinks") instanceof Map<?, ?> allLinksMap)) {
            throw new IllegalArgumentException("allLinks must be a non-null object");
        }

        Map<String, Object> sanitizedLinks = new LinkedHashMap<>();

        for (Map.Entry<?, ?> entry : allLinksMap.entrySet()) {
            if (!(entry.getKey() instanceof String key)) continue;

            if (BLOCKED_KEYS.contains(key)) continue;
            if (key.contains("-")) {
                LOG.warning("validate: skipping allLinks[\"" + key + "\"] — hyphens not allowed in item IDs");
                continue;
            }

            if (!(entry.getValue() instanceof Map<?, ?> link)) {
                LOG.warning("validate: skipping allLinks[\"" + key + "\"] — not a valid link object");
                continue;
            }

            if (!(link.get("url") instanceof String urlStr)) {
                LOG.warning("validate: skipping allLinks[\"" + key + "\"] — missing or invalid url");
                continue;
            }

            // Shape via whitelist.
            Map<String, Object> shaped = new LinkedHashMap<>();
            shaped.put("url", urlStr);
            if (link.get("label") instanceof String s) shaped.put("label", s);
            if (link.get("cssClass") instanceof String s) shaped.put("cssClass", s);
            if (link.get("image") instanceof String s) shaped.put("image", s);
            if (link.get("altText") instanceof String s) shaped.put("altText", s);
            if (link.get("targetWindow") instanceof String s) shaped.put("targetWindow", s);
            if (link.get("description") instanceof String s) shaped.put("description", s);
            if (link.get("thumbnail") instanceof String s) shaped.put("thumbnail", s);

            // Tags — strings only, reject hyphens.
            if (link.get("tags") instanceof List<?> tagsList) {
                List<String> cleanTags = new ArrayList<>();
                for (Object t : tagsList) {
                    if (!(t instanceof String tagStr)) continue;
                    if (tagStr.contains("-")) {
                        LOG.warning("validate: allLinks[\"" + key + "\"] — stripping tag \""
                            + tagStr + "\" (hyphens not allowed)");
                        continue;
                    }
                    cleanTags.add(tagStr);
                }
                shaped.put("tags", cleanTags);
            }

            // Hooks — tier-aware allowlist enforcement.
            if (link.get("hooks") instanceof List<?> hooksList) {
                List<String> stringHooks = new ArrayList<>();
                for (Object h : hooksList) {
                    if (h instanceof String hs) stringHooks.add(hs);
                }
                if ("author".equals(provenance)) {
                    if (!stringHooks.isEmpty()) shaped.put("hooks", stringHooks);
                } else if (hookAllowlist != null) {
                    List<String> allowed = new ArrayList<>();
                    for (String h : stringHooks) {
                        if (hookAllowlist.contains(h)) {
                            allowed.add(h);
                        } else {
                            LOG.warning("validate: allLinks[\"" + key + "\"] — stripping hook \""
                                + h + "\" not in settings.hooks allowlist (tier: " + provenance + ")");
                        }
                    }
                    if (!allowed.isEmpty()) shaped.put("hooks", allowed);
                } else if (!stringHooks.isEmpty()) {
                    LOG.warning("validate: allLinks[\"" + key + "\"] — dropping "
                        + stringHooks.size() + " hook(s) on " + provenance
                        + "-tier link; declare settings.hooks to allow specific keys");
                }
            }

            if (link.get("guid") instanceof String s) shaped.put("guid", s);
            if (link.containsKey("createdAt")) shaped.put("createdAt", link.get("createdAt"));

            // Meta — copy with nested BLOCKED_KEYS filter. (sanitizeLinkUrls
            // runs a second pass that also strips blocked keys and
            // sanitises *Url fields; this first pass makes sure
            // shaped["meta"] is already a fresh map.)
            if (link.get("meta") instanceof Map<?, ?> metaMap) {
                Map<String, Object> safeMeta = new LinkedHashMap<>();
                for (Map.Entry<?, ?> me : metaMap.entrySet()) {
                    if (!(me.getKey() instanceof String mk)) continue;
                    if (BLOCKED_KEYS.contains(mk)) continue;
                    safeMeta.put(mk, me.getValue());
                }
                shaped.put("meta", safeMeta);
            }

            // Single source of truth for URL-field sanitization.
            Map<String, Object> finalLink = sanitizeLinkUrls(shaped);

            // Stamp provenance AFTER the whitelist pass — since shaped
            // was built from a fixed set of known keys, an incoming
            // config cannot pre-stamp itself via a forged _provenance field.
            LinkProvenance.stamp(finalLink, provenance);

            sanitizedLinks.put(key, finalLink);
        }

        // --- settings (optional) ---
        Map<String, Object> settings = filterBlocked(cloned.get("settings"));

        // --- macros (optional) ---
        Map<String, Object> macros = null;
        if (cloned.get("macros") instanceof Map<?, ?> macrosRaw) {
            macros = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : macrosRaw.entrySet()) {
                if (!(entry.getKey() instanceof String name)) continue;
                if (BLOCKED_KEYS.contains(name)) continue;
                if (name.contains("-")) {
                    LOG.warning("validate: skipping macro \"" + name + "\" — hyphens not allowed");
                    continue;
                }
                if (entry.getValue() instanceof Map<?, ?> macroMap
                        && macroMap.get("linkItems") instanceof String) {
                    macros.put(name, new LinkedHashMap<>(macroMap));
                }
            }
        }

        // --- searchPatterns (optional) ---
        Map<String, Object> searchPatterns = null;
        if (cloned.get("searchPatterns") instanceof Map<?, ?> spRaw) {
            searchPatterns = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : spRaw.entrySet()) {
                if (!(entry.getKey() instanceof String spKey)) continue;
                if (BLOCKED_KEYS.contains(spKey)) continue;
                if (spKey.contains("-")) {
                    LOG.warning("validate: skipping searchPattern \"" + spKey + "\" — hyphens not allowed");
                    continue;
                }

                if (entry.getValue() instanceof String patStr) {
                    Config.RegexValidation v = ValidateRegex.validate(patStr);
                    if (v.safe()) {
                        searchPatterns.put(spKey, patStr);
                    } else {
                        LOG.warning("validate: removing searchPattern \"" + spKey + "\" — " + v.reason());
                    }
                } else if (entry.getValue() instanceof Map<?, ?> patMap
                        && patMap.get("pattern") instanceof String pat) {
                    Config.RegexValidation v = ValidateRegex.validate(pat);
                    if (v.safe()) {
                        searchPatterns.put(spKey, new LinkedHashMap<>(patMap));
                    } else {
                        LOG.warning("validate: removing searchPattern \"" + spKey + "\" — " + v.reason());
                    }
                }
            }
        }

        // --- protocols (optional, data-only since 3.2) ---
        Map<String, Object> protocols = null;
        if (cloned.get("protocols") instanceof Map<?, ?> protoRaw) {
            protocols = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : protoRaw.entrySet()) {
                if (!(entry.getKey() instanceof String pkey)) continue;
                if (BLOCKED_KEYS.contains(pkey)) continue;
                protocols.put(pkey, entry.getValue());
            }
        }

        // Assemble.
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("allLinks", sanitizedLinks);
        if (settings != null && !settings.isEmpty()) result.put("settings", settings);
        if (macros != null && !macros.isEmpty()) result.put("macros", macros);
        if (searchPatterns != null && !searchPatterns.isEmpty()) result.put("searchPatterns", searchPatterns);
        if (protocols != null && !protocols.isEmpty()) result.put("protocols", protocols);

        // Deep-freeze children and the top level.
        Map<String, Object> frozen = (Map<String, Object>) deepFreeze(result);
        VALIDATED.put(frozen, Boolean.TRUE);
        return frozen;
    }

    /**
     * Recursively wrap maps and lists in unmodifiable views. Strings,
     * numbers, booleans, and nulls pass through unchanged.
     */
    @SuppressWarnings("unchecked")
    private static Object deepFreeze(Object obj) {
        if (obj instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (e.getKey() instanceof String k) {
                    out.put(k, deepFreeze(e.getValue()));
                }
            }
            return Collections.unmodifiableMap(out);
        }
        if (obj instanceof List<?> list) {
            List<Object> out = new ArrayList<>(list.size());
            for (Object item : list) out.add(deepFreeze(item));
            return Collections.unmodifiableList(out);
        }
        return obj;
    }

    private static Map<String, Object> filterBlocked(Object raw) {
        if (!(raw instanceof Map<?, ?> map)) return null;
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() instanceof String key && !BLOCKED_KEYS.contains(key)) {
                result.put(key, entry.getValue());
            }
        }
        return result;
    }
}
