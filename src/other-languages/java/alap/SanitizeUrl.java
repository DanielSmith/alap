// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.regex.Pattern;

/**
 * URL sanitizer — Java port of src/core/sanitizeUrl.ts.
 *
 * <p>Blocks dangerous URI schemes (javascript:, data:, vbscript:, blob:)
 * to prevent XSS when rendering links from untrusted configs.
 */
public final class SanitizeUrl {

    private static final Pattern CONTROL_CHARS =
        Pattern.compile("[\\x00-\\x1f\\x7f]");

    private static final Pattern DANGEROUS_SCHEME =
        Pattern.compile("^(javascript|data|vbscript|blob)\\s*:", Pattern.CASE_INSENSITIVE);

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
}
