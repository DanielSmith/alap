// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package tests;

import alap.SanitizeUrl;

import java.util.List;

/**
 * Tests for SanitizeUrl — covers loose, strict, and withSchemes.
 *
 * <p>Self-contained runner, same pattern as ExpressionParserTest.
 * Run: {@code java -ea tests.SanitizeUrlTest}
 */
public class SanitizeUrlTest {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Alap Java — SanitizeUrl Test Suite\n");

        section("Loose (SanitizeUrl.sanitize)");
        run(SanitizeUrlTest::testLooseHttpsPasses);
        run(SanitizeUrlTest::testLooseHttpPasses);
        run(SanitizeUrlTest::testLooseMailtoPasses);
        run(SanitizeUrlTest::testLooseTelPasses);
        run(SanitizeUrlTest::testLooseRelativePasses);
        run(SanitizeUrlTest::testLooseEmptyPasses);
        run(SanitizeUrlTest::testLooseJavascriptBlocked);
        run(SanitizeUrlTest::testLooseJavascriptCaseInsensitive);
        run(SanitizeUrlTest::testLooseDataBlocked);
        run(SanitizeUrlTest::testLooseVbscriptBlocked);
        run(SanitizeUrlTest::testLooseBlobBlocked);
        run(SanitizeUrlTest::testLooseControlCharNewline);
        run(SanitizeUrlTest::testLooseControlCharTab);
        run(SanitizeUrlTest::testLooseControlCharNull);
        run(SanitizeUrlTest::testLooseWhitespaceBeforeColon);

        section("Strict (SanitizeUrl.strict)");
        run(SanitizeUrlTest::testStrictHttpsPasses);
        run(SanitizeUrlTest::testStrictHttpPasses);
        run(SanitizeUrlTest::testStrictMailtoPasses);
        run(SanitizeUrlTest::testStrictRelativePasses);
        run(SanitizeUrlTest::testStrictEmptyPasses);
        run(SanitizeUrlTest::testStrictTelBlocked);
        run(SanitizeUrlTest::testStrictFtpBlocked);
        run(SanitizeUrlTest::testStrictCustomSchemeBlocked);
        run(SanitizeUrlTest::testStrictJavascriptStillBlocked);
        run(SanitizeUrlTest::testStrictDataStillBlocked);
        run(SanitizeUrlTest::testStrictControlCharStillBlocked);

        section("WithSchemes (SanitizeUrl.withSchemes)");
        run(SanitizeUrlTest::testWithSchemesDefaultAllowsHttpHttps);
        run(SanitizeUrlTest::testWithSchemesDefaultBlocksMailto);
        run(SanitizeUrlTest::testWithSchemesCustomAllowlistPermitsObsidian);
        run(SanitizeUrlTest::testWithSchemesCustomAllowlistBlocksUnlisted);
        run(SanitizeUrlTest::testWithSchemesRelativePassesRegardless);
        run(SanitizeUrlTest::testWithSchemesDangerousBlockedEvenIfInAllowlist);
        run(SanitizeUrlTest::testWithSchemesEmptyAllowlistRejectsSchemeBearing);
        run(SanitizeUrlTest::testWithSchemesEmptyAllowlistPassesRelative);
        run(SanitizeUrlTest::testWithSchemesCaseInsensitiveSchemeMatch);

        System.out.println("\n==================================================");
        System.out.println(passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
        System.exit(failed == 0 ? 0 : 1);
    }

    // ---- Loose ----

    static void testLooseHttpsPasses() {
        assertEquals("https://example.com", SanitizeUrl.sanitize("https://example.com"), "loose https passes");
    }

    static void testLooseHttpPasses() {
        assertEquals("http://example.com", SanitizeUrl.sanitize("http://example.com"), "loose http passes");
    }

    static void testLooseMailtoPasses() {
        assertEquals("mailto:a@b.com", SanitizeUrl.sanitize("mailto:a@b.com"), "loose mailto passes");
    }

    static void testLooseTelPasses() {
        assertEquals("tel:+15551234", SanitizeUrl.sanitize("tel:+15551234"), "loose tel passes");
    }

    static void testLooseRelativePasses() {
        assertEquals("/foo/bar", SanitizeUrl.sanitize("/foo/bar"), "loose relative passes");
    }

    static void testLooseEmptyPasses() {
        assertEquals("", SanitizeUrl.sanitize(""), "loose empty passes");
    }

    static void testLooseJavascriptBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("javascript:alert(1)"), "loose javascript blocked");
    }

    static void testLooseJavascriptCaseInsensitive() {
        assertEquals("about:blank", SanitizeUrl.sanitize("JAVASCRIPT:alert(1)"), "loose JAVASCRIPT blocked");
        assertEquals("about:blank", SanitizeUrl.sanitize("JavaScript:alert(1)"), "loose JavaScript blocked");
    }

    static void testLooseDataBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("data:text/html,x"), "loose data blocked");
    }

    static void testLooseVbscriptBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("vbscript:alert(1)"), "loose vbscript blocked");
    }

    static void testLooseBlobBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("blob:https://example.com/abc"), "loose blob blocked");
    }

    static void testLooseControlCharNewline() {
        assertEquals("about:blank", SanitizeUrl.sanitize("java\nscript:alert(1)"), "loose newline disguise blocked");
    }

    static void testLooseControlCharTab() {
        assertEquals("about:blank", SanitizeUrl.sanitize("java\tscript:alert(1)"), "loose tab disguise blocked");
    }

    static void testLooseControlCharNull() {
        assertEquals("about:blank", SanitizeUrl.sanitize("java\0script:alert(1)"), "loose null disguise blocked");
    }

    static void testLooseWhitespaceBeforeColon() {
        assertEquals("about:blank", SanitizeUrl.sanitize("javascript :alert(1)"), "loose whitespace before colon blocked");
    }

    // ---- Strict ----

    static void testStrictHttpsPasses() {
        assertEquals("https://example.com", SanitizeUrl.strict("https://example.com"), "strict https passes");
    }

    static void testStrictHttpPasses() {
        assertEquals("http://example.com", SanitizeUrl.strict("http://example.com"), "strict http passes");
    }

    static void testStrictMailtoPasses() {
        assertEquals("mailto:a@b.com", SanitizeUrl.strict("mailto:a@b.com"), "strict mailto passes");
    }

    static void testStrictRelativePasses() {
        assertEquals("/foo", SanitizeUrl.strict("/foo"), "strict relative passes");
    }

    static void testStrictEmptyPasses() {
        assertEquals("", SanitizeUrl.strict(""), "strict empty passes");
    }

    static void testStrictTelBlocked() {
        assertEquals("about:blank", SanitizeUrl.strict("tel:+15551234"), "strict tel blocked");
    }

    static void testStrictFtpBlocked() {
        assertEquals("about:blank", SanitizeUrl.strict("ftp://example.com"), "strict ftp blocked");
    }

    static void testStrictCustomSchemeBlocked() {
        assertEquals("about:blank", SanitizeUrl.strict("obsidian://open?vault=foo"), "strict custom scheme blocked");
    }

    static void testStrictJavascriptStillBlocked() {
        assertEquals("about:blank", SanitizeUrl.strict("javascript:alert(1)"), "strict javascript still blocked");
    }

    static void testStrictDataStillBlocked() {
        assertEquals("about:blank", SanitizeUrl.strict("data:text/html,x"), "strict data still blocked");
    }

    static void testStrictControlCharStillBlocked() {
        assertEquals("about:blank", SanitizeUrl.strict("java\nscript:alert(1)"), "strict control char still blocked");
    }

    // ---- WithSchemes ----

    static void testWithSchemesDefaultAllowsHttpHttps() {
        assertEquals("http://example.com", SanitizeUrl.withSchemes("http://example.com", null), "default allows http");
        assertEquals("https://example.com", SanitizeUrl.withSchemes("https://example.com", null), "default allows https");
    }

    static void testWithSchemesDefaultBlocksMailto() {
        assertEquals("about:blank", SanitizeUrl.withSchemes("mailto:a@b.com", null), "default blocks mailto");
    }

    static void testWithSchemesCustomAllowlistPermitsObsidian() {
        assertEquals(
            "obsidian://open?vault=foo",
            SanitizeUrl.withSchemes("obsidian://open?vault=foo", List.of("http", "https", "obsidian")),
            "custom allowlist permits obsidian"
        );
    }

    static void testWithSchemesCustomAllowlistBlocksUnlisted() {
        assertEquals(
            "about:blank",
            SanitizeUrl.withSchemes("ftp://example.com", List.of("http", "https")),
            "custom allowlist blocks unlisted"
        );
    }

    static void testWithSchemesRelativePassesRegardless() {
        assertEquals("/foo", SanitizeUrl.withSchemes("/foo", List.of("http")), "relative passes regardless");
    }

    static void testWithSchemesDangerousBlockedEvenIfInAllowlist() {
        // Defence-in-depth: dangerous-scheme blocklist runs first.
        assertEquals(
            "about:blank",
            SanitizeUrl.withSchemes("javascript:alert(1)", List.of("javascript")),
            "dangerous blocked even if in allowlist"
        );
    }

    static void testWithSchemesEmptyAllowlistRejectsSchemeBearing() {
        assertEquals("about:blank", SanitizeUrl.withSchemes("http://example.com", List.of()), "empty allowlist rejects scheme-bearing");
    }

    static void testWithSchemesEmptyAllowlistPassesRelative() {
        assertEquals("/foo", SanitizeUrl.withSchemes("/foo", List.of()), "empty allowlist passes relative");
    }

    static void testWithSchemesCaseInsensitiveSchemeMatch() {
        assertEquals("HTTPS://example.com", SanitizeUrl.withSchemes("HTTPS://example.com", List.of("https")), "case-insensitive scheme match");
    }

    // ---- Runner ----

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
