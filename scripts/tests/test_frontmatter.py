"""Tests for vault_from_md.frontmatter."""

from __future__ import annotations

from vault_from_md.frontmatter import (
    Frontmatter,
    extract,
    merge,
    serialize,
)


class TestExtract:
    def test_no_frontmatter_returns_absent(self) -> None:
        src = "# Hello\n\nJust a body.\n"
        fm, body = extract(src)
        assert fm.present is False
        assert fm.data == {}
        assert body == src

    def test_extracts_simple_block(self) -> None:
        src = "---\ntitle: Hello\n---\n# body\n"
        fm, body = extract(src)
        assert fm.present is True
        assert fm.data == {"title": "Hello"}
        assert body == "# body\n"

    def test_extracts_list_values(self) -> None:
        src = "---\ntags:\n  - a\n  - b\n---\nbody"
        fm, body = extract(src)
        assert fm.data == {"tags": ["a", "b"]}

    def test_extracts_inline_list(self) -> None:
        src = "---\ntags: [a, b]\n---\nbody"
        fm, body = extract(src)
        assert fm.data == {"tags": ["a", "b"]}

    def test_empty_block_is_present(self) -> None:
        src = "---\n---\nbody"
        fm, body = extract(src)
        assert fm.present is True
        assert fm.data == {}
        assert body == "body"

    def test_missing_close_fence_returns_absent(self) -> None:
        src = "---\ntitle: bad\nno close fence\n# body"
        fm, body = extract(src)
        assert fm.present is False
        assert body == src  # source preserved

    def test_malformed_yaml_returns_absent_preserves_body(self) -> None:
        # YAML that parses but isn't a mapping (bare string) → refused.
        src = "---\nnot-a-mapping\n---\nbody"
        fm, body = extract(src)
        assert fm.present is False
        assert body == src  # full source preserved — no data loss

    def test_crlf_line_endings_handled(self) -> None:
        src = "---\r\ntitle: Windows\r\n---\r\nbody\r\n"
        fm, body = extract(src)
        assert fm.present is True
        assert fm.data == {"title": "Windows"}

    def test_bom_stripped(self) -> None:
        src = "\ufeff---\ntitle: WithBOM\n---\nbody"
        fm, body = extract(src)
        assert fm.data == {"title": "WithBOM"}

    def test_non_dict_top_level_list_refused(self) -> None:
        src = "---\n- a\n- b\n---\nbody"
        fm, body = extract(src)
        assert fm.present is False


class TestMerge:
    def test_adds_fields_to_empty_frontmatter(self) -> None:
        merged = merge(Frontmatter(), {"title": "Hi", "source": "x.md"})
        assert merged.data == {"title": "Hi", "source": "x.md"}
        assert merged.present is True

    def test_user_keys_win(self) -> None:
        existing = Frontmatter(data={"title": "User Title"}, present=True)
        merged = merge(existing, {"title": "Derived Title"})
        assert merged.data["title"] == "User Title"

    def test_adds_missing_keys(self) -> None:
        existing = Frontmatter(data={"title": "User"}, present=True)
        merged = merge(existing, {"title": "Derived", "source": "x.md"})
        assert merged.data == {"title": "User", "source": "x.md"}

    def test_skips_none_values(self) -> None:
        merged = merge(Frontmatter(), {"title": None})
        assert "title" not in merged.data

    def test_skips_empty_strings(self) -> None:
        merged = merge(Frontmatter(), {"description": "  "})
        assert "description" not in merged.data

    def test_preserves_non_overwritten_user_keys(self) -> None:
        existing = Frontmatter(
            data={"custom_key": "user value", "title": "User"},
            present=True,
        )
        merged = merge(existing, {"title": "Derived", "source": "x.md"})
        assert merged.data == {
            "custom_key": "user value",
            "title": "User",
            "source": "x.md",
        }


class TestMergeTags:
    def test_tags_additive_union(self) -> None:
        existing = Frontmatter(data={"tags": ["a", "b"]}, present=True)
        merged = merge(existing, {"tags": ["b", "c"]})
        # b deduped, c appended; order preserved (existing first, then new).
        assert merged.data["tags"] == ["a", "b", "c"]

    def test_tags_normalized_strip_hash(self) -> None:
        existing = Frontmatter(data={"tags": ["#techno", "music"]}, present=True)
        merged = merge(existing, {"tags": ["dance"]})
        assert merged.data["tags"] == ["techno", "music", "dance"]

    def test_tags_hyphen_to_underscore(self) -> None:
        # Why: `-` is Alap's WITHOUT operator in expressions.
        merged = merge(Frontmatter(), {"tags": ["framework-guides"]})
        assert merged.data["tags"] == ["framework_guides"]

    def test_tags_case_insensitive_dedupe(self) -> None:
        existing = Frontmatter(data={"tags": ["Music"]}, present=True)
        merged = merge(existing, {"tags": ["music"]})
        assert merged.data["tags"] == ["music"]  # one entry, lowercased

    def test_tags_scalar_existing_coerced_to_list(self) -> None:
        existing = Frontmatter(data={"tags": "alone"}, present=True)
        merged = merge(existing, {"tags": ["two"]})
        assert merged.data["tags"] == ["alone", "two"]

    def test_empty_tags_not_written(self) -> None:
        merged = merge(Frontmatter(), {"tags": []})
        assert "tags" not in merged.data


class TestSerialize:
    def test_empty_frontmatter_emits_body_only(self) -> None:
        body = "# Hello\n"
        assert serialize(Frontmatter(), body) == body

    def test_emits_fenced_yaml_block(self) -> None:
        fm = Frontmatter(data={"title": "Hello"}, present=True)
        out = serialize(fm, "# body\n")
        assert out.startswith("---\n")
        assert "title: Hello" in out
        assert "---\n# body" in out

    def test_preserves_key_order_not_sorted(self) -> None:
        fm = Frontmatter(
            data={"z": 1, "a": 2, "m": 3},
            present=True,
        )
        out = serialize(fm, "")
        yaml_section = out.split("---\n")[1]
        # z appears before a, which appears before m.
        z_pos = yaml_section.index("z:")
        a_pos = yaml_section.index("a:")
        m_pos = yaml_section.index("m:")
        assert z_pos < a_pos < m_pos


class TestRoundTripIdempotence:
    def test_serialize_extract_roundtrip_is_stable(self) -> None:
        src = "---\ntitle: Stable\ntags:\n- music\n---\n# Body\n"
        fm, body = extract(src)
        round1 = serialize(fm, body)
        fm2, body2 = extract(round1)
        round2 = serialize(fm2, body2)
        assert round1 == round2

    def test_merge_is_idempotent_on_second_run(self) -> None:
        # Run the full pipeline twice; second pass should produce the
        # same output. Critical for `pnpm run vault:docs` safety: a
        # re-run doesn't silently keep adding duplicate tags.
        src = "# Body\n"
        additions = {"title": "A", "tags": ["x"], "source": "a.md"}
        fm1, body1 = extract(src)
        merged1 = merge(fm1, additions)
        out1 = serialize(merged1, body1)

        fm2, body2 = extract(out1)
        merged2 = merge(fm2, additions)
        out2 = serialize(merged2, body2)

        assert out1 == out2
