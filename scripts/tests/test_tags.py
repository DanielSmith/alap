"""Tests for vault_from_md.tags."""

from __future__ import annotations

from pathlib import Path

from vault_from_md.tags import (
    TagRule,
    default_directory_rules,
    derive_tags,
    normalize_tag,
)


class TestNormalizeTag:
    def test_lowercases(self) -> None:
        assert normalize_tag("Framework") == "framework"

    def test_strips_leading_hash(self) -> None:
        assert normalize_tag("#security") == "security"

    def test_hyphens_to_underscores(self) -> None:
        # Critical: `-` is Alap's WITHOUT operator, so `.framework-guides`
        # would parse as a subtraction. Normalize to underscore.
        assert normalize_tag("framework-guides") == "framework_guides"

    def test_strips_whitespace(self) -> None:
        assert normalize_tag("  idea  ") == "idea"

    def test_empty_stays_empty(self) -> None:
        assert normalize_tag("") == ""
        assert normalize_tag("   ") == ""
        assert normalize_tag("#") == ""

    def test_combined_transformations(self) -> None:
        assert normalize_tag("#My-Cool-Tag") == "my_cool_tag"


class TestDeriveTagsDirectoryRule:
    def test_matches_first_path_segment(self) -> None:
        rules = (TagRule(kind="dir", match="framework-guides", tag="framework_guides"),)
        assert derive_tags(Path("framework-guides/react.md"), rules) == ("framework_guides",)

    def test_matches_nested_files(self) -> None:
        rules = (TagRule(kind="dir", match="cookbook", tag="cookbook"),)
        assert derive_tags(Path("cookbook/sub/deep.md"), rules) == ("cookbook",)

    def test_no_match_when_first_segment_different(self) -> None:
        rules = (TagRule(kind="dir", match="cookbook", tag="cookbook"),)
        assert derive_tags(Path("other/file.md"), rules) == ()

    def test_no_match_on_middle_segment(self) -> None:
        # The rule matches first-segment only; a dir named `cookbook`
        # somewhere in the middle of the path doesn't match.
        rules = (TagRule(kind="dir", match="cookbook", tag="cookbook"),)
        assert derive_tags(Path("other/cookbook/file.md"), rules) == ()


class TestDeriveTagsPrefixRule:
    def test_matches_filename_prefix(self) -> None:
        rules = (TagRule(kind="prefix", match="idea-", tag="idea"),)
        assert derive_tags(Path("idea-lens.md"), rules) == ("idea",)

    def test_matches_in_subdir(self) -> None:
        # Prefix matches at any directory depth — the filename starts
        # with the prefix regardless of where it lives.
        rules = (TagRule(kind="prefix", match="plan-", tag="plan"),)
        assert derive_tags(Path("work/2026/plan-q1.md"), rules) == ("plan",)

    def test_no_match_when_not_prefix(self) -> None:
        rules = (TagRule(kind="prefix", match="plan-", tag="plan"),)
        assert derive_tags(Path("idea-plan.md"), rules) == ()


class TestDeriveTagsMultipleRules:
    def test_can_yield_multiple_tags(self) -> None:
        rules = (
            TagRule(kind="dir", match="cookbook", tag="cookbook"),
            TagRule(kind="prefix", match="lens-", tag="lens"),
        )
        # Both apply — the file is in cookbook/ AND starts with lens-.
        assert derive_tags(Path("cookbook/lens-intro.md"), rules) == ("cookbook", "lens")

    def test_preserves_rule_declaration_order(self) -> None:
        rules = (
            TagRule(kind="dir", match="x", tag="first"),
            TagRule(kind="dir", match="x", tag="second"),
        )
        tags = derive_tags(Path("x/note.md"), rules)
        assert tags == ("first", "second")

    def test_dedupes_identical_derived_tags(self) -> None:
        # Two rules both contributing the same (normalized) tag → one
        # output.
        rules = (
            TagRule(kind="dir", match="x", tag="common"),
            TagRule(kind="prefix", match="note", tag="common"),
        )
        assert derive_tags(Path("x/note.md"), rules) == ("common",)


class TestDeriveTagsNormalization:
    def test_tags_normalized_on_output(self) -> None:
        # Hyphenated rule.tag gets underscored in output.
        rules = (TagRule(kind="dir", match="framework-guides", tag="framework-guides"),)
        assert derive_tags(Path("framework-guides/react.md"), rules) == ("framework_guides",)

    def test_empty_tag_skipped(self) -> None:
        rules = (TagRule(kind="dir", match="x", tag=""),)
        assert derive_tags(Path("x/a.md"), rules) == ()


class TestDefaultDirectoryRules:
    def test_one_rule_per_top_level_dir(self, tmp_path: Path) -> None:
        (tmp_path / "alpha").mkdir()
        (tmp_path / "beta").mkdir()
        (tmp_path / "gamma").mkdir()
        rules = default_directory_rules(tmp_path)
        assert {r.match for r in rules} == {"alpha", "beta", "gamma"}
        assert all(r.kind == "dir" for r in rules)

    def test_skips_hidden_dirs(self, tmp_path: Path) -> None:
        (tmp_path / "visible").mkdir()
        (tmp_path / ".git").mkdir()
        (tmp_path / ".obsidian").mkdir()
        rules = default_directory_rules(tmp_path)
        assert {r.match for r in rules} == {"visible"}

    def test_skips_files(self, tmp_path: Path) -> None:
        (tmp_path / "visible").mkdir()
        (tmp_path / "README.md").write_text("x")
        rules = default_directory_rules(tmp_path)
        assert {r.match for r in rules} == {"visible"}

    def test_normalizes_derived_tag_names(self, tmp_path: Path) -> None:
        (tmp_path / "framework-guides").mkdir()
        rules = default_directory_rules(tmp_path)
        assert rules[0].tag == "framework_guides"
        # match field is the literal dir name, so it still matches the
        # actual path segment.
        assert rules[0].match == "framework-guides"

    def test_missing_source_returns_empty(self, tmp_path: Path) -> None:
        assert default_directory_rules(tmp_path / "does-not-exist") == ()


class TestAlapDocsScenario:
    """The tag ruleset vault_docs.py will ship with."""

    def _alap_rules(self) -> tuple[TagRule, ...]:
        return (
            TagRule(kind="dir", match="api-reference",    tag="api_reference"),
            TagRule(kind="dir", match="cookbook",         tag="cookbook"),
            TagRule(kind="dir", match="core-concepts",    tag="core_concepts"),
            TagRule(kind="dir", match="framework-guides", tag="framework_guides"),
            TagRule(kind="dir", match="getting-started",  tag="getting_started"),
            TagRule(kind="dir", match="integrations",     tag="integrations"),
            TagRule(kind="dir", match="packages",         tag="packages"),
            TagRule(kind="dir", match="plugins",          tag="plugins"),
            TagRule(kind="dir", match="provenance",       tag="provenance"),
        )

    def test_top_level_readme_untagged(self) -> None:
        assert derive_tags(Path("README.md"), self._alap_rules()) == ()
        assert derive_tags(Path("FAQ.md"), self._alap_rules()) == ()

    def test_cookbook_file_gets_cookbook_tag(self) -> None:
        assert derive_tags(Path("cookbook/lens.md"), self._alap_rules()) == ("cookbook",)

    def test_framework_guides_normalized(self) -> None:
        assert derive_tags(Path("framework-guides/react.md"), self._alap_rules()) == ("framework_guides",)

    def test_nested_cookbook_still_tagged(self) -> None:
        assert derive_tags(Path("cookbook/deep/nested.md"), self._alap_rules()) == ("cookbook",)
