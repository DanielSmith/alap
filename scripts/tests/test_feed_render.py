"""Tests for feed_from_xml.render."""

from __future__ import annotations

from datetime import datetime, timezone

import yaml

from feed_from_xml.parse import FeedItem, FeedMeta
from feed_from_xml.render import (
    RenderedItem,
    filename_for,
    render_item,
    render_items,
)


def _item(**overrides) -> FeedItem:
    """Build a FeedItem with sane defaults; override per test."""
    defaults = dict(
        title="Hello World",
        url="https://example.com/hello",
        guid="https://example.com/?p=1",
        published=datetime(2026, 4, 15, 9, 0, 0, tzinfo=timezone.utc),
        author="Jane Doe",
        tags=("programming", "python"),
        body_html="<p>Body text with <a href='https://x/'>a link</a>.</p>",
        body_is_summary=False,
    )
    defaults.update(overrides)
    return FeedItem(**defaults)


def _meta() -> FeedMeta:
    return FeedMeta(
        title="Example Blog",
        url="https://example.com/",
        description="Thoughts and things.",
    )


def _parse_frontmatter(rendered: RenderedItem) -> dict:
    """Tests care about the frontmatter dict shape; helper extracts it."""
    content = rendered.content
    assert content.startswith("---\n")
    end = content.index("\n---\n", 4)
    yaml_text = content[4:end]
    return yaml.safe_load(yaml_text) or {}


# --- Filenames -------------------------------------------------------------


class TestFilename:
    def test_dated_filename_shape(self) -> None:
        item = _item()
        assert filename_for(item) == "2026-04-15-hello-world.md"

    def test_undated_uses_undated_prefix(self) -> None:
        item = _item(published=None)
        assert filename_for(item) == "undated-hello-world.md"

    def test_slug_handles_unicode_accents(self) -> None:
        item = _item(title="Café Résumé")
        # Accents collapse to ASCII; whitespace becomes `-`.
        assert filename_for(item) == "2026-04-15-cafe-resume.md"

    def test_slug_drops_punctuation(self) -> None:
        item = _item(title="Hello, World!  How's it going?")
        assert filename_for(item) == "2026-04-15-hello-world-hows-it-going.md"

    def test_slug_caps_length(self) -> None:
        # 200-char title → slug capped under 80 chars.
        long_title = "a" * 200
        item = _item(title=long_title)
        name = filename_for(item)
        slug = name.replace("2026-04-15-", "").replace(".md", "")
        assert len(slug) <= 80

    def test_empty_title_becomes_untitled(self) -> None:
        item = _item(title="")
        assert filename_for(item) == "2026-04-15-untitled.md"

    def test_only_punctuation_title_becomes_untitled(self) -> None:
        item = _item(title="!!!???")
        assert filename_for(item) == "2026-04-15-untitled.md"


# --- Rendered content ------------------------------------------------------


class TestRenderItem:
    def test_frontmatter_has_expected_keys(self) -> None:
        r = render_item(_item(), _meta())
        fm = _parse_frontmatter(r)
        assert fm["title"] == "Hello World"
        assert fm["item_url"] == "https://example.com/hello"
        assert fm["published"] == "2026-04-15T09:00:00+00:00"
        assert fm["author"] == "Jane Doe"
        assert fm["tags"] == ["programming", "python"]
        assert fm["feed_title"] == "Example Blog"
        assert fm["feed_url"] == "https://example.com/"

    def test_guid_omitted_when_equal_to_url(self) -> None:
        r = render_item(_item(guid="https://example.com/hello",
                              url="https://example.com/hello"), _meta())
        fm = _parse_frontmatter(r)
        assert "guid" not in fm

    def test_guid_kept_when_distinct_from_url(self) -> None:
        r = render_item(_item(guid="tag:example,2026:1"), _meta())
        fm = _parse_frontmatter(r)
        assert fm["guid"] == "tag:example,2026:1"

    def test_summary_flag_emitted_when_applicable(self) -> None:
        r = render_item(_item(body_is_summary=True), _meta())
        fm = _parse_frontmatter(r)
        assert fm["body_source"] == "summary"

    def test_summary_flag_absent_when_full_content(self) -> None:
        r = render_item(_item(body_is_summary=False), _meta())
        fm = _parse_frontmatter(r)
        assert "body_source" not in fm

    def test_empty_fields_omitted(self) -> None:
        item = _item(author="", tags=())
        r = render_item(item, FeedMeta())
        fm = _parse_frontmatter(r)
        assert "author" not in fm
        assert "tags" not in fm
        assert "feed_title" not in fm
        assert "feed_url" not in fm

    def test_hyphen_in_tag_becomes_underscore(self) -> None:
        # Alap's `-` is the WITHOUT operator; tags can't carry hyphens.
        r = render_item(_item(tags=("web-dev", "writing about code")), _meta())
        fm = _parse_frontmatter(r)
        assert fm["tags"] == ["web_dev", "writing_about_code"]

    def test_undated_item_omits_published(self) -> None:
        r = render_item(_item(published=None), _meta())
        fm = _parse_frontmatter(r)
        assert "published" not in fm


# --- HTML → markdown -------------------------------------------------------


class TestBodyConversion:
    def test_paragraphs_become_markdown(self) -> None:
        item = _item(body_html="<p>First.</p><p>Second.</p>")
        r = render_item(item, _meta())
        assert "First." in r.content
        assert "Second." in r.content

    def test_links_become_markdown_links(self) -> None:
        item = _item(body_html='<p>See <a href="https://x/">this</a></p>')
        r = render_item(item, _meta())
        assert "[this](https://x/)" in r.content

    def test_lists_become_markdown_lists(self) -> None:
        item = _item(body_html="<ul><li>one</li><li>two</li></ul>")
        r = render_item(item, _meta())
        assert "- one" in r.content
        assert "- two" in r.content

    def test_headers_use_atx_style(self) -> None:
        item = _item(body_html="<h2>Section</h2><p>body</p>")
        r = render_item(item, _meta())
        assert "## Section" in r.content

    def test_empty_body_still_valid(self) -> None:
        item = _item(body_html="")
        r = render_item(item, _meta())
        # Still has frontmatter.
        assert r.content.startswith("---\n")
        # Ends on a newline.
        assert r.content.endswith("\n")


# --- Collision handling ---------------------------------------------------


class TestCollisions:
    def test_same_filename_pair_gets_suffixed(self) -> None:
        item1 = _item(title="Same Title", guid="1")
        item2 = _item(title="Same Title", guid="2")
        rendered = render_items((item1, item2), _meta())
        assert rendered[0][0].filename == "2026-04-15-same-title.md"
        assert rendered[1][0].filename == "2026-04-15-same-title-2.md"
        # Warning recorded on the renamed item.
        assert rendered[1][1] and "collision" in rendered[1][1][0]

    def test_three_way_collision(self) -> None:
        items = tuple(_item(title="Same", guid=str(i)) for i in range(3))
        rendered = render_items(items, _meta())
        names = [r[0].filename for r in rendered]
        assert names == [
            "2026-04-15-same.md",
            "2026-04-15-same-2.md",
            "2026-04-15-same-3.md",
        ]

    def test_no_collision_no_warnings(self) -> None:
        item1 = _item(title="One", guid="1")
        item2 = _item(title="Two", guid="2")
        rendered = render_items((item1, item2), _meta())
        assert rendered[0][1] == []
        assert rendered[1][1] == []


# --- Idempotence ----------------------------------------------------------


class TestIdempotence:
    def test_render_item_is_deterministic(self) -> None:
        item = _item()
        r1 = render_item(item, _meta())
        r2 = render_item(item, _meta())
        assert r1.content == r2.content
        assert r1.filename == r2.filename
