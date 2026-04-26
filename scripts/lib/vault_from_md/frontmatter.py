"""
Copyright 2026 Daniel Smith — Apache 2.0

YAML frontmatter extraction, merging, and serialization.

Three-stage pipeline the converter drives per file:

    text = path.read_text()
    fm, body = extract(text)
    merged = merge(fm, additions={"title": ..., "tags": [...], ...})
    out   = serialize(merged, body)
    path.write_text(out)

Merge rule of thumb: **user keys always win**. If a source file already
has `title: Something`, the converter's derived title is discarded. The
exception is `tags`, which is additive — existing and new tags are
unioned (deduped) so path-derived tags join, not replace, inline
frontmatter tags a user may have written.

Dependency: PyYAML. Install with `pip3 install --user pyyaml`,
`uv tool install pyyaml`, or a venv of your choice. See
`scripts/README.md` for options.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

try:
    import yaml
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "pyyaml is required for the vault converter. "
        "Install with `pip3 install --user pyyaml` or via `uv`/venv. "
        "See scripts/README.md."
    ) from e


FENCE = "---"

# Matches an opening `---\n` or `---\r\n` at the very start of the file.
_OPEN_FENCE_RE = re.compile(r"\A---\r?\n")

# Matches a closing fence on its own line: `\n---\n`, `\n---\r\n`, or the
# same at end-of-string without a trailing newline. Multiline so ^/$ work
# per-line.
_CLOSE_FENCE_RE = re.compile(r"^---\s*$\r?\n?", re.MULTILINE)


@dataclass(frozen=True)
class Frontmatter:
    """
    Parsed YAML frontmatter block.

    `present=False` means the source had no frontmatter block (or a
    malformed one we refused to parse). `data` is always a dict — empty
    when absent — so callers don't need to None-check.
    """
    data: dict[str, Any] = field(default_factory=dict)
    present: bool = False


# --- extract ---------------------------------------------------------------


def extract(source: str) -> tuple[Frontmatter, str]:
    """
    Split `source` into `(Frontmatter, body)`.

    Recognises `---\\n…\\n---\\n` (and `\\r\\n` variants) at the start
    of the file. Malformed blocks — missing close fence, invalid YAML,
    non-dict top-level — return `Frontmatter(present=False)` and the
    full original source as body. No data loss.

    Ignores a leading UTF-8 BOM if present.
    """
    if source.startswith("\ufeff"):
        source = source[1:]

    open_match = _OPEN_FENCE_RE.match(source)
    if not open_match:
        return Frontmatter(), source

    after_open = source[open_match.end():]
    close_match = _CLOSE_FENCE_RE.search(after_open)
    if not close_match:
        # No close fence → treat as no frontmatter; don't accidentally
        # consume the whole file as YAML.
        return Frontmatter(), source

    yaml_text = after_open[:close_match.start()]
    body = after_open[close_match.end():]

    try:
        parsed = yaml.safe_load(yaml_text)
    except yaml.YAMLError:
        # Malformed YAML → treat as no frontmatter. Returning (empty,
        # original source) lets the converter still add its derived
        # fields without risking a data-loss overwrite of a file we
        # couldn't parse.
        return Frontmatter(), source

    if parsed is None:
        # Empty frontmatter block (`---\n---\n`) — present but no keys.
        return Frontmatter(data={}, present=True), body

    if not isinstance(parsed, dict):
        # A bare scalar or a list at the top level isn't real
        # frontmatter. Refuse to interpret, preserve the source.
        return Frontmatter(), source

    return Frontmatter(data=parsed, present=True), body


# --- merge -----------------------------------------------------------------


def merge(existing: Frontmatter, additions: dict[str, Any]) -> Frontmatter:
    """
    Merge `additions` into `existing.data` without clobbering user keys.
    Returns a fresh Frontmatter; does not mutate the input.

    Rules:
      - For any key in `additions` that is NOT already in `existing`,
        the addition's value is written.
      - `tags` is the one exception: new tags are unioned with existing
        tags (deduped), so path-derived tags join rather than replace
        whatever the user already declared.
      - Empty or None values in `additions` are skipped — we never write
        a meaningless `description: null` just because the source body
        was empty.
    """
    merged: dict[str, Any] = dict(existing.data)

    for key, value in additions.items():
        if key == "tags":
            union = _merge_tags(merged.get("tags"), value)
            if union:
                merged["tags"] = union
            continue

        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue

        if key not in merged:
            merged[key] = value
        # else: user key wins, preserve as-is.

    return Frontmatter(data=merged, present=True)


def _merge_tags(existing: Any, additions: Any) -> list[str]:
    """
    Union existing + addition tags, deduping by case-insensitive form
    with hyphens normalized to underscores. Output stores the
    underscore/lowercase form so Alap expressions can reference them
    (hyphens are the WITHOUT operator, so `.framework-guides` wouldn't
    parse as a single tag selector).
    """
    out: list[str] = []
    seen: set[str] = set()
    for source in (_as_tag_list(existing), _as_tag_list(additions)):
        for raw in source:
            normalized = raw.lstrip("#").strip().lower().replace("-", "_")
            if normalized and normalized not in seen:
                out.append(normalized)
                seen.add(normalized)
    return out


def _as_tag_list(raw: Any) -> list[str]:
    """
    Coerce a frontmatter `tags:` value into a list of strings. Handles:
      - None / missing → []
      - a bare string → [string]
      - a list of strings → as-is (non-string items stringified)
    Anything else (dict, nested list, …) is treated as empty — we
    don't pretend to understand exotic shapes.
    """
    if raw is None:
        return []
    if isinstance(raw, str):
        return [raw]
    if isinstance(raw, list):
        return [str(x) for x in raw if x is not None]
    return []


# --- serialize -------------------------------------------------------------


def serialize(fm: Frontmatter, body: str) -> str:
    """
    Emit the final markdown: frontmatter block (if any) + body.

    When `fm.data` is empty the block is omitted entirely — we don't
    emit `---\\n---\\n` just to say "there's no metadata." Body is
    passed through unchanged.

    PyYAML's `safe_dump` handles quoting, escaping, unicode. Keys stay
    in declaration order (relies on Python 3.7+ insertion-ordered
    dicts); `sort_keys=False` keeps the user's author-set keys from
    being reshuffled each regen.
    """
    if not fm.data:
        return body

    yaml_text = yaml.safe_dump(
        fm.data,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    )
    # safe_dump emits a trailing newline, so the close fence sits on its
    # own line without needing an explicit \n.
    return f"{FENCE}\n{yaml_text}{FENCE}\n{body}"
