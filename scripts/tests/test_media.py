"""Tests for vault_from_md.media."""

from __future__ import annotations

import os
import stat
from pathlib import Path

import pytest

from vault_from_md.media import copy_media
from vault_from_md.scan import MediaFile


def _make_media(source_root: Path, rel: str, content: bytes = b"x") -> MediaFile:
    abs_path = source_root / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(content)
    return MediaFile(
        abs_path=abs_path,
        rel_path=Path(rel),
        extension=Path(rel).suffix.lstrip(".").lower(),
        size=len(content),
    )


class TestBasicCopy:
    def test_copies_single_file(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        m = _make_media(src, "flow.png", b"pixels")
        result = copy_media((m,), dest_root=dest)
        assert result.ok
        assert result.copied == (Path("flow.png"),)
        assert (dest / "flow.png").read_bytes() == b"pixels"
        assert result.bytes_copied == 6

    def test_creates_dest_root_if_missing(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest" / "deeply" / "nested"
        m = _make_media(src, "a.png")
        copy_media((m,), dest_root=dest)
        assert dest.is_dir()

    def test_empty_input_produces_empty_result(self, tmp_path: Path) -> None:
        dest = tmp_path / "dest"
        result = copy_media((), dest_root=dest)
        assert result.copied == ()
        assert result.skipped == ()
        assert result.bytes_copied == 0
        assert result.ok


class TestMirroredTree:
    def test_nested_paths_mirrored(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        m1 = _make_media(src, "cookbook/flow.png")
        m2 = _make_media(src, "api-reference/lightbox.jpg")
        result = copy_media((m1, m2), dest_root=dest)
        assert result.ok
        assert (dest / "cookbook" / "flow.png").is_file()
        assert (dest / "api-reference" / "lightbox.jpg").is_file()

    def test_deep_nesting_created(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        m = _make_media(src, "a/b/c/d/e/deep.png")
        copy_media((m,), dest_root=dest)
        assert (dest / "a" / "b" / "c" / "d" / "e" / "deep.png").is_file()


class TestPreservationSemantics:
    def test_content_matches_source(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        content = b"some binary content \x00 \xff"
        m = _make_media(src, "bin.png", content=content)
        copy_media((m,), dest_root=dest)
        assert (dest / "bin.png").read_bytes() == content

    def test_mtime_preserved(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        m = _make_media(src, "a.png")
        # Set a distinct mtime on the source
        fixed_mtime = 1_000_000_000.0  # 2001-09-09 UTC
        os.utime(m.abs_path, (fixed_mtime, fixed_mtime))
        copy_media((m,), dest_root=dest)
        # Copy should have the same mtime (shutil.copy2 preserves it)
        copied_mtime = (dest / "a.png").stat().st_mtime
        assert abs(copied_mtime - fixed_mtime) < 1  # 1s fudge for fs rounding

    @pytest.mark.skipif(os.name == "nt", reason="mode bits differ on Windows")
    def test_mode_preserved(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        m = _make_media(src, "exec.png")
        # Make source file executable (distinctive mode).
        src_mode = stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR | stat.S_IRGRP
        os.chmod(m.abs_path, src_mode)
        copy_media((m,), dest_root=dest)
        copied_mode = stat.S_IMODE((dest / "exec.png").stat().st_mode)
        assert copied_mode == src_mode


class TestOverwrite:
    def test_existing_dest_file_overwritten(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        (dest / "a.png").parent.mkdir(parents=True, exist_ok=True)
        (dest / "a.png").write_bytes(b"old content")
        m = _make_media(src, "a.png", content=b"new content")
        result = copy_media((m,), dest_root=dest)
        assert result.ok
        assert (dest / "a.png").read_bytes() == b"new content"


class TestFailureIsolation:
    def test_missing_source_marked_skipped_not_raised(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        # Build a MediaFile whose abs_path doesn't exist.
        m = MediaFile(
            abs_path=src / "ghost.png",
            rel_path=Path("ghost.png"),
            extension="png",
            size=0,
        )
        result = copy_media((m,), dest_root=dest)
        assert not result.ok
        assert result.copied == ()
        assert result.skipped == (Path("ghost.png"),)

    def test_one_failure_does_not_kill_batch(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        good = _make_media(src, "real.png", content=b"data")
        ghost = MediaFile(
            abs_path=src / "missing.png",
            rel_path=Path("missing.png"),
            extension="png",
            size=0,
        )
        result = copy_media((good, ghost), dest_root=dest)
        # One copied, one skipped — batch continued past the bad entry.
        assert result.copied == (Path("real.png"),)
        assert result.skipped == (Path("missing.png"),)
        assert (dest / "real.png").exists()


class TestBytesAccounting:
    def test_bytes_copied_sums_sizes(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        m1 = _make_media(src, "a.png", content=b"x" * 100)
        m2 = _make_media(src, "b.jpg", content=b"y" * 250)
        result = copy_media((m1, m2), dest_root=dest)
        assert result.bytes_copied == 350

    def test_skipped_file_not_counted(self, tmp_path: Path) -> None:
        src = tmp_path / "src"
        dest = tmp_path / "dest"
        good = _make_media(src, "real.png", content=b"x" * 50)
        ghost = MediaFile(
            abs_path=src / "missing.png",
            rel_path=Path("missing.png"),
            extension="png",
            size=999,  # even though MediaFile claims 999, copy fails → not counted
        )
        result = copy_media((good, ghost), dest_root=dest)
        assert result.bytes_copied == 50  # only the real one
