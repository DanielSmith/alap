"""Tests for vault_from_md.sanitize — HTML sanitisation."""

from __future__ import annotations

from vault_from_md.sanitize import (
    SanitizeReport,
    strip_frontmatter_html,
    strip_unsafe_html,
)


# --- Body: dangerous elements ---------------------------------------------


class TestDangerousElements:
    def test_script_paired_stripped(self) -> None:
        body = "Before\n<script>alert(1)</script>\nAfter"
        out, report = strip_unsafe_html(body)
        assert "<script>" not in out
        assert "alert(1)" not in out
        assert "Before" in out
        assert "After" in out
        assert report.elements_stripped == 1

    def test_script_multiline_stripped(self) -> None:
        body = "<script>\nvar x = 1;\nalert(x);\n</script>"
        out, _ = strip_unsafe_html(body)
        assert out.strip() == ""

    def test_iframe_stripped(self) -> None:
        body = '<iframe src="https://evil.com">content</iframe>'
        out, report = strip_unsafe_html(body)
        assert "<iframe" not in out
        assert report.elements_stripped == 1

    def test_object_stripped(self) -> None:
        body = '<object data="x.swf">fallback</object>'
        out, _ = strip_unsafe_html(body)
        assert "<object" not in out

    def test_embed_self_closing_stripped(self) -> None:
        body = '<embed src="x.swf" />'
        out, _ = strip_unsafe_html(body)
        assert "<embed" not in out

    def test_link_stylesheet_stripped(self) -> None:
        body = '<link rel="stylesheet" href="evil.css">'
        out, _ = strip_unsafe_html(body)
        assert "<link" not in out

    def test_case_insensitive_matching(self) -> None:
        # `<SCRIPT>`, `<ScRiPt>` — all the same threat.
        body = "<SCRIPT>x</SCRIPT>"
        out, _ = strip_unsafe_html(body)
        assert "SCRIPT" not in out

    def test_multiple_elements_counted(self) -> None:
        body = "<script>x</script>\n<iframe>y</iframe>\n<object>z</object>"
        _, report = strip_unsafe_html(body)
        assert report.elements_stripped == 3


# --- Body: event handlers --------------------------------------------------


class TestEventHandlers:
    def test_onclick_stripped(self) -> None:
        body = '<a href="x" onclick="alert(1)">click</a>'
        out, report = strip_unsafe_html(body)
        assert "onclick" not in out
        assert 'href="x"' in out  # benign attr preserved
        assert "click</a>" in out  # content preserved
        assert report.event_handlers_stripped == 1

    def test_onerror_on_img_stripped(self) -> None:
        body = '<img src="x.png" onerror="alert(1)">'
        out, _ = strip_unsafe_html(body)
        assert "onerror" not in out
        assert "<img" in out  # img tag itself not removed

    def test_multiple_handlers_counted(self) -> None:
        body = '<a href="#" onclick="x" onmouseover="y" onfocus="z">t</a>'
        _, report = strip_unsafe_html(body)
        assert report.event_handlers_stripped == 3

    def test_unquoted_handler_value_stripped(self) -> None:
        body = '<a onclick=alert(1)>t</a>'
        out, _ = strip_unsafe_html(body)
        assert "onclick" not in out


# --- Body: dangerous URL schemes -------------------------------------------


class TestDangerousUrls:
    def test_javascript_href_neutralised(self) -> None:
        body = '<a href="javascript:alert(1)">click</a>'
        out, report = strip_unsafe_html(body)
        assert "javascript:" not in out
        assert 'href="#"' in out
        assert report.dangerous_urls_neutralised == 1

    def test_javascript_src_neutralised(self) -> None:
        body = '<img src="javascript:alert(1)">'
        out, _ = strip_unsafe_html(body)
        assert "javascript:" not in out

    def test_vbscript_neutralised(self) -> None:
        body = '<a href="vbscript:MsgBox(1)">t</a>'
        out, _ = strip_unsafe_html(body)
        assert "vbscript:" not in out

    def test_data_text_html_neutralised(self) -> None:
        body = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>'
        # Full iframe element stripped via element rule, not reached by
        # URL neutraliser — both paths converge on "gone".
        out, _ = strip_unsafe_html(body)
        assert "<iframe" not in out
        assert "data:text/html" not in out

    def test_data_image_preserved(self) -> None:
        # `data:image/png;base64,…` is legitimate for inline images —
        # only `data:text/html` and `data:application/xhtml` are gated.
        body = '<img src="data:image/png;base64,iVBORw0KGgo=">'
        out, report = strip_unsafe_html(body)
        assert 'data:image/png' in out
        assert report.dangerous_urls_neutralised == 0

    def test_safe_http_url_preserved(self) -> None:
        body = '<a href="https://example.com">link</a>'
        out, report = strip_unsafe_html(body)
        assert "https://example.com" in out
        assert report.total == 0


# --- Body: markdown links --------------------------------------------------


class TestMarkdownLinks:
    def test_javascript_markdown_link_neutralised(self) -> None:
        body = "Click [here](javascript:alert(1)) now."
        out, report = strip_unsafe_html(body)
        assert "[here](#)" in out
        assert "javascript:" not in out
        assert report.markdown_links_neutralised == 1

    def test_nested_parens_in_js_url_handled(self) -> None:
        # The URL `javascript:alert(1)` contains nested parens;
        # simple greedy match would leave a stray `)`.
        body = "[x](javascript:alert(1))"
        out, _ = strip_unsafe_html(body)
        assert out == "[x](#)"

    def test_image_with_dangerous_scheme_neutralised(self) -> None:
        # HTML→markdown converters (markdownify) can emit `<img
        # src="data:text/html,…">` as `![alt](data:text/html,…)`.
        # A rogue publisher could also emit `![](javascript:…)` in
        # source markdown. Both get neutralised to `![alt](#)`;
        # `data:image/…` / `data:audio/…` stay untouched (legitimate
        # inline media).
        body = "![alt](javascript:alert(1))"
        out, _ = strip_unsafe_html(body)
        assert out == "![alt](#)"

    def test_image_with_data_image_preserved(self) -> None:
        # Inline images with the legitimate data:image/* media type
        # survive every layer — the neutraliser targets text/html,
        # not images.
        body = "![pixel](data:image/png;base64,iVBORw0KGgo)"
        out, _ = strip_unsafe_html(body)
        assert out == body

    def test_safe_markdown_link_preserved(self) -> None:
        body = "[safe](https://example.com)"
        out, report = strip_unsafe_html(body)
        assert out == body
        assert report.total == 0


# --- Body: full-text non-interference --------------------------------------


class TestBodyPassThrough:
    def test_plain_markdown_unchanged(self) -> None:
        body = "# Title\n\nParagraph with [link](to.md).\n\n- item\n- another\n"
        out, report = strip_unsafe_html(body)
        assert out == body
        assert report.total == 0

    def test_safe_html_preserved(self) -> None:
        body = (
            "<div class='note'>\n"
            "  <strong>important</strong>: read the\n"
            "  <em>whole</em> thing.\n"
            "</div>"
        )
        out, report = strip_unsafe_html(body)
        assert out == body
        assert report.total == 0


# --- Body: idempotence ----------------------------------------------------


class TestBodyIdempotence:
    def test_second_run_is_no_op(self) -> None:
        body = (
            "<script>a</script>\n"
            '<a href="javascript:x" onclick="y">t</a>\n'
            "[x](vbscript:y)"
        )
        once, _ = strip_unsafe_html(body)
        twice, report = strip_unsafe_html(once)
        assert once == twice
        assert report.total == 0


# --- Frontmatter -----------------------------------------------------------


class TestFrontmatterStrip:
    def test_html_in_string_value_stripped(self) -> None:
        data = {"title": "Example <script>alert(1)</script>"}
        cleaned, report = strip_frontmatter_html(data)
        assert cleaned["title"] == "Example alert(1)"
        assert report.elements_stripped == 2  # opening + closing tag

    def test_html_in_list_items_stripped(self) -> None:
        data = {"tags": ["music", "<script>x</script>", "work"]}
        cleaned, report = strip_frontmatter_html(data)
        assert cleaned["tags"] == ["music", "x", "work"]
        assert report.elements_stripped == 2

    def test_non_string_values_unaffected(self) -> None:
        data = {"draft": True, "weight": 20, "author": None, "date": 2024}
        cleaned, report = strip_frontmatter_html(data)
        assert cleaned == data
        assert report.total == 0

    def test_nested_dict_not_recursed(self) -> None:
        # v1 doesn't recurse into dict values — only top-level string
        # and string-list values are touched. Documented limitation.
        data = {"meta": {"inner": "<script>x</script>"}}
        cleaned, _ = strip_frontmatter_html(data)
        assert cleaned["meta"] == {"inner": "<script>x</script>"}

    def test_empty_dict_returns_empty_report(self) -> None:
        _, report = strip_frontmatter_html({})
        assert report.total == 0

    def test_clean_data_unchanged(self) -> None:
        data = {"title": "Plain Title", "tags": ["a", "b"]}
        cleaned, report = strip_frontmatter_html(data)
        assert cleaned == data
        assert report.total == 0


# --- Report arithmetic -----------------------------------------------------


class TestReportAddition:
    def test_reports_add_componentwise(self) -> None:
        a = SanitizeReport(elements_stripped=1, event_handlers_stripped=2)
        b = SanitizeReport(elements_stripped=3, markdown_links_neutralised=1)
        c = a + b
        assert c.elements_stripped == 4
        assert c.event_handlers_stripped == 2
        assert c.markdown_links_neutralised == 1
        assert c.total == 7

    def test_empty_report_total_is_zero(self) -> None:
        assert SanitizeReport().total == 0
