# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
Recursive immutability — Python port of src/core/deepFreeze.ts.

Wraps dicts in :class:`types.MappingProxyType` (a read-only view) and
converts lists to tuples, recursively. Strings, numbers, booleans, and
``None`` are already immutable and pass through unchanged.

The returned structure is read-only at every level: attempts to assign
into a ``MappingProxyType`` raise ``TypeError``; tuples have no setter.

This pairs with :func:`deep_clone.deep_clone_data` — clone detaches from
the caller on intake, freeze locks the result on return.
"""

from __future__ import annotations

from types import MappingProxyType
from typing import Any


def deep_freeze(value: Any) -> Any:
    """Return a deeply-immutable view of *value*."""
    if isinstance(value, dict):
        return MappingProxyType({k: deep_freeze(v) for k, v in value.items()})
    if isinstance(value, list) or isinstance(value, tuple):
        return tuple(deep_freeze(v) for v in value)
    # str, int, float, bool, None, already-frozen Mappings, etc. — immutable
    # or out-of-scope for this pass.
    return value
