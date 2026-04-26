"""
Copyright 2026 Daniel Smith — Apache 2.0

Media copy for the vault converter — extension-allowlisted, mirror-tree,
shutil-based.

Behaviour:
  • Only files with extensions in MEDIA_EXTENSIONS (from scan.py) are
    copied. `.zip`, `.canvas`, `.excalidraw`, unknown binaries are
    silently ignored — scan.py excludes them, so they never reach here.
  • Destination paths mirror source structure relative to the source
    root. `docs/architecture/flow.png` → `vault/architecture/flow.png`.
    Keeps relative Markdown image refs (`![](./flow.png)`) working in
    the converted output.
  • Parent directories in dest are created as needed.
  • File mode bits and mtime are preserved via `shutil.copy2`, so
    regeneration doesn't falsely touch every file's mtime.
  • Existing dest files are overwritten. Callers confirm at CLI level
    before invoking.

Copy, not symlink: symlinks would save disk but break cross-platform
portability (Git symlink handling on Windows is fragile) and the whole
point of the example vault is that it's a standalone artefact.

Augment-only mode (detected upstream by `.obsidian/` at source) skips
this step entirely — an existing vault already has its attachments
arranged, and copying them would double-count and duplicate storage.
The orchestrator decides whether to call this module at all.
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from .scan import MediaFile


@dataclass(frozen=True)
class CopyResult:
    """Summary of a batch of media copies."""
    copied: tuple[Path, ...]       # relative paths that were written
    skipped: tuple[Path, ...]      # relative paths that failed (permission, disk, etc.)
    bytes_copied: int

    @property
    def ok(self) -> bool:
        """True when every input was copied successfully."""
        return not self.skipped


def copy_media(
    media: tuple[MediaFile, ...],
    *,
    dest_root: Path,
) -> CopyResult:
    """
    Copy each `MediaFile` to `dest_root / rel_path`, mirroring source
    structure and preserving mtime + permissions.

    Args:
        media: The `MediaFile` tuple from a ScanResult. Each entry
            carries its absolute source path, relative destination
            path, and size.
        dest_root: Vault output root directory. Created if missing.

    Returns:
        CopyResult enumerating which files were copied and which were
        skipped due to runtime errors. Never raises on individual
        copy failures — a bad file shouldn't abort the batch. The
        orchestrator decides how to surface skips.
    """
    dest_root.mkdir(parents=True, exist_ok=True)

    copied: list[Path] = []
    skipped: list[Path] = []
    bytes_copied = 0

    for m in media:
        dest = dest_root / m.rel_path
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            # copy2 preserves mode + mtime; important for idempotence
            # (second run doesn't churn mtimes) and for a vault that
            # retains original filesystem timestamps of its media.
            shutil.copy2(m.abs_path, dest)
            copied.append(m.rel_path)
            bytes_copied += m.size
        except (OSError, shutil.Error):
            # Don't kill the batch on one bad file — permission errors,
            # bad symlinks behind a source path, disk-full, etc.
            skipped.append(m.rel_path)

    return CopyResult(
        copied=tuple(copied),
        skipped=tuple(skipped),
        bytes_copied=bytes_copied,
    )
