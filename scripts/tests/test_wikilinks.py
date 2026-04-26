"""Tests for vault_from_md.wikilinks."""

from __future__ import annotations

from pathlib import Path

from vault_from_md.wikilinks import rewrite_links


def _rewrite(body: str, current: Path, converted: frozenset[Path]) -> str:
    return rewrite_links(body, current_file_rel=current, converted_set=converted)


class TestBasicRewrite:
    def test_same_dir_link_rewrites(self) -> None:
        converted = frozenset({Path("cookbook/react.md"), Path("cookbook/other.md")})
        body = "See [React](react.md)."
        out = _rewrite(body, Path("cookbook/other.md"), converted)
        assert out == "See [[cookbook/react|React]]."

    def test_parent_relative_link_rewrites(self) -> None:
        converted = frozenset({Path("framework-guides/vue.md"), Path("cookbook/a.md")})
        body = "See [Vue](../framework-guides/vue.md)."
        out = _rewrite(body, Path("cookbook/a.md"), converted)
        assert out == "See [[framework-guides/vue|Vue]]."

    def test_fragment_preserved(self) -> None:
        converted = frozenset({Path("cookbook/lightbox.md")})
        body = "See [Usage](lightbox.md#usage)."
        out = _rewrite(body, Path("cookbook/other.md"), converted)
        assert out == "See [[cookbook/lightbox#usage|Usage]]."

    def test_text_matching_basename_elides_alias(self) -> None:
        converted = frozenset({Path("cookbook/react.md")})
        body = "See [react](react.md)."
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        assert out == "See [[cookbook/react]]."

    def test_text_matching_full_path_elides_alias(self) -> None:
        converted = frozenset({Path("cookbook/react.md")})
        body = "See [cookbook/react](react.md)."
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        assert out == "See [[cookbook/react]]."

    def test_url_encoded_target_decoded(self) -> None:
        converted = frozenset({Path("cookbook/my file.md")})
        body = "See [x](my%20file.md)."
        out = _rewrite(body, Path("cookbook/other.md"), converted)
        assert out == "See [[cookbook/my file|x]]."


class TestLeaveAlone:
    def test_external_http_preserved(self) -> None:
        body = "See [gh](https://github.com/x)."
        out = _rewrite(body, Path("x.md"), frozenset())
        assert out == body

    def test_external_http_lowercase(self) -> None:
        body = "See [ex](http://example.com)."
        out = _rewrite(body, Path("x.md"), frozenset())
        assert out == body

    def test_mailto_preserved(self) -> None:
        body = "Mail [me](mailto:a@b.c)."
        out = _rewrite(body, Path("x.md"), frozenset())
        assert out == body

    def test_tel_preserved(self) -> None:
        body = "Call [me](tel:+15551234)."
        out = _rewrite(body, Path("x.md"), frozenset())
        assert out == body

    def test_unknown_scheme_preserved(self) -> None:
        body = "Open [repo](git+https://github.com/x.git)."
        out = _rewrite(body, Path("x.md"), frozenset())
        assert out == body

    def test_pure_fragment_preserved(self) -> None:
        body = "See [top](#top)."
        out = _rewrite(body, Path("x.md"), frozenset())
        assert out == body

    def test_target_outside_converted_set_preserved(self) -> None:
        converted = frozenset({Path("a.md")})
        body = "See [x](missing.md)."
        out = _rewrite(body, Path("x.md"), converted)
        assert out == body

    def test_escape_above_root_preserved(self) -> None:
        # `../../../outside.md` — resolution would escape the source
        # root; keep the link untouched.
        converted = frozenset()
        body = "See [x](../../../outside.md)."
        out = _rewrite(body, Path("a/b.md"), converted)
        assert out == body

    def test_image_syntax_left_alone(self) -> None:
        converted = frozenset({Path("cookbook/flow.png")})
        body = "![alt](flow.png)"
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        # Images stay as standard Markdown regardless of set membership.
        assert out == body


class TestProtectedRegions:
    def test_existing_wikilink_not_double_processed(self) -> None:
        converted = frozenset({Path("cookbook/a.md")})
        body = "Already wikilinked: [[cookbook/a]]."
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        assert out == body

    def test_fenced_code_block_links_preserved(self) -> None:
        converted = frozenset({Path("cookbook/a.md")})
        body = "```\n[do not touch](a.md)\n```"
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        assert out == body

    def test_tilde_fenced_code_block_preserved(self) -> None:
        converted = frozenset({Path("cookbook/a.md")})
        body = "~~~\n[keep](a.md)\n~~~"
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        assert out == body

    def test_inline_code_link_preserved(self) -> None:
        converted = frozenset({Path("cookbook/a.md")})
        body = "Inline `[keep](a.md)` stays."
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        assert out == body

    def test_mixed_protected_and_unprotected(self) -> None:
        converted = frozenset({Path("cookbook/a.md")})
        body = "Real: [text](a.md). Code: `[x](a.md)`. Wikilink: [[cookbook/a]]."
        out = _rewrite(body, Path("cookbook/x.md"), converted)
        # Only the first link rewritten.
        assert out == (
            "Real: [[cookbook/a|text]]. Code: `[x](a.md)`. Wikilink: [[cookbook/a]]."
        )


class TestIdempotence:
    def test_second_pass_is_no_op(self) -> None:
        converted = frozenset({
            Path("cookbook/react.md"),
            Path("framework-guides/vue.md"),
        })
        body = (
            "See [React](react.md) and [Vue](../framework-guides/vue.md). "
            "External [gh](https://github.com)."
        )
        pass1 = _rewrite(body, Path("cookbook/x.md"), converted)
        pass2 = _rewrite(pass1, Path("cookbook/x.md"), converted)
        assert pass1 == pass2

    def test_idempotent_with_fragments_and_code(self) -> None:
        converted = frozenset({Path("cookbook/a.md")})
        body = (
            "See [A](a.md#section) and `[x](a.md)` and [[cookbook/a]]. "
            "```\n[keep](a.md)\n```"
        )
        pass1 = _rewrite(body, Path("cookbook/x.md"), converted)
        pass2 = _rewrite(pass1, Path("cookbook/x.md"), converted)
        assert pass1 == pass2


class TestMultipleLinks:
    def test_multiple_links_on_one_line(self) -> None:
        converted = frozenset({Path("a.md"), Path("b.md")})
        body = "[first](a.md) and [second](b.md)"
        out = _rewrite(body, Path("x.md"), converted)
        assert out == "[[a|first]] and [[b|second]]"

    def test_multiple_links_on_separate_lines(self) -> None:
        converted = frozenset({Path("a.md"), Path("b.md")})
        body = "See [A](a.md).\nAlso [B](b.md)."
        out = _rewrite(body, Path("x.md"), converted)
        assert out == "See [[a|A]].\nAlso [[b|B]]."
