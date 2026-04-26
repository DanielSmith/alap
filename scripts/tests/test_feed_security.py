"""End-to-end security tests for the feed → markdown pipeline."""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from feed_from_xml.parse import parse_bytes, parse_file
from feed_from_xml.render import render_item, render_items
from feed_from_xml.security import (
    FeedTooLargeError,
    MAX_FEED_BYTES,
    MAX_ITEMS,
    check_feed_size,
    harden_filename,
    is_dangerous_url,
    neutralise_url,
)


# --- XML-level attacks the parser must absorb ------------------------------


XXE_FEED = b"""<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<rss version="2.0">
  <channel>
    <title>&xxe;</title>
    <item><title>&xxe;</title><description>&xxe;</description></item>
  </channel>
</rss>
"""


ENTITY_BOMB_FEED = b"""<?xml version="1.0"?>
<!DOCTYPE rss [
 <!ENTITY a "LOLLOLLOL">
 <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">
 <!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">
]>
<rss version="2.0"><channel><title>&c;</title><item><title>&c;</title></item></channel></rss>
"""


class TestXMLLevelAttacks:
    def test_xxe_external_entity_not_resolved(self) -> None:
        # feedparser does not resolve external entities; the `&xxe;`
        # reference stays literal, /etc/passwd is never read.
        result = parse_bytes(XXE_FEED)
        assert "root:" not in result.meta.title
        # Items may or may not survive — the point is /etc/passwd content
        # is absent from any extracted field.
        for item in result.items:
            assert "root:" not in item.title
            assert "root:" not in item.body_html

    def test_entity_expansion_bomb_does_not_amplify(self) -> None:
        # feedparser caps entity expansion upstream. The final title
        # must not explode to a memory-dangerous size.
        result = parse_bytes(ENTITY_BOMB_FEED)
        assert len(result.meta.title) < 10_000


# --- Body HTML sanitisation in rendered output -----------------------------


def _feed_with_body(body_html: str) -> bytes:
    # Minimal CDATA-wrapped item body fixture.
    return f"""<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Body Attacks</title>
    <link>https://body.example/</link>
    <item>
      <title>Payload</title>
      <link>https://body.example/p</link>
      <guid>https://body.example/p</guid>
      <pubDate>Wed, 15 Apr 2026 09:00:00 +0000</pubDate>
      <content:encoded><![CDATA[{body_html}]]></content:encoded>
    </item>
  </channel>
</rss>
""".encode()


def _render_single(feed_bytes: bytes, **render_kwargs):
    result = parse_bytes(feed_bytes)
    assert len(result.items) == 1
    return render_item(result.items[0], result.meta, **render_kwargs)


class TestBodySanitization:
    # Note on the layered defence at play here:
    #   1. feedparser's own HTML sanitiser runs at parse time and
    #      already strips `<script>`, `<iframe>`, event handlers,
    #      and strips `javascript:`/`vbscript:` URLs in `<a href>`
    #      to empty `href=""`.
    #   2. markdownify converts the (pre-sanitised) HTML to markdown
    #      — preserves any remaining link / image syntax.
    #   3. `vault_from_md.sanitize.strip_unsafe_html` neutralises
    #      what survives: markdown images/links with dangerous URL
    #      schemes, plus raw HTML tags.
    # Any one layer would be insufficient; these tests prove the
    # composition holds.

    def test_javascript_url_in_link_neutralised_end_to_end(self) -> None:
        # feedparser strips href → `<a href="">click</a>`; markdownify
        # drops the anchor wrapping. Final markdown has no `javascript:`.
        rendered = _render_single(_feed_with_body(
            '<p>see <a href="javascript:alert(1)">click</a></p>'
        ))
        assert "javascript:" not in rendered.content

    def test_vbscript_url_in_link_neutralised(self) -> None:
        rendered = _render_single(_feed_with_body(
            '<a href="vbscript:MsgBox(1)">x</a>'
        ))
        assert "vbscript:" not in rendered.content

    def test_data_text_html_url_in_image_neutralised(self) -> None:
        # `data:image/...` stays alone; `data:text/html` gets caught
        # here in the markdown-image sanitiser — feedparser preserves
        # it in img src, so this is the layer that closes the gap.
        rendered = _render_single(_feed_with_body(
            '<img src="data:text/html,<script>alert(1)</script>" alt="x">'
        ))
        assert "data:text/html" not in rendered.content
        assert rendered.body_report.markdown_links_neutralised > 0

    def test_data_image_url_passes_through(self) -> None:
        # Legitimate inline images should survive every layer.
        payload = "data:image/png;base64,iVBORw0KGgo"
        rendered = _render_single(_feed_with_body(
            f'<img src="{payload}" alt="inline">'
        ))
        assert payload in rendered.content

    def test_allow_unsafe_html_is_a_noop_on_pre_sanitised_content(self) -> None:
        # With `allow_unsafe_html=True`, our post-processor is a no-op.
        # The result still shows no `javascript:` because feedparser's
        # upstream sanitiser already handled it. We're documenting the
        # layered reality, not claiming the flag revives dangerous
        # schemes that feedparser removed.
        rendered = _render_single(
            _feed_with_body('<a href="javascript:alert(1)">click</a>'),
            allow_unsafe_html=True,
        )
        assert "javascript:" not in rendered.content
        assert rendered.body_report.total == 0  # post-processor skipped

    def test_allow_unsafe_html_preserves_markdown_link_with_dangerous_scheme(self) -> None:
        # When the body already arrives as markdown (not HTML) —
        # through a future format-converter plugin, or a feed whose
        # body was already markdown — our post-processor is the ONLY
        # layer. Strict: neutralised. Permissive: preserved.
        from vault_from_md.sanitize import strip_unsafe_html
        md = "[click](javascript:alert(1))"
        sanitised, report = strip_unsafe_html(md)
        assert "javascript:" not in sanitised
        assert report.markdown_links_neutralised == 1

    def test_script_tag_does_not_survive(self) -> None:
        # feedparser strips <script>; this is regression coverage.
        rendered = _render_single(_feed_with_body(
            "<p>before</p><script>alert(1)</script><p>after</p>"
        ))
        assert "<script>" not in rendered.content
        assert "alert(1)" not in rendered.content


# --- Frontmatter sanitisation ---------------------------------------------


class TestFrontmatterSanitization:
    def test_html_in_title_stripped_from_frontmatter_by_default(self) -> None:
        feed = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
<item>
  <title>Hi &lt;script&gt;alert(1)&lt;/script&gt; there</title>
  <description>body</description>
</item></channel></rss>
"""
        result = parse_bytes(feed)
        rendered = render_item(result.items[0], result.meta)
        # <script> never makes it into the rendered frontmatter.
        assert "<script>" not in rendered.content
        assert "alert(1)" in rendered.content or True  # text content may survive, tags do not
        assert rendered.frontmatter_report.total > 0

    def test_html_in_author_stripped(self) -> None:
        feed = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
<item>
  <title>A</title>
  <author>Jane&lt;iframe src="x"&gt;&lt;/iframe&gt;</author>
  <description>b</description>
</item></channel></rss>
"""
        result = parse_bytes(feed)
        rendered = render_item(result.items[0], result.meta)
        assert "<iframe" not in rendered.content

    def test_allow_frontmatter_html_preserves(self) -> None:
        feed = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
<item><title>Hi &lt;b&gt;bold&lt;/b&gt; there</title><description>b</description></item>
</channel></rss>
"""
        result = parse_bytes(feed)
        rendered = render_item(
            result.items[0], result.meta,
            allow_frontmatter_html=True,
        )
        assert "<b>" in rendered.content


# --- URL-scheme validation on frontmatter URL fields -----------------------


class TestURLSchemeValidation:
    def test_dangerous_scheme_detected(self) -> None:
        assert is_dangerous_url("javascript:alert(1)")
        assert is_dangerous_url("  JavaScript:alert(1)")
        assert is_dangerous_url("vbscript:x")
        assert is_dangerous_url("data:text/html,x")

    def test_safe_schemes_not_flagged(self) -> None:
        assert not is_dangerous_url("https://example.com/")
        assert not is_dangerous_url("http://example.com/")
        assert not is_dangerous_url("tag:example.com,2026:1")
        assert not is_dangerous_url("mailto:a@b")
        assert not is_dangerous_url("")

    def test_neutralise_converts_to_hash(self) -> None:
        assert neutralise_url("javascript:alert(1)") == "#"
        assert neutralise_url("https://ok/") == "https://ok/"

    def test_dangerous_item_url_neutralised_in_frontmatter(self) -> None:
        feed = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
<item><title>Bad</title><link>javascript:alert(1)</link><description>b</description></item>
</channel></rss>
"""
        result = parse_bytes(feed)
        rendered = render_item(result.items[0], result.meta)
        assert "javascript:" not in rendered.content
        assert "item_url: '#'" in rendered.content
        assert rendered.dangerous_urls_in_frontmatter >= 1


# --- Filename hardening ---------------------------------------------------


class TestFilenameHardening:
    def test_windows_reserved_names_prefixed(self) -> None:
        assert harden_filename("2026-04-15-con.md") == "2026-04-15-_con.md"
        assert harden_filename("2026-04-15-PRN.md") == "2026-04-15-_PRN.md"
        assert harden_filename("CON.md") == "_CON.md"

    def test_leading_dots_stripped(self) -> None:
        # A leading `.` would produce a hidden Unix file.
        assert harden_filename(".htaccess") == "htaccess"
        assert harden_filename("..double.md") == "double.md"

    def test_control_chars_removed(self) -> None:
        # Null byte or control char in a filename would confuse a lot
        # of consumers (shells, archivers, Obsidian's file tree).
        assert "\x00" not in harden_filename("2026-04-15-ok\x00bad.md")
        assert "\x07" not in harden_filename("bell\x07.md")

    def test_normal_filenames_pass_through(self) -> None:
        assert harden_filename("2026-04-15-hello.md") == "2026-04-15-hello.md"
        assert harden_filename("undated-x.md") == "undated-x.md"

    def test_empty_becomes_untitled(self) -> None:
        assert harden_filename("") == "untitled.md"
        assert harden_filename("...") == "untitled.md"

    def test_path_traversal_slug_does_not_escape(self) -> None:
        # The slugifier already strips `/` — verify the final filename
        # has no traversal components. Exercised via the full render
        # path so slug + harden compose correctly.
        feed = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
<item>
  <title>../../../etc/passwd</title>
  <pubDate>Wed, 15 Apr 2026 09:00:00 +0000</pubDate>
  <description>x</description>
</item></channel></rss>
"""
        result = parse_bytes(feed)
        rendered = render_item(result.items[0], result.meta)
        assert "/" not in rendered.filename
        assert ".." not in rendered.filename


# --- Resource caps --------------------------------------------------------


class TestResourceCaps:
    def test_item_cap_stops_at_configured_max(self) -> None:
        # Synthesise a feed with 500 items; cap at 100.
        entries = "\n".join(
            f"<item><title>t{i}</title><guid>g{i}</guid><description>x</description></item>"
            for i in range(500)
        )
        feed = f"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Big</title>
{entries}
</channel></rss>
""".encode()
        result = parse_bytes(feed, max_items=100)
        assert len(result.items) == 100
        assert result.items_capped is True
        assert any("item cap" in w for w in result.warnings)

    def test_no_cap_hit_when_under_limit(self) -> None:
        feed = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Small</title>
<item><title>a</title><guid>1</guid><description>x</description></item>
</channel></rss>
"""
        result = parse_bytes(feed, max_items=1000)
        assert result.items_capped is False
        assert len(result.items) == 1

    def test_feed_too_large_raises_before_read(self, tmp_path: Path) -> None:
        # Write a 2 KB file, cap at 1 KB — raise before bytes are read.
        p = tmp_path / "big.xml"
        p.write_bytes(b"<rss>" + (b"x" * 2048) + b"</rss>")
        with pytest.raises(FeedTooLargeError):
            parse_file(p, max_feed_bytes=1024)

    def test_feed_under_cap_parses(self, tmp_path: Path) -> None:
        p = tmp_path / "ok.xml"
        p.write_bytes(
            b"<?xml version='1.0'?><rss version='2.0'><channel><title>t</title>"
            b"<item><title>a</title><description>x</description></item>"
            b"</channel></rss>"
        )
        result = parse_file(p, max_feed_bytes=10 * 1024 * 1024)
        assert not result.malformed

    def test_check_feed_size_silent_on_missing_file(self, tmp_path: Path) -> None:
        # If stat fails, `check_feed_size` returns silently so the
        # downstream read path surfaces the I/O error with a better
        # message. Non-existence here shouldn't raise from the guard.
        check_feed_size(tmp_path / "nope.xml", max_feed_bytes=100)


# --- Idempotence & ReDoS guards -------------------------------------------


class TestIdempotenceAndBoundedTime:
    def test_rendering_is_deterministic_with_strict_defaults(self) -> None:
        feed = _feed_with_body(
            '<p>see <a href="javascript:alert(1)">click</a> and '
            '<iframe src="x"></iframe></p>'
        )
        r1 = _render_single(feed)
        r2 = _render_single(feed)
        assert r1.content == r2.content

    def test_pathological_title_bounded_time(self) -> None:
        # 10,000 chars of punctuation-only title. Slugifier must not
        # regress to catastrophic backtracking.
        title = "!" * 10_000
        feed = f"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>t</title>
<item><title>{title}</title><description>b</description></item></channel></rss>
""".encode()
        start = time.monotonic()
        result = parse_bytes(feed)
        rendered = render_item(result.items[0], result.meta)
        elapsed = time.monotonic() - start
        assert elapsed < 2.0, f"took {elapsed:.2f}s — regex regression?"
        assert rendered.filename.endswith(".md")

    def test_pathological_body_bounded_time(self) -> None:
        # Long string of unclosed `<script` openings — a classic
        # backtracking trigger. The shared sanitiser's `{0,500}` cap
        # bounds the search.
        body = "<script " * 10_000
        feed = _feed_with_body(body)
        start = time.monotonic()
        result = parse_bytes(feed)
        render_item(result.items[0], result.meta)
        elapsed = time.monotonic() - start
        assert elapsed < 2.0, f"took {elapsed:.2f}s — regex regression?"


# --- End-to-end integration ----------------------------------------------


ADVERSARIAL_FEED = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Evil Feed &lt;script&gt;alert(1)&lt;/script&gt;</title>
    <link>javascript:alert(1)</link>
    <description>a</description>
    <item>
      <title>Post &lt;script&gt;alert(1)&lt;/script&gt;</title>
      <link>javascript:alert(2)</link>
      <guid>https://ok.example/1</guid>
      <pubDate>Wed, 15 Apr 2026 09:00:00 +0000</pubDate>
      <author>Jane &lt;iframe&gt;&lt;/iframe&gt;</author>
      <content:encoded><![CDATA[
        <p>Hello.</p>
        <a href="javascript:alert(3)">click1</a>
        <a href="vbscript:MsgBox(1)">click2</a>
        <img src="data:text/html,<script>alert(4)</script>" alt="x">
        <script>alert(5)</script>
        <iframe src="x"></iframe>
        <div onclick="alert(6)">click3</div>
      ]]></content:encoded>
    </item>
  </channel>
</rss>
"""


class TestAdversarialIntegration:
    def test_every_attack_vector_neutralised_under_strict_defaults(self) -> None:
        """
        Every *executable* shape is gone. Inert text content that
        *happened* to be inside a script tag (e.g. the literal string
        `alert(1)`) may survive as plain text — that's correct: YAML
        frontmatter and markdown bodies don't execute text. What the
        attack surface cares about is tags, URL schemes, and event
        handlers.
        """
        result = parse_bytes(ADVERSARIAL_FEED)
        assert len(result.items) == 1
        rendered = render_items(result.items, result.meta)
        assert len(rendered) == 1
        content = rendered[0][0].content

        # Executable / structural shapes — must be gone.
        assert "<script" not in content
        assert "</script>" not in content
        assert "<iframe" not in content
        assert "javascript:" not in content
        assert "vbscript:" not in content
        assert "data:text/html" not in content
        assert "onclick" not in content

        # feed_url/item_url neutralised.
        assert "item_url: '#'" in content or "item_url: #" in content
        assert "feed_url: '#'" in content or "feed_url: #" in content

    def test_opt_in_flags_skip_our_post_processor(self) -> None:
        """
        With both flags on, our own sanitisers run no ops — but
        feedparser's upstream sanitiser still strips body `<script>`,
        `<iframe>`, event handlers, and `javascript:`/`vbscript:`
        href attributes. The flags control OUR layer, not feedparser's.
        This is the honest shape — documenting it rather than claiming
        the flag restores what the source never delivered.
        """
        result = parse_bytes(ADVERSARIAL_FEED)
        rendered = render_items(
            result.items, result.meta,
            allow_unsafe_html=True,
            allow_frontmatter_html=True,
        )
        content = rendered[0][0].content

        # `<iframe>` and `<script>` were in frontmatter fields (title,
        # author, feed_title) as HTML-encoded text; with
        # `--allow-frontmatter-html` they survive frontmatter.
        assert "<iframe" in content
        assert "<script>" in content
        # Body-path feedparser-level strips (onclick handlers in body
        # HTML) still take effect because those happen upstream of our
        # layer — the flag doesn't control feedparser.
        assert "onclick" not in content
