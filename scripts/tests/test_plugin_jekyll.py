"""Tests for vault_from_md.plugins.jekyll — Liquid tag transforms."""

from __future__ import annotations

from vault_from_md.plugins.jekyll import transform


# --- comment --------------------------------------------------------------


class TestComment:
    def test_comment_block_stripped(self) -> None:
        body = "Before.\n{% comment %}internal note{% endcomment %}\nAfter."
        out = transform(body)
        assert "internal note" not in out
        assert "{% comment %}" not in out
        assert "{% endcomment %}" not in out
        assert "Before." in out
        assert "After." in out

    def test_multi_line_comment(self) -> None:
        body = "A\n{% comment %}\nline one\nline two\n{% endcomment %}\nB"
        out = transform(body)
        assert "line one" not in out
        assert "A" in out
        assert "B" in out


# --- raw ------------------------------------------------------------------


class TestRaw:
    def test_raw_delimiters_stripped_content_kept(self) -> None:
        body = "{% raw %}literal text{% endraw %}"
        assert transform(body) == "literal text"

    def test_raw_protects_liquid_syntax(self) -> None:
        # Inside raw, `{{ page.x }}` should survive the variable-output
        # strip that happens outside raw.
        body = "outside {{ page.title }} {% raw %}inside {{ page.title }}{% endraw %}"
        out = transform(body)
        # Outside was stripped (empty replacement), inside survives.
        assert "inside {{ page.title }}" in out
        # Outside's `{{ page.title }}` was replaced with empty string.
        assert "outside  " in out or "outside " in out

    def test_raw_protects_unknown_liquid(self) -> None:
        body = "{% raw %}{% some_unknown_tag %}{% endraw %}"
        assert transform(body) == "{% some_unknown_tag %}"

    def test_multi_line_raw_body(self) -> None:
        body = "{% raw %}\nline one\nline two\n{% endraw %}"
        assert transform(body) == "\nline one\nline two\n"


# --- highlight ------------------------------------------------------------


class TestHighlight:
    def test_highlight_becomes_fenced_code(self) -> None:
        body = "{% highlight python %}\nprint('hi')\n{% endhighlight %}"
        out = transform(body)
        assert out.startswith("```python\n")
        assert "print('hi')" in out
        assert out.rstrip().endswith("```")

    def test_highlight_with_options(self) -> None:
        body = "{% highlight ruby linenos %}\nputs 'x'\n{% endhighlight %}"
        out = transform(body)
        assert out.startswith("```ruby\n")
        assert "puts 'x'" in out

    def test_highlight_preserves_internal_lines(self) -> None:
        body = "{% highlight bash %}\necho a\necho b\necho c\n{% endhighlight %}"
        out = transform(body)
        for line in ("echo a", "echo b", "echo c"):
            assert line in out


# --- include --------------------------------------------------------------


class TestInclude:
    def test_include_stripped(self) -> None:
        body = "Before\n{% include footer.html %}\nAfter"
        out = transform(body)
        assert "{% include" not in out
        assert "Before" in out
        assert "After" in out

    def test_include_with_params_stripped(self) -> None:
        body = '{% include alert.html kind="warning" message="careful" %}'
        assert transform(body) == ""


# --- link / post_url ------------------------------------------------------


class TestLinkTags:
    def test_link_becomes_bare_path(self) -> None:
        body = '{% link _posts/2024-01-01-post.md %}'
        assert transform(body) == "_posts/2024-01-01-post.md"

    def test_post_url_becomes_bare_ref(self) -> None:
        body = '{% post_url 2024-01-01-post %}'
        assert transform(body) == "2024-01-01-post"

    def test_link_inline_in_markdown(self) -> None:
        body = 'See [post]({% link _posts/x.md %}) for more.'
        out = transform(body)
        assert "[post](_posts/x.md)" in out


# --- variable output ------------------------------------------------------


class TestVariables:
    def test_page_title_stripped(self) -> None:
        body = "Title: {{ page.title }}"
        assert transform(body) == "Title: "

    def test_site_base_stripped(self) -> None:
        body = "{{ site.baseurl }}/path"
        assert transform(body) == "/path"

    def test_page_with_filter_stripped(self) -> None:
        body = "{{ page.date | date: '%Y-%m-%d' }}"
        assert transform(body) == ""

    def test_non_page_site_variable_left_alone(self) -> None:
        # `{{ foo }}` that isn't page. or site. prefixed passes through —
        # we don't try to guess what it means.
        body = "{{ foo }}"
        assert transform(body) == body


# --- Pass-through / non-interference --------------------------------------


class TestPassThrough:
    def test_plain_markdown_unchanged(self) -> None:
        body = "# Title\n\nParagraph [link](to.md).\n"
        assert transform(body) == body

    def test_unknown_liquid_tag_left_alone(self) -> None:
        body = "{% capture x %}something{% endcapture %}"
        assert transform(body) == body

    def test_unknown_inline_tag_left_alone(self) -> None:
        body = "{% jsonify some_var %}"
        assert transform(body) == body


# --- Idempotence -----------------------------------------------------------


class TestIdempotence:
    def test_double_transform_is_stable(self) -> None:
        body = (
            "{% comment %}internal{% endcomment %}\n"
            "{% highlight python %}x = 1{% endhighlight %}\n"
            "{% include x.html %}\n"
            "{% link y.md %}\n"
            "{{ page.title }}\n"
            "{% raw %}{{ literal }}{% endraw %}\n"
        )
        once = transform(body)
        twice = transform(once)
        assert once == twice

    def test_transformed_output_contains_no_liquid(self) -> None:
        body = (
            "{% comment %}c{% endcomment %}"
            "{% highlight sh %}x{% endhighlight %}"
            "{% include y.html %}"
            "{{ page.x }}"
        )
        out = transform(body)
        # None of the liquid tag markers should remain (raw's content
        # can contain `{{ literal }}` but this body has no raw).
        assert "{% comment" not in out
        assert "{% highlight" not in out
        assert "{% include" not in out
        assert "{% endcomment" not in out
        assert "{% endhighlight" not in out


# --- Raw protection integration -------------------------------------------


class TestRawProtection:
    def test_raw_survives_full_transform_pipeline(self) -> None:
        # A raw block containing every other kind of liquid tag should
        # come out literal, proving the protection works against the
        # entire other-pattern set — not just one.
        body = (
            "Real output: {{ page.title }}\n"
            "{% raw %}"
            "Literal: {{ page.title }} {% include x.html %} {% link y %}"
            "{% endraw %}"
        )
        out = transform(body)
        assert "Real output: " in out  # stripped
        assert "Literal: {{ page.title }} {% include x.html %} {% link y %}" in out
