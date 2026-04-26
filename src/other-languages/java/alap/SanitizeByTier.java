// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.Map;

/**
 * Tier-aware sanitizers — Java port of src/core/sanitizeByTier.ts.
 *
 * <p>Consumers (renderers, anything that takes a validated link and
 * forwards it into a rendered surface) read provenance off each link
 * and apply the appropriate rule: strict on anything that crossed a
 * trust boundary (storage adapter, protocol handler, unstamped), loose
 * on author-tier links the developer hand-wrote.
 *
 * <p>Fail-closed policy: a link with no provenance stamp is treated as
 * untrusted. {@link ValidateConfig} stamps every link it returns, so
 * the only way an unstamped link ends up here is if it bypassed
 * validation — a code path that should not exist in normal use.
 */
public final class SanitizeByTier {

    private SanitizeByTier() {}

    /**
     * Loose sanitize for author-tier, strict otherwise.
     *
     * <p>Author-tier gets {@link SanitizeUrl#sanitize(String)} (permits
     * {@code tel:}, {@code mailto:}, and any custom developer-intended
     * scheme that is not explicitly dangerous). Everything else —
     * including unstamped — gets {@link SanitizeUrl#strict(String)}
     * ({@code http} / {@code https} / {@code mailto} only).
     */
    public static String url(String url, Map<String, Object> link) {
        if (LinkProvenance.isAuthorTier(link)) {
            return SanitizeUrl.sanitize(url);
        }
        return SanitizeUrl.strict(url);
    }

    /**
     * Author keeps its {@code cssClass}; everything else drops it.
     *
     * <p>Attacker-controlled class names can target CSS selectors that
     * exfiltrate data via {@code content: attr(...)}, trigger
     * layout-driven side channels, or overlay visible UI to mislead
     * the user. There is no narrow allowlist that beats "do not let
     * untrusted input pick a class at all."
     */
    public static String cssClass(String cssClass, Map<String, Object> link) {
        if (cssClass == null) return null;
        return LinkProvenance.isAuthorTier(link) ? cssClass : null;
    }

    /**
     * Author passes {@code targetWindow} through (including {@code null});
     * everything else clamps to {@code "_blank"} unconditionally.
     *
     * <p>Even when a non-author link did not specify its own target, we
     * still clamp to {@code "_blank"} rather than let it inherit the
     * author's named-window default (e.g. {@code "fromAlap"}). Letting
     * a storage- or protocol-tier link ride into an author-reserved
     * window would let it overwrite whatever the author had open there.
     */
    public static String targetWindow(String targetWindow, Map<String, Object> link) {
        if (LinkProvenance.isAuthorTier(link)) return targetWindow;
        return "_blank";
    }
}
