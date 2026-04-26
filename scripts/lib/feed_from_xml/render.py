"""
Copyright 2026 Daniel Smith — Apache 2.0

Render `FeedItem`s into one markdown file per item.

Shape of each output file:

    ---
    title: The Post Title
    item_url: https://example.com/the-post
    published: 2026-04-15T09:00:00+00:00
    author: Jane Doe
    tags: [programming, python]
    feed_title: Example Blog
    feed_url: https://example.com/feed.xml
    guid: https://example.com/?p=123
    ---

    Full content with paragraphs and [links](https://...) rendered as markdown.

Downstream, `vault_convert.py` picks these up as ordinary markdown:
- frontmatter keys are preserved additively (user keys win)
- `vault_convert` adds `source`/`modified` without colliding with our
  feed-native keys (`item_url`, `feed_url`, `published`, …)

**Filename shape.** `YYYY-MM-DD-slug.md` — date prefix from the
published timestamp (UTC, so ordering is stable across runs), slug
derived from the title. Missing-date fallback: use "undated-" prefix
so the item is still distinguishable but visibly unanchored in time.

**HTML → markdown.** `markdownify` handles the common surface: lists,
blockquotes, headers, inline formatting, links, images, code blocks.
We pass `heading_style="ATX"` so output is `#` / `##` / `###` rather
than `---` underlines, and `bullets="-"` to get one consistent bullet
char across the corpus.

**Dependency.** `markdownify` — small, focused HTML→markdown lib.
Install with `pip3 install --user markdownify` or via `uv`/venv.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import markdownify as md_convert
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "markdownify is required for the feed-to-markdown converter. "
        "Install with `pip3 install --user markdownify` or via `uv`/venv. "
        "See scripts/README.md."
    ) from e

try:
    import yaml
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "pyyaml is required for the feed-to-markdown converter. "
        "Install with `pip3 install --user pyyaml` or via `uv`/venv. "
        "See scripts/README.md."
    ) from e

from feed_from_xml.parse import FeedItem, FeedMeta
from feed_from_xml.security import (
    harden_filename,
    is_dangerous_url,
    neutralise_url,
)
from vault_from_md.sanitize import (
    SanitizeReport,
    strip_frontmatter_html,
    strip_unsafe_html,
)


# --- Filename slug --------------------------------------------------------


# Filenames are case-sensitive on some platforms and case-preserving on
# others; lowercase is the lowest-friction choice. `-` is the word
# separator; anything outside `[a-z0-9-]` is dropped or replaced.
_SLUG_SUBSTITUTIONS = re.compile(r"[^\w\s-]", re.UNICODE)
_SLUG_COLLAPSE_WS = re.compile(r"[-\s]+")

# Guard against pathological titles. 80 chars is enough to remain
# readable after the `YYYY-MM-DD-` prefix without risking path-length
# issues on Windows (260-char MAX_PATH, minus ancestor path budget).
_SLUG_MAX_LEN = 80


def _slugify(text: str) -> str:
    """
    Lowercase ASCII slug. Unicode is normalised (NFKD) and diacritics
    stripped so `café` becomes `cafe`. Non-alphanumeric runs collapse
    to a single `-`. Empty input returns `untitled`.
    """
    if not text:
        return "untitled"
    # Normalize accents → ASCII where possible.
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = _SLUG_SUBSTITUTIONS.sub("", text)
    text = _SLUG_COLLAPSE_WS.sub("-", text).strip("-")
    if not text:
        return "untitled"
    return text[:_SLUG_MAX_LEN].rstrip("-") or "untitled"


def filename_for(item: FeedItem) -> str:
    """
    Build the output filename for one item. Shape:
      - `YYYY-MM-DD-slug.md` when `published` is set
      - `undated-slug.md` otherwise

    Runs through `harden_filename` as a final step so Windows reserved
    names, leading dots, and control chars can't slip through from an
    adversarial title.
    """
    slug = _slugify(item.title)
    if item.published is not None:
        date_prefix = item.published.strftime("%Y-%m-%d")
        raw = f"{date_prefix}-{slug}.md"
    else:
        raw = f"undated-{slug}.md"
    return harden_filename(raw)


# --- Rendering ------------------------------------------------------------


@dataclass(frozen=True)
class RenderedItem:
    """Pairing of filename + file contents for one item."""
    filename: str
    content: str
    body_report: SanitizeReport = SanitizeReport()
    frontmatter_report: SanitizeReport = SanitizeReport()
    dangerous_urls_in_frontmatter: int = 0


def render_item(
    item: FeedItem,
    feed_meta: FeedMeta,
    *,
    allow_unsafe_html: bool = False,
    allow_frontmatter_html: bool = False,
) -> RenderedItem:
    """
    Produce the markdown file contents (frontmatter + body) for one
    feed item. Does not touch the filesystem — callers wire I/O.

    Strict defaults (match `vault_convert.py`'s posture):
      - body HTML → markdown → sanitised to neutralise `javascript:`/
        `data:text/html` URLs markdownify leaves in links, plus any
        stray `<script>`/`<iframe>` that survived conversion.
      - frontmatter string values stripped of any HTML tags; URL
        fields (`item_url`, `feed_url`, `guid`) neutralised when they
        carry a dangerous scheme.

    `allow_unsafe_html=True` preserves dangerous body patterns;
    `allow_frontmatter_html=True` preserves HTML-in-frontmatter.
    """
    frontmatter_data, dangerous_url_count = _build_frontmatter(item, feed_meta)
    if allow_frontmatter_html:
        frontmatter_report = SanitizeReport()
    else:
        frontmatter_data, frontmatter_report = strip_frontmatter_html(frontmatter_data)

    frontmatter_yaml = yaml.safe_dump(
        frontmatter_data,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    )

    body_md = _html_to_markdown(item.body_html)
    if allow_unsafe_html:
        body_report = SanitizeReport()
    else:
        body_md, body_report = strip_unsafe_html(body_md)

    content = f"---\n{frontmatter_yaml}---\n\n{body_md}"
    # One trailing newline; don't let markdownify leave a double.
    if not content.endswith("\n"):
        content += "\n"
    return RenderedItem(
        filename=filename_for(item),
        content=content,
        body_report=body_report,
        frontmatter_report=frontmatter_report,
        dangerous_urls_in_frontmatter=dangerous_url_count,
    )


def render_items(
    items: tuple[FeedItem, ...],
    feed_meta: FeedMeta,
    *,
    allow_unsafe_html: bool = False,
    allow_frontmatter_html: bool = False,
) -> tuple[tuple[RenderedItem, list[str]], ...]:
    """
    Render every item and resolve filename collisions.

    Two items can legitimately share a filename (same title, same
    date) when the feed carries near-duplicate entries (update
    republishes, CMS imports). We suffix the collision with
    `-2.md`, `-3.md`, …, preserving the first item's unsuffixed
    filename. Returns the rendered items alongside a per-item list
    of warnings (currently: collision notes) so the CLI can surface
    them.
    """
    rendered: list[tuple[RenderedItem, list[str]]] = []
    used: dict[str, int] = {}
    for item in items:
        r = render_item(
            item,
            feed_meta,
            allow_unsafe_html=allow_unsafe_html,
            allow_frontmatter_html=allow_frontmatter_html,
        )
        warnings: list[str] = []
        base = r.filename
        count = used.get(base, 0)
        if count:
            stem = base[:-3] if base.endswith(".md") else base
            suffixed = f"{stem}-{count + 1}.md"
            warnings.append(
                f"filename collision on '{base}' — renamed to '{suffixed}'"
            )
            r = RenderedItem(
                filename=suffixed,
                content=r.content,
                body_report=r.body_report,
                frontmatter_report=r.frontmatter_report,
                dangerous_urls_in_frontmatter=r.dangerous_urls_in_frontmatter,
            )
        used[base] = count + 1
        rendered.append((r, warnings))
    return tuple(rendered)


# --- Frontmatter ----------------------------------------------------------


def _build_frontmatter(
    item: FeedItem,
    feed_meta: FeedMeta,
) -> tuple[dict[str, Any], int]:
    """
    Assemble the frontmatter dict and return `(data, dangerous_url_count)`.

    Order matters — it's what users see at the top of each note.
    Title first, URLs, date, authorship, classification, provenance.
    `yaml.safe_dump(sort_keys=False)` preserves this order.

    Empty-string fields are omitted rather than emitted as `title: ''`;
    that keeps the frontmatter visually tight and avoids misleading
    empty metadata.

    URL-carrying fields (`item_url`, `feed_url`, `guid` when opaque
    URI) are neutralised to `#` if they carry a dangerous scheme;
    the count is reported for the post-convert CLI summary.
    """
    out: dict[str, Any] = {}
    dangerous_urls = 0
    if item.title:
        out["title"] = item.title
    if item.url:
        neutral = neutralise_url(item.url)
        if neutral != item.url:
            dangerous_urls += 1
        out["item_url"] = neutral
    if item.published is not None:
        # ISO 8601 with timezone (`+00:00`) — unambiguous, sortable,
        # parseable by any downstream tool.
        out["published"] = item.published.isoformat()
    if item.author:
        out["author"] = item.author
    if item.tags:
        # Normalise tag strings for Obsidian + Alap: `-` is the WITHOUT
        # operator, so hyphens become underscores. Whitespace → `_`
        # for the same reason.
        out["tags"] = [_normalise_tag(t) for t in item.tags]
    if feed_meta.title:
        out["feed_title"] = feed_meta.title
    if feed_meta.url:
        neutral = neutralise_url(feed_meta.url)
        if neutral != feed_meta.url:
            dangerous_urls += 1
        out["feed_url"] = neutral
    if item.guid and item.guid != item.url:
        # Skip when guid === url; avoids duplicate noise. Keep it
        # when publishers use opaque IDs (`tag:example.com,2026:123`).
        # Only URL-shaped GUIDs (http/https) get URL-scheme validation —
        # `tag:` URIs are legitimate identifiers and shouldn't be
        # neutralised. The cheap heuristic: only flag when the value
        # matches a dangerous scheme explicitly.
        if is_dangerous_url(item.guid):
            dangerous_urls += 1
            out["guid"] = "#"
        else:
            out["guid"] = item.guid
    if item.body_is_summary:
        # Flag the distinction so downstream tools can decide whether
        # to fetch the full article via `item_url`.
        out["body_source"] = "summary"
    return out, dangerous_urls


def _normalise_tag(tag: str) -> str:
    """
    Lowercase + underscore-joined form. Alap expressions use `-` as
    the WITHOUT operator, so hyphenated feed categories (`web-dev`)
    need normalising before they become usable tag atoms.
    """
    tag = tag.strip().lower()
    tag = re.sub(r"[\s-]+", "_", tag)
    tag = re.sub(r"[^\w_]", "", tag)
    return tag or "untagged"


# --- HTML → markdown ------------------------------------------------------


def _html_to_markdown(html: str) -> str:
    """
    Convert HTML body content to markdown. `markdownify` handles the
    common cases. We pick consistent output styles so every file in
    the resulting corpus reads the same — headings as `#`, bullets as
    `-`, code fences rather than indent-style blocks.
    """
    if not html.strip():
        return ""
    md = md_convert.markdownify(
        html,
        heading_style="ATX",
        bullets="-",
        code_language="",
    )
    # markdownify can emit runs of blank lines inside complex content;
    # collapse ≥3 consecutive newlines to exactly two so the result is
    # predictable.
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip() + "\n"
