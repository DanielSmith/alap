// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package tests;

import alap.Config;
import alap.ExpressionParser;
import alap.SanitizeUrl;
import alap.SsrfGuard;
import alap.Token;
import alap.ValidateConfig;
import alap.ValidateRegex;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests for the Java expression parser — mirrors the Python/Go/Rust test tiers.
 *
 * <p>Self-contained test runner using assertions (no JUnit dependency).
 * Run: {@code java -ea tests.ExpressionParserTest}
 */
public class ExpressionParserTest {

    private static int passed = 0;
    private static int failed = 0;

    // ------------------------------------------------------------------
    // Test config — mirrors tests/fixtures/links.ts
    // ------------------------------------------------------------------

    private static Map<String, Object> testConfig() {
        Map<String, Object> config = new LinkedHashMap<>();

        // Settings
        config.put("settings", Map.of("listType", "ul", "menuTimeout", 5000));

        // Macros
        config.put("macros", Map.of(
            "cars", Map.of("linkItems", "vwbug, bmwe36"),
            "nycbridges", Map.of("linkItems", ".nyc + .bridge"),
            "everything", Map.of("linkItems", ".nyc | .sf")
        ));

        // Search patterns
        config.put("searchPatterns", Map.of(
            "bridges", "bridge",
            "germanCars", Map.of(
                "pattern", "VW|BMW",
                "options", Map.of("fields", "l", "limit", 5)
            )
        ));

        // AllLinks — LinkedHashMap preserves insertion order
        Map<String, Object> allLinks = new LinkedHashMap<>();
        allLinks.put("vwbug", link("VW Bug", "https://example.com/vwbug", "car", "vw", "germany"));
        allLinks.put("bmwe36", link("BMW E36", "https://example.com/bmwe36", "car", "bmw", "germany"));
        allLinks.put("miata", link("Mazda Miata", "https://example.com/miata", "car", "mazda", "japan"));
        allLinks.put("brooklyn", link("Brooklyn Bridge", "https://example.com/brooklyn", "nyc", "bridge", "landmark"));
        allLinks.put("manhattan", link("Manhattan Bridge", "https://example.com/manhattan", "nyc", "bridge"));
        allLinks.put("highline", link("The High Line", "https://example.com/highline", "nyc", "park", "landmark"));
        allLinks.put("centralpark", link("Central Park", "https://example.com/centralpark", "nyc", "park"));
        allLinks.put("goldengate", link("Golden Gate", "https://example.com/goldengate", "sf", "bridge", "landmark"));
        allLinks.put("dolores", link("Dolores Park", "https://example.com/dolores", "sf", "park"));
        allLinks.put("towerbridge", link("Tower Bridge", "https://example.com/towerbridge", "london", "bridge", "landmark"));
        allLinks.put("aqus", link("Aqus Cafe", "https://example.com/aqus", "coffee", "sf"));
        allLinks.put("bluebottle", link("Blue Bottle", "https://example.com/bluebottle", "coffee", "sf", "nyc"));
        allLinks.put("acre", link("Acre Coffee", "https://example.com/acre", "coffee"));
        config.put("allLinks", allLinks);

        return config;
    }

    private static Map<String, Object> link(String label, String url, String... tags) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("url", url);
        m.put("tags", List.of(tags));
        return m;
    }

    // ------------------------------------------------------------------
    // Tier 1 — Operands
    // ------------------------------------------------------------------

    static void testSingleItemId() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of("vwbug"), parser.query("vwbug"), "single item ID");
    }

    static void testSingleClass() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".car");
        assertSorted(List.of("bmwe36", "miata", "vwbug"), result, "single class .car");
    }

    static void testNonexistentItem() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query("doesnotexist"), "nonexistent item");
    }

    static void testNonexistentClass() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query(".doesnotexist"), "nonexistent class");
    }

    // ------------------------------------------------------------------
    // Tier 2 — Commas
    // ------------------------------------------------------------------

    static void testTwoItems() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of("vwbug", "bmwe36"), parser.query("vwbug, bmwe36"), "two items");
    }

    static void testThreeItems() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of("vwbug", "bmwe36", "miata"),
            parser.query("vwbug, bmwe36, miata"), "three items");
    }

    static void testItemAndClass() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query("vwbug, .sf");
        assertEquals("vwbug", result.getFirst(), "item and class: first is vwbug");
        assertContains(result, "goldengate", "item and class: has goldengate");
        assertContains(result, "dolores", "item and class: has dolores");
    }

    static void testDeduplication() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of("vwbug"), parser.query("vwbug, vwbug"), "deduplication");
    }

    // ------------------------------------------------------------------
    // Tier 3 — Operators
    // ------------------------------------------------------------------

    static void testIntersection() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".nyc + .bridge");
        assertSorted(List.of("brooklyn", "manhattan"), result, "intersection .nyc + .bridge");
    }

    static void testUnion() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".nyc | .sf");
        assertContains(result, "brooklyn", "union has brooklyn");
        assertContains(result, "goldengate", "union has goldengate");
    }

    static void testSubtraction() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".nyc - .bridge");
        assertNotContains(result, "brooklyn", "subtract: no brooklyn");
        assertNotContains(result, "manhattan", "subtract: no manhattan");
        assertContains(result, "highline", "subtract: has highline");
        assertContains(result, "centralpark", "subtract: has centralpark");
    }

    // ------------------------------------------------------------------
    // Tier 4 — Chained operators
    // ------------------------------------------------------------------

    static void testThreeWayIntersection() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of("brooklyn"), parser.query(".nyc + .bridge + .landmark"),
            "three-way intersection");
    }

    static void testUnionThenSubtract() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        // Left-to-right: (.nyc | .sf) - .bridge
        List<String> result = parser.query(".nyc | .sf - .bridge");
        assertNotContains(result, "brooklyn", "union-sub: no brooklyn");
        assertNotContains(result, "manhattan", "union-sub: no manhattan");
        assertNotContains(result, "goldengate", "union-sub: no goldengate");
        assertContains(result, "highline", "union-sub: has highline");
    }

    // ------------------------------------------------------------------
    // Tier 5 — Mixed
    // ------------------------------------------------------------------

    static void testItemAndClassIntersection() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of("brooklyn"), parser.query("brooklyn + .landmark"),
            "item + class intersection");
    }

    static void testClassUnionWithItem() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".car | goldengate");
        assertContains(result, "vwbug", "class|item: has vwbug");
        assertContains(result, "goldengate", "class|item: has goldengate");
    }

    // ------------------------------------------------------------------
    // Tier 6 — Macros
    // ------------------------------------------------------------------

    static void testNamedMacro() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertSorted(List.of("bmwe36", "vwbug"), parser.query("@cars"), "named macro @cars");
    }

    static void testMacroWithOperators() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertSorted(List.of("brooklyn", "manhattan"), parser.query("@nycbridges"),
            "macro with operators");
    }

    static void testUnknownMacro() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query("@nonexistent"), "unknown macro");
    }

    static void testBareMacroWithAnchor() {
        Map<String, Object> config = new LinkedHashMap<>(testConfig());
        Map<String, Object> macros = new LinkedHashMap<>(ExpressionParser.asMap(config.get("macros")));
        macros.put("myanchor", Map.of("linkItems", "vwbug"));
        config.put("macros", macros);

        ExpressionParser parser = new ExpressionParser(config);
        assertEquals(List.of("vwbug"), parser.query("@", "myanchor"), "bare @ with anchor");
    }

    // ------------------------------------------------------------------
    // Tier 7 — Parentheses
    // ------------------------------------------------------------------

    static void testBasicGrouping() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> withParens = parser.query(".nyc | (.sf + .bridge)");
        assertContains(withParens, "highline", "parens: has highline");
        assertContains(withParens, "centralpark", "parens: has centralpark");
        assertContains(withParens, "goldengate", "parens: has goldengate");
    }

    static void testNestedParens() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query("((.nyc + .bridge) | (.sf + .bridge))");
        assertSorted(List.of("brooklyn", "goldengate", "manhattan"), result, "nested parens");
    }

    static void testParensWithSubtraction() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query("(.nyc | .sf) - .park");
        assertNotContains(result, "centralpark", "parens-sub: no centralpark");
        assertNotContains(result, "dolores", "parens-sub: no dolores");
        assertContains(result, "brooklyn", "parens-sub: has brooklyn");
    }

    // ------------------------------------------------------------------
    // Tier 8 — Edge cases
    // ------------------------------------------------------------------

    static void testEmptyString() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query(""), "empty string");
    }

    static void testWhitespaceOnly() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query("   "), "whitespace only");
    }

    static void testNullExpression() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query(null), "null expression");
    }

    static void testEmptyConfig() {
        ExpressionParser parser = new ExpressionParser(Map.of("allLinks", Map.of()));
        assertEquals(List.of(), parser.query(".car"), "empty config");
    }

    static void testNoAllLinks() {
        ExpressionParser parser = new ExpressionParser(Map.of());
        assertEquals(List.of(), parser.query("vwbug"), "no allLinks");
    }

    // ------------------------------------------------------------------
    // Tier 9 — Protocols
    // ------------------------------------------------------------------

    static Map<String, Object> protocolConfig() {
        Map<String, Object> config = new LinkedHashMap<>(testConfig());
        Config.ProtocolHandler tagHandler = (args, link, id) -> {
            if (args.isEmpty()) return false;
            Object tags = link.get("tags");
            return tags instanceof List<?> tagList && tagList.contains(args.getFirst());
        };
        Config.ProtocolHandler brokenHandler = (args, link, id) -> {
            throw new RuntimeException("boom");
        };
        config.put("protocols", Map.of(
            "hastag", tagHandler,
            "broken", brokenHandler
        ));
        return config;
    }

    static void testProtocolTokenization() {
        List<Token> tokens = ExpressionParser.tokenize(":time:7d:");
        assertEquals(1, tokens.size(), "protocol token count");
        assertInstance(tokens.getFirst(), Token.Protocol.class, "protocol token type");
        assertEquals("time|7d", ((Token.Protocol) tokens.getFirst()).value(), "protocol value");
    }

    static void testProtocolMultiArgTokenization() {
        List<Token> tokens = ExpressionParser.tokenize(":time:7d:newest:");
        assertEquals(1, tokens.size(), "protocol multi-arg count");
        assertEquals("time|7d|newest", ((Token.Protocol) tokens.getFirst()).value(), "multi-arg value");
    }

    static void testProtocolResolution() {
        ExpressionParser parser = new ExpressionParser(protocolConfig());
        List<String> result = parser.query(":hastag:coffee:");
        assertSorted(List.of("acre", "aqus", "bluebottle"), result, "protocol resolution");
    }

    static void testUnknownProtocol() {
        ExpressionParser parser = new ExpressionParser(protocolConfig());
        List<String> result = parser.query(":nonexistent:arg:");
        assertEquals(List.of(), result, "unknown protocol");
    }

    static void testProtocolHandlerThrows() {
        ExpressionParser parser = new ExpressionParser(protocolConfig());
        List<String> result = parser.query(":broken:arg:");
        assertEquals(List.of(), result, "protocol handler throws");
    }

    static void testProtocolWithTagIntersection() {
        ExpressionParser parser = new ExpressionParser(protocolConfig());
        List<String> result = parser.query(":hastag:coffee: + .sf");
        assertSorted(List.of("aqus", "bluebottle"), result, "protocol + tag intersection");
    }

    static void testProtocolWithTagUnion() {
        ExpressionParser parser = new ExpressionParser(protocolConfig());
        List<String> result = parser.query(":hastag:coffee: | .bridge");
        assertContains(result, "acre", "protocol|tag: has acre");
        assertContains(result, "brooklyn", "protocol|tag: has brooklyn");
        assertContains(result, "goldengate", "protocol|tag: has goldengate");
    }

    // ------------------------------------------------------------------
    // Tier 10 — Refiners
    // ------------------------------------------------------------------

    static void testRefinerTokenization() {
        List<Token> tokens = ExpressionParser.tokenize("*sort*");
        assertEquals(1, tokens.size(), "refiner token count");
        assertInstance(tokens.getFirst(), Token.Refiner.class, "refiner token type");
        assertEquals("sort", ((Token.Refiner) tokens.getFirst()).value(), "refiner value");
    }

    static void testRefinerWithArgTokenization() {
        List<Token> tokens = ExpressionParser.tokenize("*sort:label*");
        assertEquals(1, tokens.size(), "refiner-arg token count");
        assertEquals("sort:label", ((Token.Refiner) tokens.getFirst()).value(), "refiner-arg value");
    }

    static void testSortRefinerDefault() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".car *sort*");
        Map<String, Object> allLinks = ExpressionParser.asMap(testConfig().get("allLinks"));
        List<String> labels = result.stream()
            .map(id -> (String) ExpressionParser.asMap(allLinks.get(id)).get("label"))
            .toList();
        List<String> sorted = new ArrayList<>(labels);
        sorted.sort(String.CASE_INSENSITIVE_ORDER);
        assertEquals(sorted, labels, "sort by label");
    }

    static void testSortRefinerByUrl() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".car *sort:url*");
        Map<String, Object> allLinks = ExpressionParser.asMap(testConfig().get("allLinks"));
        List<String> urls = result.stream()
            .map(id -> (String) ExpressionParser.asMap(allLinks.get(id)).get("url"))
            .toList();
        List<String> sorted = new ArrayList<>(urls);
        sorted.sort(String.CASE_INSENSITIVE_ORDER);
        assertEquals(sorted, urls, "sort by url");
    }

    static void testReverseRefiner() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> normal = parser.query(".car *sort*");
        List<String> reversed = parser.query(".car *sort* *reverse*");
        List<String> expected = new ArrayList<>(normal);
        java.util.Collections.reverse(expected);
        assertEquals(expected, reversed, "reverse refiner");
    }

    static void testLimitRefiner() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".car *sort* *limit:2*");
        assertEquals(2, result.size(), "limit:2 size");
    }

    static void testLimitZero() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        assertEquals(List.of(), parser.query(".car *limit:0*"), "limit:0 empty");
    }

    static void testSkipRefiner() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> full = parser.query(".car *sort*");
        List<String> skipped = parser.query(".car *sort* *skip:1*");
        assertEquals(full.subList(1, full.size()), skipped, "skip:1");
    }

    static void testShuffleRefiner() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query(".car *shuffle*");
        List<String> sorted = new ArrayList<>(result);
        sorted.sort(String::compareTo);
        assertSorted(List.of("bmwe36", "miata", "vwbug"), result, "shuffle same items");
    }

    static void testUniqueRefiner() {
        Map<String, Object> config = Map.of("allLinks", Map.of(
            "a", Map.of("label", "A", "url", "https://same.com", "tags", List.of("t")),
            "b", Map.of("label", "B", "url", "https://same.com", "tags", List.of("t")),
            "c", Map.of("label", "C", "url", "https://other.com", "tags", List.of("t"))
        ));
        ExpressionParser parser = new ExpressionParser(config);
        List<String> result = parser.query(".t *unique:url*");
        assertEquals(2, result.size(), "unique:url size");
    }

    static void testRefinerChainedSortLimit() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> sortedAll = parser.query(".car *sort*");
        List<String> sortedLimited = parser.query(".car *sort* *limit:2*");
        assertEquals(sortedAll.subList(0, 2), sortedLimited, "sort then limit");
    }

    static void testRefinerInParenthesizedGroup() {
        ExpressionParser parser = new ExpressionParser(testConfig());
        List<String> result = parser.query("(.car *sort* *limit:1*), goldengate");
        assertEquals(2, result.size(), "refiner in parens: 2 items");
        assertContains(result, "goldengate", "refiner in parens: has goldengate");
    }

    // ------------------------------------------------------------------
    // Tier 11 — Hyphenated identifiers
    // ------------------------------------------------------------------

    static void testHyphenParsedAsWithout() {
        Map<String, Object> config = Map.of("allLinks", Map.of(
            "my", Map.of("label", "My", "url", "https://my.com", "tags", List.of()),
            "item", Map.of("label", "Item", "url", "https://item.com", "tags", List.of())
        ));
        ExpressionParser parser = new ExpressionParser(config);
        // "my-item" parses as "my" MINUS "item"
        assertEquals(List.of("my"), parser.query("my-item"), "hyphen as WITHOUT");
    }

    // ------------------------------------------------------------------
    // Convenience functions
    // ------------------------------------------------------------------

    static void testResolveExpression() {
        List<Map<String, Object>> results = ExpressionParser.resolve(testConfig(), ".car + .germany");
        List<String> ids = results.stream().map(r -> (String) r.get("id")).sorted().toList();
        assertEquals(List.of("bmwe36", "vwbug"), ids, "resolve: ids");
        for (Map<String, Object> r : results) {
            assertNotNull(r.get("id"), "resolve: has id");
            assertNotNull(r.get("label"), "resolve: has label");
            assertNotNull(r.get("url"), "resolve: has url");
        }
    }

    static void testCherryPick() {
        Map<String, Object> result = ExpressionParser.cherryPick(testConfig(), "vwbug, miata");
        assertContainsKey(result, "vwbug", "cherryPick: has vwbug");
        assertContainsKey(result, "miata", "cherryPick: has miata");
        assertNotContainsKey(result, "bmwe36", "cherryPick: no bmwe36");
    }

    static void testMergeConfigs() {
        Map<String, Object> c1 = Map.of(
            "allLinks", Map.of("a", Map.of("label", "A", "url", "https://a.com")),
            "macros", Map.of("m1", Map.of("linkItems", "a"))
        );
        Map<String, Object> c2 = Map.of(
            "allLinks", Map.of("b", Map.of("label", "B", "url", "https://b.com")),
            "macros", Map.of("m2", Map.of("linkItems", "b"))
        );
        Map<String, Object> merged = ExpressionParser.mergeConfigs(c1, c2);
        Map<String, Object> links = ExpressionParser.asMap(merged.get("allLinks"));
        Map<String, Object> macros = ExpressionParser.asMap(merged.get("macros"));
        assertContainsKey(links, "a", "merge: has link a");
        assertContainsKey(links, "b", "merge: has link b");
        assertContainsKey(macros, "m1", "merge: has macro m1");
        assertContainsKey(macros, "m2", "merge: has macro m2");
    }

    static void testMergeConfigsLaterWins() {
        Map<String, Object> c1 = Map.of("allLinks", Map.of("a", Map.of("label", "Old", "url", "https://old.com")));
        Map<String, Object> c2 = Map.of("allLinks", Map.of("a", Map.of("label", "New", "url", "https://new.com")));
        Map<String, Object> merged = ExpressionParser.mergeConfigs(c1, c2);
        Map<String, Object> links = ExpressionParser.asMap(merged.get("allLinks"));
        Map<String, Object> a = ExpressionParser.asMap(links.get("a"));
        assertEquals("New", a.get("label"), "merge: later wins");
    }

    // ------------------------------------------------------------------
    // URL sanitization
    // ------------------------------------------------------------------

    static void testSafeUrls() {
        assertEquals("https://example.com", SanitizeUrl.sanitize("https://example.com"), "safe https");
        assertEquals("http://example.com", SanitizeUrl.sanitize("http://example.com"), "safe http");
        assertEquals("mailto:user@example.com", SanitizeUrl.sanitize("mailto:user@example.com"), "safe mailto");
        assertEquals("/relative/path", SanitizeUrl.sanitize("/relative/path"), "safe relative");
        assertEquals("", SanitizeUrl.sanitize(""), "safe empty");
    }

    static void testJavascriptBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("javascript:alert(1)"), "block javascript");
        assertEquals("about:blank", SanitizeUrl.sanitize("JAVASCRIPT:alert(1)"), "block JAVASCRIPT");
        assertEquals("about:blank", SanitizeUrl.sanitize("JavaScript:void(0)"), "block JavaScript");
    }

    static void testDataBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("data:text/html,<h1>Hi</h1>"), "block data");
    }

    static void testVbscriptBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("vbscript:MsgBox"), "block vbscript");
    }

    static void testBlobBlocked() {
        assertEquals("about:blank", SanitizeUrl.sanitize("blob:https://example.com/uuid"), "block blob");
    }

    static void testControlCharsStripped() {
        assertEquals("about:blank", SanitizeUrl.sanitize("java\nscript:alert(1)"), "block ctrl-n");
        assertEquals("about:blank", SanitizeUrl.sanitize("java\tscript:alert(1)"), "block ctrl-t");
    }

    static void testSanitizeInResolve() {
        Map<String, Object> config = Map.of("allLinks", Map.of(
            "bad", Map.of("label", "Evil", "url", "javascript:alert(1)", "tags", List.of("test")),
            "good", Map.of("label", "Good", "url", "https://example.com", "tags", List.of("test"))
        ));
        List<Map<String, Object>> results = ExpressionParser.resolve(config, ".test");
        Map<String, String> urls = new HashMap<>();
        for (Map<String, Object> r : results) {
            urls.put((String) r.get("id"), (String) r.get("url"));
        }
        assertEquals("about:blank", urls.get("bad"), "resolve sanitizes bad url");
        assertEquals("https://example.com", urls.get("good"), "resolve keeps good url");
    }

    // ------------------------------------------------------------------
    // Regex validation
    // ------------------------------------------------------------------

    static void testValidRegex() {
        assertTrue(ValidateRegex.validate("simple").safe(), "simple regex is safe");
        assertTrue(ValidateRegex.validate("^foo$").safe(), "anchored regex is safe");
        assertTrue(ValidateRegex.validate("[a-z]+").safe(), "char class regex is safe");
        assertTrue(ValidateRegex.validate("\\d{3}-\\d{4}").safe(), "quantifier regex is safe");
        assertTrue(ValidateRegex.validate("(abc)+").safe(), "quantified group safe");
        assertTrue(ValidateRegex.validate("(a|b)*").safe(), "alternation group safe");
    }

    static void testInvalidRegex() {
        assertFalse(ValidateRegex.validate("[invalid").safe(), "unclosed bracket unsafe");
    }

    static void testNestedQuantifier() {
        Config.RegexValidation r1 = ValidateRegex.validate("(a+)+");
        assertFalse(r1.safe(), "nested quantifier unsafe");
        assertTrue(r1.reason().contains("Nested quantifier"), "reason mentions nested quantifier");

        Config.RegexValidation r2 = ValidateRegex.validate("(a*)*b");
        assertFalse(r2.safe(), "nested star unsafe");

        Config.RegexValidation r3 = ValidateRegex.validate("(\\w+\\w+)+");
        assertFalse(r3.safe(), "nested word unsafe");
    }

    // ------------------------------------------------------------------
    // SSRF guard
    // ------------------------------------------------------------------

    static void testSsrfLoopback() {
        assertTrue(SsrfGuard.isPrivateHost("http://127.0.0.1/"), "loopback 127.0.0.1");
        assertTrue(SsrfGuard.isPrivateHost("http://127.0.0.99/"), "loopback 127.0.0.99");
    }

    static void testSsrfRfc1918() {
        assertTrue(SsrfGuard.isPrivateHost("http://10.0.0.1/"), "RFC1918 10.x");
        assertTrue(SsrfGuard.isPrivateHost("http://172.16.0.1/"), "RFC1918 172.16.x");
        assertTrue(SsrfGuard.isPrivateHost("http://192.168.1.1/"), "RFC1918 192.168.x");
    }

    static void testSsrfLinkLocal() {
        assertTrue(SsrfGuard.isPrivateHost("http://169.254.169.254/"), "link-local / metadata");
    }

    static void testSsrfLocalhost() {
        assertTrue(SsrfGuard.isPrivateHost("http://localhost/"), "localhost");
        assertTrue(SsrfGuard.isPrivateHost("http://foo.localhost/"), "foo.localhost");
    }

    static void testSsrfPublicIp() {
        assertFalse(SsrfGuard.isPrivateHost("http://8.8.8.8/"), "public 8.8.8.8");
        assertFalse(SsrfGuard.isPrivateHost("https://example.com/"), "public domain");
    }

    static void testSsrfMalformed() {
        assertTrue(SsrfGuard.isPrivateHost(""), "empty → private (fail closed)");
        assertTrue(SsrfGuard.isPrivateHost(null), "null → private (fail closed)");
    }

    static void testSsrfIpv6Loopback() {
        assertTrue(SsrfGuard.isPrivateHost("http://[::1]/"), "IPv6 loopback");
    }

    static void testSsrfCgn() {
        assertTrue(SsrfGuard.isPrivateHost("http://100.64.0.1/"), "CGN 100.64.x");
    }

    static void testSsrfLocalhostWithPort() {
        assertTrue(SsrfGuard.isPrivateHost("http://localhost:8080"), "localhost with port");
    }

    static void testSsrfIpv4MappedIpv6() {
        assertTrue(SsrfGuard.isPrivateHost("http://[::ffff:127.0.0.1]"), "IPv4-mapped loopback");
        assertTrue(SsrfGuard.isPrivateHost("http://[::ffff:10.0.0.1]"), "IPv4-mapped RFC1918");
    }

    static void testSsrfZeroAddress() {
        assertTrue(SsrfGuard.isPrivateHost("http://0.0.0.0/"), "0.0.0.0 bypass");
        assertTrue(SsrfGuard.isPrivateHost("http://0.0.0.0:8080/"), "0.0.0.0 with port");
    }

    static void testSsrfMalformedString() {
        assertTrue(SsrfGuard.isPrivateHost("not a url at all"), "malformed → fail closed");
    }

    // ------------------------------------------------------------------
    // Config validation
    // ------------------------------------------------------------------

    static void testValidateBasic() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "test", Map.of("url", "https://example.com", "label", "Test", "tags", List.of("a"))
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        assertContainsKey(links, "test", "validate: has test link");
    }

    static void testValidateBlocksPrototypePollution() {
        Map<String, Object> raw = new LinkedHashMap<>();
        Map<String, Object> allLinks = new LinkedHashMap<>();
        allLinks.put("good", Map.of("url", "https://example.com", "label", "Good"));
        allLinks.put("__proto__", Map.of("url", "https://evil.com", "label", "Evil"));
        raw.put("allLinks", allLinks);

        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        assertContainsKey(links, "good", "validate: keeps good");
        assertNotContainsKey(links, "__proto__", "validate: blocks __proto__");
    }

    static void testValidateRejectsHyphens() {
        Map<String, Object> raw = new LinkedHashMap<>();
        Map<String, Object> allLinks = new LinkedHashMap<>();
        allLinks.put("good_id", Map.of("url", "https://example.com"));
        allLinks.put("bad-id", Map.of("url", "https://example.com"));
        raw.put("allLinks", allLinks);

        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        assertContainsKey(links, "good_id", "validate: keeps underscore id");
        assertNotContainsKey(links, "bad-id", "validate: rejects hyphen id");
    }

    static void testValidateStripsHyphenTags() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "test", Map.of("url", "https://example.com", "tags", List.of("good", "bad-tag", "ok"))
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        Map<String, Object> link = ExpressionParser.asMap(links.get("test"));
        @SuppressWarnings("unchecked")
        List<String> tags = (List<String>) link.get("tags");
        assertTrue(tags.contains("good"), "validate: keeps good tag");
        assertFalse(tags.contains("bad-tag"), "validate: strips hyphen tag");
        assertTrue(tags.contains("ok"), "validate: keeps ok tag");
    }

    static void testValidateSanitizesUrls() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "evil", Map.of("url", "javascript:alert(1)", "label", "Evil")
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        Map<String, Object> link = ExpressionParser.asMap(links.get("evil"));
        assertEquals("about:blank", link.get("url"), "validate: sanitizes url");
    }

    static void testValidateRequiresAllLinks() {
        boolean threw = false;
        try {
            ValidateConfig.validate(Map.of());
        } catch (IllegalArgumentException e) {
            threw = true;
        }
        assertTrue(threw, "validate: throws on missing allLinks");
    }

    static void testValidateRejectsHyphenMacros() {
        Map<String, Object> raw = Map.of(
            "allLinks", Map.of("a", Map.of("url", "https://a.com")),
            "macros", Map.of(
                "good_macro", Map.of("linkItems", "a"),
                "bad-macro", Map.of("linkItems", "a")
            )
        );
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> macros = ExpressionParser.asMap(result.get("macros"));
        assertContainsKey(macros, "good_macro", "validate: keeps underscore macro");
        assertNotContainsKey(macros, "bad-macro", "validate: rejects hyphen macro");
    }

    static void testValidatePreservesSettings() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("allLinks", Map.of("a", Map.of("url", "https://a.com")));
        raw.put("settings", Map.of("listType", "ul", "menuTimeout", 5000));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> settings = ExpressionParser.asMap(result.get("settings"));
        assertEquals("ul", settings.get("listType"), "validate: preserves settings listType");
        assertEquals(5000, settings.get("menuTimeout"), "validate: preserves settings menuTimeout");
    }

    static void testValidatePreservesMacros() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("allLinks", Map.of("a", Map.of("url", "https://a.com")));
        raw.put("macros", Map.of("fav", Map.of("linkItems", "a")));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> macros = ExpressionParser.asMap(result.get("macros"));
        Map<String, Object> fav = ExpressionParser.asMap(macros.get("fav"));
        assertEquals("a", fav.get("linkItems"), "validate: preserves macro linkItems");
    }

    static void testValidatePreservesSearchPatterns() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("allLinks", Map.of("a", Map.of("url", "https://a.com")));
        raw.put("searchPatterns", Map.of("bridge", "bridge"));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> sp = ExpressionParser.asMap(result.get("searchPatterns"));
        assertEquals("bridge", sp.get("bridge"), "validate: preserves search pattern");
    }

    static void testValidateSanitizesJavascriptInImage() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "img", Map.of("url", "https://safe.com", "image", "javascript:alert(1)")
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> link = ExpressionParser.asMap(
            ExpressionParser.asMap(result.get("allLinks")).get("img"));
        assertEquals("about:blank", link.get("image"), "validate: sanitizes image url");
    }

    static void testValidateSkipsNonDictLinks() {
        Map<String, Object> raw = new LinkedHashMap<>();
        Map<String, Object> allLinks = new LinkedHashMap<>();
        allLinks.put("bad", "not a dict");
        allLinks.put("good", Map.of("url", "https://ok.com"));
        raw.put("allLinks", allLinks);
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        assertNotContainsKey(links, "bad", "validate: skips non-dict link");
        assertContainsKey(links, "good", "validate: keeps dict link");
    }

    static void testValidateSkipsLinksMissingUrl() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "nourl", Map.of("label", "No URL")
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        assertNotContainsKey(links, "nourl", "validate: skips link without url");
    }

    static void testValidateFiltersNonStringTags() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "a", Map.of("url", "https://x.com", "tags", List.of("ok", 42, "fine"))
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> link = ExpressionParser.asMap(
            ExpressionParser.asMap(result.get("allLinks")).get("a"));
        @SuppressWarnings("unchecked")
        List<String> tags = (List<String>) link.get("tags");
        assertEquals(List.of("ok", "fine"), tags, "validate: filters non-string tags");
    }

    static void testValidateRejectsHyphenSearchPatterns() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("allLinks", Map.of("a", Map.of("url", "https://a.com")));
        raw.put("searchPatterns", Map.of("my-pattern", "bridge"));
        Map<String, Object> result = ValidateConfig.validate(raw);
        assertTrue(!result.containsKey("searchPatterns")
            || !ExpressionParser.asMap(result.get("searchPatterns")).containsKey("my-pattern"),
            "validate: rejects hyphen search pattern key");
    }

    static void testValidateRemovesDangerousRegex() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("allLinks", Map.of("a", Map.of("url", "https://a.com")));
        raw.put("searchPatterns", Map.of("evil", "(a+)+"));
        Map<String, Object> result = ValidateConfig.validate(raw);
        assertTrue(!result.containsKey("searchPatterns")
            || !ExpressionParser.asMap(result.get("searchPatterns")).containsKey("evil"),
            "validate: removes dangerous regex pattern");
    }

    static void testValidateAllowsHyphensInNonExpressionFields() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "a", Map.of(
                "url", "https://my-site.com",
                "label", "My-Label",
                "cssClass", "my-class",
                "description", "some-thing"
            )
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> link = ExpressionParser.asMap(
            ExpressionParser.asMap(result.get("allLinks")).get("a"));
        assertEquals("https://my-site.com", link.get("url"), "validate: hyphens ok in url");
        assertEquals("My-Label", link.get("label"), "validate: hyphens ok in label");
        assertEquals("my-class", link.get("cssClass"), "validate: hyphens ok in cssClass");
        assertEquals("some-thing", link.get("description"), "validate: hyphens ok in description");
    }

    static void testValidatePreservesHooksAndGuid() {
        Map<String, Object> raw = Map.of("allLinks", Map.of(
            "test", Map.of(
                "url", "https://example.com",
                "hooks", List.of("onLoad", "onRender"),
                "guid", "abc-123"
            )
        ));
        Map<String, Object> result = ValidateConfig.validate(raw);
        Map<String, Object> links = ExpressionParser.asMap(result.get("allLinks"));
        Map<String, Object> link = ExpressionParser.asMap(links.get("test"));
        assertEquals("abc-123", link.get("guid"), "validate: preserves guid");
        @SuppressWarnings("unchecked")
        List<String> hooks = (List<String>) link.get("hooks");
        assertEquals(List.of("onLoad", "onRender"), hooks, "validate: preserves hooks");
    }

    // ------------------------------------------------------------------
    // Test runner
    // ------------------------------------------------------------------

    public static void main(String[] args) {
        System.out.println("Alap Java Parser — Test Suite\n");

        section("Tier 1 — Operands");
        run(ExpressionParserTest::testSingleItemId);
        run(ExpressionParserTest::testSingleClass);
        run(ExpressionParserTest::testNonexistentItem);
        run(ExpressionParserTest::testNonexistentClass);

        section("Tier 2 — Commas");
        run(ExpressionParserTest::testTwoItems);
        run(ExpressionParserTest::testThreeItems);
        run(ExpressionParserTest::testItemAndClass);
        run(ExpressionParserTest::testDeduplication);

        section("Tier 3 — Operators");
        run(ExpressionParserTest::testIntersection);
        run(ExpressionParserTest::testUnion);
        run(ExpressionParserTest::testSubtraction);

        section("Tier 4 — Chained operators");
        run(ExpressionParserTest::testThreeWayIntersection);
        run(ExpressionParserTest::testUnionThenSubtract);

        section("Tier 5 — Mixed");
        run(ExpressionParserTest::testItemAndClassIntersection);
        run(ExpressionParserTest::testClassUnionWithItem);

        section("Tier 6 — Macros");
        run(ExpressionParserTest::testNamedMacro);
        run(ExpressionParserTest::testMacroWithOperators);
        run(ExpressionParserTest::testUnknownMacro);
        run(ExpressionParserTest::testBareMacroWithAnchor);

        section("Tier 7 — Parentheses");
        run(ExpressionParserTest::testBasicGrouping);
        run(ExpressionParserTest::testNestedParens);
        run(ExpressionParserTest::testParensWithSubtraction);

        section("Tier 8 — Edge cases");
        run(ExpressionParserTest::testEmptyString);
        run(ExpressionParserTest::testWhitespaceOnly);
        run(ExpressionParserTest::testNullExpression);
        run(ExpressionParserTest::testEmptyConfig);
        run(ExpressionParserTest::testNoAllLinks);

        section("Tier 9 — Protocols");
        run(ExpressionParserTest::testProtocolTokenization);
        run(ExpressionParserTest::testProtocolMultiArgTokenization);
        run(ExpressionParserTest::testProtocolResolution);
        run(ExpressionParserTest::testUnknownProtocol);
        run(ExpressionParserTest::testProtocolHandlerThrows);
        run(ExpressionParserTest::testProtocolWithTagIntersection);
        run(ExpressionParserTest::testProtocolWithTagUnion);

        section("Tier 10 — Refiners");
        run(ExpressionParserTest::testRefinerTokenization);
        run(ExpressionParserTest::testRefinerWithArgTokenization);
        run(ExpressionParserTest::testSortRefinerDefault);
        run(ExpressionParserTest::testSortRefinerByUrl);
        run(ExpressionParserTest::testReverseRefiner);
        run(ExpressionParserTest::testLimitRefiner);
        run(ExpressionParserTest::testLimitZero);
        run(ExpressionParserTest::testSkipRefiner);
        run(ExpressionParserTest::testShuffleRefiner);
        run(ExpressionParserTest::testUniqueRefiner);
        run(ExpressionParserTest::testRefinerChainedSortLimit);
        run(ExpressionParserTest::testRefinerInParenthesizedGroup);

        section("Tier 11 — Hyphenated identifiers");
        run(ExpressionParserTest::testHyphenParsedAsWithout);

        section("Convenience functions");
        run(ExpressionParserTest::testResolveExpression);
        run(ExpressionParserTest::testCherryPick);
        run(ExpressionParserTest::testMergeConfigs);
        run(ExpressionParserTest::testMergeConfigsLaterWins);

        section("URL sanitization");
        run(ExpressionParserTest::testSafeUrls);
        run(ExpressionParserTest::testJavascriptBlocked);
        run(ExpressionParserTest::testDataBlocked);
        run(ExpressionParserTest::testVbscriptBlocked);
        run(ExpressionParserTest::testBlobBlocked);
        run(ExpressionParserTest::testControlCharsStripped);
        run(ExpressionParserTest::testSanitizeInResolve);

        section("Regex validation");
        run(ExpressionParserTest::testValidRegex);
        run(ExpressionParserTest::testInvalidRegex);
        run(ExpressionParserTest::testNestedQuantifier);

        section("SSRF guard");
        run(ExpressionParserTest::testSsrfLoopback);
        run(ExpressionParserTest::testSsrfRfc1918);
        run(ExpressionParserTest::testSsrfLinkLocal);
        run(ExpressionParserTest::testSsrfLocalhost);
        run(ExpressionParserTest::testSsrfLocalhostWithPort);
        run(ExpressionParserTest::testSsrfPublicIp);
        run(ExpressionParserTest::testSsrfMalformed);
        run(ExpressionParserTest::testSsrfMalformedString);
        run(ExpressionParserTest::testSsrfIpv6Loopback);
        run(ExpressionParserTest::testSsrfIpv4MappedIpv6);
        run(ExpressionParserTest::testSsrfZeroAddress);
        run(ExpressionParserTest::testSsrfCgn);

        section("Config validation");
        run(ExpressionParserTest::testValidateBasic);
        run(ExpressionParserTest::testValidatePreservesSettings);
        run(ExpressionParserTest::testValidatePreservesMacros);
        run(ExpressionParserTest::testValidatePreservesSearchPatterns);
        run(ExpressionParserTest::testValidateBlocksPrototypePollution);
        run(ExpressionParserTest::testValidateRejectsHyphens);
        run(ExpressionParserTest::testValidateStripsHyphenTags);
        run(ExpressionParserTest::testValidateSanitizesUrls);
        run(ExpressionParserTest::testValidateSanitizesJavascriptInImage);
        run(ExpressionParserTest::testValidateSkipsNonDictLinks);
        run(ExpressionParserTest::testValidateSkipsLinksMissingUrl);
        run(ExpressionParserTest::testValidateFiltersNonStringTags);
        run(ExpressionParserTest::testValidateRequiresAllLinks);
        run(ExpressionParserTest::testValidateRejectsHyphenMacros);
        run(ExpressionParserTest::testValidateRejectsHyphenSearchPatterns);
        run(ExpressionParserTest::testValidateRemovesDangerousRegex);
        run(ExpressionParserTest::testValidateAllowsHyphensInNonExpressionFields);
        run(ExpressionParserTest::testValidatePreservesHooksAndGuid);

        // Summary
        System.out.println("\n" + "=".repeat(50));
        System.out.printf("%d passed, %d failed, %d total%n", passed, failed, passed + failed);
        if (failed > 0) {
            System.exit(1);
        }
    }

    // ------------------------------------------------------------------
    // Assertion helpers
    // ------------------------------------------------------------------

    private static void run(Runnable test) {
        String name = "?";
        try {
            // Extract method name from stack for better output
            test.run();
            passed++;
        } catch (AssertionError e) {
            failed++;
            System.out.println("  FAIL: " + e.getMessage());
        } catch (Exception e) {
            failed++;
            System.out.println("  FAIL (exception): " + e);
        }
    }

    private static void section(String name) {
        System.out.println("\n--- " + name + " ---");
    }

    private static void assertEquals(Object expected, Object actual, String msg) {
        if (!expected.equals(actual)) {
            throw new AssertionError(msg + ": expected " + expected + " but got " + actual);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertSorted(List<String> expectedSorted, List<String> actual, String msg) {
        List<String> actualSorted = new ArrayList<>(actual);
        actualSorted.sort(String::compareTo);
        if (!expectedSorted.equals(actualSorted)) {
            throw new AssertionError(msg + ": expected sorted " + expectedSorted
                + " but got sorted " + actualSorted);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertContains(List<String> list, String item, String msg) {
        if (!list.contains(item)) {
            throw new AssertionError(msg + ": " + list + " does not contain " + item);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertNotContains(List<String> list, String item, String msg) {
        if (list.contains(item)) {
            throw new AssertionError(msg + ": " + list + " should not contain " + item);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertContainsKey(Map<String, Object> map, String key, String msg) {
        if (map == null || !map.containsKey(key)) {
            throw new AssertionError(msg + ": map does not contain key " + key);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertNotContainsKey(Map<String, Object> map, String key, String msg) {
        if (map != null && map.containsKey(key)) {
            throw new AssertionError(msg + ": map should not contain key " + key);
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertTrue(boolean condition, String msg) {
        if (!condition) {
            throw new AssertionError(msg + ": expected true");
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertFalse(boolean condition, String msg) {
        if (condition) {
            throw new AssertionError(msg + ": expected false");
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertNotNull(Object obj, String msg) {
        if (obj == null) {
            throw new AssertionError(msg + ": expected non-null");
        }
        System.out.println("  PASS: " + msg);
    }

    private static void assertInstance(Object obj, Class<?> type, String msg) {
        if (!type.isInstance(obj)) {
            throw new AssertionError(msg + ": expected " + type.getSimpleName()
                + " but got " + obj.getClass().getSimpleName());
        }
        System.out.println("  PASS: " + msg);
    }
}
