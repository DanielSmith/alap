"""
Copyright 2026 Daniel Smith — Apache 2.0

Rewrite standard Markdown links to Obsidian wikilinks — but only where
it makes sense:

    [text](other-doc.md)          → [[other-doc|text]]
    [text](other-doc.md#heading)  → [[other-doc#heading|text]]
    [read here](other-doc.md)     → [[other-doc|read here]]
    [other-doc](other-doc.md)     → [[other-doc]]          (alias elided)

Left alone (ever):
  - External URLs (http, https, mailto, tel, ftp, …)
  - Pure-fragment anchors ([text](#section))
  - Targets outside the converted set (cross-vault, broken, external md)
  - Image syntax `![alt](path.png)` — image refs stay standard Markdown
  - Contents of existing `[[wikilinks]]`, fenced code blocks, inline code

Target form: **path-rooted from source**, not basename. The alap docs
corpus has colliding basenames (`framework-guides/README.md`,
`packages/README.md`, `api-reference/lightbox.md`,
`cookbook/lightbox.md`), so basename-form wikilinks would be ambiguous.
Obsidian resolves path-form wikilinks unambiguously.

Idempotent: running this on its own output is a no-op because existing
`[[wikilinks]]` are stashed before the link regex runs and restored
after.
"""

from __future__ import annotations

import re
import urllib.parse
from pathlib import Path, PurePosixPath


# --- Region protection regexes --------------------------------------------

# Fenced code blocks. Covers ``` and ~~~ fences, any info string, any
# indent level. Non-greedy body. Good-enough for the docs/ corpus and
# most real-world markdown; pathological nested fences with more
# backticks are rare in documentation.
_FENCE_CODE_RE = re.compile(
    r"^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n.*?^[ \t]*(?P=fence)[ \t]*$",
    re.MULTILINE | re.DOTALL,
)

# Inline code: `one backtick span`. Does not cross newlines.
_INLINE_CODE_RE = re.compile(r"`[^`\n]+`")

# Existing wikilinks — skip these so we don't double-process the output
# of a previous run. Permits `[[foo|bar]]` aliases and `[[foo#heading]]`.
_WIKILINK_RE = re.compile(r"\[\[[^\]\n]+\]\]")

# Standard Markdown link. Negative lookbehind on `!` excludes image
# syntax `![alt](path.png)` — images stay as standard Markdown per the
# plan (Obsidian reads them fine).
_MD_LINK_RE = re.compile(r"(?<!!)\[([^\]\n]+)\]\(([^)\n]+)\)")

# External URL schemes we never rewrite.
_EXTERNAL_SCHEMES = ("http:", "https:", "mailto:", "tel:", "ftp:", "ftps:", "file:")

# NUL-delimited placeholder used to stash protected regions. NUL is
# safe because it never appears in legitimate markdown.
_PLACEHOLDER_FMT = "\x00{}\x00"
_PLACEHOLDER_RE = re.compile(r"\x00(\d+)\x00")


def rewrite_links(
    body: str,
    *,
    current_file_rel: Path,
    converted_set: frozenset[Path],
) -> str:
    """
    Rewrite in-scope Markdown links to wikilinks.

    Args:
        body: Markdown body text (no frontmatter block — caller strips
            that before calling). Returned unchanged if no matches.
        current_file_rel: Relative path of the current source file,
            used to resolve relative links in the body.
        converted_set: The full set of relative paths that exist in
            the converted output. A link target must land inside this
            set to be rewritten; anything else passes through.

    Returns:
        The body with eligible links converted. Idempotent: re-running
        on the output is a no-op because existing `[[…]]` are stashed
        and restored without modification.
    """
    placeholders: list[str] = []

    def stash(match: re.Match[str]) -> str:
        idx = len(placeholders)
        placeholders.append(match.group(0))
        return _PLACEHOLDER_FMT.format(idx)

    # Protect regions in a specific order: fenced code first (broadest),
    # then inline code, then wikilinks. Any link text inside a
    # protected region is never seen by the rewrite regex.
    work = _FENCE_CODE_RE.sub(stash, body)
    work = _INLINE_CODE_RE.sub(stash, work)
    work = _WIKILINK_RE.sub(stash, work)

    # Rewrite markdown links in the exposed remainder.
    current_parts = current_file_rel.parent.parts

    def rewrite_one(match: re.Match[str]) -> str:
        return _maybe_rewrite(match, current_parts, converted_set)

    work = _MD_LINK_RE.sub(rewrite_one, work)

    # Restore stashed regions verbatim.
    def restore(match: re.Match[str]) -> str:
        return placeholders[int(match.group(1))]

    return _PLACEHOLDER_RE.sub(restore, work)


def _maybe_rewrite(
    match: re.Match[str],
    current_dir_parts: tuple[str, ...],
    converted_set: frozenset[Path],
) -> str:
    """
    Decide whether a single `[text](target)` should become a wikilink.
    Returns the original match string on any "leave alone" path.
    """
    original = match.group(0)
    text = match.group(1)
    target = match.group(2)

    # External schemes: http, https, mailto, tel, … — never rewrite.
    lower = target.lower()
    if any(lower.startswith(s) for s in _EXTERNAL_SCHEMES):
        return original
    if "://" in target:
        # Catch-all for schemes we didn't enumerate (git+https, etc.).
        return original

    # Pure fragment like [text](#section) — an in-file anchor. Leave
    # alone; Obsidian handles them as standard Markdown.
    if target.startswith("#"):
        return original

    # Split the target into path and fragment.
    if "#" in target:
        path_str, fragment = target.split("#", 1)
    else:
        path_str, fragment = target, ""

    # URL-decode path component (`%20` → space, etc.). Fragment stays
    # as written — Obsidian heading links use raw characters.
    path_str = urllib.parse.unquote(path_str)
    if not path_str:
        return original

    # Resolve relative to the current file's directory, normalizing
    # `.` and `..`. Escape above source root → leave as-is.
    resolved = _resolve_posix(current_dir_parts, path_str)
    if resolved is None:
        return original

    # Normalize markdown-family extensions to `.md` before the set
    # lookup — a `[x](foo.mdx)` link should resolve to the dest-side
    # `foo.md` entry, since convert.py renames extensions on write.
    resolved_normalized = _normalize_md_suffix(resolved)
    resolved_path = Path(*resolved_normalized.parts)
    if resolved_path not in converted_set:
        return original

    # Drop the markdown extension for the wikilink target — Obsidian
    # convention is `[[foo]]` for `foo.md`. Handle any of the
    # recognized flavours the original link may have used.
    target_parts = list(resolved.parts)
    last = target_parts[-1]
    lower = last.lower()
    for ext in (".markdown", ".mdx", ".md"):
        if lower.endswith(ext):
            target_parts[-1] = last[: -len(ext)]
            break
    target_str = "/".join(target_parts)

    # Attach fragment if present. Obsidian uses `[[note#heading|alias]]`.
    wikilink_target = f"{target_str}#{fragment}" if fragment else target_str

    # Elide the alias when the link text is the same as the basename or
    # full path — avoids noisy `[[foo|foo]]` output.
    basename = target_parts[-1]
    stripped = text.strip()
    if stripped == basename or stripped == target_str:
        return f"[[{wikilink_target}]]"
    return f"[[{wikilink_target}|{text}]]"


def _normalize_md_suffix(p: PurePosixPath) -> PurePosixPath:
    """
    Rewrite any markdown-family extension (`.md`, `.mdx`, `.markdown`)
    to `.md`, leaving other suffixes alone. Used before the
    converted-set lookup so that `[x](foo.mdx)` resolves against the
    destination-side `foo.md` entry.
    """
    suffix = p.suffix.lstrip(".").lower()
    if suffix in {"md", "mdx", "markdown"}:
        return p.with_suffix(".md")
    return p


def _resolve_posix(
    base_dir_parts: tuple[str, ...],
    rel: str,
) -> PurePosixPath | None:
    """
    Resolve `rel` against `base_dir_parts` using posix-style semantics:
    joins, normalizes `.` and `..`, and rejects escape-above-root.

    Returns None when the path tries to escape above source root (any
    `..` that would pop an empty stack). The caller treats None as
    "leave the link alone."
    """
    combined = list(base_dir_parts) + rel.split("/")
    out: list[str] = []
    for part in combined:
        if part == "..":
            if not out:
                return None  # escaped above root
            out.pop()
        elif part and part != ".":
            out.append(part)
    if not out:
        return None
    return PurePosixPath(*out)
