"""Tests for feed_from_xml.parse."""

from __future__ import annotations

from datetime import datetime, timezone

from feed_from_xml.parse import (
    FeedItem,
    FeedMeta,
    ParseResult,
    parse_bytes,
)


# --- Fixtures --------------------------------------------------------------


RSS_2_0 = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example Blog</title>
    <link>https://example.com/</link>
    <description>Thoughts and things.</description>
    <item>
      <title>Hello World</title>
      <link>https://example.com/hello</link>
      <guid>https://example.com/?p=1</guid>
      <pubDate>Wed, 15 Apr 2026 09:00:00 +0000</pubDate>
      <author>jane@example.com (Jane Doe)</author>
      <category>programming</category>
      <category>python</category>
      <description>Short summary.</description>
      <content:encoded><![CDATA[<p>Full article content with <a href="https://other.example/">a link</a>.</p>]]></content:encoded>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/second</link>
      <guid>https://example.com/?p=2</guid>
      <pubDate>Thu, 16 Apr 2026 10:00:00 +0000</pubDate>
      <description>Only a summary here.</description>
    </item>
  </channel>
</rss>
"""


ATOM_1_0 = b"""<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <link href="https://atom.example/"/>
  <id>https://atom.example/</id>
  <updated>2026-04-16T00:00:00Z</updated>
  <subtitle>Atom thoughts.</subtitle>
  <entry>
    <title>Atom Post</title>
    <link href="https://atom.example/post"/>
    <id>tag:atom.example,2026:1</id>
    <published>2026-04-15T09:00:00Z</published>
    <author><name>John Smith</name></author>
    <category term="web"/>
    <category term="notes"/>
    <content type="html"><![CDATA[<p>Atom body content.</p>]]></content>
  </entry>
</feed>
"""


MALFORMED = b"<?xml version=\"1.0\"?><this-is-not-a-feed></this-is-not-a-feed>"


BOZO_BUT_HAS_ITEMS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bozo Feed</title>
    <item>
      <title>Still Readable</title>
      <link>https://example.com/x</link>
      <description>body</description>
    </item>
    <item>
      <title>Unterminated</title>
"""


DUPLICATE_GUIDS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dedupe Test</title>
    <item>
      <title>One</title>
      <guid>https://dedupe.example/1</guid>
      <description>first</description>
    </item>
    <item>
      <title>One Again</title>
      <guid>https://dedupe.example/1</guid>
      <description>second (dupe)</description>
    </item>
    <item>
      <title>Two</title>
      <guid>https://dedupe.example/2</guid>
      <description>third</description>
    </item>
  </channel>
</rss>
"""


MINIMAL_ENTRY = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Minimal</title>
    <item>
      <description>Just a body, no title or link.</description>
    </item>
  </channel>
</rss>
"""


EMPTY_ENTRIES = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
  </channel>
</rss>
"""


# --- RSS 2.0 ---------------------------------------------------------------


class TestParseRSS20:
    def test_returns_well_formed_result(self) -> None:
        result = parse_bytes(RSS_2_0)
        assert isinstance(result, ParseResult)
        assert result.malformed is False
        assert len(result.items) == 2

    def test_extracts_feed_metadata(self) -> None:
        result = parse_bytes(RSS_2_0)
        assert result.meta.title == "Example Blog"
        assert result.meta.url == "https://example.com/"
        assert result.meta.description == "Thoughts and things."

    def test_first_item_uses_content_encoded(self) -> None:
        result = parse_bytes(RSS_2_0)
        item = result.items[0]
        assert "Full article content" in item.body_html
        assert item.body_is_summary is False

    def test_second_item_falls_back_to_description(self) -> None:
        result = parse_bytes(RSS_2_0)
        item = result.items[1]
        assert item.body_html == "Only a summary here."
        assert item.body_is_summary is True

    def test_extracts_title_link_guid(self) -> None:
        result = parse_bytes(RSS_2_0)
        item = result.items[0]
        assert item.title == "Hello World"
        assert item.url == "https://example.com/hello"
        assert item.guid == "https://example.com/?p=1"

    def test_extracts_published_as_utc_datetime(self) -> None:
        result = parse_bytes(RSS_2_0)
        item = result.items[0]
        assert item.published == datetime(2026, 4, 15, 9, 0, 0, tzinfo=timezone.utc)

    def test_extracts_author(self) -> None:
        result = parse_bytes(RSS_2_0)
        # feedparser reformats `jane@example.com (Jane Doe)` into
        # `Jane Doe` — accept either shape; what matters is author
        # resolves to something usable.
        assert result.items[0].author  # non-empty

    def test_extracts_tags(self) -> None:
        result = parse_bytes(RSS_2_0)
        assert set(result.items[0].tags) == {"programming", "python"}


# --- Atom 1.0 --------------------------------------------------------------


class TestParseAtom10:
    def test_extracts_feed_metadata(self) -> None:
        result = parse_bytes(ATOM_1_0)
        assert result.meta.title == "Atom Blog"
        assert result.meta.url == "https://atom.example/"
        assert result.meta.description == "Atom thoughts."

    def test_extracts_entry(self) -> None:
        result = parse_bytes(ATOM_1_0)
        assert len(result.items) == 1
        item = result.items[0]
        assert item.title == "Atom Post"
        assert item.url == "https://atom.example/post"
        assert item.guid == "tag:atom.example,2026:1"

    def test_extracts_published_from_atom(self) -> None:
        result = parse_bytes(ATOM_1_0)
        item = result.items[0]
        assert item.published == datetime(2026, 4, 15, 9, 0, 0, tzinfo=timezone.utc)

    def test_extracts_author_from_authors_list(self) -> None:
        result = parse_bytes(ATOM_1_0)
        assert result.items[0].author == "John Smith"

    def test_extracts_content(self) -> None:
        result = parse_bytes(ATOM_1_0)
        item = result.items[0]
        assert "Atom body content" in item.body_html
        assert item.body_is_summary is False

    def test_extracts_tags(self) -> None:
        result = parse_bytes(ATOM_1_0)
        assert set(result.items[0].tags) == {"web", "notes"}


# --- Error handling --------------------------------------------------------


class TestErrorHandling:
    def test_malformed_returns_malformed_result(self) -> None:
        result = parse_bytes(MALFORMED)
        assert result.malformed is True
        assert result.items == ()

    def test_malformed_still_returns_meta_empty(self) -> None:
        result = parse_bytes(MALFORMED)
        assert result.meta == FeedMeta()
        assert result.warnings  # at least one warning

    def test_bozo_with_partial_items_not_marked_malformed(self) -> None:
        # Even if feedparser flags `bozo=1`, if we recovered at least
        # one usable entry we want the result usable — not dropped.
        result = parse_bytes(BOZO_BUT_HAS_ITEMS)
        assert result.malformed is False
        assert len(result.items) >= 1

    def test_empty_feed_returns_zero_items_not_malformed(self) -> None:
        result = parse_bytes(EMPTY_ENTRIES)
        assert result.malformed is False
        assert result.items == ()

    def test_minimal_entry_is_still_admitted(self) -> None:
        result = parse_bytes(MINIMAL_ENTRY)
        assert len(result.items) == 1
        assert result.items[0].body_html == "Just a body, no title or link."


# --- Dedupe ---------------------------------------------------------------


class TestDedupe:
    def test_drops_duplicate_guids_within_file(self) -> None:
        result = parse_bytes(DUPLICATE_GUIDS)
        assert len(result.items) == 2
        assert result.duplicates_dropped == 1

    def test_preserves_first_of_duplicated_pair(self) -> None:
        # The first item with a given GUID wins; reprocesses (CMS
        # republication) that share the GUID are dropped.
        result = parse_bytes(DUPLICATE_GUIDS)
        assert result.items[0].title == "One"

    def test_no_duplicates_reports_zero(self) -> None:
        result = parse_bytes(RSS_2_0)
        assert result.duplicates_dropped == 0
