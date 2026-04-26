"""
Copyright 2026 Daniel Smith — Apache 2.0

Orchestrator for the vault converter.

Ties the five pure-transform modules together:

    scan.py        → preview pass, collects markdown + media + vault flag
    tags.py        → path → tag derivation
    frontmatter.py → YAML extract / merge-preserve / serialize
    wikilinks.py   → [text](file.md) → [[file|text]] (full-convert only)
    media.py       → allowlist-based mirror-tree file copy

Core invariant enforced at the entry point: **source is never modified**.
The converter refuses outright (no flag override) when source and
destination overlap in any direction. See `docs/markdown-to-obsidian-convert.md`
§ "Core invariant" for the full rationale.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import plugins as ssg_plugins_mod
from .active_content import ActiveContentReport, process_active_content
from .frontmatter import Frontmatter, extract, merge, serialize
from .media import CopyResult, copy_media
from .sanitize import SanitizeReport, strip_frontmatter_html, strip_unsafe_html
from .scan import MAX_SCAN_DEPTH, MAX_SCAN_FILES, MarkdownFile, ScanResult, scan
from .tags import TagRule, derive_tags
from .wikilinks import rewrite_links


# Per-file size cap for source markdown. Files larger than this are
# skipped (with a warning) rather than read into memory. A crafted 5GB
# `.md` file at the top of a source tree would otherwise take the
# converter process down with it.
#
# 20 MB covers every realistic markdown document (the longest prose
# file in Gwern.net is under 2 MB). Users with legitimate larger
# content override via `--max-file-size MB` on the CLI or
# `ConvertConfig.max_file_size_bytes` in Python.
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024


# --- Config + result types ------------------------------------------------


@dataclass(frozen=True)
class ConvertConfig:
    """
    All options that shape a single conversion run. Keep this small —
    every optional field has a sensible default for the common case so
    `vault_docs.py` can be a near-zero-arg wrapper.
    """
    source_root: Path
    dest_root: Path
    tag_rules: tuple[TagRule, ...] = ()
    # None = auto-detect from `.obsidian/` at source; True/False overrides.
    augment_only: bool | None = None
    include: tuple[str, ...] | None = None
    exclude: tuple[str, ...] | None = None
    max_depth: int = MAX_SCAN_DEPTH
    # Cap on how long description derivation's first-paragraph extract
    # can be. Kept short so lens/menu thumbnails stay readable.
    description_max_length: int = 200
    # SSG shortcode plugin names to apply to body text, in order. Empty
    # tuple (default) means no transforms. See
    # `scripts/lib/vault_from_md/plugins/` for available plugins and
    # `docs/obsidian-conversion--plan.md` for the architecture.
    ssg_plugins: tuple[str, ...] = ()
    # Per-file size cap for source markdown. Files larger than this
    # are recorded in `ConvertResult.markdown_size_skipped` and not
    # read. Default is generous enough for any realistic prose; a
    # higher cap means a single adversarial file can OOM the process.
    max_file_size_bytes: int = MAX_FILE_SIZE_BYTES
    # HTML sanitisation. Defaults are strict: dangerous body HTML
    # (<script>, <iframe>, event handlers, javascript: URLs) is
    # stripped, and any HTML tags in frontmatter string values are
    # removed. Users who need the original content preserved (e.g.
    # converting their own vault containing legitimate `<iframe>`
    # embeds) opt out via these flags.
    allow_unsafe_html: bool = False
    allow_frontmatter_html: bool = False
    # Active-content policy. Strict by default: Obsidian community-
    # plugin blocks (dataview, dataviewjs, tasks, excalidraw,
    # templater) are stripped from the body. Users converting their
    # own vault and wanting to preserve legitimate queries opt in via
    # `allow_active_content=True`. Counts are always reported;
    # stripping is what the flag controls.
    allow_active_content: bool = False


@dataclass(frozen=True)
class ConvertResult:
    """
    Summary of a conversion run. Preview-ish data lives on `scan`;
    everything else is the write phase's outcome.

    `markdown_size_skipped` records files that exceeded
    `ConvertConfig.max_file_size_bytes` and were not read. These
    aren't failures (the scan succeeded) — they're policy skips the
    CLI surfaces so the user can decide whether to raise the cap.
    """
    scan: ScanResult
    augment_mode: bool
    markdown_written: tuple[Path, ...]
    markdown_failed: tuple[Path, ...]
    markdown_size_skipped: tuple[Path, ...]
    media: CopyResult
    # Running totals of things the HTML sanitiser stripped across the
    # whole batch. Reported by the CLI summary so users see what the
    # strict defaults caught (or missed, if they used --allow-* flags).
    sanitize_body: SanitizeReport = SanitizeReport()
    sanitize_frontmatter: SanitizeReport = SanitizeReport()
    # Active-content totals — per-plugin counts encountered in source
    # bodies. When `allow_active_content=False` these were stripped
    # from the output; when True the counts are informational only.
    active_content: ActiveContentReport = ActiveContentReport()

    @property
    def ok(self) -> bool:
        # Size-skipped files aren't failures — policy decisions the
        # caller consciously made (via the default cap or an explicit
        # override). Failures are read errors, decode errors, etc.
        return not self.markdown_failed and self.media.ok


# --- Public entry point ---------------------------------------------------


def convert(config: ConvertConfig) -> ConvertResult:
    """
    Scan, per-file transform, and media copy — in that order.

    Raises:
        ValueError: when source/dest violate the read-only-source
            invariant (same path, dest inside source, or source inside
            dest), or when source isn't an existing directory.

    Returns:
        A ConvertResult. Individual file failures are captured in
        `markdown_failed` rather than raised — one bad file doesn't
        abort the batch.
    """
    _validate_paths(config.source_root, config.dest_root)

    scan_result = scan(
        config.source_root,
        include=config.include,
        exclude=config.exclude,
        max_depth=config.max_depth,
    )

    augment_mode = (
        config.augment_only
        if config.augment_only is not None
        else scan_result.is_existing_vault
    )

    # The rewriter needs to know which link targets are "in scope" so it
    # doesn't turn outside-set `[text](thing.md)` into dangling wikilinks.
    # Every source markdown extension normalizes to `.md` in the output
    # (Obsidian only recognizes `.md` as a note), so the converted_set
    # also uses `.md` — that way `[x](foo.mdx)` resolves against the
    # dest-side `foo.md` entry.
    converted_set = frozenset(
        _normalize_to_md(m.rel_path) for m in scan_result.markdown
    )

    # Resolve SSG plugin names to transform callables exactly once.
    # Each callable takes body text and returns transformed body text.
    # Empty tuple → empty list; the per-file loop below is a no-op when
    # no plugins are configured.
    ssg_transforms = ssg_plugins_mod.load(config.ssg_plugins)

    written: list[Path] = []
    failed: list[Path] = []
    size_skipped: list[Path] = []
    body_report_total = SanitizeReport()
    fm_report_total = SanitizeReport()
    active_content_total = ActiveContentReport()

    for md in scan_result.markdown:
        # Pre-read size gate. A crafted huge .md file would otherwise
        # be loaded into memory by read_text before we get a chance
        # to refuse. Skip-then-continue so the surrounding batch still
        # converts.
        if md.size > config.max_file_size_bytes:
            size_skipped.append(md.rel_path)
            continue
        try:
            body_report, fm_report, ac_report = _convert_file(
                md,
                dest_root=config.dest_root,
                tag_rules=config.tag_rules,
                converted_set=converted_set,
                augment_mode=augment_mode,
                description_max_length=config.description_max_length,
                ssg_transforms=ssg_transforms,
                allow_unsafe_html=config.allow_unsafe_html,
                allow_frontmatter_html=config.allow_frontmatter_html,
                allow_active_content=config.allow_active_content,
            )
            written.append(md.rel_path)
            body_report_total = body_report_total + body_report
            fm_report_total = fm_report_total + fm_report
            active_content_total = active_content_total + ac_report
        except (OSError, UnicodeDecodeError):
            # Bad encoding, permission denied, disk error — record and
            # continue. The CLI surfaces failed files in its summary.
            failed.append(md.rel_path)

    media_result = copy_media(scan_result.media, dest_root=config.dest_root)

    return ConvertResult(
        scan=scan_result,
        augment_mode=augment_mode,
        markdown_written=tuple(written),
        markdown_failed=tuple(failed),
        markdown_size_skipped=tuple(size_skipped),
        media=media_result,
        sanitize_body=body_report_total,
        sanitize_frontmatter=fm_report_total,
        active_content=active_content_total,
    )


# --- Invariant enforcement -------------------------------------------------


def _validate_paths(source: Path, dest: Path) -> None:
    """
    Enforce the core invariant: every conversion writes to a destination
    that is not the source. Raises `ValueError` on any overlap case;
    there is no flag override.
    """
    if not source.exists():
        raise ValueError(f"source does not exist: {source}")
    if not source.is_dir():
        raise ValueError(f"source is not a directory: {source}")

    source_abs = source.resolve()
    # Dest may not exist yet. `Path.resolve()` handles non-existent
    # paths from Python 3.6+ by resolving what it can and appending
    # the rest literally — good enough for our overlap checks.
    dest_abs = dest.resolve()

    if source_abs == dest_abs:
        raise ValueError(
            "source and destination must be different directories. "
            "Pass a new dest path; the converter never edits in place. "
            f"(got: {source_abs})"
        )
    if dest_abs.is_relative_to(source_abs):
        raise ValueError(
            "destination must not be inside source. Regenerations would "
            "recursively include our own output. "
            f"(source={source_abs}, dest={dest_abs})"
        )
    if source_abs.is_relative_to(dest_abs):
        raise ValueError(
            "source must not be inside destination. Structural confusion. "
            f"(source={source_abs}, dest={dest_abs})"
        )


# --- Per-file transform ---------------------------------------------------


def _convert_file(
    md: MarkdownFile,
    *,
    dest_root: Path,
    tag_rules: tuple[TagRule, ...],
    converted_set: frozenset[Path],
    augment_mode: bool,
    description_max_length: int,
    ssg_transforms: list[Callable[[str], str]],
    allow_unsafe_html: bool,
    allow_frontmatter_html: bool,
    allow_active_content: bool,
) -> tuple[SanitizeReport, SanitizeReport, ActiveContentReport]:
    """
    Read → extract frontmatter → apply SSG transforms → sanitize body
    → scan/strip active content → derive additions → merge → sanitize
    frontmatter → maybe rewrite links → serialize → write.

    Returns a (body_report, frontmatter_report, active_content_report)
    tuple of counts that the caller aggregates across files for the
    CLI summary.

    Idempotent: running this on its own output produces byte-identical
    output a second time. `merge` preserves user keys (so fields we
    derived last time aren't re-derived on top of themselves),
    `rewrite_links` skips existing `[[…]]`, SSG transforms are
    contracted to be idempotent on their own output, and the
    sanitiser removes patterns that can't re-appear on re-run.
    """
    source_text = md.abs_path.read_text(encoding="utf-8")
    fm, body = extract(source_text)

    # SSG transforms run after frontmatter extraction (so they never
    # risk corrupting YAML) and before description/title derivation
    # (so the derived description reads clean text, not raw shortcodes).
    # They also run before wikilink rewriting — any markdown links a
    # transform produces (e.g. Hugo `{{< figure >}}` → `![alt](src)`)
    # get a chance to participate in the wikilink pass.
    for transform in ssg_transforms:
        body = transform(body)

    # HTML sanitisation on body. Strict by default; `allow_unsafe_html`
    # bypasses when a user explicitly opts in. Runs after SSG
    # transforms so anything they might have emitted is also covered,
    # and before description derivation so the summary reads clean.
    body_report = SanitizeReport()
    if not allow_unsafe_html:
        body, body_report = strip_unsafe_html(body)

    # Active-content scan/strip. Counts are always produced; stripping
    # happens only when `allow_active_content` is False. Runs after
    # HTML sanitisation so a templater `<%` expression that happens to
    # live inside a `<script>` (double-jeopardy) is already gone.
    body, active_report = process_active_content(
        body, strip=not allow_active_content,
    )

    additions = _build_additions(
        md=md,
        body=body,
        tag_rules=tag_rules,
        augment_mode=augment_mode,
        description_max_length=description_max_length,
    )

    merged_fm = merge(fm, additions)

    # HTML sanitisation on merged frontmatter. Applies to the merged
    # dict, not the original extract, so derived fields (title,
    # description) are also scrubbed — those came from body content
    # that may itself have contained HTML.
    fm_report = SanitizeReport()
    if not allow_frontmatter_html:
        cleaned_data, fm_report = strip_frontmatter_html(merged_fm.data)
        merged_fm = Frontmatter(data=cleaned_data, present=merged_fm.present)

    out_body = body
    if not augment_mode:
        # Rewrite only when converting cold markdown. Augment mode
        # preserves existing `[[wikilinks]]` as-is.
        out_body = rewrite_links(
            body,
            current_file_rel=md.rel_path,
            converted_set=converted_set,
        )

    out_text = serialize(merged_fm, out_body)

    # Normalize extension in the destination. MDX and .markdown files
    # are written as `.md` so Obsidian opens them as notes. The original
    # extension is preserved in the `source:` frontmatter field for
    # traceability.
    dest_rel = _normalize_to_md(md.rel_path)
    dest_path = dest_root / dest_rel
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_text(out_text, encoding="utf-8")

    return body_report, fm_report, active_report


def _build_additions(
    *,
    md: MarkdownFile,
    body: str,
    tag_rules: tuple[TagRule, ...],
    augment_mode: bool,
    description_max_length: int,
) -> dict[str, Any]:
    """
    Produce the additions dict that `merge` unions into existing
    frontmatter. `merge` honours user keys, so fields the source note
    already set get preserved — these additions are only used when the
    source is missing a field.

    `source` and `modified` are always provided. `tags` is always
    provided (may be empty; `merge` skips empty lists). `title` and
    `description` are full-convert-only — augment mode doesn't derive
    those because an existing vault's notes either have them already
    or work fine without.
    """
    additions: dict[str, Any] = {
        "source": md.rel_path.as_posix(),
        "modified": _format_mtime(md.abs_path),
        "tags": list(derive_tags(md.rel_path, tag_rules)),
    }

    if not augment_mode:
        additions["title"] = _derive_title(body, md.rel_path)
        description = _derive_description(body, max_length=description_max_length)
        if description:
            additions["description"] = description

    return additions


# --- Derivation helpers ---------------------------------------------------


# First-line `# heading`. Tolerates optional trailing whitespace;
# refuses to match `## subheadings` (needs exactly one `#` + space).
_H1_RE = re.compile(r"^# +(.+?)\s*$", re.MULTILINE)


def _derive_title(body: str, rel_path: Path) -> str:
    """
    First H1 heading in the body, trimmed. Falls back to the filename
    without its `.md` extension when there is no H1 (common for notes
    that rely on the filename as their title — Obsidian's default).
    """
    m = _H1_RE.search(body)
    if m:
        return m.group(1).strip()
    return rel_path.stem


def _derive_description(body: str, *, max_length: int) -> str:
    """
    First non-heading paragraph in the body, link-syntax stripped,
    whitespace-collapsed, truncated at `max_length` chars (ellipsis on
    truncation). Skipped entirely if the body has no prose — we don't
    write an empty `description:` key.

    "Non-heading" filter: paragraphs whose first line starts with `#`
    are skipped. Link syntax is stripped to plain text because
    descriptions are shown in human-facing UI (Properties panel, lens
    card preview) where raw `[text](url)` or `[[target|alias]]` is
    noise. The *text* part survives; the URL part is dropped.
    """
    paragraphs = re.split(r"\n\s*\n", body)
    for para in paragraphs:
        stripped = para.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            continue  # skip headings
        plain = _strip_link_syntax(stripped)
        collapsed = re.sub(r"\s+", " ", plain).strip()
        if not collapsed:
            continue
        if len(collapsed) > max_length:
            # Trim on word boundary when we can; fall back to hard cut.
            cut = collapsed[:max_length].rstrip()
            last_space = cut.rfind(" ")
            if last_space > max_length * 0.6:
                cut = cut[:last_space]
            return cut + "…"
        return collapsed
    return ""


# Markdown/Obsidian link syntax we strip when deriving a description.
# Each regex preserves the human-readable text part and discards the
# URL or target.
_WIKILINK_ALIASED_RE = re.compile(r"\[\[[^\]|]+\|([^\]]+)\]\]")
_WIKILINK_BARE_RE = re.compile(r"\[\[([^\]]+)\]\]")
_MD_LINK_RE = re.compile(r"(?<!!)\[([^\]]+)\]\([^)]*\)")
_MD_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")


def _strip_link_syntax(text: str) -> str:
    """
    Replace link-flavoured markdown with its plain-text component:

        [[target|alias]]  → alias
        [[target]]        → target
        [text](url)       → text
        ![alt](url)       → alt  (images keep their alt text)
    """
    text = _WIKILINK_ALIASED_RE.sub(r"\1", text)
    text = _WIKILINK_BARE_RE.sub(r"\1", text)
    text = _MD_LINK_RE.sub(r"\1", text)
    text = _MD_IMAGE_RE.sub(r"\1", text)
    return text


def _normalize_to_md(rel_path: Path) -> Path:
    """
    Rewrite any markdown-family extension (`.md`, `.mdx`, `.markdown`)
    to `.md`. Files without a recognized markdown extension pass
    through unchanged — scan.py already filters the input set, so this
    is a safe identity for anything it hands us.
    """
    suffix = rel_path.suffix.lstrip(".").lower()
    if suffix in {"md", "mdx", "markdown"}:
        return rel_path.with_suffix(".md")
    return rel_path


def _format_mtime(path: Path) -> str:
    """
    ISO-8601 UTC timestamp from the file's mtime. Obsidian renders
    these in the Properties panel as dates and sorts them naturally;
    Alap's `:time:` protocol can parse them when future work surfaces
    `modified` on emitted links.
    """
    mtime = path.stat().st_mtime
    dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
