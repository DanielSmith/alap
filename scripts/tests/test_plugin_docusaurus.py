"""Tests for vault_from_md.plugins.docusaurus — MDX admonitions, directives, imports."""

from __future__ import annotations

from vault_from_md.plugins.docusaurus import transform


# --- Admonitions ----------------------------------------------------------


class TestAdmonitionPlain:
    def test_plain_note_becomes_callout(self) -> None:
        body = ":::note\ncontent\n:::"
        out = transform(body)
        assert "> [!note]" in out
        assert "> content" in out
        assert ":::" not in out

    def test_all_types_recognized(self) -> None:
        for kind in ("note", "tip", "info", "warning", "danger", "caution"):
            body = f":::{kind}\nbody\n:::"
            out = transform(body)
            assert f"> [!{kind}]" in out

    def test_multi_line_body(self) -> None:
        body = ":::note\nLine one.\nLine two.\n:::"
        out = transform(body)
        assert "> Line one." in out
        assert "> Line two." in out

    def test_blank_lines_within_body(self) -> None:
        body = ":::note\nParagraph one.\n\nParagraph two.\n:::"
        out = transform(body)
        # Obsidian callout contiguity: bare `>` for blank lines.
        assert "\n>\n" in out
        assert "> Paragraph one." in out
        assert "> Paragraph two." in out


class TestAdmonitionLegacyTitle:
    def test_inline_title_after_type(self) -> None:
        body = ":::warning Pay Attention\nbody\n:::"
        out = transform(body)
        assert "> [!warning] Pay Attention" in out
        assert "> body" in out

    def test_title_with_spaces(self) -> None:
        body = ":::note Important Notice Here\nbody\n:::"
        out = transform(body)
        assert "> [!note] Important Notice Here" in out


class TestAdmonitionDirectiveTitle:
    def test_bracketed_title_converted(self) -> None:
        # Docusaurus 3.10+ preferred syntax.
        body = ":::warning[Pay Attention]\nbody\n:::"
        out = transform(body)
        assert "> [!warning] Pay Attention" in out
        assert "> body" in out

    def test_empty_bracketed_title(self) -> None:
        # `:::note[]` — empty brackets shouldn't produce "> [!note] ".
        body = ":::note[]\nbody\n:::"
        out = transform(body)
        assert out.split("\n")[0] == "> [!note]"


class TestAdmonitionShortcut:
    def test_class_id_shortcut_discarded(self) -> None:
        # Docusaurus 3.10+ admonition class/id shortcut. We discard
        # class/id (Obsidian doesn't use them) but the admonition
        # itself still becomes a callout.
        body = ":::note{.my-class #my-id}\nbody\n:::"
        out = transform(body)
        assert "> [!note]" in out
        assert "> body" in out
        assert ".my-class" not in out
        assert "#my-id" not in out

    def test_directive_title_plus_shortcut(self) -> None:
        body = ":::warning[Heads up]{.important}\nbody\n:::"
        out = transform(body)
        assert "> [!warning] Heads up" in out
        assert ".important" not in out


# --- Heading IDs ----------------------------------------------------------


class TestHeadingIds:
    def test_legacy_id_stripped(self) -> None:
        body = "## My Section {#my-section}\ncontent"
        out = transform(body)
        assert "## My Section" in out
        assert "{#my-section}" not in out

    def test_mdx_native_id_stripped(self) -> None:
        # Docusaurus 3.10+ MDX-native form.
        body = "## My Section {/* #my-section */}\ncontent"
        out = transform(body)
        assert "## My Section" in out
        assert "{/* #my-section */}" not in out

    def test_various_heading_levels(self) -> None:
        for n in range(1, 7):
            prefix = "#" * n
            body = f"{prefix} Heading {{#id{n}}}\n"
            out = transform(body)
            assert f"{prefix} Heading" in out
            assert f"{{#id{n}}}" not in out

    def test_both_forms_in_same_doc(self) -> None:
        body = (
            "## Old Form {#old-id}\n"
            "## New Form {/* #new-id */}\n"
        )
        out = transform(body)
        assert "## Old Form" in out
        assert "## New Form" in out
        assert "{#" not in out
        assert "*/}" not in out

    def test_heading_without_id_unchanged(self) -> None:
        body = "## Plain Heading\nbody\n"
        assert transform(body) == body


# --- Comments --------------------------------------------------------------


class TestHtmlComments:
    def test_html_comment_stripped(self) -> None:
        body = "Before <!-- hidden --> After"
        assert transform(body) == "Before  After"

    def test_multi_line_html_comment(self) -> None:
        body = "Before\n<!--\nhidden\nspans\nlines\n-->\nAfter"
        out = transform(body)
        assert "hidden" not in out
        assert "Before" in out
        assert "After" in out

    def test_multiple_html_comments(self) -> None:
        body = "A<!--x-->B<!--y-->C"
        assert transform(body) == "ABC"


class TestJsxComments:
    def test_jsx_comment_stripped(self) -> None:
        body = "Before {/* hidden */} After"
        assert transform(body) == "Before  After"

    def test_multi_line_jsx_comment(self) -> None:
        body = "Before\n{/*\nhidden\nspans\nlines\n*/}\nAfter"
        out = transform(body)
        assert "hidden" not in out
        assert "Before" in out
        assert "After" in out


# --- Leading imports -------------------------------------------------------


class TestLeadingImports:
    def test_single_import_stripped(self) -> None:
        body = "import X from 'something';\n\n# Title"
        out = transform(body)
        assert "import X" not in out
        assert "# Title" in out

    def test_multiple_imports_stripped(self) -> None:
        body = (
            "import Tabs from '@theme/Tabs';\n"
            "import TabItem from '@theme/TabItem';\n"
            "\n"
            "# Page Title\n"
        )
        out = transform(body)
        assert "import" not in out
        assert "# Page Title" in out

    def test_destructured_imports(self) -> None:
        body = "import { A, B, C } from 'pkg';\n\nbody"
        out = transform(body)
        assert "import" not in out
        assert "body" in out

    def test_import_mid_document_unchanged(self) -> None:
        # An `import` word mid-prose shouldn't be confused with a
        # leading-top-of-file import statement.
        body = "# Title\n\nTo import a package, run `npm install`.\n"
        assert transform(body) == body


# --- JSX wrappers ---------------------------------------------------------


class TestTabsWrapper:
    def test_tabs_outer_stripped_content_kept(self) -> None:
        body = "<Tabs>\n<TabItem value='py'>python content</TabItem>\n</Tabs>"
        out = transform(body)
        assert "<Tabs>" not in out
        assert "</Tabs>" not in out
        assert "<TabItem" not in out
        assert "</TabItem>" not in out
        assert "python content" in out

    def test_tabs_with_attrs(self) -> None:
        body = '<Tabs groupId="langs" defaultValue="py">\ninner\n</Tabs>'
        out = transform(body)
        assert "<Tabs" not in out
        assert "inner" in out

    def test_multiple_tabitems(self) -> None:
        body = (
            "<Tabs>\n"
            "<TabItem value='py' label='Python'>\n"
            "python code\n"
            "</TabItem>\n"
            "<TabItem value='rb' label='Ruby'>\n"
            "ruby code\n"
            "</TabItem>\n"
            "</Tabs>\n"
        )
        out = transform(body)
        assert "python code" in out
        assert "ruby code" in out
        assert "<TabItem" not in out


# --- Unknown JSX pass-through ---------------------------------------------


class TestUnknownJsx:
    def test_unknown_component_left_alone(self) -> None:
        body = "Before <MyCustomComponent prop='x' /> After"
        assert transform(body) == body

    def test_details_summary_pass_through(self) -> None:
        # `<details>` renders natively in Obsidian — pass through.
        body = "<details><summary>click</summary>hidden</details>"
        assert transform(body) == body


# --- Pass-through / non-interference --------------------------------------


class TestPassThrough:
    def test_plain_markdown_unchanged(self) -> None:
        body = "# Title\n\nParagraph [link](to.md).\n\n- item\n- another\n"
        assert transform(body) == body

    def test_triple_colons_outside_admonition_unchanged(self) -> None:
        # `:::` mid-prose without a line start shouldn't trigger.
        body = "Something about ratios like 3:::4."
        assert transform(body) == body


# --- Idempotence -----------------------------------------------------------


class TestIdempotence:
    def test_double_transform_is_stable(self) -> None:
        body = (
            "import X from 'pkg';\n\n"
            "# Title {#main}\n\n"
            ":::warning[Hey]\n"
            "body\n"
            ":::\n\n"
            "<!-- old comment -->\n\n"
            "{/* mdx comment */}\n\n"
            "<Tabs>\n<TabItem>x</TabItem>\n</Tabs>\n"
        )
        once = transform(body)
        twice = transform(once)
        assert once == twice

    def test_transformed_output_has_no_docusaurus_markers(self) -> None:
        body = (
            "import X from 'p';\n"
            ":::note\nbody\n:::\n"
            "## Title {#id}\n"
            "## Other {/* #otherid */}\n"
            "<!-- comment -->\n"
            "{/* jsx comment */}\n"
            "<Tabs>inner</Tabs>\n"
        )
        out = transform(body)
        assert "import " not in out
        assert ":::" not in out
        assert "{#id}" not in out
        assert "{/* #otherid */}" not in out
        assert "<!--" not in out
        # `<Tabs>` stripped.
        assert "<Tabs" not in out


# --- Realistic mixed sample -----------------------------------------------


class TestRealistic:
    def test_docusaurus_style_page(self) -> None:
        body = (
            "import Tabs from '@theme/Tabs';\n"
            "import TabItem from '@theme/TabItem';\n"
            "\n"
            "# Getting Started {#intro}\n"
            "\n"
            "Welcome. Here's a note:\n"
            "\n"
            ":::tip[Pro tip]\n"
            "Read the docs.\n"
            ":::\n"
            "\n"
            "And a warning:\n"
            "\n"
            ":::warning\n"
            "Careful now.\n"
            ":::\n"
            "\n"
            "<!-- remove me before publishing -->\n"
            "\n"
            "## Platform-specific {/* #platform */}\n"
            "\n"
            "<Tabs>\n"
            "<TabItem value='mac' label='macOS'>\n"
            "mac instructions\n"
            "</TabItem>\n"
            "<TabItem value='win' label='Windows'>\n"
            "windows instructions\n"
            "</TabItem>\n"
            "</Tabs>\n"
        )
        out = transform(body)
        # Imports stripped.
        assert "import " not in out
        # Heading IDs gone.
        assert "{#intro}" not in out
        assert "{/* #platform */}" not in out
        # Admonitions converted.
        assert "> [!tip] Pro tip" in out
        assert "> Read the docs." in out
        assert "> [!warning]" in out
        assert "> Careful now." in out
        # Comment stripped.
        assert "remove me" not in out
        # Tab content kept, tags gone.
        assert "mac instructions" in out
        assert "windows instructions" in out
        assert "<Tabs" not in out
        assert "<TabItem" not in out
        # Headings still there.
        assert "# Getting Started" in out
        assert "## Platform-specific" in out
