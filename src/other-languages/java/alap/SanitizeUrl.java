// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * URL sanitizer — Java port of src/core/sanitizeUrl.ts.
 *
 * <p>Three entry points:
 * <ul>
 *   <li>{@link #sanitize(String)} — loose; allows http, https, mailto,
 *       tel, relative, empty string; blocks the dangerous set.</li>
 *   <li>{@link #strict(String)} — http / https / mailto only (plus
 *       relative / empty).</li>
 *   <li>{@link #withSchemes(String, List)} — configurable scheme
 *       allowlist.</li>
 * </ul>
 */
public final class SanitizeUrl {

    private static final Pattern CONTROL_CHARS =
        Pattern.compile("[\\x00-\\x1f\\x7f]");

    private static final Pattern DANGEROUS_SCHEME =
        Pattern.compile("^(javascript|data|vbscript|blob)\\s*:", Pattern.CASE_INSENSITIVE);

    private static final Pattern SCHEME_MATCH =
        Pattern.compile("^([a-zA-Z][a-zA-Z0-9+\\-.]*)\\s*:");

    public static final List<String> DEFAULT_SCHEMES = List.of("http", "https");
    public static final List<String> STRICT_SCHEMES = List.of("http", "https", "mailto");

    private SanitizeUrl() {}

    /**
     * Returns {@code url} unchanged if safe, or {@code "about:blank"} if dangerous.
     */
    public static String sanitize(String url) {
        if (url == null || url.isEmpty()) {
            return url == null ? "" : url;
        }

        String normalized = CONTROL_CHARS.matcher(url).replaceAll("").strip();

        if (DANGEROUS_SCHEME.matcher(normalized).find()) {
            return "about:blank";
        }

        return url;
    }

    /**
     * Strict URL sanitizer — http / https / mailto only (plus relative
     * URLs and empty string). Use for links whose origin has not been
     * verified as author-tier: protocol handler results, storage-loaded
     * configs, etc. Blocks {@code tel:}, {@code ftp:}, {@code blob:},
     * {@code data:}, {@code javascript:}, and any other scheme not in
     * the tight allowlist.
     */
    public static String strict(String url) {
        return withSchemes(url, STRICT_SCHEMES);
    }

    /**
     * Sanitize a URL against a configurable scheme allowlist.
     *
     * <p>Runs the dangerous-scheme blocklist first (defence-in-depth:
     * {@code javascript:} is blocked even when it appears in the
     * allowlist). Relative URLs pass through unchanged regardless of
     * the allowlist. Default allowed schemes are {@code http} / {@code https}.
     *
     * @param url the URL to sanitize
     * @param allowedSchemes list of allowed schemes, or {@code null} for defaults
     */
    public static String withSchemes(String url, List<String> allowedSchemes) {
        String base = sanitize(url);
        if ("about:blank".equals(base)) return base;
        if (base == null || base.isEmpty()) return base;

        List<String> schemes = allowedSchemes != null ? allowedSchemes : DEFAULT_SCHEMES;

        String normalized = CONTROL_CHARS.matcher(base).replaceAll("").strip();
        Matcher m = SCHEME_MATCH.matcher(normalized);
        if (m.find()) {
            String scheme = m.group(1).toLowerCase();
            if (!schemes.contains(scheme)) {
                return "about:blank";
            }
        }

        return base;
    }
}
