// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package tests;

import alap.ConfigCloneError;
import alap.DeepClone;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests for DeepClone — allowlist + rejections + resource bounds + blocked keys.
 *
 * <p>Run: {@code java -ea tests.DeepCloneTest}
 */
public class DeepCloneTest {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("Alap Java — DeepClone Test Suite\n");

        section("Allowed shapes");
        run(DeepCloneTest::testEmptyMap);
        run(DeepCloneTest::testFlatMap);
        run(DeepCloneTest::testNestedMap);
        run(DeepCloneTest::testList);
        run(DeepCloneTest::testMixed);
        run(DeepCloneTest::testPrimitivesPassThrough);

        section("Detachment");
        run(DeepCloneTest::testInputNotMutated);
        run(DeepCloneTest::testMutationOfOutputDoesNotAffectInput);

        section("Rejections");
        run(DeepCloneTest::testRejectsRunnable);
        run(DeepCloneTest::testRejectsFunction);
        run(DeepCloneTest::testRejectsConsumer);
        run(DeepCloneTest::testRejectsSupplier);
        run(DeepCloneTest::testRejectsPredicate);
        run(DeepCloneTest::testRejectsCustomClassInstance);
        run(DeepCloneTest::testRejectsJavaArray);
        run(DeepCloneTest::testRejectsNonStringKey);
        run(DeepCloneTest::testRejectsCycle);
        run(DeepCloneTest::testRejectsMutualCycle);
        run(DeepCloneTest::testSharedReferenceNotRejected);

        section("Resource bounds");
        run(DeepCloneTest::testDepthAtLimitOk);
        run(DeepCloneTest::testDepthOverLimitRejected);
        run(DeepCloneTest::testNodeCountAtLimitOk);
        run(DeepCloneTest::testNodeCountOverLimitRejected);
        run(DeepCloneTest::testPrimitivesDoNotCountAsNodes);

        section("Blocked keys");
        run(DeepCloneTest::testProtoKeySilentlySkipped);
        run(DeepCloneTest::testConstructorKeySilentlySkipped);
        run(DeepCloneTest::testPrototypeKeySilentlySkipped);
        run(DeepCloneTest::testPythonDunderKeysSilentlySkipped);
        run(DeepCloneTest::testBlockedKeysDoNotCountAsNodes);

        System.out.println("\n==================================================");
        System.out.println(passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
        System.exit(failed == 0 ? 0 : 1);
    }

    // --- Allowed ---

    static void testEmptyMap() {
        assertEquals(new LinkedHashMap<>(), DeepClone.call(new HashMap<>()), "empty map");
    }

    static void testFlatMap() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("url", "/a");
        src.put("label", "A");
        Object out = DeepClone.call(src);
        assertEquals(src, out, "flat map structural equality");
        assertFalse(src == out, "flat map reference-detached");
    }

    static void testNestedMap() {
        Map<String, Object> inner = new LinkedHashMap<>();
        inner.put("leaf", 42);
        Map<String, Object> outer = new LinkedHashMap<>();
        outer.put("outer", inner);
        Object out = DeepClone.call(outer);
        assertEquals(outer, out, "nested map equals");
        assertFalse(((Map<?, ?>) out).get("outer") == inner, "nested ref detached");
    }

    static void testList() {
        assertEquals(List.of(1, 2, 3), DeepClone.call(List.of(1, 2, 3)), "list passes");
    }

    static void testMixed() {
        Map<String, Object> src = new LinkedHashMap<>();
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("url", "/a");
        a.put("tags", List.of("nyc", "coffee"));
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("rank", 1);
        a.put("meta", meta);
        Map<String, Object> all = new LinkedHashMap<>();
        all.put("a", a);
        src.put("allLinks", all);
        assertEquals(src, DeepClone.call(src), "mixed structure equals");
    }

    static void testPrimitivesPassThrough() {
        assertEquals("hello", DeepClone.call("hello"), "string passes");
        assertEquals(42, DeepClone.call(42), "int passes");
        assertEquals(3.14, DeepClone.call(3.14), "double passes");
        assertEquals(Boolean.TRUE, DeepClone.call(Boolean.TRUE), "true passes");
        assertEquals(Boolean.FALSE, DeepClone.call(Boolean.FALSE), "false passes");
        assertEquals(null, DeepClone.call(null), "null passes");
    }

    // --- Detachment ---

    static void testInputNotMutated() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("url", "/a");
        Map<String, Object> snap = new LinkedHashMap<>(src);
        DeepClone.call(src);
        assertEquals(snap, src, "input unchanged");
    }

    static void testMutationOfOutputDoesNotAffectInput() {
        List<String> tags = new ArrayList<>(List.of("x", "y"));
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("tags", tags);
        Object out = DeepClone.call(src);
        @SuppressWarnings("unchecked")
        List<Object> outTags = (List<Object>) ((Map<String, Object>) out).get("tags");
        outTags.add("z");
        assertEquals(List.of("x", "y"), tags, "input tags unchanged after mutating output");
    }

    // --- Rejections ---

    static void testRejectsRunnable() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("handler", (Runnable) () -> {});
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects Runnable");
    }

    static void testRejectsFunction() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("handler", (java.util.function.Function<Object, Object>) x -> x);
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects Function");
    }

    static void testRejectsConsumer() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("handler", (java.util.function.Consumer<Object>) x -> {});
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects Consumer");
    }

    static void testRejectsSupplier() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("handler", (java.util.function.Supplier<Object>) () -> null);
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects Supplier");
    }

    static void testRejectsPredicate() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("handler", (java.util.function.Predicate<Object>) x -> true);
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects Predicate");
    }

    static void testRejectsCustomClassInstance() {
        class Opaque {}
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("obj", new Opaque());
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects custom class");
    }

    static void testRejectsJavaArray() {
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("arr", new int[]{1, 2, 3});
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects Java array");
    }

    static void testRejectsNonStringKey() {
        Map<Object, Object> src = new LinkedHashMap<>();
        src.put(1, "value");
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(src), "rejects non-String key");
    }

    static void testRejectsCycle() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("self", a);
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(a), "rejects self-cycle");
    }

    static void testRejectsMutualCycle() {
        Map<String, Object> a = new LinkedHashMap<>();
        Map<String, Object> b = new LinkedHashMap<>();
        a.put("fwd", b);
        b.put("back", a);
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(a), "rejects mutual cycle");
    }

    static void testSharedReferenceNotRejected() {
        Map<String, Object> shared = new LinkedHashMap<>();
        shared.put("rank", 1);
        Map<String, Object> src = new LinkedHashMap<>();
        src.put("a", shared);
        src.put("b", shared);
        @SuppressWarnings("unchecked")
        Map<String, Object> out = (Map<String, Object>) DeepClone.call(src);
        assertEquals(1, ((Map<?, ?>) out.get("a")).get("rank"), "a rank ok");
        assertEquals(1, ((Map<?, ?>) out.get("b")).get("rank"), "b rank ok");
        assertFalse(out.get("a") == out.get("b"), "shared ref cloned into distinct copies");
    }

    // --- Resource bounds ---

    static void testDepthAtLimitOk() {
        Map<String, Object> root = new LinkedHashMap<>();
        Map<String, Object> current = root;
        for (int i = 0; i < 64; i++) {
            Map<String, Object> next = new LinkedHashMap<>();
            current.put("nested", next);
            current = next;
        }
        assertTrue(DeepClone.call(root) instanceof Map, "depth 65 total (0-64) ok");
    }

    static void testDepthOverLimitRejected() {
        Map<String, Object> root = new LinkedHashMap<>();
        Map<String, Object> current = root;
        for (int i = 0; i < 65; i++) {
            Map<String, Object> next = new LinkedHashMap<>();
            current.put("nested", next);
            current = next;
        }
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(root), "depth 66 total rejected");
    }

    static void testNodeCountAtLimitOk() {
        // 1 list + 9,999 empty maps = 10,000 nodes, at cap.
        List<Object> payload = new ArrayList<>(9_999);
        for (int i = 0; i < 9_999; i++) payload.add(new LinkedHashMap<>());
        Object out = DeepClone.call(payload);
        assertEquals(9_999, ((List<?>) out).size(), "node count at cap ok");
    }

    static void testNodeCountOverLimitRejected() {
        List<Object> payload = new ArrayList<>(10_001);
        for (int i = 0; i < 10_001; i++) payload.add(new LinkedHashMap<>());
        assertThrows(ConfigCloneError.class, () -> DeepClone.call(payload), "node count over cap rejected");
    }

    static void testPrimitivesDoNotCountAsNodes() {
        Map<String, Object> payload = new LinkedHashMap<>();
        for (int i = 0; i < 20_000; i++) payload.put("k" + i, i);
        Object out = DeepClone.call(payload);
        assertEquals(20_000, ((Map<?, ?>) out).size(), "20k primitive values fine");
    }

    // --- Blocked keys ---

    static void testProtoKeySilentlySkipped() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("url", "/a");
        payload.put("__proto__", Map.of("hacked", true));
        @SuppressWarnings("unchecked")
        Map<String, Object> out = (Map<String, Object>) DeepClone.call(payload);
        assertTrue(out.containsKey("url"), "url kept");
        assertFalse(out.containsKey("__proto__"), "__proto__ skipped");
    }

    static void testConstructorKeySilentlySkipped() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("url", "/a");
        payload.put("constructor", Map.of("bad", true));
        @SuppressWarnings("unchecked")
        Map<String, Object> out = (Map<String, Object>) DeepClone.call(payload);
        assertFalse(out.containsKey("constructor"), "constructor skipped");
    }

    static void testPrototypeKeySilentlySkipped() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("url", "/a");
        payload.put("prototype", Map.of("bad", true));
        @SuppressWarnings("unchecked")
        Map<String, Object> out = (Map<String, Object>) DeepClone.call(payload);
        assertFalse(out.containsKey("prototype"), "prototype skipped");
    }

    static void testPythonDunderKeysSilentlySkipped() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("url", "/a");
        payload.put("__class__", Map.of("bad", true));
        @SuppressWarnings("unchecked")
        Map<String, Object> out = (Map<String, Object>) DeepClone.call(payload);
        assertFalse(out.containsKey("__class__"), "__class__ skipped");
    }

    static void testBlockedKeysDoNotCountAsNodes() {
        Map<String, Object> pathological = new LinkedHashMap<>();
        Map<String, Object> current = pathological;
        for (int i = 0; i < 200; i++) {
            Map<String, Object> next = new LinkedHashMap<>();
            current.put("nested", next);
            current = next;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("url", "/a");
        payload.put("__proto__", pathological);
        @SuppressWarnings("unchecked")
        Map<String, Object> out = (Map<String, Object>) DeepClone.call(payload);
        assertEquals(1, out.size(), "only url kept");
        assertEquals("/a", out.get("url"), "url value kept");
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
