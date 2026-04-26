// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package tests;

import alap.LinkProvenance;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tests for LinkProvenance — tier stamping + predicates + cloneTo.
 *
 * <p>Run: {@code java -ea tests.LinkProvenanceTest}
 */
public class LinkProvenanceTest {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Alap Java — LinkProvenance Test Suite\n");

        section("Stamp + get");
        run(LinkProvenanceTest::testStampAuthorThenRead);
        run(LinkProvenanceTest::testStampStorageLocal);
        run(LinkProvenanceTest::testStampStorageRemote);
        run(LinkProvenanceTest::testStampProtocol);
        run(LinkProvenanceTest::testUnstampedReturnsNull);
        run(LinkProvenanceTest::testStampOverwritesExisting);
        run(LinkProvenanceTest::testStampUsesReservedKey);

        section("Invalid tier rejection");
        run(LinkProvenanceTest::testRejectsUnknownTier);
        run(LinkProvenanceTest::testRejectsTypoAuthor);
        run(LinkProvenanceTest::testRejectsEmpty);
        run(LinkProvenanceTest::testRejectsNull);
        run(LinkProvenanceTest::testRejectsBareProtocolPrefix);
        run(LinkProvenanceTest::testAcceptsAnyProtocolSuffix);

        section("Tier predicates");
        run(LinkProvenanceTest::testAuthorTruePredicate);
        run(LinkProvenanceTest::testStorageTrueForLocal);
        run(LinkProvenanceTest::testStorageTrueForRemote);
        run(LinkProvenanceTest::testProtocolTrueForProtocolWeb);
        run(LinkProvenanceTest::testAllFalseForUnstamped);

        section("cloneTo");
        run(LinkProvenanceTest::testCloneToCopiesStamp);
        run(LinkProvenanceTest::testCloneToNoOpWhenSrcUnstamped);
        run(LinkProvenanceTest::testCloneToOverwritesExistingDest);

        System.out.println("\n==================================================");
        System.out.println(passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
        System.exit(failed == 0 ? 0 : 1);
    }

    private static Map<String, Object> link() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("url", "/a");
        return m;
    }

    // --- Stamp + get ---

    static void testStampAuthorThenRead() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "author");
        assertEquals("author", LinkProvenance.get(m), "author stamp read");
    }

    static void testStampStorageLocal() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "storage:local");
        assertEquals("storage:local", LinkProvenance.get(m), "storage:local stamp read");
    }

    static void testStampStorageRemote() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "storage:remote");
        assertEquals("storage:remote", LinkProvenance.get(m), "storage:remote stamp read");
    }

    static void testStampProtocol() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "protocol:web");
        assertEquals("protocol:web", LinkProvenance.get(m), "protocol:web stamp read");
    }

    static void testUnstampedReturnsNull() {
        assertEquals(null, LinkProvenance.get(link()), "unstamped returns null");
    }

    static void testStampOverwritesExisting() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "author");
        LinkProvenance.stamp(m, "protocol:web");
        assertEquals("protocol:web", LinkProvenance.get(m), "second stamp overwrites");
    }

    static void testStampUsesReservedKey() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "author");
        assertTrue(m.containsKey(LinkProvenance.PROVENANCE_KEY), "reserved key present");
        assertEquals("author", m.get(LinkProvenance.PROVENANCE_KEY), "reserved key value");
    }

    // --- Invalid tier ---

    static void testRejectsUnknownTier() {
        assertThrows(IllegalArgumentException.class,
            () -> LinkProvenance.stamp(link(), "admin"), "rejects admin");
    }

    static void testRejectsTypoAuthor() {
        assertThrows(IllegalArgumentException.class,
            () -> LinkProvenance.stamp(link(), "Author"), "rejects Author");
    }

    static void testRejectsEmpty() {
        assertThrows(IllegalArgumentException.class,
            () -> LinkProvenance.stamp(link(), ""), "rejects empty");
    }

    static void testRejectsNull() {
        assertThrows(IllegalArgumentException.class,
            () -> LinkProvenance.stamp(link(), null), "rejects null");
    }

    static void testRejectsBareProtocolPrefix() {
        assertThrows(IllegalArgumentException.class,
            () -> LinkProvenance.stamp(link(), "protocol:"), "rejects bare protocol:");
    }

    static void testAcceptsAnyProtocolSuffix() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "protocol:custom_handler_42");
        assertEquals("protocol:custom_handler_42", LinkProvenance.get(m), "accepts custom suffix");
    }

    // --- Predicates ---

    static void testAuthorTruePredicate() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "author");
        assertTrue(LinkProvenance.isAuthorTier(m), "isAuthorTier true");
        assertFalse(LinkProvenance.isStorageTier(m), "isStorageTier false");
        assertFalse(LinkProvenance.isProtocolTier(m), "isProtocolTier false");
    }

    static void testStorageTrueForLocal() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "storage:local");
        assertFalse(LinkProvenance.isAuthorTier(m), "isAuthorTier false");
        assertTrue(LinkProvenance.isStorageTier(m), "isStorageTier true");
        assertFalse(LinkProvenance.isProtocolTier(m), "isProtocolTier false");
    }

    static void testStorageTrueForRemote() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "storage:remote");
        assertTrue(LinkProvenance.isStorageTier(m), "storage:remote -> isStorageTier true");
    }

    static void testProtocolTrueForProtocolWeb() {
        Map<String, Object> m = link();
        LinkProvenance.stamp(m, "protocol:web");
        assertFalse(LinkProvenance.isAuthorTier(m), "isAuthorTier false");
        assertFalse(LinkProvenance.isStorageTier(m), "isStorageTier false");
        assertTrue(LinkProvenance.isProtocolTier(m), "isProtocolTier true");
    }

    static void testAllFalseForUnstamped() {
        Map<String, Object> m = link();
        assertFalse(LinkProvenance.isAuthorTier(m), "unstamped !author");
        assertFalse(LinkProvenance.isStorageTier(m), "unstamped !storage");
        assertFalse(LinkProvenance.isProtocolTier(m), "unstamped !protocol");
    }

    // --- cloneTo ---

    static void testCloneToCopiesStamp() {
        Map<String, Object> src = link();
        LinkProvenance.stamp(src, "protocol:web");
        Map<String, Object> dest = new LinkedHashMap<>();
        dest.put("url", "/b");
        LinkProvenance.cloneTo(src, dest);
        assertEquals("protocol:web", LinkProvenance.get(dest), "cloneTo copies");
    }

    static void testCloneToNoOpWhenSrcUnstamped() {
        Map<String, Object> src = link();
        Map<String, Object> dest = new HashMap<>();
        dest.put("url", "/b");
        LinkProvenance.cloneTo(src, dest);
        assertEquals(null, LinkProvenance.get(dest), "dest still unstamped");
        assertFalse(dest.containsKey(LinkProvenance.PROVENANCE_KEY), "reserved key not set");
    }

    static void testCloneToOverwritesExistingDest() {
        Map<String, Object> src = link();
        LinkProvenance.stamp(src, "storage:remote");
        Map<String, Object> dest = new LinkedHashMap<>();
        dest.put("url", "/b");
        LinkProvenance.stamp(dest, "author");
        LinkProvenance.cloneTo(src, dest);
        assertEquals("storage:remote", LinkProvenance.get(dest), "cloneTo overwrites");
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
                " but got " + t.getClass().getSimpleName());
        }
        throw new AssertionError(msg + ": expected " + expected.getSimpleName() + " but nothing was thrown");
    }
}
