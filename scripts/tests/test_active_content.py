"""Tests for vault_from_md.active_content — Obsidian-plugin block detection."""

from __future__ import annotations

from vault_from_md.active_content import (
    ActiveContentReport,
    process_active_content,
)


# --- Detection + strip: each plugin type ----------------------------------


class TestDataview:
    def test_dataview_block_detected_and_stripped(self) -> None:
        body = "# Title\n\n```dataview\nLIST FROM #mytag\n```\n\nAfter."
        out, report = process_active_content(body, strip=True)
        assert "```dataview" not in out
        assert "LIST FROM" not in out
        assert "# Title" in out
        assert "After." in out
        assert report.dataview == 1

    def test_dataview_with_options_detected(self) -> None:
        body = "```dataview {type=table}\nx\n```"
        out, report = process_active_content(body, strip=True)
        assert report.dataview == 1
        assert out.strip() == ""

    def test_dataviewjs_detected(self) -> None:
        body = "```dataviewjs\ndv.pages('#work').forEach(p => dv.paragraph(p.file.name));\n```"
        out, report = process_active_content(body, strip=True)
        assert report.dataviewjs == 1
        assert "dv.pages" not in out


class TestTasks:
    def test_tasks_block_detected(self) -> None:
        body = "```tasks\nnot done\ndue before today\n```"
        _, report = process_active_content(body, strip=True)
        assert report.tasks == 1


class TestExcalidraw:
    def test_excalidraw_block_detected(self) -> None:
        body = "```excalidraw\n{...json blob...}\n```"
        _, report = process_active_content(body, strip=True)
        assert report.excalidraw == 1


class TestTemplater:
    def test_inline_templater_detected(self) -> None:
        body = "Date is <% tp.date.now() %> today."
        out, report = process_active_content(body, strip=True)
        assert "<%" not in out
        assert report.templater == 1
        assert "Date is " in out
        assert " today." in out

    def test_block_templater_detected(self) -> None:
        body = "<%*\nconst x = 1;\ntR += x;\n%>"
        out, report = process_active_content(body, strip=True)
        assert "<%" not in out
        assert report.templater == 1
        assert out.strip() == ""

    def test_templater_variants_all_detected(self) -> None:
        # Different prefix markers all count as templater.
        body = "<%= a %> <% b %> <%- c %> <%+ d %> <%~ e %>"
        _, report = process_active_content(body, strip=True)
        assert report.templater == 5


# --- Allow mode (preserve + count) ----------------------------------------


class TestAllowMode:
    def test_strip_false_preserves_content(self) -> None:
        body = "```dataview\nLIST\n```\n<% now %>"
        out, report = process_active_content(body, strip=False)
        assert "```dataview" in out
        assert "<%" in out
        # Counts still produced even when not stripping.
        assert report.dataview == 1
        assert report.templater == 1

    def test_allow_mode_output_is_input(self) -> None:
        body = "```dataview\nLIST\n```"
        out, _ = process_active_content(body, strip=False)
        assert out == body


# --- Multi-block accuracy -------------------------------------------------


class TestCounting:
    def test_multiple_dataview_blocks_counted(self) -> None:
        body = (
            "```dataview\nx\n```\n\n"
            "prose\n\n"
            "```dataview\ny\n```\n\n"
            "```dataview\nz\n```"
        )
        _, report = process_active_content(body, strip=True)
        assert report.dataview == 3

    def test_mixed_plugins_in_same_file(self) -> None:
        body = (
            "```dataview\nLIST\n```\n"
            "```dataviewjs\ndv.x()\n```\n"
            "```tasks\ntodo\n```\n"
            "```excalidraw\n{}\n```\n"
            "<% now %>"
        )
        _, report = process_active_content(body, strip=True)
        assert report.dataview == 1
        assert report.dataviewjs == 1
        assert report.tasks == 1
        assert report.excalidraw == 1
        assert report.templater == 1
        assert report.total == 5


# --- Non-interference -----------------------------------------------------


class TestPassThrough:
    def test_plain_markdown_unchanged_in_strip_mode(self) -> None:
        body = "# Title\n\nParagraph.\n\n```python\ndef f(): pass\n```\n"
        out, report = process_active_content(body, strip=True)
        assert out == body
        assert report.total == 0

    def test_non_plugin_fenced_languages_preserved(self) -> None:
        # A regular `python`/`bash`/`ruby` code block is NOT active
        # content in Obsidian's sense — it's just a display block.
        body = "```python\nimport sys\n```"
        out, _ = process_active_content(body, strip=True)
        assert out == body

    def test_percent_mid_prose_untouched(self) -> None:
        # `50%` in prose should not match Templater.
        body = "The target is 50% of capacity."
        out, report = process_active_content(body, strip=True)
        assert out == body
        assert report.templater == 0


# --- Idempotence -----------------------------------------------------------


class TestIdempotence:
    def test_strip_twice_is_stable(self) -> None:
        body = "```dataview\nLIST\n```\n<% now %>"
        once, _ = process_active_content(body, strip=True)
        twice, report = process_active_content(once, strip=True)
        assert once == twice
        assert report.total == 0

    def test_preserve_twice_is_stable(self) -> None:
        body = "```dataview\nLIST\n```"
        once, _ = process_active_content(body, strip=False)
        twice, _ = process_active_content(once, strip=False)
        assert once == twice


# --- Report arithmetic + summary ------------------------------------------


class TestReport:
    def test_reports_add_componentwise(self) -> None:
        a = ActiveContentReport(dataview=1, templater=2)
        b = ActiveContentReport(dataview=3, excalidraw=1)
        c = a + b
        assert c.dataview == 4
        assert c.templater == 2
        assert c.excalidraw == 1
        assert c.total == 7

    def test_summary_skips_zero_counts(self) -> None:
        r = ActiveContentReport(dataview=3, templater=1)
        assert r.summary() == ["dataview: 3", "templater: 1"]

    def test_summary_empty_when_all_zero(self) -> None:
        assert ActiveContentReport().summary() == []
