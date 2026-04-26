"""
Copyright 2026 Daniel Smith — Apache 2.0

Preview-pass scan for the vault converter.

Walks a source directory with include/exclude glob filters, categorizes
every file into markdown / media / ignored, records any symlinks we chose
not to follow, and stops at a configurable max depth. Returns a
structured ScanResult that the CLI renders into the "Scanning…" preview
the user confirms before any write happens; convert.py then iterates the
same result to do the actual conversion.

Pure function — the only filesystem access is read-only directory
traversal plus `stat()` for sizes. Safe to run on any directory.
"""

from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

# Markdown-family extensions the scanner treats as note content. All
# get normalized to `.md` in the converted output so Obsidian opens
# them as notes (Obsidian's default note-recognition is `.md` only;
# `.mdx` and `.markdown` files would show up as opaque attachments
# otherwise).
#
# Why each:
#   md        — canonical markdown
#   mdx       — JSX-in-markdown (Gatsby, Next.js, Astro, Docusaurus;
#               common shape for digital gardens). JSX components pass
#               through as literal text, same as Hugo shortcodes.
#   markdown  — older long-form extension, occasionally seen in the wild.
MARKDOWN_EXTENSIONS: frozenset[str] = frozenset({
    "md",
    "mdx",
    "markdown",
})

# Media extension allowlist. Anything not a markdown-family ext and
# not in this set is ignored by the scan — keeps `.zip`, `.canvas`,
# `.excalidraw`, random binaries out of the count. Users who want more
# file types extend this list rather than having the converter guess.
MEDIA_EXTENSIONS: frozenset[str] = frozenset({
    "png", "jpg", "jpeg", "gif", "webp", "svg",
    "pdf",
    "mp4", "mp3", "wav",
})

# Default excludes applied to every scan regardless of user config.
# These directories are always uninteresting — vendored third-party
# tooling, VCS metadata, OS/IDE junk, or build caches — and including
# them would noise up the count (or risk sweeping thousands of vendor
# files into the output vault, e.g. 14k MkDocs theme SVGs under
# `.venv/.../material/templates/.icons/`).
#
# `.obsidian/` lives here too — we read it directly for vault detection
# at the source root, but never walk into it as content.
#
# Not included (judgment calls for users to opt into via --exclude):
# `build/`, `dist/`, `target/`, `vendor/` — sometimes carry legitimate
# shipped-docs content, so auto-excluding risks hiding intentional
# material. Users who want those gone say so explicitly.
DEFAULT_EXCLUDES: tuple[str, ...] = (
    # Node toolchain
    "**/node_modules/**",
    # VCS — cover the four mainstream systems. The less common
    # (.fossil, .darcs, _darcs, .monotone) we leave out; users who
    # have those can add to --exclude.
    "**/.git/**",
    "**/.svn/**",
    "**/.hg/**",
    "**/.bzr/**",
    "**/CVS/**",
    # OS / IDE cruft
    "**/.DS_Store",
    # Obsidian internals (detected separately for vault-mode)
    "**/.obsidian/**",
    "**/.trash/**",
    # Python toolchain — virtualenvs, caches
    "**/.venv/**",
    "**/venv/**",
    "**/__pycache__/**",
    "**/.pytest_cache/**",
    "**/.tox/**",
    "**/.mypy_cache/**",
    "**/.ruff_cache/**",
    # PHP / Laravel toolchain. `vendor/` is Composer's install target —
    # always third-party deps, same category as node_modules/. Laravel's
    # `bootstrap/cache/` holds compiled service/package lists;
    # `storage/framework/` holds the framework's own cache, sessions,
    # and compiled Blade views. `storage/logs/` and `storage/app/` are
    # intentionally NOT excluded — logs are judgment-call content and
    # `app/` often holds user uploads.
    "**/vendor/**",
    "**/bootstrap/cache/**",
    "**/storage/framework/**",
)

# Subdirectory name that marks a source root as an already-existing
# Obsidian vault. Its presence flips the converter into augment-only
# mode (no link rewriting, no content changes, only additive YAML).
OBSIDIAN_CONFIG_DIR = ".obsidian"

# Deepest directory level below source root the walker will descend
# into. Ten is generous — real docs and vault trees are 4–5 deep at
# worst — but guards against pathological cases (circular-ish symlinks
# followed by surprise, deeply nested vendor trees, etc.). Directories
# reached past this limit are recorded in ScanResult.depth_limit_reached
# so the CLI can warn.
MAX_SCAN_DEPTH = 10

# Upper bound on the total number of files the walker will admit into
# the scan result. A generous default that comfortably handles every
# real corpus we've tested (K8s docs: 1,573; GitHub docs: ~10k; personal
# vault: 547) while refusing to hand back a half-gigabyte result on a
# pathological or misconfigured scan (someone points the converter at
# their `/` or `$HOME` by accident).
#
# When the cap fires the walker stops recording and sets
# ScanResult.file_limit_reached = True so the CLI can warn. Users who
# legitimately need more raise the limit via --max-files.
MAX_SCAN_FILES = 20_000


@dataclass(frozen=True)
class MarkdownFile:
    """One `.md` file found during the scan."""
    abs_path: Path
    rel_path: Path  # relative to scan source root
    size: int


@dataclass(frozen=True)
class MediaFile:
    """One media file (png / jpg / pdf / …) found during the scan."""
    abs_path: Path
    rel_path: Path
    extension: str  # lowercase, no leading dot
    size: int


@dataclass(frozen=True)
class ScanResult:
    """
    Full preview summary. Read by the CLI before prompting the user.

    `symlinks_skipped`, `depth_limit_reached`, and `file_limit_reached`
    aren't failures — they are observations the CLI surfaces so the
    user can spot unexpected tree shapes before writing.

    `symlink_count` is kept separately from `symlinks_skipped` as
    belt-and-suspenders: the set dedupes by path (all that should ever
    matter under normal walks), while the count records the raw number
    of symlink encounters. If the two diverge, something odd happened
    during the walk and the user should see that.

    `file_limit_reached` is True when the walker stopped admitting
    files because MAX_SCAN_FILES (or the user's --max-files override)
    was hit. Output still reflects all files accepted up to that
    point; it's a DoS guard, not an error condition.
    """
    source_root: Path
    is_existing_vault: bool  # `.obsidian/` at source root → augment-only
    markdown: tuple[MarkdownFile, ...]
    media: tuple[MediaFile, ...]
    symlink_count: int
    symlinks_skipped: frozenset[Path]
    depth_limit_reached: tuple[Path, ...]
    file_limit_reached: bool = False

    @property
    def total_bytes(self) -> int:
        return sum(m.size for m in self.markdown) + sum(m.size for m in self.media)

    @property
    def markdown_dirs(self) -> frozenset[Path]:
        """Unique parent directories of every markdown file (relative)."""
        return frozenset(m.rel_path.parent for m in self.markdown)

    @property
    def media_dirs(self) -> frozenset[Path]:
        return frozenset(m.rel_path.parent for m in self.media)

    @property
    def media_by_extension(self) -> dict[str, int]:
        """Count of media files keyed by lowercase extension, sorted by count desc."""
        counts: dict[str, int] = {}
        for m in self.media:
            counts[m.extension] = counts.get(m.extension, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))


def scan(
    source: Path,
    *,
    include: Iterable[str] | None = None,
    exclude: Iterable[str] | None = None,
    max_depth: int = MAX_SCAN_DEPTH,
    max_files: int = MAX_SCAN_FILES,
) -> ScanResult:
    """
    Walk `source` and categorize files.

    Args:
        source: Path to the source directory. Resolved to absolute.
        include: Optional glob patterns. When provided, a file must match
            at least one pattern to be considered. When None, every
            markdown/media file that passes exclude filters is counted.
        exclude: Optional additional exclude globs, applied after
            DEFAULT_EXCLUDES.
        max_depth: Deepest directory level below source root to descend
            into. Directories beyond this are recorded in
            `ScanResult.depth_limit_reached`.
        max_files: Hard cap on the number of files (markdown + media
            combined, after filter application) the walker will admit.
            When reached, the walker stops and the result's
            `file_limit_reached` flag is set. Defense against
            runaway scans on misconfigured source paths.

    Returns:
        A ScanResult with markdown, media, vault detection, skipped
        symlinks, any depth-limit hits, and a file_limit_reached flag.

    Raises:
        ValueError: if `source` is not an existing directory.
    """
    source = source.resolve()
    if not source.is_dir():
        raise ValueError(f"source is not a directory: {source}")

    is_existing_vault = (source / OBSIDIAN_CONFIG_DIR).is_dir()

    include_patterns = tuple(include) if include else ()
    exclude_patterns = DEFAULT_EXCLUDES + tuple(exclude or ())

    walk = _walk(source, max_depth=max_depth, exclude_patterns=exclude_patterns)
    file_limit_reached = False

    markdown: list[MarkdownFile] = []
    media: list[MediaFile] = []

    for path in walk.files:
        rel = path.relative_to(source)
        rel_str = rel.as_posix()

        # File-level exclude check (dir-level pruning already done during walk).
        if _matches_any(rel_str, exclude_patterns):
            continue
        if include_patterns and not _matches_any(rel_str, include_patterns):
            continue

        ext = path.suffix.lstrip(".").lower()
        try:
            size = path.stat().st_size
        except OSError:
            # Broken symlink, permission error, etc. — skip silently.
            continue

        if ext in MARKDOWN_EXTENSIONS:
            markdown.append(MarkdownFile(abs_path=path, rel_path=rel, size=size))
        elif ext in MEDIA_EXTENSIONS:
            media.append(MediaFile(abs_path=path, rel_path=rel, extension=ext, size=size))
        # Anything else is silently skipped — not an error, just not
        # material the converter operates on.

        # Stop admitting once we've hit the cap. Breaks loop so any
        # remaining candidates in walk.files are ignored; the user's
        # preview will show the flag.
        if len(markdown) + len(media) >= max_files:
            file_limit_reached = True
            break

    markdown.sort(key=lambda m: m.rel_path)
    media.sort(key=lambda m: m.rel_path)

    return ScanResult(
        source_root=source,
        is_existing_vault=is_existing_vault,
        markdown=tuple(markdown),
        media=tuple(media),
        symlink_count=walk.symlink_count,
        symlinks_skipped=frozenset(walk.symlinks),
        depth_limit_reached=tuple(sorted(walk.depth_hits)),
        file_limit_reached=file_limit_reached,
    )


# --- Walk ------------------------------------------------------------------


@dataclass
class _WalkResult:
    files: list[Path] = field(default_factory=list)
    symlinks: set[Path] = field(default_factory=set)  # unique relative paths
    symlink_count: int = 0  # raw encounter count, possibly > len(symlinks)
    depth_hits: list[Path] = field(default_factory=list)  # rel paths of dirs we didn't descend into


def _walk(
    root: Path,
    *,
    max_depth: int,
    exclude_patterns: tuple[str, ...],
) -> _WalkResult:
    """
    Depth-limited, symlink-observant walk.

    Symlinks are recorded but never followed — a symlink pointing outside
    the source could expand the scan unpredictably. Real vaults rarely
    use escape-pointing symlinks; users who need them can copy the target
    into the vault instead.

    Directories matching an exclude pattern of shape `**/x/**` are pruned
    at the walk step so we don't burn budget descending into
    `node_modules/` or a vault's own `.obsidian/`.
    """
    result = _WalkResult()

    # Build a set of "dir-style" exclude patterns (those that end in
    # `/**`). These match directory paths directly and trigger pruning
    # during the walk, avoiding wasted descent.
    dir_prune_patterns = tuple(p[:-3] for p in exclude_patterns if p.endswith("/**"))

    def recurse(dir_path: Path, depth: int) -> None:
        if depth > max_depth:
            result.depth_hits.append(dir_path.relative_to(root))
            return
        try:
            entries = list(os.scandir(dir_path))
        except (PermissionError, OSError):
            return
        # Sort for determinism (makes tests and preview output stable).
        entries.sort(key=lambda e: e.name)

        for entry in entries:
            full = Path(entry.path)
            try:
                rel = full.relative_to(root)
            except ValueError:
                # Should never happen under scandir of a subtree, but be
                # defensive — a future refactor that follows symlinks
                # could trip this.
                continue

            if entry.is_symlink():
                result.symlink_count += 1
                result.symlinks.add(rel)
                continue

            if entry.is_dir(follow_symlinks=False):
                # Dir-level prune: skip entire subtrees matched by
                # exclude patterns of shape `**/x/**`. File-level
                # excludes still run later on any survivors.
                if _matches_any(rel.as_posix(), dir_prune_patterns):
                    continue
                recurse(full, depth + 1)
            elif entry.is_file(follow_symlinks=False):
                result.files.append(full)

    recurse(root, depth=0)
    return result


# --- Glob matching ---------------------------------------------------------


def _matches_any(path: str, patterns: tuple[str, ...]) -> bool:
    for pattern in patterns:
        if _glob_match(path, pattern):
            return True
    return False


def _glob_match(path: str, pattern: str) -> bool:
    """
    Gitignore-style glob match with `**` (recursive wildcard) support.

    Patterns without any `/` match anywhere in the tree (so `.DS_Store`
    matches `a/b/.DS_Store`). Mirrors `.gitignore` conventions and lets
    user rules stay short.
    """
    if "/" not in pattern:
        pattern = "**/" + pattern
    return _match_segments(path.split("/"), pattern.split("/"))


def _match_segments(path: list[str], patt: list[str]) -> bool:
    """
    Recursive segment-by-segment match; `**` is zero-or-more segments.
    Single-segment `*`, `?`, `[…]` are delegated to `fnmatch`.
    """
    if not patt:
        return not path
    head = patt[0]
    if head == "**":
        rest = patt[1:]
        if not rest:
            return True  # trailing ** matches everything remaining
        for i in range(len(path) + 1):
            if _match_segments(path[i:], rest):
                return True
        return False
    if not path:
        return False
    if fnmatch.fnmatchcase(path[0], head):
        return _match_segments(path[1:], patt[1:])
    return False
