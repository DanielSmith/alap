"""Tests for vault_from_md.scan."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from vault_from_md.scan import (
    DEFAULT_EXCLUDES,
    MEDIA_EXTENSIONS,
    MAX_SCAN_DEPTH,
    OBSIDIAN_CONFIG_DIR,
    ScanResult,
    scan,
)


def _touch(p: Path, *, size: int = 0) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(b"x" * size)


class TestBasicScan:
    def test_empty_directory(self, tmp_path: Path) -> None:
        r = scan(tmp_path)
        assert r.markdown == ()
        assert r.media == ()
        assert r.total_bytes == 0
        assert r.symlink_count == 0
        assert not r.is_existing_vault

    def test_rejects_non_directory(self, tmp_path: Path) -> None:
        with pytest.raises(ValueError):
            scan(tmp_path / "does-not-exist")

    def test_collects_markdown_files(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a.md", size=10)
        _touch(tmp_path / "b.md", size=20)
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("a.md"), Path("b.md")]
        assert r.total_bytes == 30

    def test_categorizes_by_extension(self, tmp_path: Path) -> None:
        _touch(tmp_path / "doc.md")
        _touch(tmp_path / "img.png")
        _touch(tmp_path / "audio.mp3")
        _touch(tmp_path / "archive.zip")  # not in allowlist
        r = scan(tmp_path)
        assert len(r.markdown) == 1
        assert len(r.media) == 2
        assert r.media_by_extension == {"mp3": 1, "png": 1}

    def test_extension_case_normalization(self, tmp_path: Path) -> None:
        _touch(tmp_path / "A.MD")
        _touch(tmp_path / "photo.PNG")
        r = scan(tmp_path)
        assert len(r.markdown) == 1
        assert r.media[0].extension == "png"

    def test_mdx_files_recognized_as_markdown(self, tmp_path: Path) -> None:
        _touch(tmp_path / "note.mdx")
        _touch(tmp_path / "classic.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 2
        assert {m.rel_path.name for m in r.markdown} == {"note.mdx", "classic.md"}

    def test_markdown_ext_recognized(self, tmp_path: Path) -> None:
        _touch(tmp_path / "old.markdown")
        r = scan(tmp_path)
        assert len(r.markdown) == 1

    def test_unknown_extensions_still_skipped(self, tmp_path: Path) -> None:
        # The widened markdown set shouldn't accidentally sweep up
        # other text formats that happen to look document-ish.
        _touch(tmp_path / "notes.txt")
        _touch(tmp_path / "notes.rst")
        _touch(tmp_path / "notes.org")
        _touch(tmp_path / "real.md")
        r = scan(tmp_path)
        assert [m.rel_path.name for m in r.markdown] == ["real.md"]


class TestVaultDetection:
    def test_detects_obsidian_vault(self, tmp_path: Path) -> None:
        (tmp_path / OBSIDIAN_CONFIG_DIR).mkdir()
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert r.is_existing_vault is True

    def test_non_vault_has_flag_false(self, tmp_path: Path) -> None:
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert r.is_existing_vault is False

    def test_obsidian_as_file_not_dir_is_not_vault(self, tmp_path: Path) -> None:
        # Weird edge case: someone has a file named `.obsidian` — not a vault.
        _touch(tmp_path / OBSIDIAN_CONFIG_DIR)
        r = scan(tmp_path)
        assert r.is_existing_vault is False


class TestExcludes:
    def test_default_excludes_obsidian_content(self, tmp_path: Path) -> None:
        (tmp_path / OBSIDIAN_CONFIG_DIR).mkdir()
        _touch(tmp_path / OBSIDIAN_CONFIG_DIR / "workspace.json")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 1

    def test_default_excludes_node_modules(self, tmp_path: Path) -> None:
        _touch(tmp_path / "node_modules" / "lib" / "README.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("note.md")]

    def test_default_excludes_python_venv(self, tmp_path: Path) -> None:
        _touch(tmp_path / ".venv" / "lib" / "site-packages" / "thing.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 1

    def test_default_excludes_pycache(self, tmp_path: Path) -> None:
        _touch(tmp_path / "src" / "__pycache__" / "module.pyc")
        _touch(tmp_path / "src" / "module.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 1

    def test_default_excludes_laravel_vendor(self, tmp_path: Path) -> None:
        _touch(tmp_path / "vendor" / "laravel" / "framework" / "README.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 1

    def test_default_excludes_laravel_storage_framework(self, tmp_path: Path) -> None:
        _touch(tmp_path / "storage" / "framework" / "cache" / "data.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 1

    def test_default_excludes_svn(self, tmp_path: Path) -> None:
        _touch(tmp_path / ".svn" / "entries" / "x.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("note.md")]

    def test_default_excludes_hg(self, tmp_path: Path) -> None:
        _touch(tmp_path / ".hg" / "store" / "x.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("note.md")]

    def test_default_excludes_bzr(self, tmp_path: Path) -> None:
        _touch(tmp_path / ".bzr" / "repository" / "x.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("note.md")]

    def test_default_excludes_cvs(self, tmp_path: Path) -> None:
        _touch(tmp_path / "CVS" / "Entries.md")
        _touch(tmp_path / "note.md")
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("note.md")]

    def test_default_excludes_ds_store(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a" / ".DS_Store")
        _touch(tmp_path / "a" / "note.md")
        r = scan(tmp_path)
        # .DS_Store isn't a markdown or media ext so it wouldn't count
        # anyway, but this asserts the pattern is compiled/applied.
        assert len(r.markdown) == 1

    def test_user_excludes_applied_in_addition(self, tmp_path: Path) -> None:
        _touch(tmp_path / "keep.md")
        _touch(tmp_path / "drafts" / "skip.md")
        r = scan(tmp_path, exclude=["**/drafts/**"])
        assert [m.rel_path for m in r.markdown] == [Path("keep.md")]


class TestIncludes:
    def test_include_restricts_to_matching_paths(self, tmp_path: Path) -> None:
        _touch(tmp_path / "docs" / "a.md")
        _touch(tmp_path / "extras" / "b.md")
        r = scan(tmp_path, include=["docs/**"])
        assert [m.rel_path for m in r.markdown] == [Path("docs/a.md")]

    def test_empty_include_means_include_all(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a.md")
        r1 = scan(tmp_path, include=None)
        r2 = scan(tmp_path, include=[])
        assert len(r1.markdown) == len(r2.markdown) == 1


class TestSymlinks:
    @pytest.mark.skipif(
        os.name == "nt",
        reason="symlink creation requires admin on Windows",
    )
    def test_records_symlink_without_following(self, tmp_path: Path) -> None:
        real = tmp_path / "real"
        real.mkdir()
        _touch(real / "inside.md")
        link = tmp_path / "link"
        link.symlink_to(real)
        r = scan(tmp_path)
        # The symlink itself is recorded once…
        assert r.symlink_count == 1
        assert Path("link") in r.symlinks_skipped
        # …and the content behind it is NOT double-counted via the symlink.
        assert [m.rel_path for m in r.markdown] == [Path("real/inside.md")]

    @pytest.mark.skipif(
        os.name == "nt",
        reason="symlink creation requires admin on Windows",
    )
    def test_symlinks_unique_by_path(self, tmp_path: Path) -> None:
        real = tmp_path / "target.md"
        real.write_text("x")
        (tmp_path / "a.md").symlink_to(real)
        (tmp_path / "b.md").symlink_to(real)
        r = scan(tmp_path)
        # Two distinct symlinks, both recorded.
        assert r.symlink_count == 2
        assert len(r.symlinks_skipped) == 2


class TestDepthLimit:
    def test_stops_at_max_depth_and_reports(self, tmp_path: Path) -> None:
        # Build a chain exactly one deeper than the limit.
        deep = tmp_path
        for i in range(MAX_SCAN_DEPTH + 1):
            deep = deep / f"d{i}"
        _touch(deep / "leaf.md")
        r = scan(tmp_path)
        # The leaf was at MAX_SCAN_DEPTH + 2 segments deep; scan refused
        # to descend that far and recorded the directory it stopped at.
        assert r.markdown == ()
        assert len(r.depth_limit_reached) >= 1

    def test_respects_user_max_depth_override(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a" / "b" / "c" / "deep.md")
        r = scan(tmp_path, max_depth=2)
        # `a/b/c/deep.md` is 4 segments → walker stops at a/b (depth 2)
        # and never reaches c/ or its file.
        assert r.markdown == ()
        assert len(r.depth_limit_reached) >= 1

    def test_shallow_tree_does_not_hit_limit(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a" / "b" / "shallow.md")
        r = scan(tmp_path)
        assert len(r.markdown) == 1
        assert r.depth_limit_reached == ()


class TestFileLimit:
    def test_file_limit_defaults_not_hit_on_small_tree(self, tmp_path: Path) -> None:
        for i in range(5):
            _touch(tmp_path / f"note-{i}.md")
        r = scan(tmp_path)
        assert r.file_limit_reached is False
        assert len(r.markdown) == 5

    def test_file_limit_respected_when_custom(self, tmp_path: Path) -> None:
        for i in range(20):
            _touch(tmp_path / f"note-{i:02d}.md")
        r = scan(tmp_path, max_files=10)
        assert r.file_limit_reached is True
        assert len(r.markdown) + len(r.media) == 10

    def test_file_limit_flag_clear_when_under_cap(self, tmp_path: Path) -> None:
        _touch(tmp_path / "only.md")
        r = scan(tmp_path, max_files=100)
        assert r.file_limit_reached is False


class TestResultProperties:
    def test_total_bytes_sums_markdown_and_media(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a.md", size=100)
        _touch(tmp_path / "b.png", size=250)
        r = scan(tmp_path)
        assert r.total_bytes == 350

    def test_markdown_dirs_are_unique(self, tmp_path: Path) -> None:
        _touch(tmp_path / "x" / "1.md")
        _touch(tmp_path / "x" / "2.md")
        _touch(tmp_path / "y" / "3.md")
        r = scan(tmp_path)
        assert r.markdown_dirs == frozenset({Path("x"), Path("y")})

    def test_media_by_extension_sorted_by_count_desc(self, tmp_path: Path) -> None:
        _touch(tmp_path / "a.png")
        _touch(tmp_path / "b.png")
        _touch(tmp_path / "c.png")
        _touch(tmp_path / "d.mp3")
        r = scan(tmp_path)
        # png (3) listed before mp3 (1)
        assert list(r.media_by_extension.keys()) == ["png", "mp3"]


class TestOrderingDeterminism:
    def test_markdown_sorted_by_relpath(self, tmp_path: Path) -> None:
        for name in ["c.md", "a.md", "b.md"]:
            _touch(tmp_path / name)
        r = scan(tmp_path)
        assert [m.rel_path for m in r.markdown] == [Path("a.md"), Path("b.md"), Path("c.md")]
