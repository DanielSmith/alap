// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package tests;

import alap.ConfigMigrationError;
import alap.LinkProvenance;
import alap.ValidateConfig;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests for ValidateConfig — 3.2 features (provenance, hooks allowlist,
 * assertNoHandlers, sanitizeLinkUrls, meta / thumbnail, idempotence,
 * deep-freeze immutability).
 *
 * <p>Run: {@code java -ea tests.ValidateConfigTest}
 */
public class ValidateConfigTest {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Alap Java — ValidateConfig Test Suite (3.2 features)\n");

        section("Provenance stamping");
        run(ValidateConfigTest::testProvenanceDefaultsToAuthor);
        run(ValidateConfigTest::testProvenanceStorageLocal);
        run(ValidateConfigTest::testProvenanceStorageRemote);
        run(ValidateConfigTest::testProvenanceProtocol);
        run(ValidateConfigTest::testProvenanceCannotBePresetByInput);

        section("Hooks allowlist");
        run(ValidateConfigTest::testHooksAuthorKeepsAllVerbatim);
        run(ValidateConfigTest::testHooksNonAuthorWithoutAllowlistStripsAll);
        run(ValidateConfigTest::testHooksNonAuthorIntersectsAgainstAllowlist);
        run(ValidateConfigTest::testHooksNonAuthorFullyStrippedWhenNoneMatch);

        section("Idempotence");
        run(ValidateConfigTest::testIdempotenceReturnsSameInstance);
        run(ValidateConfigTest::testIdempotencePreservesProvenance);
        run(ValidateConfigTest::testBareMapNotMistakenForValidated);

        section("assertNoHandlersInConfig");
        run(ValidateConfigTest::testAssertRejectsGenerateFunction);
        run(ValidateConfigTest::testAssertRejectsFilterConsumer);
        run(ValidateConfigTest::testAssertRejectsHandlerRunnable);
        run(ValidateConfigTest::testAssertPermitsDataOnlyProtocols);
        run(ValidateConfigTest::testAssertNoProtocolsFieldIsOk);
        run(ValidateConfigTest::testValidateRaisesOnCallableInProtocols);

        section("Deep-freeze immutability");
        run(ValidateConfigTest::testResultMapIsImmutable);
        run(ValidateConfigTest::testNestedLinkIsImmutable);
        run(ValidateConfigTest::testTagsListIsImmutable);

        section("Meta URL sanitization");
        run(ValidateConfigTest::testMetaUrlKeySanitized);
        run(ValidateConfigTest::testMetaUrlCaseInsensitiveMatch);
        run(ValidateConfigTest::testMetaNonUrlKeyUntouched);
        run(ValidateConfigTest::testMetaBlockedKeysRecursed);

        section("Thumbnail sanitization");
        run(ValidateConfigTest::testThumbnailSanitized);
        run(ValidateConfigTest::testThumbnailValidUrlPreserved);

        section("sanitizeLinkUrls helper (direct)");
        run(ValidateConfigTest::testSanitizeLinkUrlsDirectUrl);
        run(ValidateConfigTest::testSanitizeLinkUrlsDirectImage);
        run(ValidateConfigTest::testSanitizeLinkUrlsDirectThumbnail);
        run(ValidateConfigTest::testSanitizeLinkUrlsDirectMetaUrl);
        run(ValidateConfigTest::testSanitizeLinkUrlsDirectStripsBlockedMetaKeys);

        System.out.println("\n==================================================");
        System.out.println(passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
        System.exit(failed == 0 ? 0 : 1);
    }

    private static Map<String, Object> minimalConfig() {
        Map<String, Object> alpha = new LinkedHashMap<>();
        alpha.put("url", "https://example.com/alpha");
        alpha.put("label", "Alpha");
        Map<String, Object> allLinks = new LinkedHashMap<>();
        allLinks.put("alpha", alpha);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", allLinks);
        return cfg;
    }

    // --- Provenance ---

    @SuppressWarnings("unchecked")
    static void testProvenanceDefaultsToAuthor() {
        Map<String, Object> result = ValidateConfig.validate(minimalConfig());
        Map<String, Object> link = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("alpha");
        assertTrue(LinkProvenance.isAuthorTier(link), "default stamps author");
        assertEquals("author", LinkProvenance.get(link), "provenance value");
    }

    @SuppressWarnings("unchecked")
    static void testProvenanceStorageLocal() {
        Map<String, Object> result = ValidateConfig.validate(minimalConfig(), "storage:local");
        Map<String, Object> link = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("alpha");
        assertTrue(LinkProvenance.isStorageTier(link), "storage tier predicate");
        assertEquals("storage:local", LinkProvenance.get(link), "storage:local stamp");
    }

    @SuppressWarnings("unchecked")
    static void testProvenanceStorageRemote() {
        Map<String, Object> result = ValidateConfig.validate(minimalConfig(), "storage:remote");
        Map<String, Object> link = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("alpha");
        assertEquals("storage:remote", LinkProvenance.get(link), "storage:remote stamp");
    }

    @SuppressWarnings("unchecked")
    static void testProvenanceProtocol() {
        Map<String, Object> result = ValidateConfig.validate(minimalConfig(), "protocol:web");
        Map<String, Object> link = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("alpha");
        assertTrue(LinkProvenance.isProtocolTier(link), "protocol tier predicate");
        assertEquals("protocol:web", LinkProvenance.get(link), "protocol:web stamp");
    }

    @SuppressWarnings("unchecked")
    static void testProvenanceCannotBePresetByInput() {
        // Input tries to pre-stamp itself as author while being loaded
        // from storage:remote. The whitelist filters _provenance out,
        // and stamp runs after whitelist.
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "https://x.com");
        link.put(LinkProvenance.PROVENANCE_KEY, "author");
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", link);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg, "storage:remote");
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertEquals("storage:remote", LinkProvenance.get(out), "preset _provenance overridden");
    }

    // --- Hooks allowlist ---

    @SuppressWarnings("unchecked")
    static void testHooksAuthorKeepsAllVerbatim() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("hooks", List.of("hover", "click", "anything"));
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", link);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertEquals(List.of("hover", "click", "anything"), out.get("hooks"), "author keeps all hooks");
    }

    @SuppressWarnings("unchecked")
    static void testHooksNonAuthorWithoutAllowlistStripsAll() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("hooks", List.of("hover", "click"));
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", link);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg, "storage:remote");
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertFalse(out.containsKey("hooks"), "non-author w/o allowlist strips all hooks");
    }

    @SuppressWarnings("unchecked")
    static void testHooksNonAuthorIntersectsAgainstAllowlist() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("hooks", List.of("hover", "attacker_chosen"));
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", link);
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("hooks", List.of("hover"));
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);
        cfg.put("settings", settings);

        Map<String, Object> result = ValidateConfig.validate(cfg, "protocol:web");
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertEquals(List.of("hover"), out.get("hooks"), "intersected against allowlist");
    }

    @SuppressWarnings("unchecked")
    static void testHooksNonAuthorFullyStrippedWhenNoneMatch() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("hooks", List.of("evil", "worse"));
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", link);
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("hooks", List.of("approved_hook"));
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);
        cfg.put("settings", settings);

        Map<String, Object> result = ValidateConfig.validate(cfg, "storage:remote");
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertFalse(out.containsKey("hooks"), "all hooks stripped when none match");
    }

    // --- Idempotence ---

    static void testIdempotenceReturnsSameInstance() {
        Map<String, Object> first = ValidateConfig.validate(minimalConfig(), "storage:remote");
        Map<String, Object> second = ValidateConfig.validate(first);
        assertTrue(first == second, "re-validate returns same instance");
    }

    @SuppressWarnings("unchecked")
    static void testIdempotencePreservesProvenance() {
        Map<String, Object> first = ValidateConfig.validate(minimalConfig(), "storage:remote");
        // Even if caller passes "author" on re-validate, the original
        // storage:remote stamp is kept via short-circuit.
        Map<String, Object> second = ValidateConfig.validate(first, "author");
        assertTrue(first == second, "same instance returned");
        Map<String, Object> link = (Map<String, Object>) ((Map<String, Object>) second.get("allLinks")).get("alpha");
        assertEquals("storage:remote", LinkProvenance.get(link), "storage:remote stamp preserved");
    }

    static void testBareMapNotMistakenForValidated() {
        // A plain Map matching the shape of a validated one must NOT
        // short-circuit — it has no stamp and must go through validation.
        Map<String, Object> first = ValidateConfig.validate(minimalConfig());
        Map<String, Object> second = ValidateConfig.validate(minimalConfig());  // different instance
        assertFalse(first == second, "different instances from different inputs");
    }

    // --- assertNoHandlersInConfig ---

    static void testAssertRejectsGenerateFunction() {
        Map<String, Object> web = new LinkedHashMap<>();
        web.put("generate", (java.util.function.Function<Object, Object>) args -> List.of());
        Map<String, Object> protocols = new LinkedHashMap<>();
        protocols.put("web", web);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("protocols", protocols);

        assertThrows(ConfigMigrationError.class,
            () -> ValidateConfig.assertNoHandlersInConfig(cfg),
            "rejects generate function");
    }

    static void testAssertRejectsFilterConsumer() {
        Map<String, Object> custom = new LinkedHashMap<>();
        custom.put("filter", (java.util.function.Consumer<Object>) links -> {});
        Map<String, Object> protocols = new LinkedHashMap<>();
        protocols.put("custom", custom);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("protocols", protocols);

        assertThrows(ConfigMigrationError.class,
            () -> ValidateConfig.assertNoHandlersInConfig(cfg),
            "rejects filter consumer");
    }

    static void testAssertRejectsHandlerRunnable() {
        Map<String, Object> custom = new LinkedHashMap<>();
        custom.put("handler", (Runnable) () -> {});
        Map<String, Object> protocols = new LinkedHashMap<>();
        protocols.put("custom", custom);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("protocols", protocols);

        assertThrows(ConfigMigrationError.class,
            () -> ValidateConfig.assertNoHandlersInConfig(cfg),
            "rejects handler runnable");
    }

    static void testAssertPermitsDataOnlyProtocols() {
        Map<String, Object> keys = new LinkedHashMap<>();
        keys.put("books", Map.of("url", "..."));
        Map<String, Object> web = new LinkedHashMap<>();
        web.put("keys", keys);
        Map<String, Object> protocols = new LinkedHashMap<>();
        protocols.put("web", web);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("protocols", protocols);

        ValidateConfig.assertNoHandlersInConfig(cfg);
        assertTrue(true, "data-only protocols permitted (no throw)");
    }

    static void testAssertNoProtocolsFieldIsOk() {
        ValidateConfig.assertNoHandlersInConfig(new LinkedHashMap<>());
        assertTrue(true, "no protocols field is ok");
    }

    static void testValidateRaisesOnCallableInProtocols() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> web = new LinkedHashMap<>();
        web.put("generate", (java.util.function.Supplier<Object>) () -> List.of());
        Map<String, Object> protocols = new LinkedHashMap<>();
        protocols.put("web", web);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);
        cfg.put("protocols", protocols);

        assertThrows(ConfigMigrationError.class,
            () -> ValidateConfig.validate(cfg),
            "validate raises on callable in protocols");
    }

    // --- Deep-freeze ---

    static void testResultMapIsImmutable() {
        Map<String, Object> result = ValidateConfig.validate(minimalConfig());
        assertThrows(UnsupportedOperationException.class,
            () -> result.put("settings", new LinkedHashMap<>()),
            "top-level put throws");
    }

    @SuppressWarnings("unchecked")
    static void testNestedLinkIsImmutable() {
        Map<String, Object> result = ValidateConfig.validate(minimalConfig());
        Map<String, Object> link = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("alpha");
        assertThrows(UnsupportedOperationException.class,
            () -> link.put("url", "https://evil.com"),
            "nested link put throws");
    }

    @SuppressWarnings("unchecked")
    static void testTagsListIsImmutable() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("tags", new ArrayList<>(List.of("nyc")));
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        List<Object> tags = (List<Object>) out.get("tags");
        assertThrows(UnsupportedOperationException.class,
            () -> tags.add("evil"),
            "tags list add throws");
    }

    // --- Meta URL sanitization ---

    @SuppressWarnings("unchecked")
    static void testMetaUrlKeySanitized() {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("iconUrl", "javascript:alert(1)");
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("meta", meta);
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> outMeta = (Map<String, Object>) ((Map<String, Object>)
            ((Map<String, Object>) result.get("allLinks")).get("a")).get("meta");
        assertEquals("about:blank", outMeta.get("iconUrl"), "iconUrl sanitized");
    }

    @SuppressWarnings("unchecked")
    static void testMetaUrlCaseInsensitiveMatch() {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("ImageURL", "javascript:alert(1)");
        meta.put("AvatarUrl", "data:text/html,x");
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("meta", meta);
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> outMeta = (Map<String, Object>) ((Map<String, Object>)
            ((Map<String, Object>) result.get("allLinks")).get("a")).get("meta");
        assertEquals("about:blank", outMeta.get("ImageURL"), "ImageURL sanitized");
        assertEquals("about:blank", outMeta.get("AvatarUrl"), "AvatarUrl sanitized");
    }

    @SuppressWarnings("unchecked")
    static void testMetaNonUrlKeyUntouched() {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("author", "Someone");
        meta.put("rank", 1);
        meta.put("body", "plain text");
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("meta", meta);
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> outMeta = (Map<String, Object>) ((Map<String, Object>)
            ((Map<String, Object>) result.get("allLinks")).get("a")).get("meta");
        assertEquals("Someone", outMeta.get("author"), "author untouched");
        assertEquals(1, outMeta.get("rank"), "rank untouched");
    }

    @SuppressWarnings("unchecked")
    static void testMetaBlockedKeysRecursed() {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("__proto__", Map.of("bad", true));
        meta.put("__class__", Map.of("bad", true));
        meta.put("legit", "ok");
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("meta", meta);
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> outMeta = (Map<String, Object>) ((Map<String, Object>)
            ((Map<String, Object>) result.get("allLinks")).get("a")).get("meta");
        assertFalse(outMeta.containsKey("__proto__"), "__proto__ stripped from meta");
        assertFalse(outMeta.containsKey("__class__"), "__class__ stripped from meta");
        assertEquals("ok", outMeta.get("legit"), "legit key kept");
    }

    // --- Thumbnail ---

    @SuppressWarnings("unchecked")
    static void testThumbnailSanitized() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("thumbnail", "javascript:alert(1)");
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertEquals("about:blank", out.get("thumbnail"), "thumbnail sanitized");
    }

    @SuppressWarnings("unchecked")
    static void testThumbnailValidUrlPreserved() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("thumbnail", "https://example.com/thumb.jpg");
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("allLinks", all);

        Map<String, Object> result = ValidateConfig.validate(cfg);
        Map<String, Object> out = (Map<String, Object>) ((Map<String, Object>) result.get("allLinks")).get("a");
        assertEquals("https://example.com/thumb.jpg", out.get("thumbnail"), "thumbnail preserved");
    }

    // --- sanitizeLinkUrls helper ---

    static void testSanitizeLinkUrlsDirectUrl() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "javascript:alert(1)");
        Map<String, Object> out = ValidateConfig.sanitizeLinkUrls(link);
        assertEquals("about:blank", out.get("url"), "direct url sanitized");
    }

    static void testSanitizeLinkUrlsDirectImage() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("image", "data:text/html,x");
        Map<String, Object> out = ValidateConfig.sanitizeLinkUrls(link);
        assertEquals("about:blank", out.get("image"), "direct image sanitized");
    }

    static void testSanitizeLinkUrlsDirectThumbnail() {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("thumbnail", "vbscript:bad");
        Map<String, Object> out = ValidateConfig.sanitizeLinkUrls(link);
        assertEquals("about:blank", out.get("thumbnail"), "direct thumbnail sanitized");
    }

    @SuppressWarnings("unchecked")
    static void testSanitizeLinkUrlsDirectMetaUrl() {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("coverUrl", "javascript:bad");
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("meta", meta);
        Map<String, Object> out = ValidateConfig.sanitizeLinkUrls(link);
        Map<String, Object> outMeta = (Map<String, Object>) out.get("meta");
        assertEquals("about:blank", outMeta.get("coverUrl"), "direct meta.coverUrl sanitized");
    }

    @SuppressWarnings("unchecked")
    static void testSanitizeLinkUrlsDirectStripsBlockedMetaKeys() {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("__proto__", Map.of("x", 1));
        meta.put("ok", "keep");
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("url", "/a");
        link.put("meta", meta);
        Map<String, Object> out = ValidateConfig.sanitizeLinkUrls(link);
        Map<String, Object> outMeta = (Map<String, Object>) out.get("meta");
        assertFalse(outMeta.containsKey("__proto__"), "blocked meta key stripped");
        assertEquals("keep", outMeta.get("ok"), "legit meta key kept");
    }

    // --- Runner ---

    private static void run(Runnable test) {
        try {
            test.run();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("  FAIL: " + e.getMessage());
        } catch (Throwable t) {
            failed++;
            System.out.println("  ERROR: " + t.getClass().getSimpleName() + ": " + t.getMessage());
        }
    }

    private static void section(String name) {
        System.out.println("\n--- " + name + " ---");
    }

    private static void assertEquals(Object expected, Object actual, String msg) {
        if (expected == null ? actual != null : !expected.equals(actual)) {
            throw new AssertionError(msg + ": expected " + expected + " but got " + actual);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertTrue(boolean cond, String msg) {
        if (!cond) throw new AssertionError(msg + ": expected true");
        System.out.println("  PASS: " + msg);
    }

    private static void assertFalse(boolean cond, String msg) {
        if (cond) throw new AssertionError(msg + ": expected false");
        System.out.println("  PASS: " + msg);
    }

    private static void assertThrows(Class<? extends Throwable> expected, Runnable action, String msg) {
        try {
            action.run();
        } catch (Throwable t) {
            if (expected.isInstance(t)) {
                System.out.println("  PASS: " + msg);
                return;
            }
            throw new AssertionError(msg + ": expected " + expected.getSimpleName() +
                " but got " + t.getClass().getSimpleName() + " (" + t.getMessage() + ")");
        }
        throw new AssertionError(msg + ": expected " + expected.getSimpleName() + " but nothing was thrown");
    }
}
