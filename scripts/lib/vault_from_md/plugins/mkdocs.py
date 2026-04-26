"""
Copyright 2026 Daniel Smith — Apache 2.0

MkDocs (Python-Markdown / Material) transforms.

Primary target is the Python-Markdown admonition extension, which
MkDocs-Material uses heavily:

    !!! note                          → > [!note]
        content here                      > content here

    !!! warning "Pay Attention"       → > [!warning] Pay Attention
        Something bad                     > Something bad

    ??? note                          → > [!note]-         (collapsed)
        hidden-by-default

    ???+ note                         → > [!note]+         (collapsible, open)
        visible-by-default collapsible

Also:
    [TOC]                             → (stripped — Obsidian has an outline pane)

MkDocs-Material extensions we deliberately pass through (too
format-specific for regex, would need HTML-fragment parsing):
    - Content tabs (`=== "Tab"`)
    - Code annotations (the inline `(1)` / `1. { .annotate }` dance)
    - Content grids

Idempotent: rewritten admonitions become Obsidian callouts that don't
match the `!!!` or `???` patterns again. `[TOC]` strip is permanent.
"""

from __future__ import annotations

import re


# --- Patterns -------------------------------------------------------------

# Admonition header + indented content block. Captures:
#   1. marker: one of `!!!`, `???`, `???+`
#   2. type:   `note`, `warning`, etc. (any word)
#   3. title:  optional quoted string
#   4. body:   indented content lines (may include blank lines)
#
# Content lines are 4-space or tab-indented. Blank lines within an
# admonition are permitted and retain the callout's contiguity. The
# block ends at the first non-indented, non-blank line (or EOF).
_ADMONITION_RE = re.compile(
    r"""
    ^(!!!|\?\?\?\+?)          # group 1: marker
    [ \t]+(\w+)               # group 2: type (non-capturing space; word)
    (?:[ \t]+"([^"]*)")?      # group 3: optional quoted title
    [ \t]*\n                  # end of header line
    (                         # group 4: content block
        (?:
            (?:[ ]{4}|\t).*\n?   # indented content line
            |
            [ \t]*\n             # blank line inside admonition
        )*
    )
    """,
    re.MULTILINE | re.VERBOSE,
)

# `[TOC]` on its own line → strip. Leading/trailing whitespace on the
# line is tolerated; the newline too.
_TOC_RE = re.compile(r"^[ \t]*\[TOC\][ \t]*\n?", re.MULTILINE)


# --- Entry point ----------------------------------------------------------


def transform(body: str) -> str:
    """Apply MkDocs transforms. Idempotent."""
    body = _ADMONITION_RE.sub(_admonition_sub, body)
    body = _TOC_RE.sub("", body)
    return body


# --- Per-pattern substitution ---------------------------------------------


def _admonition_sub(m: re.Match[str]) -> str:
    marker = m.group(1)
    kind = m.group(2).lower()
    title = m.group(3)  # may be None
    raw_body = m.group(4) or ""

    # Obsidian callout modifier:
    #   `!!!`  → no suffix  (standard)
    #   `???`  → `-` suffix (collapsed)
    #   `???+` → `+` suffix (expanded-collapsible)
    if marker.startswith("!!!"):
        suffix = ""
    elif marker == "???+":
        suffix = "+"
    else:  # "???"
        suffix = "-"

    header = f"> [!{kind}]{suffix}"
    if title:
        header += f" {title}"

    body_out = _dedent_and_quote(raw_body)
    if body_out:
        return f"{header}\n{body_out}\n"
    # Admonition with empty body — just the header.
    return f"{header}\n"


# --- Helpers --------------------------------------------------------------


def _dedent_and_quote(text: str) -> str:
    """
    Strip the first four spaces (or one tab) from each content line
    and prefix every line with the blockquote marker. Blank lines get
    a bare `>` so Obsidian keeps the callout contiguous.
    """
    lines = text.rstrip("\n").split("\n")
    out: list[str] = []
    for line in lines:
        if line.startswith("    "):
            stripped = line[4:]
        elif line.startswith("\t"):
            stripped = line[1:]
        else:
            # Blank-line continuation or less-indented edge case.
            stripped = line.strip()
        if stripped:
            out.append(f"> {stripped}")
        else:
            out.append(">")
    # Trim trailing all-blank quote markers so we don't emit `>\n>\n>`
    # tails.
    while out and out[-1] == ">":
        out.pop()
    return "\n".join(out)
