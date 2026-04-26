// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package tests;

import alap.LinkProvenance;
import alap.SanitizeByTier;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tests for SanitizeByTier — tier-aware URL / cssClass / targetWindow.
 *
 * <p>Run: {@code java -ea tests.SanitizeByTierTest}
 */
public class SanitizeByTierTest {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Alap Java — SanitizeByTier Test Suite\n");

        section("URL — author tier");
        run(SanitizeByTierTest::testUrlAuthorKeepsHttps);
        run(SanitizeByTierTest::testUrlAuthorKeepsHttp);
        run(SanitizeByTierTest::testUrlAuthorKeepsTel);
        run(SanitizeByTierTest::testUrlAuthorKeepsMailto);
        run(SanitizeByTierTest::testUrlAuthorKeepsCustomScheme);
        run(SanitizeByTierTest::testUrlAuthorStillBlocksJavascript);
        run(SanitizeByTierTest::testUrlAuthorStillBlocksData);
        run(SanitizeByTierTest::testUrlAuthorKeepsRelative);

        section("URL — storage tier");
        run(SanitizeByTierTest::testUrlStorageRemoteKeepsHttps);
        run(SanitizeByTierTest::testUrlStorageRemoteKeepsMailto);
        run(SanitizeByTierTest::testUrlStorageRemoteRejectsTel);
        run(SanitizeByTierTest::testUrlStorageRemoteRejectsCustomScheme);
        run(SanitizeByTierTest::testUrlStorageLocalRejectsTel);
        run(SanitizeByTierTest::testUrlStorageRemoteStillBlocksJavascript);

        section("URL — protocol tier");
        run(SanitizeByTierTest::testUrlProtocolKeepsHttps);
        run(SanitizeByTierTest::testUrlProtocolRejectsTel);
        run(SanitizeByTierTest::testUrlProtocolRejectsCustomScheme);
        run(SanitizeByTierTest::testUrlProtocolBlocksJavascript);

        section("URL — unstamped (fail-closed)");
        run(SanitizeByTierTest::testUrlUnstampedRejectsTel);
        run(SanitizeByTierTest::testUrlUnstampedKeepsHttps);
        run(SanitizeByTierTest::testUrlUnstampedBlocksJavascript);

        section("cssClass");
        run(SanitizeByTierTest::testCssClassAuthorKeepsClass);
        run(SanitizeByTierTest::testCssClassAuthorKeepsMultiWord);
        run(SanitizeByTierTest::testCssClassAuthorNullStaysNull);
        run(SanitizeByTierTest::testCssClassStorageRemoteDropsClass);
        run(SanitizeByTierTest::testCssClassStorageLocalDropsClass);
        run(SanitizeByTierTest::testCssClassProtocolDropsClass);
        run(SanitizeByTierTest::testCssClassProtocolNullStaysNull);
        run(SanitizeByTierTest::testCssClassUnstampedDropsClass);

        section("targetWindow");
        run(SanitizeByTierTest::testTargetWindowAuthorKeepsSelf);
        run(SanitizeByTierTest::testTargetWindowAuthorKeepsBlank);
        run(SanitizeByTierTest::testTargetWindowAuthorKeepsNamedWindow);
        run(SanitizeByTierTest::testTargetWindowAuthorPassesNullThrough);
        run(SanitizeByTierTest::testTargetWindowStorageClampsSelfToBlank);
        run(SanitizeByTierTest::testTargetWindowStorageClampsNamedWindowToBlank);
        run(SanitizeByTierTest::testTargetWindowStorageClampsNullToBlank);
        run(SanitizeByTierTest::testTargetWindowStorageLocalClamps);
        run(SanitizeByTierTest::testTargetWindowProtocolClamps);
        run(SanitizeByTierTest::testTargetWindowUnstampedClamps);
        run(SanitizeByTierTest::testTargetWindowUnstampedNullClamps);

        System.out.println("\n==================================================");
        System.out.println(passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
        System.exit(failed == 0 ? 0 : 1);
    }

    private static Map<String, Object> stampedLink(String tier) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("url", "/a");
        LinkProvenance.stamp(m, tier);
        return m;
    }

    private static Map<String, Object> unstampedLink() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("url", "/a");
        return m;
    }

    // --- URL: author ---

    static void testUrlAuthorKeepsHttps() {
        assertEquals("https://example.com",
            SanitizeByTier.url("https://example.com", stampedLink("author")),
            "author keeps https");
    }

    static void testUrlAuthorKeepsHttp() {
        assertEquals("http://example.com",
            SanitizeByTier.url("http://example.com", stampedLink("author")),
            "author keeps http");
    }

    static void testUrlAuthorKeepsTel() {
        assertEquals("tel:+15551234",
            SanitizeByTier.url("tel:+15551234", stampedLink("author")),
            "author keeps tel");
    }

    static void testUrlAuthorKeepsMailto() {
        assertEquals("mailto:a@b.com",
            SanitizeByTier.url("mailto:a@b.com", stampedLink("author")),
            "author keeps mailto");
    }

    static void testUrlAuthorKeepsCustomScheme() {
        assertEquals("obsidian://open?vault=foo",
            SanitizeByTier.url("obsidian://open?vault=foo", stampedLink("author")),
            "author keeps obsidian://");
    }

    static void testUrlAuthorStillBlocksJavascript() {
        assertEquals("about:blank",
            SanitizeByTier.url("javascript:alert(1)", stampedLink("author")),
            "author blocks javascript");
    }

    static void testUrlAuthorStillBlocksData() {
        assertEquals("about:blank",
            SanitizeByTier.url("data:text/html,x", stampedLink("author")),
            "author blocks data");
    }

    static void testUrlAuthorKeepsRelative() {
        assertEquals("/foo/bar",
            SanitizeByTier.url("/foo/bar", stampedLink("author")),
            "author keeps relative");
    }

    // --- URL: storage ---

    static void testUrlStorageRemoteKeepsHttps() {
        assertEquals("https://example.com",
            SanitizeByTier.url("https://example.com", stampedLink("storage:remote")),
            "storage:remote keeps https");
    }

    static void testUrlStorageRemoteKeepsMailto() {
        assertEquals("mailto:a@b.com",
            SanitizeByTier.url("mailto:a@b.com", stampedLink("storage:remote")),
            "storage:remote keeps mailto");
    }

    static void testUrlStorageRemoteRejectsTel() {
        assertEquals("about:blank",
            SanitizeByTier.url("tel:+15551234", stampedLink("storage:remote")),
            "storage:remote rejects tel");
    }

    static void testUrlStorageRemoteRejectsCustomScheme() {
        assertEquals("about:blank",
            SanitizeByTier.url("obsidian://open?vault=foo", stampedLink("storage:remote")),
            "storage:remote rejects custom scheme");
    }

    static void testUrlStorageLocalRejectsTel() {
        assertEquals("about:blank",
            SanitizeByTier.url("tel:+15551234", stampedLink("storage:local")),
            "storage:local rejects tel");
    }

    static void testUrlStorageRemoteStillBlocksJavascript() {
        assertEquals("about:blank",
            SanitizeByTier.url("javascript:alert(1)", stampedLink("storage:remote")),
            "storage:remote blocks javascript");
    }

    // --- URL: protocol ---

    static void testUrlProtocolKeepsHttps() {
        assertEquals("https://example.com",
            SanitizeByTier.url("https://example.com", stampedLink("protocol:web")),
            "protocol:web keeps https");
    }

    static void testUrlProtocolRejectsTel() {
        assertEquals("about:blank",
            SanitizeByTier.url("tel:+15551234", stampedLink("protocol:web")),
            "protocol:web rejects tel");
    }

    static void testUrlProtocolRejectsCustomScheme() {
        assertEquals("about:blank",
            SanitizeByTier.url("obsidian://open", stampedLink("protocol:atproto")),
            "protocol:atproto rejects custom scheme");
    }

    static void testUrlProtocolBlocksJavascript() {
        assertEquals("about:blank",
            SanitizeByTier.url("javascript:alert(1)", stampedLink("protocol:web")),
            "protocol:web blocks javascript");
    }

    // --- URL: unstamped (fail-closed) ---

    static void testUrlUnstampedRejectsTel() {
        assertEquals("about:blank",
            SanitizeByTier.url("tel:+15551234", unstampedLink()),
            "unstamped rejects tel");
    }

    static void testUrlUnstampedKeepsHttps() {
        assertEquals("https://example.com",
            SanitizeByTier.url("https://example.com", unstampedLink()),
            "unstamped keeps https");
    }

    static void testUrlUnstampedBlocksJavascript() {
        assertEquals("about:blank",
            SanitizeByTier.url("javascript:alert(1)", unstampedLink()),
            "unstamped blocks javascript");
    }

    // --- cssClass ---

    static void testCssClassAuthorKeepsClass() {
        assertEquals("my-class",
            SanitizeByTier.cssClass("my-class", stampedLink("author")),
            "author keeps class");
    }

    static void testCssClassAuthorKeepsMultiWord() {
        assertEquals("primary special",
            SanitizeByTier.cssClass("primary special", stampedLink("author")),
            "author keeps multi-word");
    }

    static void testCssClassAuthorNullStaysNull() {
        assertEquals(null,
            SanitizeByTier.cssClass(null, stampedLink("author")),
            "author null stays null");
    }

    static void testCssClassStorageRemoteDropsClass() {
        assertEquals(null,
            SanitizeByTier.cssClass("my-class", stampedLink("storage:remote")),
            "storage:remote drops class");
    }

    static void testCssClassStorageLocalDropsClass() {
        assertEquals(null,
            SanitizeByTier.cssClass("my-class", stampedLink("storage:local")),
            "storage:local drops class");
    }

    static void testCssClassProtocolDropsClass() {
        assertEquals(null,
            SanitizeByTier.cssClass("my-class", stampedLink("protocol:web")),
            "protocol drops class");
    }

    static void testCssClassProtocolNullStaysNull() {
        assertEquals(null,
            SanitizeByTier.cssClass(null, stampedLink("protocol:web")),
            "protocol null stays null");
    }

    static void testCssClassUnstampedDropsClass() {
        assertEquals(null,
            SanitizeByTier.cssClass("my-class", unstampedLink()),
            "unstamped drops class");
    }

    // --- targetWindow ---

    static void testTargetWindowAuthorKeepsSelf() {
        assertEquals("_self",
            SanitizeByTier.targetWindow("_self", stampedLink("author")),
            "author keeps _self");
    }

    static void testTargetWindowAuthorKeepsBlank() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow("_blank", stampedLink("author")),
            "author keeps _blank");
    }

    static void testTargetWindowAuthorKeepsNamedWindow() {
        assertEquals("fromAlap",
            SanitizeByTier.targetWindow("fromAlap", stampedLink("author")),
            "author keeps named window");
    }

    static void testTargetWindowAuthorPassesNullThrough() {
        // Author-tier intentionally preserves null so the caller's
        // fallback chain still applies.
        assertEquals(null,
            SanitizeByTier.targetWindow(null, stampedLink("author")),
            "author passes null through");
    }

    static void testTargetWindowStorageClampsSelfToBlank() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow("_self", stampedLink("storage:remote")),
            "storage:remote clamps _self");
    }

    static void testTargetWindowStorageClampsNamedWindowToBlank() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow("fromAlap", stampedLink("storage:remote")),
            "storage:remote clamps named window");
    }

    static void testTargetWindowStorageClampsNullToBlank() {
        // Non-author tier forces _blank even when input is null.
        assertEquals("_blank",
            SanitizeByTier.targetWindow(null, stampedLink("storage:remote")),
            "storage:remote clamps null to _blank");
    }

    static void testTargetWindowStorageLocalClamps() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow("_parent", stampedLink("storage:local")),
            "storage:local clamps _parent");
    }

    static void testTargetWindowProtocolClamps() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow("fromAlap", stampedLink("protocol:web")),
            "protocol clamps named window");
    }

    static void testTargetWindowUnstampedClamps() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow("_self", unstampedLink()),
            "unstamped clamps _self");
    }

    static void testTargetWindowUnstampedNullClamps() {
        assertEquals("_blank",
            SanitizeByTier.targetWindow(null, unstampedLink()),
            "unstamped null clamps to _blank");
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
}
