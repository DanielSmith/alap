# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
Provenance tier stamping — Python port of src/core/linkProvenance.ts.

Links carry a provenance tier (where they came from) so downstream
sanitizers can apply strictness matched to the source's trustworthiness.

Tiers, loosest → strictest:
  - ``'author'``          — link came from the developer's hand-written config
  - ``'storage:local'``   — loaded from a local storage adapter
  - ``'storage:remote'``  — loaded from a remote config server
  - ``'protocol:<name>'`` — returned by a protocol handler

TypeScript stores the stamp in a ``WeakMap`` keyed on runtime object
identity so an attacker-writable ``.provenance`` field on an incoming
link cannot pre-stamp itself for free. Python ``dict`` is not
weakref-safe, so this port stamps a reserved ``_provenance`` key on
the link dict directly. The safety property is preserved through the
``validate_config`` whitelist: validate_config builds each link from a
fixed set of known field names, and only stamps ``_provenance`` *after*
the whitelist step. An incoming config carrying its own ``_provenance``
field is filtered out by the whitelist before stamping.
"""

from __future__ import annotations

from typing import Any, Mapping

# Reserved key. The whitelist in validate_config intentionally excludes
# this key so it cannot be pre-stamped from untrusted input.
PROVENANCE_KEY = "_provenance"

# A provenance value is one of the four strings documented above. Typed as
# ``str`` because Python has no way to check a literal-union at runtime
# that would improve over what stamp_provenance already enforces
# (``str`` + ``_is_valid_provenance``). Runtime validation happens at the
# stamp call site.
Provenance = str


def _is_valid_provenance(tier: str) -> bool:
    return tier in ("author", "storage:local", "storage:remote") or tier.startswith("protocol:")


def stamp_provenance(link: dict[str, Any], tier: Provenance) -> None:
    """Stamp *link* with its provenance tier. Overwrites any existing stamp."""
    if not isinstance(tier, str) or not _is_valid_provenance(tier):
        raise ValueError(
            f"stamp_provenance: invalid tier {tier!r}. Must be 'author', "
            "'storage:local', 'storage:remote', or 'protocol:<name>'."
        )
    link[PROVENANCE_KEY] = tier


def get_provenance(link: Mapping[str, Any]) -> Provenance | None:
    """Read a link's provenance tier, or ``None`` if unstamped."""
    prov = link.get(PROVENANCE_KEY)
    return prov if isinstance(prov, str) else None


def is_author_tier(link: Mapping[str, Any]) -> bool:
    """True if the link was hand-written in the developer's config."""
    return link.get(PROVENANCE_KEY) == "author"


def is_storage_tier(link: Mapping[str, Any]) -> bool:
    """True if the link was loaded from a storage adapter."""
    prov = link.get(PROVENANCE_KEY)
    return prov in ("storage:local", "storage:remote")


def is_protocol_tier(link: Mapping[str, Any]) -> bool:
    """True if the link was returned by a protocol handler."""
    prov = link.get(PROVENANCE_KEY)
    return isinstance(prov, str) and prov.startswith("protocol:")


def clone_provenance(src: Mapping[str, Any], dest: dict[str, Any]) -> None:
    """Copy the provenance stamp from *src* to *dest*.

    Used anywhere the port creates a fresh link derived from a stamped
    one. No-op if *src* is unstamped.
    """
    prov = src.get(PROVENANCE_KEY)
    if isinstance(prov, str):
        dest[PROVENANCE_KEY] = prov
