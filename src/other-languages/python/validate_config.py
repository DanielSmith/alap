# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
validate_config — Python port of src/core/validateConfig.ts.

Takes an untrusted config dict and returns a frozen, provenance-stamped
copy. Mirrors the 3.2 reference behaviour:

- deep-clones the input (rejects functions, class instances, cycles);
- rejects function-valued protocol handlers with :class:`ConfigMigrationError`;
- stamps each validated link with the caller-supplied provenance tier;
- enforces the hooks allowlist against non-author tiers (fail-closed
  when ``settings.hooks`` is not declared);
- sanitizes every URL-bearing field (``url``, ``image``, ``thumbnail``,
  and any ``meta.*Url`` key) through :func:`sanitize_url`;
- strips ``__proto__``, ``constructor``, ``prototype`` keys from all
  dict-shaped fields, including nested ``link.meta``;
- rejects hyphens in link IDs, tag names, macro names, and searchPattern
  keys (``-`` is the WITHOUT operator in expressions);
- deep-freezes the returned config so handlers see the shape the
  validator approved;
- short-circuits when re-validating a config it has already produced
  (so storage-tier stamps are not overwritten to ``'author'``).
"""

from __future__ import annotations

import re
import warnings
import weakref
from typing import Any, Mapping

from deep_clone import deep_clone_data
from deep_freeze import deep_freeze
from link_provenance import PROVENANCE_KEY, stamp_provenance
from sanitize_url import sanitize_url
from validate_regex import validate_regex


BLOCKED_KEYS = frozenset({
    # JS prototype-pollution set (parity with TS).
    "__proto__", "constructor", "prototype",
    # Python-specific dunders — blocked in addition to the JS set so
    # a config passed to Jinja2, a logging formatter, or any other
    # attribute-introspecting consumer can't surface class hierarchy
    # via a crafted key. Documented in alap/docs/api-reference/security.md.
    "__class__", "__bases__", "__mro__", "__subclasses__",
})

_URL_KEY_RE = re.compile(r"url$", re.IGNORECASE)


class ConfigMigrationError(Exception):
    """Raised when a config has a legacy shape requiring migration.

    Currently thrown by :func:`assert_no_handlers_in_config` when a
    ``config['protocols'][<name>]['generate' | 'filter' | 'handler']``
    slot holds a callable. Handlers must be registered separately
    via the runtime registry; the config itself is pure data.
    """


class _FrozenAlapConfig(dict):
    """Read-only dict subclass returned by :func:`validate_config`.

    Subclass (rather than a bare ``dict``) so instances are weakref-able
    — the :data:`_VALIDATED` WeakSet relies on that for leak-free
    idempotence tracking. ``__hash__`` is set to :func:`object.__hash__`
    so WeakSet uses instance identity for bucketing; structural dict
    equality is preserved for normal ``==`` comparisons.
    """

    # Identity-hash so WeakSet tracks by instance, not structural content.
    # (dict is unhashable by default; the subclass needs a concrete
    # __hash__ to be WeakSet-compatible.)
    __hash__ = object.__hash__  # type: ignore[assignment]

    def __setitem__(self, key, value):
        raise TypeError(
            "validated config is read-only; call validate_config to produce a new one"
        )

    def __delitem__(self, key):
        raise TypeError("validated config is read-only")

    def clear(self):
        raise TypeError("validated config is read-only")

    def pop(self, *args, **kwargs):
        raise TypeError("validated config is read-only")

    def popitem(self):
        raise TypeError("validated config is read-only")

    def update(self, *args, **kwargs):
        raise TypeError("validated config is read-only")

    def setdefault(self, *args, **kwargs):
        raise TypeError("validated config is read-only")


_VALIDATED: weakref.WeakSet = weakref.WeakSet()


def assert_no_handlers_in_config(config: Mapping[str, Any]) -> None:
    """Reject function-valued protocol handlers in *config*.

    Handlers must be registered via the runtime registry, not embedded
    in the config. Thrown loudly at the validate front door so the
    shape mismatch surfaces with the exact field name, not as a missing
    handler at first dispatch.
    """
    if not isinstance(config, Mapping):
        return
    protocols = config.get("protocols")
    if not isinstance(protocols, dict):
        return
    for name, entry in protocols.items():
        if not isinstance(entry, dict):
            continue
        for field in ("generate", "filter", "handler"):
            if callable(entry.get(field)):
                raise ConfigMigrationError(
                    f"config['protocols'][{name!r}][{field!r}] is a callable "
                    "— handlers must be registered separately via the runtime "
                    "registry, not embedded in the config. "
                    "See docs/handlers-out-of-config.md."
                )


def sanitize_link_urls(link: Mapping[str, Any]) -> dict[str, Any]:
    """Single source of truth for URL-scheme sanitization on a link.

    Scans ``url``, ``image``, ``thumbnail``, and any ``meta`` key whose
    name ends with ``url`` (case-insensitive), passing each through
    :func:`sanitize_url`. Strips ``__proto__`` / ``constructor`` /
    ``prototype`` keys from ``meta`` during the pass — Python has no
    prototype chain to pollute, but parity with the TypeScript
    reference keeps behaviour identical across ports.
    """
    out: dict[str, Any] = dict(link)
    if isinstance(link.get("url"), str):
        out["url"] = sanitize_url(link["url"])
    if isinstance(link.get("image"), str):
        out["image"] = sanitize_url(link["image"])
    if isinstance(link.get("thumbnail"), str):
        out["thumbnail"] = sanitize_url(link["thumbnail"])
    raw_meta = link.get("meta")
    if isinstance(raw_meta, dict):
        safe_meta: dict[str, Any] = {}
        for mk, mv in raw_meta.items():
            if mk in BLOCKED_KEYS:
                continue
            if isinstance(mv, str) and _URL_KEY_RE.search(mk):
                safe_meta[mk] = sanitize_url(mv)
            else:
                safe_meta[mk] = mv
        out["meta"] = safe_meta
    return out


def _has_hyphen(name: str) -> bool:
    return "-" in name


def _validate_search_patterns(raw_patterns: dict) -> dict:
    out: dict[str, Any] = {}
    for key in list(raw_patterns.keys()):
        if key in BLOCKED_KEYS:
            continue
        if _has_hyphen(key):
            warnings.warn(
                f"validate_config: skipping searchPattern {key!r} — hyphens are "
                "not allowed in pattern keys. Use underscores instead. The '-' "
                "character is the WITHOUT operator in expressions."
            )
            continue
        entry = raw_patterns[key]
        # Object form: {"pattern": "...", "fields": [...]}
        if isinstance(entry, dict) and isinstance(entry.get("pattern"), str):
            validation = validate_regex(entry["pattern"])
            if validation["safe"]:
                out[key] = entry
            else:
                warnings.warn(
                    f"validate_config: removing searchPattern {key!r} — {validation.get("reason", "invalid")}"
                )
            continue
        # String shorthand
        if isinstance(entry, str):
            validation = validate_regex(entry)
            if validation["safe"]:
                out[key] = entry
            else:
                warnings.warn(
                    f"validate_config: removing searchPattern {key!r} — {validation.get("reason", "invalid")}"
                )
            continue
        warnings.warn(
            f"validate_config: skipping searchPattern {key!r} — invalid shape"
        )
    return out


def validate_config(config: Any, *, provenance: str = "author") -> _FrozenAlapConfig:
    """Validate and sanitize *config* from an untrusted source.

    Returns a frozen copy with each link stamped with *provenance*. See
    the module docstring for the full list of transformations applied.

    Raises :class:`ValueError` when the config is structurally invalid
    (e.g. missing ``allLinks``), :class:`ConfigMigrationError` when the
    config carries function-valued protocol handlers, or
    :class:`deep_clone.DeepCloneError` when the config contains
    non-data types, cycles, or exceeds the clone resource bounds.
    """
    # Idempotence short-circuit: a pre-validated config has its original
    # provenance stamps (including storage-tier stamps from storage
    # adapters); re-running the pipeline would overwrite them to
    # 'author'. VALIDATED membership is proof we produced this object,
    # so the caller cannot forge idempotence from outside.
    if isinstance(config, _FrozenAlapConfig) and config in _VALIDATED:
        return config

    if not isinstance(config, dict):
        raise ValueError("Invalid config: expected a dict")

    # Reject function-valued protocol handlers before any further
    # processing so the migration error surfaces at the exact field
    # name, not as a generic "not data" from deep_clone.
    assert_no_handlers_in_config(config)

    # Detach from caller; deep_clone rejects functions / class
    # instances / cycles / non-str dict keys / over-bound structures.
    raw = deep_clone_data(config)

    # Hook allowlist pulled from settings up front so the per-link
    # pass below can filter non-author-tier hooks against it.
    raw_settings = raw.get("settings") if isinstance(raw, dict) else None
    if isinstance(raw_settings, dict) and isinstance(raw_settings.get("hooks"), list):
        hook_allowlist: frozenset[str] | None = frozenset(
            h for h in raw_settings["hooks"] if isinstance(h, str)
        )
    else:
        hook_allowlist = None

    # --- allLinks (required) ----------------------------------------
    raw_links = raw.get("allLinks")
    if not isinstance(raw_links, dict):
        raise ValueError("Invalid config: allLinks must be a non-null dict")

    sanitized_links: dict[str, dict] = {}
    for key in list(raw_links.keys()):
        if key in BLOCKED_KEYS:
            continue
        if _has_hyphen(key):
            warnings.warn(
                f"validate_config: skipping allLinks[{key!r}] — hyphens are not "
                "allowed in item IDs. Use underscores instead. The '-' character "
                "is the WITHOUT operator in expressions."
            )
            continue

        link = raw_links[key]
        if not isinstance(link, dict):
            warnings.warn(
                f"validate_config: skipping allLinks[{key!r}] — not a valid link object"
            )
            continue

        if not isinstance(link.get("url"), str):
            warnings.warn(
                f"validate_config: skipping allLinks[{key!r}] — missing or invalid url"
            )
            continue

        # Tag filter — strings only, reject hyphens.
        tags: list[str] | None = None
        if "tags" in link:
            if isinstance(link["tags"], list):
                clean_tags: list[str] = []
                for t in link["tags"]:
                    if not isinstance(t, str):
                        continue
                    if _has_hyphen(t):
                        warnings.warn(
                            f"validate_config: allLinks[{key!r}] — stripping tag "
                            f"{t!r} (hyphens not allowed in tags). Use underscores "
                            "instead."
                        )
                        continue
                    clean_tags.append(t)
                tags = clean_tags
            else:
                warnings.warn(
                    f"validate_config: allLinks[{key!r}].tags is not a list — ignoring"
                )

        # Shape via whitelist — unknown fields are silently dropped.
        shaped: dict[str, Any] = {"url": link["url"]}
        if isinstance(link.get("label"), str):
            shaped["label"] = link["label"]
        if tags is not None:
            shaped["tags"] = tags
        if isinstance(link.get("cssClass"), str):
            shaped["cssClass"] = link["cssClass"]
        if isinstance(link.get("image"), str):
            shaped["image"] = link["image"]
        if isinstance(link.get("altText"), str):
            shaped["altText"] = link["altText"]
        if isinstance(link.get("targetWindow"), str):
            shaped["targetWindow"] = link["targetWindow"]
        if isinstance(link.get("description"), str):
            shaped["description"] = link["description"]
        if isinstance(link.get("thumbnail"), str):
            shaped["thumbnail"] = link["thumbnail"]

        # Hooks — tier-aware allowlist enforcement.
        if isinstance(link.get("hooks"), list):
            string_hooks = [h for h in link["hooks"] if isinstance(h, str)]
            if provenance == "author":
                if string_hooks:
                    shaped["hooks"] = string_hooks
            elif hook_allowlist is not None:
                allowed: list[str] = []
                for h in string_hooks:
                    if h in hook_allowlist:
                        allowed.append(h)
                    else:
                        warnings.warn(
                            f"validate_config: allLinks[{key!r}] — stripping "
                            f"hook {h!r} not in settings.hooks allowlist "
                            f"(tier: {provenance})"
                        )
                if allowed:
                    shaped["hooks"] = allowed
            elif string_hooks:
                warnings.warn(
                    f"validate_config: allLinks[{key!r}] — dropping "
                    f"{len(string_hooks)} hook(s) on {provenance}-tier link; "
                    "declare settings.hooks to allow specific keys"
                )

        if isinstance(link.get("guid"), str):
            shaped["guid"] = link["guid"]
        if "createdAt" in link:
            shaped["createdAt"] = link["createdAt"]

        # Meta — copy with key blocklist at the nested level.
        # (sanitize_link_urls will run a second pass that also strips
        # blocked keys and sanitises *Url fields; this first pass makes
        # sure the shaped["meta"] we hand off is already a fresh object.)
        if isinstance(link.get("meta"), dict):
            raw_meta = link["meta"]
            safe_meta: dict[str, Any] = {}
            for mk in raw_meta.keys():
                if mk in BLOCKED_KEYS:
                    continue
                safe_meta[mk] = raw_meta[mk]
            shaped["meta"] = safe_meta

        # Single source of truth for URL-field sanitization.
        final_link = sanitize_link_urls(shaped)

        # Stamp provenance AFTER the whitelist pass — since shaped was
        # built from a fixed set of known keys, an incoming config
        # cannot pre-stamp itself via a forged _provenance field.
        stamp_provenance(final_link, provenance)

        sanitized_links[key] = final_link

    # --- settings (optional) ----------------------------------------
    settings: dict[str, Any] | None = None
    if isinstance(raw_settings, dict):
        settings = {}
        for skey in list(raw_settings.keys()):
            if skey in BLOCKED_KEYS:
                continue
            settings[skey] = raw_settings[skey]

    # --- macros (optional) ------------------------------------------
    macros: dict[str, Any] | None = None
    raw_macros = raw.get("macros")
    if isinstance(raw_macros, dict):
        macros = {}
        for mkey in list(raw_macros.keys()):
            if mkey in BLOCKED_KEYS:
                continue
            if _has_hyphen(mkey):
                warnings.warn(
                    f"validate_config: skipping macro {mkey!r} — hyphens are "
                    "not allowed in macro names. Use underscores instead. The "
                    "'-' character is the WITHOUT operator in expressions."
                )
                continue
            macro = raw_macros[mkey]
            if isinstance(macro, dict) and isinstance(macro.get("linkItems"), str):
                macros[mkey] = macro
            else:
                warnings.warn(
                    f"validate_config: skipping macro {mkey!r} — invalid shape"
                )

    # --- searchPatterns (optional) ----------------------------------
    search_patterns: dict[str, Any] | None = None
    raw_patterns = raw.get("searchPatterns")
    if isinstance(raw_patterns, dict):
        search_patterns = _validate_search_patterns(raw_patterns)

    # --- protocols (optional, data-only since 3.2) -----------------
    protocols: dict[str, Any] | None = None
    raw_protocols = raw.get("protocols")
    if isinstance(raw_protocols, dict):
        protocols = {}
        for pkey in list(raw_protocols.keys()):
            if pkey in BLOCKED_KEYS:
                continue
            protocols[pkey] = raw_protocols[pkey]

    # Assemble, freeze children, wrap top in _FrozenAlapConfig, track.
    result: dict[str, Any] = {"allLinks": deep_freeze(sanitized_links)}
    if settings is not None:
        result["settings"] = deep_freeze(settings)
    if macros is not None:
        result["macros"] = deep_freeze(macros)
    if search_patterns is not None:
        result["searchPatterns"] = deep_freeze(search_patterns)
    if protocols is not None:
        result["protocols"] = deep_freeze(protocols)

    top = _FrozenAlapConfig(result)
    _VALIDATED.add(top)
    return top
