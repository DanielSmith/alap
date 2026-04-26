"""Tests for vault_from_md.plugins.hugo — Hugo shortcode transforms."""

from __future__ import annotations

from vault_from_md.plugins.hugo import transform


# --- Docsy `heading` shortcode --------------------------------------------


class TestHeading:
    def test_heading_becomes_h2(self) -> None:
        assert transform('{{% heading "What\'s next" %}}') == "## What's next"

    def test_heading_trims_whitespace(self) -> None:
        assert transform('{{%   heading  "Intro"  %}}') == "## Intro"

    def test_heading_inside_paragraph(self) -> None:
        body = 'Before\n\n{{% heading "Middle" %}}\n\nAfter'
        expected = "Before\n\n## Middle\n\nAfter"
        assert transform(body) == expected


# --- Admonitions (angle form) ---------------------------------------------


class TestAdmonitionAngle:
    def test_note_becomes_callout(self) -> None:
        body = "{{< note >}}\nImportant thing.\n{{< /note >}}"
        out = transform(body)
        assert "> [!note]" in out
        assert "> Important thing." in out

    def test_warning_callout(self) -> None:
        body = "{{< warning >}}\nDanger ahead.\n{{< /warning >}}"
        out = transform(body)
        assert "> [!warning]" in out
        assert "> Danger ahead." in out

    def test_all_admonition_types_recognized(self) -> None:
        for kind in ("note", "warning", "tip", "info", "caution", "danger"):
            body = f"{{{{< {kind} >}}}}body\n{{{{< /{kind} >}}}}"
            out = transform(body)
            assert f"> [!{kind}]" in out

    def test_multi_line_body_preserved_with_prefix(self) -> None:
        body = (
            "{{< note >}}\n"
            "Line one.\n"
            "Line two.\n"
            "Line three.\n"
            "{{< /note >}}"
        )
        out = transform(body)
        lines = out.splitlines()
        assert lines[0] == "> [!note]"
        assert "> Line one." in out
        assert "> Line two." in out
        assert "> Line three." in out

    def test_blank_lines_in_body_keep_blockquote_contiguous(self) -> None:
        # Obsidian treats a bare `>` as a blank line within the
        # callout; a truly blank line breaks it into two callouts.
        body = "{{< note >}}\nParagraph one.\n\nParagraph two.\n{{< /note >}}"
        out = transform(body)
        # The blank line between paragraphs should be a `>` marker.
        assert "\n>\n" in out

    def test_attrs_on_opening_tag_are_tolerated(self) -> None:
        # Some themes use `{{< note title="Important" >}}`. We discard
        # attrs for now (plan marks title extraction as v2), but the
        # pattern must still match so the wrapper gets converted.
        body = '{{< note title="Pay Attention" >}}\nBody.\n{{< /note >}}'
        out = transform(body)
        assert "> [!note]" in out
        assert "> Body." in out


class TestAdmonitionPercent:
    def test_percent_form_also_handled(self) -> None:
        body = "{{% note %}}\nBody.\n{{% /note %}}"
        out = transform(body)
        assert "> [!note]" in out
        assert "> Body." in out

    def test_percent_warning(self) -> None:
        body = "{{% warning %}}\nCareful.\n{{% /warning %}}"
        assert "> [!warning]" in transform(body)


# --- pageinfo --------------------------------------------------------------


class TestPageinfo:
    def test_pageinfo_becomes_blockquote(self) -> None:
        body = "{{% pageinfo %}}\nAbout this page.\n{{% /pageinfo %}}"
        out = transform(body)
        assert "> About this page." in out
        assert "{{%" not in out
        # pageinfo is a plain blockquote, not an admonition, so no `[!]` tag.
        assert "[!" not in out

    def test_pageinfo_multi_line(self) -> None:
        body = (
            "{{% pageinfo %}}\n"
            "Line 1.\n"
            "Line 2.\n"
            "{{% /pageinfo %}}"
        )
        out = transform(body)
        assert "> Line 1." in out
        assert "> Line 2." in out


# --- figure ----------------------------------------------------------------


class TestFigure:
    def test_src_and_alt_become_image(self) -> None:
        body = '{{< figure src="/img/diagram.png" alt="Pipeline diagram" >}}'
        assert transform(body) == "![Pipeline diagram](/img/diagram.png)"

    def test_src_only_no_alt(self) -> None:
        body = '{{< figure src="/img/x.png" >}}'
        assert transform(body) == "![](/img/x.png)"

    def test_extra_attrs_tolerated(self) -> None:
        # Other attrs (caption, class, title) get dropped in v1.
        body = '{{< figure src="a.png" alt="A" caption="Fig. 1" class="hero" >}}'
        assert transform(body) == "![A](a.png)"

    def test_malformed_figure_passes_through(self) -> None:
        # No src → leave shortcode alone; user sees something's off
        # rather than getting silent data loss.
        body = '{{< figure alt="orphan" >}}'
        assert transform(body) == body


# --- toc -------------------------------------------------------------------


class TestToc:
    def test_toc_stripped(self) -> None:
        body = "# Title\n\n{{< toc >}}\n\nBody."
        out = transform(body)
        assert "{{< toc >}}" not in out

    def test_self_closing_toc_variant(self) -> None:
        body = "{{< toc />}}"
        assert transform(body) == ""


# --- highlight -------------------------------------------------------------


class TestHighlight:
    def test_highlight_becomes_fenced_code(self) -> None:
        body = '{{< highlight python >}}\nprint("hi")\n{{< /highlight >}}'
        out = transform(body)
        assert out.startswith("```python\n")
        assert 'print("hi")' in out
        assert out.rstrip().endswith("```")

    def test_highlight_with_options(self) -> None:
        body = (
            '{{< highlight python "linenos=true" >}}\n'
            "x = 1\n"
            "{{< /highlight >}}"
        )
        out = transform(body)
        assert out.startswith("```python\n")
        assert "x = 1" in out

    def test_highlight_preserves_internal_content(self) -> None:
        body = '{{< highlight bash >}}\necho "hello"\ncat /etc/passwd\n{{< /highlight >}}'
        out = transform(body)
        assert 'echo "hello"' in out
        assert "cat /etc/passwd" in out


# --- Pass-through / non-interference --------------------------------------


class TestPassThrough:
    def test_plain_markdown_unchanged(self) -> None:
        body = "# Title\n\nParagraph with [a link](to.md) and *emphasis*.\n"
        assert transform(body) == body

    def test_unknown_shortcode_left_alone(self) -> None:
        body = "{{< unknown-shortcode >}}content{{< /unknown-shortcode >}}"
        assert transform(body) == body

    def test_unknown_self_closing_shortcode(self) -> None:
        body = "{{< imgproc something >}}"
        assert transform(body) == body

    def test_braces_in_code_blocks_untouched(self) -> None:
        # The plugin uses string regex — it will actually rewrite
        # shortcode-shaped text even if it appears inside a fenced
        # code block. This is a known limitation; the wikilink
        # rewriter's stash-and-restore pattern protects code blocks
        # downstream but SSG plugins don't currently. Documenting via
        # test that this WILL change code-block contents.
        #
        # If this becomes a real problem (users losing literal
        # `{{% heading %}}` examples inside code blocks), we'll add
        # a region-protection pass similar to wikilinks.py.
        body = '```\n{{% heading "Not a real heading" %}}\n```'
        out = transform(body)
        # Current behaviour: heading fires even inside the fence.
        assert "## Not a real heading" in out


# --- Idempotence -----------------------------------------------------------


class TestIdempotence:
    def test_double_transform_is_stable(self) -> None:
        body = (
            '{{% heading "Intro" %}}\n\n'
            "{{< note >}}\nA note.\n{{< /note >}}\n\n"
            '{{< figure src="a.png" alt="A" >}}\n\n'
            "{{< toc >}}\n"
        )
        once = transform(body)
        twice = transform(once)
        assert once == twice

    def test_transformed_output_contains_no_hugo_markers(self) -> None:
        body = (
            '{{% heading "X" %}}\n'
            "{{< note >}}body{{< /note >}}\n"
            "{{< toc >}}"
        )
        out = transform(body)
        assert "{{%" not in out
        assert "{{<" not in out

    def test_unknown_shortcodes_preserve_as_pass_through(self) -> None:
        # Idempotence holds when we pass things through unchanged.
        body = "{{< unknown-x >}}x{{< /unknown-x >}}"
        assert transform(transform(body)) == transform(body)


# --- Realistic mixed sample -----------------------------------------------


class TestRealistic:
    def test_k8s_style_note_with_heading(self) -> None:
        # A shape straight out of the Kubernetes docs corpus.
        body = (
            "# Container Environment\n\n"
            "Some prose.\n\n"
            '{{% heading "What\'s next" %}}\n\n'
            "More prose.\n\n"
            "{{< note >}}\n"
            "This is a side note.\n"
            "{{< /note >}}\n"
        )
        out = transform(body)
        assert "## What's next" in out
        assert "> [!note]" in out
        assert "> This is a side note." in out
        # The original Hugo shortcodes are gone.
        assert "{{%" not in out
        assert "{{<" not in out
