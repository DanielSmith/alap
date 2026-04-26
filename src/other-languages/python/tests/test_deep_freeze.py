# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Tests for deep_freeze — recursive MappingProxyType wrapping."""

import sys
import os
from types import MappingProxyType

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from deep_freeze import deep_freeze


class TestTopLevelShapes:
    def test_empty_dict_frozen(self):
        out = deep_freeze({})
        assert isinstance(out, MappingProxyType)

    def test_dict_frozen(self):
        out = deep_freeze({"a": 1, "b": 2})
        assert isinstance(out, MappingProxyType)
        assert out["a"] == 1
        assert out["b"] == 2

    def test_list_becomes_tuple(self):
        out = deep_freeze([1, 2, 3])
        assert isinstance(out, tuple)
        assert out == (1, 2, 3)

    def test_tuple_stays_tuple(self):
        out = deep_freeze((1, 2, 3))
        assert isinstance(out, tuple)
        assert out == (1, 2, 3)

    def test_primitives_pass_through(self):
        assert deep_freeze("x") == "x"
        assert deep_freeze(42) == 42
        assert deep_freeze(True) is True
        assert deep_freeze(None) is None


class TestRecursive:
    def test_nested_dict(self):
        out = deep_freeze({"outer": {"inner": {"leaf": 1}}})
        assert isinstance(out, MappingProxyType)
        assert isinstance(out["outer"], MappingProxyType)
        assert isinstance(out["outer"]["inner"], MappingProxyType)

    def test_dict_of_lists(self):
        out = deep_freeze({"tags": ["a", "b"]})
        assert isinstance(out["tags"], tuple)
        assert out["tags"] == ("a", "b")

    def test_list_of_dicts(self):
        out = deep_freeze([{"a": 1}, {"b": 2}])
        assert isinstance(out, tuple)
        for item in out:
            assert isinstance(item, MappingProxyType)

    def test_deeply_nested_mix(self):
        src = {"allLinks": {"x": {"url": "/x", "tags": ["t1", "t2"], "meta": {"rank": 1}}}}
        out = deep_freeze(src)
        assert isinstance(out, MappingProxyType)
        assert isinstance(out["allLinks"], MappingProxyType)
        assert isinstance(out["allLinks"]["x"], MappingProxyType)
        assert isinstance(out["allLinks"]["x"]["tags"], tuple)
        assert isinstance(out["allLinks"]["x"]["meta"], MappingProxyType)


class TestImmutability:
    def test_top_level_assignment_raises(self):
        out = deep_freeze({"a": 1})
        with pytest.raises(TypeError):
            out["b"] = 2  # type: ignore[index]

    def test_top_level_delete_raises(self):
        out = deep_freeze({"a": 1})
        with pytest.raises(TypeError):
            del out["a"]  # type: ignore[index]

    def test_nested_dict_assignment_raises(self):
        out = deep_freeze({"inner": {"a": 1}})
        with pytest.raises(TypeError):
            out["inner"]["b"] = 2  # type: ignore[index]

    def test_nested_list_cannot_be_appended(self):
        out = deep_freeze({"tags": ["a"]})
        # list became tuple — no append method
        assert not hasattr(out["tags"], "append")

    def test_input_dict_not_mutated(self):
        src = {"a": 1}
        deep_freeze(src)
        # deep_freeze wraps but should not mutate the underlying dict
        src["b"] = 2
        assert src == {"a": 1, "b": 2}
