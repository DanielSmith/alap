"""Tests for vault_from_md.plugins.mkdocs — Python-Markdown / Material transforms."""

from __future__ import annotations

from vault_from_md.plugins.mkdocs import transform


# --- Admonitions (!!!) ----------------------------------------------------


class TestBasicAdmonition:
    def test_note_becomes_callout(self) -> None:
        body = "!!! note\n    Important thing.\n"
        out = transform(body)
        assert out.startswith("> [!note]\n")
        assert "> Important thing." in out

    def test_all_types_recognized(self) -> None:
        for kind in ("note", "warning", "tip", "info", "danger", "caution", "hint", "question"):
            body = f"!!! {kind}\n    body\n"
            out = transform(body)
            assert f"> [!{kind}]" in out

    def test_tab_indented_content(self) -> None:
        body = "!!! note\n\tbody line\n"
        out = transform(body)
        assert "> body line" in out


class TestAdmonitionTitle:
    def test_title_attached_to_header(self) -> None:
        body = '!!! warning "Pay Attention"\n    Something dangerous.\n'
        out = transform(body)
        assert "> [!warning] Pay Attention" in out
        assert "> Something dangerous." in out

    def test_title_with_spaces(self) -> None:
        body = '!!! note "A longer title here"\n    x\n'
        out = transform(body)
        assert "> [!note] A longer title here" in out


class TestMultiLineAdmonition:
    def test_multi_line_content(self) -> None:
        body = (
            "!!! note\n"
            "    Line one.\n"
            "    Line two.\n"
            "    Line three.\n"
        )
        out = transform(body)
        assert "> [!note]" in out
        for line in ("Line one.", "Line two.", "Line three."):
            assert f"> {line}" in out

    def test_blank_lines_become_bare_quote_markers(self) -> None:
        body = (
            "!!! note\n"
            "    Paragraph one.\n"
            "\n"
            "    Paragraph two.\n"
        )
        out = transform(body)
        # Obsidian wants `>` (no content) to keep callout contiguous;
        # a truly-blank line would split it.
        assert "\n>\n" in out
        assert "> Paragraph one." in out
        assert "> Paragraph two." in out

    def test_admonition_stops_at_non_indented_line(self) -> None:
        body = (
            "!!! note\n"
            "    Inside.\n"
            "\n"
            "Outside paragraph.\n"
        )
        out = transform(body)
        assert "> [!note]" in out
        assert "> Inside." in out
        # "Outside paragraph." stays a normal paragraph, not prefixed.
        lines = out.split("\n")
        assert "Outside paragraph." in lines

    def test_preserves_nested_markdown_indent(self) -> None:
        # Lists deeper than 4 spaces inside an admonition should keep
        # their visible indentation in the callout output.
        body = (
            "!!! note\n"
            "    - item\n"
            "        - nested\n"
            "    - back out\n"
        )
        out = transform(body)
        assert "> - item" in out
        assert ">     - nested" in out  # 4-space internal indent preserved
        assert "> - back out" in out


# --- Collapsible admonitions (??? and ???+) -------------------------------


class TestCollapsibleAdmonition:
    def test_triple_question_marks_collapsed(self) -> None:
        body = "??? note\n    hidden content\n"
        out = transform(body)
        assert "> [!note]-" in out
        assert "> hidden content" in out

    def test_triple_question_plus_collapsible_open(self) -> None:
        body = "???+ tip\n    visible content\n"
        out = transform(body)
        assert "> [!tip]+" in out
        assert "> visible content" in out

    def test_collapsible_with_title(self) -> None:
        body = '??? warning "Click to expand"\n    hidden body\n'
        out = transform(body)
        assert "> [!warning]- Click to expand" in out


# --- Empty body admonition -------------------------------------------------


class TestEmptyBody:
    def test_header_only_admonition(self) -> None:
        body = "!!! note\nParagraph afterwards.\n"
        out = transform(body)
        assert "> [!note]" in out
        assert "Paragraph afterwards." in out
        # Header was emitted on its own line with no body.
        assert out.split("\n")[0] == "> [!note]"


# --- [TOC] stripping -------------------------------------------------------


class TestToc:
    def test_toc_on_own_line_stripped(self) -> None:
        body = "# Title\n\n[TOC]\n\nBody.\n"
        out = transform(body)
        assert "[TOC]" not in out
        assert "# Title" in out
        assert "Body." in out

    def test_toc_with_leading_whitespace_stripped(self) -> None:
        body = "    [TOC]\n"
        out = transform(body)
        assert "[TOC]" not in out

    def test_inline_toc_not_stripped(self) -> None:
        # If `[TOC]` appears inline with other text, it's not the
        # admonition marker — leave it alone.
        body = "The [TOC] in this sentence stays."
        assert transform(body) == body


# --- Pass-through / non-interference --------------------------------------


class TestPassThrough:
    def test_plain_markdown_unchanged(self) -> None:
        body = "# Title\n\nParagraph with [a link](to.md).\n\n- list\n- items\n"
        assert transform(body) == body

    def test_material_content_tabs_passthrough(self) -> None:
        # Tabs are pass-through: `=== "Tab name"` format. Not mangled,
        # just appears literally in the output vault.
        body = '=== "Python"\n    print("hi")\n=== "Ruby"\n    puts "hi"\n'
        out = transform(body)
        assert '=== "Python"' in out
        assert '=== "Ruby"' in out

    def test_non_admonition_exclamation_unchanged(self) -> None:
        # Only `!!!` starting at line begin triggers; normal `!` in
        # text stays.
        body = "This is urgent!!! Really!"
        assert transform(body) == body


# --- Idempotence -----------------------------------------------------------


class TestIdempotence:
    def test_double_transform_is_stable(self) -> None:
        body = (
            "!!! note\n"
            "    first.\n\n"
            '!!! warning "Heads up"\n'
            "    careful.\n\n"
            "??? tip\n"
            "    hidden.\n\n"
            "[TOC]\n"
        )
        once = transform(body)
        twice = transform(once)
        assert once == twice

    def test_transformed_output_has_no_mkdocs_markers(self) -> None:
        body = (
            "!!! note\n"
            "    x\n"
            "[TOC]\n"
            "??? tip\n"
            "    y\n"
        )
        out = transform(body)
        assert "!!!" not in out
        assert "???" not in out
        assert "[TOC]" not in out


# --- Realistic mixed sample -----------------------------------------------


class TestRealistic:
    def test_mkdocs_material_style_page(self) -> None:
        body = (
            "# Page Title\n\n"
            "[TOC]\n\n"
            "Some intro prose.\n\n"
            '!!! info "See also"\n'
            "    Related topic A.\n"
            "    Related topic B.\n\n"
            "More content.\n\n"
            "??? warning\n"
            "    Hidden warning by default.\n"
        )
        out = transform(body)
        # TOC gone.
        assert "[TOC]" not in out
        # Both admonitions became callouts.
        assert "> [!info] See also" in out
        assert "> Related topic A." in out
        assert "> [!warning]-" in out
        assert "> Hidden warning by default." in out
        # Normal prose untouched.
        assert "Some intro prose." in out
        assert "More content." in out
