"""
Copyright 2026 Daniel Smith — Apache 2.0

Feed-specific security guards.

The threat model for `feed_to_md.py`:

- **Feed XML is attacker-controlled.** Anyone can hand us a crafted
  `.xml` to process (scraped archive, shared link, pipe from a feed
  fetcher). We can't trust the content.
- **feedparser is already safe** against XXE / entity expansion
  bombs — it rejects external-entity references and caps expansion
  upstream. We don't re-solve those.
- **markdownify strips `<script>`, `<iframe>`, and event-handler
  attributes** when converting HTML body → markdown. It does NOT
  neutralise dangerous URL schemes (`javascript:`, `data:text/html`)
  in link/image destinations — those pass through as
  `[text](javascript:…)`. We close that gap by running the output
  through `vault_from_md.sanitize.strip_unsafe_html` before writing.
- **Title / author / tag fields** can contain HTML fragments a
  publisher injected. They'd end up in YAML frontmatter unchanged.
  `vault_from_md.sanitize.strip_frontmatter_html` neutralises those.
- **Filenames are derived from titles.** A title can be `CON`,
  `.htaccess`, or `../escape`. Slugification handles most of this
  by stripping non-word characters, but Windows reserved names and
  leading-dot dotfiles still need explicit guards.
- **Resource exhaustion**: a 10 GB feed XML, or a feed with 2M
  items, or one item with a 500 MB body. Caps on all three.

Strict by default. Opt-out via explicit flags, mirroring the main
vault converter's posture.
"""

from __future__ import annotations

import re
from pathlib import Path


# --- Size / count caps ----------------------------------------------------


# Maximum accepted feed XML size. Real-world RSS archives sit in the
# tens of MB even for decade-long blogs. 100 MB is a very generous
# upper bound that still prevents a crafted multi-GB "feed" from
# being read into memory. Overridable via CLI `--max-feed-size MB`.
MAX_FEED_BYTES = 100 * 1024 * 1024  # 100 MB

# Maximum items per feed. WordPress archive exports routinely hit
# 2–5k posts; 50k covers any realistic archive while still capping a
# crafted "million-item" feed. Overridable via CLI `--max-items N`.
MAX_ITEMS = 50_000


# --- Filename hardening ---------------------------------------------------


# Windows disallows these as bare filenames (case-insensitive), even
# with an extension. Linux/macOS don't care, but the same output
# directory may be synced or opened on Windows — play it safe.
#   https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file
_WINDOWS_RESERVED = frozenset({
    "con", "prn", "aux", "nul",
    "com1", "com2", "com3", "com4", "com5",
    "com6", "com7", "com8", "com9",
    "lpt1", "lpt2", "lpt3", "lpt4", "lpt5",
    "lpt6", "lpt7", "lpt8", "lpt9",
})

# Control characters and null bytes — Unicode category `Cc`. The
# slugifier's `[^\w\s-]` strip would already drop most, but the
# explicit guard is cheaper than auditing every regex change in
# future.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x1f\x7f]")


def harden_filename(name: str) -> str:
    """
    Given a `YYYY-MM-DD-slug.md`-shape filename (or `undated-slug.md`),
    return a name safe to write across platforms.

    Guards applied:
      - Strip control characters / null bytes.
      - Reject Windows reserved stems (`CON`, `PRN`, …) by prefixing
        an underscore: `CON.md` → `_CON.md`.
      - Strip leading dots so the output doesn't become a hidden file
        on Unix or crash a Windows file explorer that won't show them.

    Empty or entirely stripped input falls back to `untitled.md`.
    """
    name = _CONTROL_CHARS_RE.sub("", name)
    # Strip leading dots — a title starting with `.` would otherwise
    # produce a hidden file.
    while name.startswith("."):
        name = name[1:]
    if not name:
        return "untitled.md"

    # The reserved-name check uses the stem (the part before `.md`,
    # minus the date prefix). `2026-04-15-con.md` → `con` → reserved.
    stem_parts = name.rsplit(".", 1)
    stem = stem_parts[0]
    # Strip a leading `YYYY-MM-DD-` date prefix for the reserved check,
    # because only the "human" portion of the filename is what Windows
    # sees as the "base name".
    match = re.match(r"^\d{4}-\d{2}-\d{2}-(.+)$", stem)
    base_for_check = match.group(1) if match else stem
    if base_for_check.lower() in _WINDOWS_RESERVED:
        # Prepend `_` to disambiguate. Keeps the date prefix intact
        # so files still sort chronologically.
        if match:
            return f"{stem[:10]}-_{base_for_check}.md"
        return f"_{name}"

    return name


# --- URL-scheme validation ------------------------------------------------


# Schemes that should NEVER appear in a feed's `<link>` / `<guid>` /
# `<feed url>` fields. Reading a feed shouldn't permit shipping a
# fragment that auto-executes when a downstream tool interprets the
# URL as clickable. We replace the URL with `#` and keep the field
# (so the metadata structure is intact).
_DANGEROUS_URL_SCHEME_RE = re.compile(
    r"^\s*(?:javascript|vbscript|livescript|data):",
    re.IGNORECASE,
)


def is_dangerous_url(url: str) -> bool:
    """Return True if `url` carries a scheme that shouldn't be clicked
    or interpreted. Empty strings are safe (just absence)."""
    if not url:
        return False
    return bool(_DANGEROUS_URL_SCHEME_RE.match(url))


def neutralise_url(url: str) -> str:
    """Return a safe placeholder URL (`#`) when `url` is dangerous,
    else pass through unchanged."""
    return "#" if is_dangerous_url(url) else url


# --- Feed-size guard ------------------------------------------------------


class FeedTooLargeError(Exception):
    """Raised when the feed XML file exceeds `max_feed_bytes`.

    Carried on an exception rather than a silent truncation because
    truncated XML parses as malformed and the user needs to know the
    cap is what rejected it, not some mysterious parse failure.
    """


def check_feed_size(path: Path, *, max_feed_bytes: int = MAX_FEED_BYTES) -> None:
    """
    Stat the feed file and raise `FeedTooLargeError` if it exceeds
    the cap. Called *before* `read_bytes()` so a crafted multi-GB
    XML never touches memory.
    """
    try:
        size = path.stat().st_size
    except OSError:
        # Let the caller's `read_bytes` surface the I/O error with a
        # more specific message — we only gate on size here.
        return
    if size > max_feed_bytes:
        raise FeedTooLargeError(
            f"feed file is {size / (1024 * 1024):.1f} MB, "
            f"exceeds cap of {max_feed_bytes / (1024 * 1024):.0f} MB. "
            f"Rerun with --max-feed-size N to raise the cap if you trust "
            f"the source."
        )
