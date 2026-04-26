"""Tests for vault_from_md.convert — the orchestrator."""

from __future__ import annotations

from pathlib import Path

import pytest

from vault_from_md.convert import (
    ConvertConfig,
    ConvertResult,
    convert,
)
from vault_from_md.tags import TagRule


# --- Helpers ---------------------------------------------------------------


def _write(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


# --- Invariant enforcement ------------------------------------------------


class TestInvariants:
    def test_refuses_same_source_and_dest(self, tmp_path: Path) -> None:
        (tmp_path / "a.md").write_text("x")
        with pytest.raises(ValueError, match="different directories"):
            convert(ConvertConfig(source_root=tmp_path, dest_root=tmp_path))

    def test_refuses_dest_inside_source(self, tmp_path: Path) -> None:
        (tmp_path / "a.md").write_text("x")
        with pytest.raises(ValueError, match="must not be inside source"):
            convert(ConvertConfig(
                source_root=tmp_path,
                dest_root=tmp_path / "output",
            ))

    def test_refuses_source_inside_dest(self, tmp_path: Path) -> None:
        src = tmp_path / "parent" / "source"
        src.mkdir(parents=True)
        (src / "a.md").write_text("x")
        with pytest.raises(ValueError, match="must not be inside destination"):
            convert(ConvertConfig(source_root=src, dest_root=tmp_path / "parent"))

    def test_refuses_missing_source(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError, match="does not exist"):
            convert(ConvertConfig(
                source_root=tmp_path / "ghost",
                dest_root=tmp_path / "out",
            ))

    def test_refuses_source_that_is_a_file(self, tmp_path: Path) -> None:
        f = tmp_path / "note.md"
        f.write_text("x")
        with pytest.raises(ValueError, match="not a directory"):
            convert(ConvertConfig(source_root=f, dest_root=tmp_path / "out"))


# --- Full-convert mode (no .obsidian/ at source) --------------------------


class TestFullConvert:
    def test_basic_file_written(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "hello.md", "# Hello\n\nFirst paragraph.\n")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert result.ok
        assert (dest / "hello.md").is_file()

    def test_source_untouched_after_convert(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        original = "# Hello\n\nBody.\n"
        _write(src / "hello.md", original)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        # Core invariant — source text is unchanged.
        assert _read(src / "hello.md") == original

    def test_frontmatter_added_with_derived_fields(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "hello.md", "# A Title\n\nThe first paragraph.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "hello.md")
        assert "title: A Title" in out
        assert "description: The first paragraph." in out
        assert "source: hello.md" in out
        assert "modified: " in out

    def test_title_falls_back_to_basename(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "no-heading.md", "Just body text, no heading.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "no-heading.md")
        assert "title: no-heading" in out

    def test_tags_derived_from_directory_rules(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "cookbook" / "lens.md", "# Lens\n\nThings.\n")
        rules = (TagRule(kind="dir", match="cookbook", tag="cookbook"),)
        convert(ConvertConfig(
            source_root=src,
            dest_root=dest,
            tag_rules=rules,
        ))
        out = _read(dest / "cookbook" / "lens.md")
        assert "tags:" in out
        assert "- cookbook" in out

    def test_wikilinks_rewritten_in_body(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nSee [B](b.md) for more.\n")
        _write(src / "b.md", "# B\n\nContent.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out_a = _read(dest / "a.md")
        assert "[[b|B]]" in out_a

    def test_nested_paths_mirrored(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a" / "b" / "c.md", "# C\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert (dest / "a" / "b" / "c.md").is_file()

    def test_media_files_copied(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "note.md", "# Note\n")
        (src / "img.png").write_bytes(b"pngdata")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert (dest / "img.png").read_bytes() == b"pngdata"

    def test_user_frontmatter_preserved(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "n.md",
            "---\ntitle: User Title\ncustom: mine\n---\n"
            "# Would-be Derived Title\n\nBody.\n"
        )
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "n.md")
        assert "title: User Title" in out
        assert "Would-be Derived Title" not in out.split("---")[1]  # not in YAML block
        assert "custom: mine" in out


# --- Augment-only mode (.obsidian/ at source) ------------------------------


class TestAugmentOnly:
    def _make_existing_vault(self, root: Path) -> None:
        """Build a minimal 'existing vault' — `.obsidian/` at root plus
        a note with wikilinks already in it."""
        (root / ".obsidian").mkdir(parents=True)
        (root / ".obsidian" / "workspace.json").write_text("{}")
        _write(root / "note.md",
            "---\ntags: [music]\n---\n"
            "# A Note\n\n"
            "See [[other]] for more context.\n"
        )
        _write(root / "other.md", "# Other\n")

    def test_augment_mode_auto_detected(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        self._make_existing_vault(src)
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert result.augment_mode is True

    def test_existing_wikilinks_preserved_exactly(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        self._make_existing_vault(src)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "note.md")
        assert "[[other]]" in out

    def test_augment_does_not_derive_title(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        self._make_existing_vault(src)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "note.md")
        # `title:` isn't added when augment mode is on (user chose not
        # to have one; the converter doesn't assume it knows better).
        yaml_block = out.split("---")[1]
        assert "title:" not in yaml_block

    def test_augment_still_adds_source_and_modified(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        self._make_existing_vault(src)
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "note.md")
        assert "source: note.md" in out
        assert "modified:" in out

    def test_augment_unions_existing_and_derived_tags(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        (src / ".obsidian").mkdir()
        _write(src / "daily" / "entry.md",
            "---\ntags: [reflection]\n---\nBody\n"
        )
        rules = (TagRule(kind="dir", match="daily", tag="daily"),)
        convert(ConvertConfig(
            source_root=src, dest_root=dest,
            tag_rules=rules,
        ))
        out = _read(dest / "daily" / "entry.md")
        assert "- reflection" in out
        assert "- daily" in out

    def test_augment_explicit_override(self, tmp_path: Path) -> None:
        # Source has no .obsidian/, but user forces augment mode.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nSee [B](b.md).\n")
        _write(src / "b.md", "# B\n")
        convert(ConvertConfig(
            source_root=src, dest_root=dest,
            augment_only=True,
        ))
        out = _read(dest / "a.md")
        # Link stays as standard markdown (no rewrite in augment mode).
        assert "[B](b.md)" in out

    def test_full_convert_explicit_override_on_vault(self, tmp_path: Path) -> None:
        # Source has .obsidian/ but user forces full convert.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        (src / ".obsidian").mkdir()
        _write(src / "a.md", "# A\n\nSee [B](b.md).\n")
        _write(src / "b.md", "# B\n")
        result = convert(ConvertConfig(
            source_root=src, dest_root=dest,
            augment_only=False,
        ))
        assert result.augment_mode is False
        out = _read(dest / "a.md")
        # Link was rewritten since full convert mode is forced.
        assert "[[b|B]]" in out


# --- Idempotence ----------------------------------------------------------


class TestIdempotence:
    def test_second_run_is_byte_identical(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nSee [B](b.md) and [gh](https://gh.com).\n")
        _write(src / "b.md", "# B\n\nText with [[a|link back]].\n")
        cfg = ConvertConfig(
            source_root=src,
            dest_root=dest,
            tag_rules=(TagRule(kind="dir", match="folder", tag="folder"),),
        )
        convert(cfg)
        first_a = _read(dest / "a.md")
        first_b = _read(dest / "b.md")
        convert(cfg)  # second pass over the same source
        assert _read(dest / "a.md") == first_a
        assert _read(dest / "b.md") == first_b


# --- Failure handling -----------------------------------------------------


class TestFailureIsolation:
    def test_unreadable_file_recorded_not_raised(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "good.md", "# Good\n")
        # Write a "bad" file as non-utf8 bytes — read_text raises
        # UnicodeDecodeError, which the orchestrator catches.
        bad = src / "bad.md"
        bad.parent.mkdir(parents=True, exist_ok=True)
        bad.write_bytes(b"\xff\xfe bad encoding")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert Path("good.md") in result.markdown_written
        assert Path("bad.md") in result.markdown_failed
        assert not result.ok  # failures present


# --- Result shape ---------------------------------------------------------


class TestExtensionNormalization:
    """MDX and .markdown sources write as .md in dest, since Obsidian
    only opens .md files as notes natively."""

    def test_mdx_source_written_as_md(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "garden.mdx", "# Entry\n\nGarden note body.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert (dest / "garden.md").is_file()
        assert not (dest / "garden.mdx").exists()

    def test_markdown_source_written_as_md(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "old.markdown", "# Old\n\nBody.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        assert (dest / "old.md").is_file()

    def test_source_frontmatter_preserves_original_extension(self, tmp_path: Path) -> None:
        # The `source:` field should reflect the original path so users
        # tracing back from the converted vault find the real file.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "entry.mdx", "# Entry\n\nBody.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "entry.md")
        assert "source: entry.mdx" in out

    def test_mdx_link_rewrites_to_md_target(self, tmp_path: Path) -> None:
        # A `[text](foo.mdx)` link should resolve against the dest-side
        # `foo.md` and produce a normal `[[foo|text]]` wikilink.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nSee [Garden](garden.mdx).\n")
        _write(src / "garden.mdx", "# Garden\n\nBody.\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out_a = _read(dest / "a.md")
        assert "[[garden|Garden]]" in out_a

    def test_mixed_md_and_mdx_both_convert(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "classic.md", "# Classic\n")
        _write(src / "garden.mdx", "# Garden\n")
        _write(src / "old.markdown", "# Old\n")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert len(result.markdown_written) == 3
        assert (dest / "classic.md").is_file()
        assert (dest / "garden.md").is_file()
        assert (dest / "old.md").is_file()


class TestDescriptionDerivation:
    """First-paragraph → description field, with link syntax stripped."""

    def test_strips_markdown_link_syntax(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "n.md",
            "# Title\n\n"
            "See [the guide](guide.md) for details.\n"
        )
        _write(src / "guide.md", "# Guide\n")
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "n.md")
        # The description holds the text, not the `[text](url)` form.
        assert "See the guide for details." in out
        assert "[the guide](guide.md)" not in out.split("---")[1]  # not in YAML block

    def test_strips_wikilink_syntax(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "n.md",
            "# Title\n\n"
            "Check [[notes|my notes]] and [[home]].\n"
        )
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "n.md")
        yaml_block = out.split("---")[1]
        assert "my notes" in yaml_block
        assert "home" in yaml_block
        assert "[[" not in yaml_block

    def test_strips_image_syntax_keeps_alt(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "n.md",
            "# Title\n\n"
            "![diagram of flow](flow.png) explains the pipeline.\n"
        )
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "n.md")
        yaml_block = out.split("---")[1]
        assert "diagram of flow" in yaml_block
        assert "flow.png" not in yaml_block

    def test_skips_paragraph_that_becomes_empty_after_stripping(self, tmp_path: Path) -> None:
        # First paragraph was pure links with no surrounding text, which
        # leaves mostly separators after stripping. Stripper returns the
        # text parts but separator chars survive — that's fine, the
        # description still conveys the sibling-link labels.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "n.md",
            "# Title\n\n"
            "![](img.png)![](img2.png)\n\n"
            "Real content here.\n"
        )
        convert(ConvertConfig(source_root=src, dest_root=dest))
        out = _read(dest / "n.md")
        yaml_block = out.split("---")[1]
        # Since the first paragraph strips to empty (two images with no
        # alt text), the second paragraph is used.
        assert "Real content here." in yaml_block


class TestSSGPlugins:
    """
    Integration of the SSG plugin scaffolding into `convert()`.

    These tests validate the plumbing (config → loader → per-file
    transform loop) using the `noop` plugin and monkeypatched fakes.
    Per-plugin pattern coverage lives in each plugin's own test file
    (test_plugin_hugo.py, etc.) as those plugins land.
    """

    def test_default_no_plugins_behaves_as_before(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nbody text\n")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert result.ok
        # No plugin was requested; body is untouched.
        assert "body text" in _read(dest / "a.md")

    def test_plugin_on_neutral_content_is_byte_identical(self, tmp_path: Path) -> None:
        # A real plugin (hugo) applied to markdown that contains no
        # Hugo shortcodes should produce the same output as running
        # with no plugins at all. Validates that enabling a plugin is
        # harmless when the input doesn't contain its target syntax.
        src = tmp_path / "src"
        dest_a = tmp_path / "dest-a"
        dest_b = tmp_path / "dest-b"
        _write(src / "a.md", "# A\n\nplain body with no shortcodes\n")
        convert(ConvertConfig(source_root=src, dest_root=dest_a))
        convert(ConvertConfig(source_root=src, dest_root=dest_b, ssg_plugins=("hugo",)))
        assert _read(dest_a / "a.md") == _read(dest_b / "a.md")

    def test_unknown_plugin_dropped_gracefully(self, tmp_path: Path) -> None:
        # Loader silently drops unknowns (CLI warns upstream). `convert`
        # proceeds with no transforms applied and no crash.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nbody\n")
        result = convert(ConvertConfig(
            source_root=src,
            dest_root=dest,
            ssg_plugins=("xyzzy-does-not-exist",),
        ))
        assert result.ok
        assert "body" in _read(dest / "a.md")

    def test_transforms_actually_run_on_body(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        # Replace the loader with a stub that returns an uppercasing
        # transform. If the convert pipeline applies it, body text
        # lands uppercased in the output.
        def uppercase(body: str) -> str:
            return body.upper()

        from vault_from_md import plugins
        monkeypatch.setattr(
            plugins, "load",
            lambda names: [uppercase] if names else [],
        )

        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n\nbody text here\n")
        convert(ConvertConfig(
            source_root=src,
            dest_root=dest,
            ssg_plugins=("fake-plugin",),
        ))
        out = _read(dest / "a.md")
        assert "BODY TEXT HERE" in out
        # Frontmatter is not transformed — only the body runs through
        # SSG plugins.
        assert "source: a.md" in out

    def test_transforms_run_in_declared_order(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        # Two fakes: first appends " FIRST", second appends " SECOND".
        # If run in order, the output ends with " FIRST SECOND". If
        # reversed, " SECOND FIRST". Asserts order preservation.
        def first(body: str) -> str:
            return body.rstrip() + " FIRST\n"

        def second(body: str) -> str:
            return body.rstrip() + " SECOND\n"

        from vault_from_md import plugins
        monkeypatch.setattr(
            plugins, "load",
            lambda names: [first, second],
        )

        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "body\n")
        convert(ConvertConfig(
            source_root=src,
            dest_root=dest,
            ssg_plugins=("a", "b"),
        ))
        out = _read(dest / "a.md")
        # second runs after first, so "FIRST SECOND" appears in order.
        first_pos = out.index("FIRST")
        second_pos = out.index("SECOND")
        assert first_pos < second_pos

    def test_transform_runs_before_description_derivation(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        # The derived description reads the body AFTER transforms run.
        # A transform that replaces the opening paragraph should be
        # reflected in the resulting `description:` frontmatter field.
        def replace_body(body: str) -> str:
            return "CLEANED UP FIRST PARAGRAPH.\n"

        from vault_from_md import plugins
        monkeypatch.setattr(
            plugins, "load",
            lambda names: [replace_body],
        )

        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "raw shortcode body that should never be seen\n")
        convert(ConvertConfig(
            source_root=src,
            dest_root=dest,
            ssg_plugins=("fake",),
        ))
        out = _read(dest / "a.md")
        yaml_block = out.split("---")[1]
        assert "CLEANED UP FIRST PARAGRAPH." in yaml_block
        assert "raw shortcode body" not in yaml_block

    def test_transform_output_can_become_wikilink(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        # Transforms run before wikilink rewrite. If a transform
        # produces a standard `[text](target.md)` link, the wikilink
        # rewriter should then turn it into `[[target|text]]`. Uses
        # text distinct from the basename so the alias survives the
        # rewriter's "elide when text == basename" optimization.
        def produce_link(body: str) -> str:
            return body + "\nSee [this other page](other.md).\n"

        from vault_from_md import plugins
        monkeypatch.setattr(
            plugins, "load",
            lambda names: [produce_link],
        )

        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n")
        _write(src / "other.md", "# Other\n")
        convert(ConvertConfig(
            source_root=src,
            dest_root=dest,
            ssg_plugins=("fake",),
        ))
        out = _read(dest / "a.md")
        assert "[[other|this other page]]" in out


class TestFileSizeCap:
    def test_oversize_file_skipped_not_read(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        # Build a 150-byte "big" file and set a 100-byte cap so we
        # don't have to write megabytes in a unit test.
        (src / "big.md").write_text("x" * 150)
        (src / "small.md").write_text("# tiny\n")
        result = convert(ConvertConfig(
            source_root=src, dest_root=dest,
            max_file_size_bytes=100,
        ))
        assert Path("big.md") in result.markdown_size_skipped
        assert Path("small.md") in result.markdown_written
        # Oversize file was NOT written to dest.
        assert not (dest / "big.md").exists()
        assert (dest / "small.md").exists()

    def test_under_cap_files_convert_normally(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "normal.md", "# Normal\n\nbody\n")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert result.markdown_size_skipped == ()
        assert len(result.markdown_written) == 1

    def test_result_ok_when_only_size_skips(self, tmp_path: Path) -> None:
        # Size skips are policy decisions, not failures — `ok` should
        # still be True even when some files were skipped.
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        src.mkdir()
        (src / "big.md").write_text("x" * 1000)
        (src / "ok.md").write_text("# ok\n")
        result = convert(ConvertConfig(
            source_root=src, dest_root=dest,
            max_file_size_bytes=50,
        ))
        assert result.ok
        assert len(result.markdown_size_skipped) == 1


class TestResult:
    def test_scan_exposed_on_result(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        _write(src / "a.md", "# A\n")
        (src / "img.png").write_bytes(b"x")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        assert len(result.scan.markdown) == 1
        assert len(result.scan.media) == 1

    def test_all_markdown_accounted_for(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        for name in ["a.md", "b.md", "sub/c.md"]:
            _write(src / name, "# heading\n")
        result = convert(ConvertConfig(source_root=src, dest_root=dest))
        total = len(result.markdown_written) + len(result.markdown_failed)
        assert total == len(result.scan.markdown)
