"""
Copyright 2026 Daniel Smith — Apache 2.0

Path → tag derivation for the vault converter.

Two built-in rule shapes, both composable in the same ruleset:

    TagRule(kind="dir",    match="framework-guides", tag="framework_guides")
    TagRule(kind="prefix", match="idea-",            tag="idea")

The shared core is intentionally small: the converter passes a relative
path and a rule tuple in; this module returns the list of tag strings
the file should carry. Alap-specific rules for the library-docs corpus
are baked into `scripts/vault_docs.py`; user-supplied rules for the
general CLI come from a YAML config file.

Hyphens in tag names normalize to underscores because `-` is Alap's
WITHOUT operator — `.framework-guides` would parse as `.framework minus
guides`, not a single tag.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal


RuleKind = Literal["dir", "prefix"]


@dataclass(frozen=True)
class TagRule:
    """
    One tag-derivation rule.

    kind="dir"    — every file whose first path segment equals `match`
                    gets the tag. Applies recursively: files under
                    `framework-guides/any/depth.md` all match
                    `match="framework-guides"`.
    kind="prefix" — every file whose basename starts with `match` gets
                    the tag. Applies at any directory level.
    """
    kind: RuleKind
    match: str
    tag: str


def normalize_tag(tag: str) -> str:
    """
    Canonicalize a tag string: strip a leading `#`, trim, lowercase,
    hyphens → underscores. Empty strings pass through as empty (caller
    should skip).

    Why hyphen → underscore: Alap expressions use `.tagname` as the tag
    atom, and `-` is the WITHOUT operator. A tag named `framework-guides`
    would parse as `.framework - guides` — a subtraction, not a selector.
    The normalization is lossy (you can't round-trip) but unambiguous.
    """
    t = tag.lstrip("#").strip().lower()
    return t.replace("-", "_")


def derive_tags(rel_path: Path, rules: tuple[TagRule, ...]) -> tuple[str, ...]:
    """
    Return the tags this file should carry, in rule-declaration order,
    deduped. Called for every markdown file in the source so kept
    allocation-light.
    """
    parts = rel_path.parts
    name = rel_path.name
    seen: set[str] = set()
    tags: list[str] = []

    for rule in rules:
        tag = normalize_tag(rule.tag)
        if not tag or tag in seen:
            continue

        if rule.kind == "dir":
            if parts and parts[0] == rule.match:
                tags.append(tag)
                seen.add(tag)
        elif rule.kind == "prefix":
            if name.startswith(rule.match):
                tags.append(tag)
                seen.add(tag)
        # Unknown `kind` values are silently ignored — forwards-compat
        # with future rule shapes a config file might carry.

    return tuple(tags)


def default_directory_rules(source_root: Path) -> tuple[TagRule, ...]:
    """
    Build one `dir`-kind rule per top-level visible subdirectory of
    `source_root`. Tag names are the directory name normalized.

    Zero-config default for `vault_convert.py` when no rules file is
    supplied: point at any tree and every top-level subdir becomes a
    tag namespace. Hidden dirs (starting with `.`) are skipped — they
    tend to be toolchain metadata (`.git`, `.obsidian`, `.github`)
    rather than content groupings.
    """
    rules: list[TagRule] = []
    try:
        entries = sorted(source_root.iterdir())
    except (OSError, PermissionError):
        return ()

    for entry in entries:
        if not entry.is_dir():
            continue
        if entry.name.startswith("."):
            continue
        rules.append(TagRule(
            kind="dir",
            match=entry.name,
            tag=normalize_tag(entry.name),
        ))
    return tuple(rules)
