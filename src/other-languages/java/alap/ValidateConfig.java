// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

/**
 * Config validation — Java port of src/core/validateConfig.ts.
 *
 * <p>Validates and sanitizes an Alap config from an untrusted source.
 */
public final class ValidateConfig {

    private static final Logger LOG = Logger.getLogger(ValidateConfig.class.getName());

    // Prototype-pollution keys blocked across all language ports.
    // Python additionally blocks __class__, __bases__, __mro__, __subclasses__
    // (Python-specific reflection attributes, not applicable to Java).
    private static final Set<String> BLOCKED_KEYS =
        Set.of("__proto__", "constructor", "prototype");

    private static final Set<String> LINK_FIELD_WHITELIST = Set.of(
        "url", "label", "tags", "cssClass", "image", "altText",
        "targetWindow", "description", "thumbnail", "hooks", "guid", "createdAt"
    );

    private ValidateConfig() {}

    /**
     * Validate and sanitize a raw config map (e.g. from JSON parsing).
     *
     * @return a sanitized copy — the input is never mutated
     * @throws IllegalArgumentException when the config is structurally invalid
     */
    public static Map<String, Object> validate(Map<String, Object> raw) {
        if (raw == null) {
            throw new IllegalArgumentException("config is null");
        }

        // allLinks is required
        if (!(raw.get("allLinks") instanceof Map<?, ?> allLinksMap)) {
            throw new IllegalArgumentException("allLinks must be a non-null object");
        }

        Map<String, Object> sanitizedLinks = new LinkedHashMap<>();

        for (Map.Entry<?, ?> entry : allLinksMap.entrySet()) {
            if (!(entry.getKey() instanceof String key)) continue;

            if (BLOCKED_KEYS.contains(key)) continue;
            if (key.contains("-")) {
                LOG.warning("validate: skipping allLinks[\"" + key
                    + "\"] — hyphens not allowed in item IDs");
                continue;
            }

            if (!(entry.getValue() instanceof Map<?, ?> link)) {
                LOG.warning("validate: skipping allLinks[\"" + key + "\"] — not a valid link object");
                continue;
            }

            // url is required
            if (!(link.get("url") instanceof String urlStr)) {
                LOG.warning("validate: skipping allLinks[\"" + key + "\"] — missing or invalid url");
                continue;
            }

            Map<String, Object> sanitized = new LinkedHashMap<>();
            sanitized.put("url", SanitizeUrl.sanitize(urlStr));

            if (link.get("label") instanceof String s) sanitized.put("label", s);
            if (link.get("cssClass") instanceof String s) sanitized.put("cssClass", s);
            if (link.get("image") instanceof String s) sanitized.put("image", SanitizeUrl.sanitize(s));
            if (link.get("altText") instanceof String s) sanitized.put("altText", s);
            if (link.get("targetWindow") instanceof String s) sanitized.put("targetWindow", s);
            if (link.get("description") instanceof String s) sanitized.put("description", s);
            if (link.get("thumbnail") instanceof String s) sanitized.put("thumbnail", s);
            if (link.get("guid") instanceof String s) sanitized.put("guid", s);
            if (link.containsKey("createdAt")) sanitized.put("createdAt", link.get("createdAt"));

            // hooks: list of strings
            if (link.get("hooks") instanceof List<?> hooksList) {
                List<String> cleanHooks = new ArrayList<>();
                for (Object h : hooksList) {
                    if (h instanceof String hs) cleanHooks.add(hs);
                }
                sanitized.put("hooks", cleanHooks);
            }

            // Tags: validate each for hyphens
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
                sanitized.put("tags", cleanTags);
            }

            sanitizedLinks.put(key, sanitized);
        }

        // Settings (optional)
        Map<String, Object> settings = filterBlocked(raw.get("settings"));

        // Macros (optional)
        Map<String, Object> macros = null;
        if (raw.get("macros") instanceof Map<?, ?> macrosRaw) {
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

        // Search patterns (optional)
        Map<String, Object> searchPatterns = null;
        if (raw.get("searchPatterns") instanceof Map<?, ?> spRaw) {
            searchPatterns = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : spRaw.entrySet()) {
                if (!(entry.getKey() instanceof String key)) continue;
                if (BLOCKED_KEYS.contains(key)) continue;
                if (key.contains("-")) {
                    LOG.warning("validate: skipping searchPattern \"" + key + "\" — hyphens not allowed");
                    continue;
                }

                if (entry.getValue() instanceof String patStr) {
                    Config.RegexValidation v = ValidateRegex.validate(patStr);
                    if (v.safe()) {
                        searchPatterns.put(key, patStr);
                    } else {
                        LOG.warning("validate: removing searchPattern \"" + key + "\" — " + v.reason());
                    }
                } else if (entry.getValue() instanceof Map<?, ?> patMap
                        && patMap.get("pattern") instanceof String pat) {
                    Config.RegexValidation v = ValidateRegex.validate(pat);
                    if (v.safe()) {
                        searchPatterns.put(key, new LinkedHashMap<>(patMap));
                    } else {
                        LOG.warning("validate: removing searchPattern \"" + key + "\" — " + v.reason());
                    }
                }
            }
        }

        // Assemble result
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("allLinks", sanitizedLinks);
        if (settings != null && !settings.isEmpty()) result.put("settings", settings);
        if (macros != null && !macros.isEmpty()) result.put("macros", macros);
        if (searchPatterns != null && !searchPatterns.isEmpty()) result.put("searchPatterns", searchPatterns);
        return result;
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
