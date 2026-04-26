# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
Deep-clone for plain config data — Python port of src/core/deepCloneData.ts.

Detaches a config from the caller's input by recursively rebuilding it,
rejecting anything that is not plain data. The point is twofold:

1. **Detachment.** Frameworks (Pydantic, dataclass instances, custom
   dict subclasses, ``collections.defaultdict`` with auto-vivifying
   factories) wrap their data in types that would otherwise leak into
   downstream immutability / serialization steps.
2. **Trust boundary.** Config is *data*. Handlers are passed separately
   via the runtime registry. A callable in config is a shape error, and
   rejecting it here surfaces the error before any downstream step has
   to cope with it.

Allowed: ``dict`` (str-keyed), ``list``, ``tuple``, ``str``, ``int``,
``float``, ``bool``, ``None``.
Rejected: callables, class instances outside the allowlist, cycles, and
non-string dict keys.

**Resource bounds** (matching src/core/deepCloneData.ts):

- ``MAX_CLONE_DEPTH = 64`` — rejects pathologically nested structures.
- ``MAX_CLONE_NODES = 10_000`` — rejects node-count DoS bombs.

Both are defence-in-depth against malicious input; legitimate configs
are orders of magnitude below either bound.

``__proto__``, ``constructor``, ``prototype`` keys are silently skipped
during clone (same as TS). Python has no prototype chain to pollute,
but parity with TS keeps behaviour identical across ports and removes
a rename-and-hope-for-the-best confusion vector.
"""

from __future__ import annotations

from typing import Any


MAX_CLONE_DEPTH = 64
MAX_CLONE_NODES = 10_000

BLOCKED_KEYS = frozenset({"__proto__", "constructor", "prototype"})


class DeepCloneError(TypeError):
    """Raised when a config contains a non-data value or exceeds a resource bound."""


def deep_clone_data(value: Any) -> Any:
    """Return a deep copy of *value* with exotic types rejected.

    Raises :class:`DeepCloneError` on callables, non-allowlist class
    instances, cycles, non-string dict keys, depth over
    :data:`MAX_CLONE_DEPTH`, or node count over :data:`MAX_CLONE_NODES`.
    """
    seen: set[int] = set()
    node_count = 0

    def _path_or_root(path: str) -> str:
        return path or "<root>"

    def _clone(v: Any, depth: int, path: str) -> Any:
        nonlocal node_count

        # Primitives are immutable — skip clone and skip node count.
        # bool is listed before int because bool is a subclass of int in Python.
        if v is None or isinstance(v, (str, bool, int, float)):
            return v

        if callable(v):
            raise DeepCloneError(
                f"deep_clone_data: functions and callables are not permitted in "
                f"config (got {type(v).__name__} at {_path_or_root(path)}). "
                "Handlers must be passed separately via the runtime registry."
            )

        if depth > MAX_CLONE_DEPTH:
            raise DeepCloneError(
                f"deep_clone_data: depth exceeds {MAX_CLONE_DEPTH} "
                f"(at {_path_or_root(path)})"
            )

        node_count += 1
        if node_count > MAX_CLONE_NODES:
            raise DeepCloneError(
                f"deep_clone_data: node count exceeds {MAX_CLONE_NODES}"
            )

        vid = id(v)
        if vid in seen:
            raise DeepCloneError(
                f"deep_clone_data: cycle detected (at {_path_or_root(path)})"
            )
        seen.add(vid)

        try:
            if type(v) is dict:
                out: dict[str, Any] = {}
                for k, val in v.items():
                    if not isinstance(k, str):
                        raise DeepCloneError(
                            f"deep_clone_data: dict keys must be strings "
                            f"(got {type(k).__name__} at {_path_or_root(path)})"
                        )
                    if k in BLOCKED_KEYS:
                        continue
                    sub_path = f"{path}.{k}" if path else k
                    out[k] = _clone(val, depth + 1, sub_path)
                return out

            # list and tuple both collapse to list — downstream consumers
            # treat them uniformly, and JSON round-trips produce lists.
            if type(v) is list or type(v) is tuple:
                return [
                    _clone(item, depth + 1, f"{path}[{i}]")
                    for i, item in enumerate(v)
                ]

            # Anything else (dict subclasses, class instances, bytes,
            # sets, numpy arrays, Pydantic models, etc.) is rejected with
            # the type name so the caller sees the specific issue.
            raise DeepCloneError(
                f"deep_clone_data: unsupported type in config: "
                f"{type(v).__name__} at {_path_or_root(path)}. "
                "Config must be plain data "
                "(dict / list / str / int / float / bool / None)."
            )
        finally:
            seen.discard(vid)

    return _clone(value, 0, "")
