"""
Copyright 2026 Daniel Smith — Apache 2.0

Parse a feed XML file into a stable list of `FeedItem`s.

`feedparser` (the de facto Python RSS/Atom parser) hides the shape
differences between RSS 0.92, RSS 2.0, Atom 1.0, and the myriad
extensions publishers layer on top. We normalize its output into a
single dataclass so `render.py` (and tests) have one shape to code
against.

**Body selection order** — reflects what publishers actually ship:
    1. `content:encoded` (RSS) or `<content>` (Atom) — full article
    2. `summary` / `description` — often truncated, but present when
       content isn't.
    3. Empty string — legitimate (a bookmark-only feed), not an error.

**Dedupe by GUID** happens at parse time (within one file). GUIDs are
the publisher's canonical identity, so two items sharing a GUID in the
same file are legitimate duplicates we can drop. Cross-run dedup (the
user running the script twice against the same file) is out of scope
for v1 — the user manages the output directory.

**Dependency.** `feedparser` — pure Python, stdlib-plus. Install with
`pip3 install --user feedparser` or via `uv`/venv.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import feedparser
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "feedparser is required for the feed-to-markdown converter. "
        "Install with `pip3 install --user feedparser` or via `uv`/venv. "
        "See scripts/README.md."
    ) from e

from feed_from_xml.security import MAX_ITEMS, check_feed_size


# --- Data shape ------------------------------------------------------------


@dataclass(frozen=True)
class FeedMeta:
    """Top-level feed metadata (shared by all items in a file)."""
    title: str = ""
    url: str = ""
    description: str = ""


@dataclass(frozen=True)
class FeedItem:
    """One normalized feed entry."""
    title: str
    url: str                # canonical item URL (link)
    guid: str               # stable identifier; falls back to url, then title
    published: datetime | None
    author: str
    tags: tuple[str, ...]
    body_html: str          # preferred full content, else summary, else ""
    body_is_summary: bool   # True if we fell back to description/summary


@dataclass(frozen=True)
class ParseResult:
    """Outcome of parsing one XML file."""
    meta: FeedMeta
    items: tuple[FeedItem, ...]
    malformed: bool = False         # bozo=True AND no items recovered
    duplicates_dropped: int = 0
    items_capped: bool = False      # True when the item-count cap fired
    warnings: tuple[str, ...] = field(default_factory=tuple)


# --- Parse -----------------------------------------------------------------


def parse_file(
    path: Path,
    *,
    max_feed_bytes: int | None = None,
    max_items: int = MAX_ITEMS,
) -> ParseResult:
    """
    Parse one feed XML file into a `ParseResult`. Never raises on
    malformed XML — returns `ParseResult(malformed=True, items=())`
    with a warning. Raises only for OS-level read errors (missing
    file, permission denied) or a feed-too-large policy violation,
    so the CLI can print a clear message.
    """
    # Size gate BEFORE reading — a crafted multi-GB "feed" never hits
    # memory. `check_feed_size` raises FeedTooLargeError on violation.
    if max_feed_bytes is not None:
        check_feed_size(path, max_feed_bytes=max_feed_bytes)
    # feedparser accepts bytes directly; this avoids any encoding
    # detection we'd otherwise have to redo ourselves.
    data = path.read_bytes()
    return parse_bytes(data, max_items=max_items)


def parse_bytes(data: bytes, *, max_items: int = MAX_ITEMS) -> ParseResult:
    """Parse raw XML bytes. Kept separate from `parse_file` so tests can
    feed fixtures without touching the filesystem."""
    parsed = feedparser.parse(data)

    warnings: list[str] = []

    # feedparser sets `bozo=1` for anything from "missing encoding"
    # to "completely malformed". Treat it as malformed only when no
    # entries were recovered — a "bozo" feed with working entries is
    # still useful.
    entries = parsed.get("entries") or []
    feed_data = parsed.get("feed") or {}
    version = str(parsed.get("version") or "")

    # "Malformed" here means one of two things:
    #   1. feedparser itself flagged bozo AND recovered no entries, OR
    #   2. the XML is well-formed but not a feed at all (no version
    #      string, no entries, empty feed metadata) — e.g. a random
    #      XML document passed by mistake.
    if parsed.get("bozo") and not entries:
        bozo_exc = parsed.get("bozo_exception")
        warnings.append(
            f"malformed feed (no items recovered): {bozo_exc}"
            if bozo_exc else "malformed feed (no items recovered)"
        )
        return ParseResult(
            meta=FeedMeta(),
            items=(),
            malformed=True,
            warnings=tuple(warnings),
        )
    if not version and not entries and not feed_data:
        warnings.append("not a recognised feed (no version, no entries)")
        return ParseResult(
            meta=FeedMeta(),
            items=(),
            malformed=True,
            warnings=tuple(warnings),
        )

    meta = _extract_feed_meta(feed_data)

    items: list[FeedItem] = []
    seen_guids: set[str] = set()
    duplicates = 0
    items_capped = False

    for entry in entries:
        # Item-count cap. Feeds with more than `max_items` are almost
        # always crafted or catastrophically broken — normal archives
        # top out in the low thousands. Stopping at the cap is
        # preferable to OOM'ing on a malicious `<item>` repeat.
        if len(items) >= max_items:
            items_capped = True
            warnings.append(
                f"item cap reached ({max_items}); additional items dropped. "
                f"Rerun with --max-items N to raise the cap if you trust "
                f"the source."
            )
            break
        item = _extract_item(entry)
        if not item:
            continue
        # Dedupe within the same file by GUID. GUID may be the item
        # URL or title when nothing stable exists — still a legitimate
        # dedupe key.
        if item.guid in seen_guids:
            duplicates += 1
            continue
        seen_guids.add(item.guid)
        items.append(item)

    return ParseResult(
        meta=meta,
        items=tuple(items),
        malformed=False,
        duplicates_dropped=duplicates,
        items_capped=items_capped,
        warnings=tuple(warnings),
    )


# --- Extraction helpers ---------------------------------------------------


def _extract_feed_meta(feed_data: Any) -> FeedMeta:
    """Pull top-level feed metadata. Empty strings — not None — so
    render code can treat it as plain text without None-checks."""
    return FeedMeta(
        title=_coerce_str(feed_data.get("title")),
        url=_coerce_str(feed_data.get("link")),
        description=_coerce_str(feed_data.get("subtitle") or feed_data.get("description")),
    )


def _extract_item(entry: Any) -> FeedItem | None:
    """
    Convert a feedparser entry dict into a `FeedItem`. Returns None if
    the entry is so minimal it can't be rendered usefully (no title
    AND no link AND no body).
    """
    title = _coerce_str(entry.get("title")).strip()
    url = _coerce_str(entry.get("link")).strip()

    body_html, body_is_summary = _extract_body(entry)

    if not title and not url and not body_html:
        return None

    # `id` is the canonical GUID in feedparser; falls through to the
    # link, then to the title, so we always have *something* to dedupe
    # against. This order matches what publishers intend as identity.
    guid_raw = entry.get("id") or entry.get("guid") or url or title
    guid = _coerce_str(guid_raw).strip()

    published = _extract_datetime(entry)
    author = _coerce_str(
        entry.get("author") or _author_from_details(entry.get("authors"))
    ).strip()
    tags = _extract_tags(entry.get("tags"))

    return FeedItem(
        title=title or "(untitled)",
        url=url,
        guid=guid or title or "untitled",
        published=published,
        author=author,
        tags=tags,
        body_html=body_html,
        body_is_summary=body_is_summary,
    )


def _extract_body(entry: Any) -> tuple[str, bool]:
    """
    Pick the richest body available.

    feedparser exposes `content` as a list of dicts (each with `value`
    and `type`) for `content:encoded` / Atom `<content>`. `summary` /
    `description` appear as a plain string on the entry.
    """
    content_list = entry.get("content") or []
    if isinstance(content_list, list):
        for item in content_list:
            if not isinstance(item, dict):
                continue
            value = _coerce_str(item.get("value"))
            if value:
                return value, False

    summary = _coerce_str(entry.get("summary"))
    if summary:
        return summary, True
    description = _coerce_str(entry.get("description"))
    if description:
        return description, True
    return "", False


def _extract_datetime(entry: Any) -> datetime | None:
    """
    feedparser resolves `pubDate` / `<published>` / `<updated>` into a
    `time.struct_time` at `published_parsed` / `updated_parsed`. We
    coerce to a timezone-aware `datetime` (UTC — the struct_time is
    already normalized to UTC by feedparser).
    """
    for key in ("published_parsed", "updated_parsed"):
        parsed = entry.get(key)
        if parsed is None:
            continue
        try:
            # struct_time is 9-tuple (year, month, day, h, m, s, wday, yday, isdst);
            # first 6 are what we need, always in UTC per feedparser convention.
            return datetime(*parsed[:6], tzinfo=timezone.utc)
        except (TypeError, ValueError):
            continue
    return None


def _extract_tags(tags_field: Any) -> tuple[str, ...]:
    """
    feedparser represents `<category>` / Atom `<category>` as a list
    of dicts, each with a `term` key. We strip, lowercase, dedupe
    (preserving first-seen order), and filter empties.
    """
    if not isinstance(tags_field, list):
        return ()
    out: list[str] = []
    seen: set[str] = set()
    for tag in tags_field:
        if not isinstance(tag, dict):
            continue
        term = _coerce_str(tag.get("term")).strip()
        if not term:
            continue
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(term)
    return tuple(out)


def _author_from_details(authors: Any) -> str:
    """Fall back to the first author's name from the `authors` list
    when `author` (scalar) is absent. Atom feeds often put it there."""
    if not isinstance(authors, list):
        return ""
    for author in authors:
        if not isinstance(author, dict):
            continue
        name = _coerce_str(author.get("name")).strip()
        if name:
            return name
    return ""


def _coerce_str(value: Any) -> str:
    """Every feedparser field can be None, a string, or some odd shape
    depending on what the publisher emitted. Centralize the coercion
    so every extractor is None-safe."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)
