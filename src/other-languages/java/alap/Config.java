// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

/**
 * Alap configuration types — Java 21 records.
 *
 * <p>Config is accepted as {@code Map<String, Object>} from callers (who bring
 * their own JSON library). These typed records are used after validation.
 */
public final class Config {

    private Config() {} // namespace only

    /** A single link entry in allLinks. */
    public record Link(
        String url,
        String label,
        List<String> tags,
        String cssClass,
        String image,
        String altText,
        String targetWindow,
        String description,
        String thumbnail,
        Object createdAt,
        Map<String, Object> meta
    ) {
        /** Convenience constructor for the common case. */
        public Link(String url, String label, List<String> tags) {
            this(url, label, tags, null, null, null, null, null, null, null, null);
        }
    }

    /** A link with its ID attached. */
    public record LinkWithId(String id, Link link) {}

    /** A named reusable expression. */
    public record Macro(String linkItems, Map<String, Object> config) {
        public Macro(String linkItems) {
            this(linkItems, null);
        }
    }

    /** Result of regex validation. */
    public record RegexValidation(boolean safe, String reason) {
        public static RegexValidation ok() {
            return new RegexValidation(true, null);
        }
        public static RegexValidation fail(String reason) {
            return new RegexValidation(false, reason);
        }
    }

    /**
     * A named protocol handler that filters links by a predicate.
     *
     * <p>The handler receives (argument segments, link map, item ID) and
     * returns true if the link matches.
     */
    @FunctionalInterface
    public interface ProtocolHandler {
        boolean test(List<String> args, Map<String, Object> link, String id);
    }
}
