// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Deep-clone for plain config data — Java port of src/core/deepCloneData.ts.
 *
 * <p>Detaches a config from the caller's input by recursively rebuilding
 * it, rejecting anything that is not plain data. Two reasons:
 *
 * <ol>
 *   <li>Detachment. Wrapper types (JPA entities, JSON library objects,
 *       custom Map subclasses) carry behaviour that would otherwise leak
 *       into downstream immutability and serialization steps.</li>
 *   <li>Trust boundary. Config is <em>data</em>. Handlers are registered
 *       separately via the runtime registry. A callable in config is a
 *       shape error; rejecting it here surfaces the error before any
 *       downstream step has to cope with it.</li>
 * </ol>
 *
 * <p>Allowed: {@code Map<String, Object>}, {@code List<Object>},
 * {@code String}, {@code Integer}, {@code Long}, {@code Double},
 * {@code Boolean}, {@code null}.
 *
 * <p>Rejected: callables (Runnable, Consumer, etc.), Java arrays, Map /
 * List subclasses outside the allowlist, non-String Map keys, cycles,
 * and structures that exceed the resource bounds.
 *
 * <p>Resource bounds, matching {@code src/core/deepCloneData.ts}:
 * <ul>
 *   <li>{@code MAX_CLONE_DEPTH = 64} — rejects pathologically nested structures</li>
 *   <li>{@code MAX_CLONE_NODES = 10_000} — rejects node-count DoS bombs</li>
 * </ul>
 *
 * <p>{@code __proto__}, {@code constructor}, {@code prototype} keys (plus
 * the Python-port dunders retained for cross-port parity) are silently
 * skipped during clone.
 */
public final class DeepClone {

    public static final int MAX_CLONE_DEPTH = 64;
    public static final int MAX_CLONE_NODES = 10_000;

    private static final Set<String> BLOCKED_KEYS = Set.of(
        "__proto__", "constructor", "prototype",
        "__class__", "__bases__", "__mro__", "__subclasses__"
    );

    private DeepClone() {}

    /**
     * Deep-clone {@code value} with exotic types rejected. Raises
     * {@link ConfigCloneError} on callables, Java arrays, non-String
     * Map keys, cycles, depth over {@link #MAX_CLONE_DEPTH}, or node
     * count over {@link #MAX_CLONE_NODES}.
     */
    public static Object call(Object value) {
        State state = new State();
        return cloneValue(value, 0, "", state);
    }

    private static Object cloneValue(Object v, int depth, String path, State state) {
        // Primitives — no clone, no count.
        if (v == null
            || v instanceof String
            || v instanceof Boolean
            || v instanceof Integer
            || v instanceof Long
            || v instanceof Double
            || v instanceof Float
            || v instanceof Short
            || v instanceof Byte) {
            return v;
        }

        // Callables — tested via common functional types. Java has no
        // single "callable" base, so we check the most common ones.
        if (v instanceof Runnable
            || v instanceof java.util.function.Function
            || v instanceof java.util.function.Consumer
            || v instanceof java.util.function.Supplier
            || v instanceof java.util.function.BiFunction
            || v instanceof java.util.function.Predicate) {
            throw new ConfigCloneError(
                "deep_clone: callable not permitted in config (got " +
                v.getClass().getSimpleName() + " at " + pathOrRoot(path) + "). " +
                "Handlers must be registered separately via the runtime registry.");
        }

        // Java arrays — reject. Configs use Lists.
        if (v.getClass().isArray()) {
            throw new ConfigCloneError(
                "deep_clone: Java array not permitted in config (got " +
                v.getClass().getSimpleName() + " at " + pathOrRoot(path) +
                "). Use List<Object> for list-shaped values.");
        }

        if (depth > MAX_CLONE_DEPTH) {
            throw new ConfigCloneError(
                "deep_clone: depth exceeds " + MAX_CLONE_DEPTH +
                " (at " + pathOrRoot(path) + ")");
        }

        state.nodeCount++;
        if (state.nodeCount > MAX_CLONE_NODES) {
            throw new ConfigCloneError(
                "deep_clone: node count exceeds " + MAX_CLONE_NODES);
        }

        // Cycle check using identity-based seen set.
        if (state.seen.containsKey(v)) {
            throw new ConfigCloneError(
                "deep_clone: cycle detected (at " + pathOrRoot(path) + ")");
        }
        state.seen.put(v, Boolean.TRUE);

        try {
            if (v instanceof Map<?, ?> map) {
                Map<String, Object> out = new LinkedHashMap<>();
                for (Map.Entry<?, ?> e : map.entrySet()) {
                    Object k = e.getKey();
                    if (!(k instanceof String keyStr)) {
                        throw new ConfigCloneError(
                            "deep_clone: Map keys must be Strings (got " +
                            (k == null ? "null" : k.getClass().getSimpleName()) +
                            " at " + pathOrRoot(path) + ")");
                    }
                    if (BLOCKED_KEYS.contains(keyStr)) continue;
                    String subPath = path.isEmpty() ? keyStr : path + "." + keyStr;
                    out.put(keyStr, cloneValue(e.getValue(), depth + 1, subPath, state));
                }
                return out;
            }

            if (v instanceof List<?> list) {
                List<Object> out = new ArrayList<>(list.size());
                int i = 0;
                for (Object item : list) {
                    out.add(cloneValue(item, depth + 1, path + "[" + i + "]", state));
                    i++;
                }
                return out;
            }

            // Everything else (Set, custom classes, etc.) rejected.
            throw new ConfigCloneError(
                "deep_clone: unsupported type in config: " +
                v.getClass().getSimpleName() + " at " + pathOrRoot(path) +
                ". Config must be plain data (Map / List / String / Number / Boolean / null).");
        } finally {
            state.seen.remove(v);
        }
    }

    private static String pathOrRoot(String path) {
        return path.isEmpty() ? "<root>" : path;
    }

    /**
     * Mutable traversal state. IdentityHashMap for the seen set so
     * structural equality between distinct Map instances doesn't
     * trigger a false-positive cycle detection.
     */
    private static final class State {
        int nodeCount = 0;
        final IdentityHashMap<Object, Boolean> seen = new IdentityHashMap<>();
    }
}
