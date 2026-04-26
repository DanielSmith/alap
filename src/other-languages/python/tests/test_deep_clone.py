# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Tests for deep_clone_data — input detachment with exotic-type rejection."""

import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from deep_clone import DeepCloneError, deep_clone_data


class TestAllowedShapes:
    def test_empty_dict(self):
        assert deep_clone_data({}) == {}

    def test_flat_dict(self):
        src = {"url": "/a", "label": "A"}
        out = deep_clone_data(src)
        assert out == src
        assert out is not src  # detached

    def test_nested_dict(self):
        src = {"outer": {"inner": {"leaf": 42}}}
        out = deep_clone_data(src)
        assert out == src
        assert out["outer"] is not src["outer"]
        assert out["outer"]["inner"] is not src["outer"]["inner"]

    def test_list(self):
        out = deep_clone_data([1, 2, 3])
        assert out == [1, 2, 3]

    def test_tuple_becomes_list(self):
        # Tuples are accepted as input but not preserved — consumers treat
        # lists and tuples uniformly, and JSON round-trips produce lists.
        out = deep_clone_data((1, 2, 3))
        assert out == [1, 2, 3]
        assert isinstance(out, list)

    def test_mixed(self):
        src = {
            "allLinks": {
                "a": {"url": "/a", "tags": ["nyc", "coffee"], "meta": {"rank": 1}},
            },
        }
        out = deep_clone_data(src)
        assert out == src

    def test_primitives_pass_through(self):
        assert deep_clone_data("hello") == "hello"
        assert deep_clone_data(42) == 42
        assert deep_clone_data(3.14) == 3.14
        assert deep_clone_data(True) is True
        assert deep_clone_data(False) is False
        assert deep_clone_data(None) is None


class TestDetachment:
    def test_input_not_mutated_by_clone(self):
        src = {"url": "/a", "tags": ["x"]}
        deep_clone_data(src)
        assert src == {"url": "/a", "tags": ["x"]}

    def test_mutation_of_output_does_not_affect_input(self):
        src = {"tags": ["x", "y"]}
        out = deep_clone_data(src)
        out["tags"].append("z")
        assert src["tags"] == ["x", "y"]


class TestRejections:
    def test_rejects_function(self):
        with pytest.raises(DeepCloneError):
            deep_clone_data({"handler": lambda x: x})

    def test_rejects_method(self):
        class Foo:
            def bar(self):
                pass

        with pytest.raises(DeepCloneError):
            deep_clone_data({"handler": Foo().bar})

    def test_rejects_class_instance(self):
        class Opaque:
            pass

        with pytest.raises(DeepCloneError):
            deep_clone_data({"obj": Opaque()})

    def test_rejects_bytes(self):
        with pytest.raises(DeepCloneError):
            deep_clone_data({"blob": b"hello"})

    def test_rejects_set(self):
        with pytest.raises(DeepCloneError):
            deep_clone_data({"tags": {"x", "y"}})

    def test_rejects_dict_subclass(self):
        class CustomDict(dict):
            pass

        with pytest.raises(DeepCloneError):
            deep_clone_data(CustomDict({"a": 1}))

    def test_rejects_non_string_dict_key(self):
        with pytest.raises(DeepCloneError):
            deep_clone_data({1: "value"})

    def test_rejects_cycle(self):
        a: dict = {}
        a["self"] = a
        with pytest.raises(DeepCloneError):
            deep_clone_data(a)

    def test_rejects_mutual_cycle(self):
        a: dict = {}
        b: dict = {"back": a}
        a["fwd"] = b
        with pytest.raises(DeepCloneError):
            deep_clone_data(a)

    def test_shared_reference_not_rejected(self):
        # Shared (non-cyclic) refs are allowed and get cloned separately —
        # the tree comes out with two independent copies.
        shared = {"rank": 1}
        src = {"a": shared, "b": shared}
        out = deep_clone_data(src)
        assert out == {"a": {"rank": 1}, "b": {"rank": 1}}
        assert out["a"] is not out["b"]


class TestResourceBounds:
    def test_depth_at_limit_ok(self):
        # 65 dicts deep — depths 0 through 64 — exactly at MAX_CLONE_DEPTH.
        # Passes because check is `depth > 64`.
        payload: dict = {}
        current = payload
        for _ in range(64):
            current["nested"] = {}
            current = current["nested"]
        out = deep_clone_data(payload)
        assert isinstance(out, dict)

    def test_depth_over_limit_rejected(self):
        # 66 dicts deep — deepest at depth 65 — exceeds MAX_CLONE_DEPTH.
        payload: dict = {}
        current = payload
        for _ in range(65):
            current["nested"] = {}
            current = current["nested"]
        with pytest.raises(DeepCloneError, match="depth exceeds"):
            deep_clone_data(payload)

    def test_node_count_at_limit_ok(self):
        # 1 list + 9,999 empty dicts = 10,000 nodes, at MAX_CLONE_NODES.
        payload = [{} for _ in range(9_999)]
        out = deep_clone_data(payload)
        assert len(out) == 9_999

    def test_node_count_over_limit_rejected(self):
        # 1 list + 10,001 empty dicts = 10,002 nodes, exceeds cap.
        payload = [{} for _ in range(10_001)]
        with pytest.raises(DeepCloneError, match="node count exceeds"):
            deep_clone_data(payload)

    def test_primitives_do_not_count_as_nodes(self):
        # A dict with 20k string keys whose values are all primitives is
        # one node (the dict). Should not trip the cap.
        payload = {f"k{i}": i for i in range(20_000)}
        out = deep_clone_data(payload)
        assert len(out) == 20_000

    def test_depth_error_includes_path(self):
        # Cycle-ish test that a path shows up in depth errors.
        payload: dict = {}
        current = payload
        for _ in range(66):  # over the limit
            current["deeper"] = {}
            current = current["deeper"]
        with pytest.raises(DeepCloneError, match=r"deeper\.deeper"):
            deep_clone_data(payload)


class TestBlockedKeys:
    def test_proto_key_silently_skipped(self):
        payload = {"url": "/a", "__proto__": {"hacked": True}}
        out = deep_clone_data(payload)
        assert "url" in out
        assert "__proto__" not in out

    def test_constructor_key_silently_skipped(self):
        payload = {"url": "/a", "constructor": {"bad": True}}
        out = deep_clone_data(payload)
        assert "constructor" not in out

    def test_prototype_key_silently_skipped(self):
        payload = {"url": "/a", "prototype": {"bad": True}}
        out = deep_clone_data(payload)
        assert "prototype" not in out

    def test_blocked_keys_do_not_count_as_nodes(self):
        # Skipping a blocked key should short-circuit before we recurse
        # into its value. A huge object under __proto__ shouldn't trip
        # the node cap or the depth cap.
        pathological = {}
        current = pathological
        for _ in range(200):
            current["nested"] = {}
            current = current["nested"]
        payload = {"url": "/a", "__proto__": pathological}
        out = deep_clone_data(payload)
        assert out == {"url": "/a"}
