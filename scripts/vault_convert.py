#!/usr/bin/env python3
"""
Copyright 2026 Daniel Smith — Apache 2.0

General-purpose vault converter CLI.

    pnpm run vault:convert <source> <dest> [flags]

Invokes `vault_from_md.convert` with user-supplied source/dest/tag
rules, runs a preview pass, prompts for confirmation unless `--yes` is
given, and writes the converted vault. Enforces the "source is never
modified" invariant at entry: source and destination must not overlap
in any direction.

Dependencies: stdlib + `pyyaml` (only for `--tags rules.yaml`).

Flags:
    --yes / -y         Skip the confirm prompt.
    --dry-run          Show the preview and exit without writing.
    --force            With --yes, overwrite a non-empty destination.
    --augment-only     Force augment mode even if `.obsidian/` absent.
    --include <glob>   Repeatable: only process matching paths.
    --exclude <glob>   Repeatable: additional excludes past defaults.
    --tags <file.yaml> Tag rules file (see scripts/README.md).
    --max-depth N      Override the directory-descent cap.
    --ssg <name>       Apply an SSG shortcode plugin. Repeatable;
                       accepts comma-separated lists. Known plugins:
                       hugo, jekyll, mkdocs, docusaurus.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# scripts/lib on sys.path so `vault_from_md` imports resolve.
_THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_THIS_DIR / "lib"))

from vault_from_md.convert import (  # noqa: E402
    MAX_FILE_SIZE_BYTES,
    ConvertConfig,
    ConvertResult,
    convert,
)
from vault_from_md.detect import detect_ssgs, which_config  # noqa: E402
from vault_from_md.scan import MAX_SCAN_DEPTH, MAX_SCAN_FILES, scan  # noqa: E402
from vault_from_md.tags import TagRule, default_directory_rules  # noqa: E402


# The set of plugins the loader knows how to dispatch. Adding a new
# plugin means editing both this set (so the CLI validates the name)
# and `vault_from_md.plugins.__init__.py` (so the loader can import
# the module). Keeping them in sync is a one-line change on each side.
KNOWN_SSGS = frozenset({"hugo", "jekyll", "mkdocs", "docusaurus"})


# --- CLI arg parsing -------------------------------------------------------


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        prog="vault_convert",
        description=(
            "Convert a directory of Markdown into an Obsidian-flavoured "
            "vault. Source is never modified — conversion always writes to a "
            "new destination."
        ),
    )
    ap.add_argument("source", type=Path, help="Source directory of Markdown files.")
    ap.add_argument("dest", type=Path, help="Destination directory (must not overlap source).")

    ap.add_argument("-y", "--yes", action="store_true",
                    help="Skip the confirm prompt.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show the preview and exit without writing.")
    ap.add_argument("--force", action="store_true",
                    help="With --yes, overwrite non-empty destination.")
    ap.add_argument("--augment-only", dest="augment_only",
                    action="store_const", const=True, default=None,
                    help="Force augment mode regardless of .obsidian/ detection.")
    ap.add_argument("--full-convert", dest="augment_only",
                    action="store_const", const=False,
                    help="Force full-convert mode even when .obsidian/ is present.")
    ap.add_argument("--include", action="append", default=None,
                    metavar="GLOB",
                    help="Only include paths matching this glob. Repeatable.")
    ap.add_argument("--exclude", action="append", default=None,
                    metavar="GLOB",
                    help="Additional exclude globs past the defaults. Repeatable.")
    ap.add_argument("--tags", type=Path, default=None, metavar="FILE",
                    help="YAML file with tag-derivation rules.")
    ap.add_argument("--max-depth", type=int, default=MAX_SCAN_DEPTH,
                    help=f"Cap on directory descent (default: {MAX_SCAN_DEPTH}).")
    ap.add_argument("--max-files", type=int, default=MAX_SCAN_FILES,
                    help=f"Cap on total files admitted to the scan "
                         f"(default: {MAX_SCAN_FILES:,}).")
    ap.add_argument("--max-file-size", type=int, default=None, metavar="MB",
                    help="Per-file size cap in MB. Files larger than this "
                         "are skipped without being read. Default: "
                         f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)}.")
    ap.add_argument("--ssg", action="append", default=[], metavar="NAME",
                    help="Apply an SSG shortcode plugin. Repeatable. "
                         "Accepts comma-separated lists. "
                         "Known plugins: hugo, jekyll, mkdocs, docusaurus.")

    # Strict-by-default security flags. Each defaults to OFF (the
    # converter strips the corresponding content). Passing the flag
    # opts IN to preserving it.
    ap.add_argument("--allow-unsafe-html", action="store_true",
                    help="Preserve dangerous HTML (<script>, <iframe>, "
                         "event handlers, javascript: URLs) in body "
                         "content. Default: stripped.")
    ap.add_argument("--allow-frontmatter-html", action="store_true",
                    help="Preserve HTML tags in frontmatter string "
                         "values. Default: stripped.")
    ap.add_argument("--allow-active-content", action="store_true",
                    help="Preserve Obsidian community-plugin blocks "
                         "(dataview, dataviewjs, tasks, excalidraw, "
                         "templater). Default: stripped.")
    return ap.parse_args(argv)


def _normalize_ssg_names(raw_args: list[str]) -> tuple[str, ...]:
    """
    Split comma-separated entries, lowercase, validate against
    `KNOWN_SSGS`, dedupe (preserving first-seen order).

    Unknown names warn to stderr and are dropped; the loader's own
    drop-unknown behaviour is defence in depth, but surfacing the name
    at CLI parse time lets the user notice typos early.
    """
    normalized: list[str] = []
    seen: set[str] = set()
    for entry in raw_args:
        for name in entry.split(","):
            name = name.strip().lower()
            if not name:
                continue
            if name not in KNOWN_SSGS:
                print(
                    f"warn: unknown SSG plugin '{name}' — known: "
                    f"{sorted(KNOWN_SSGS)}",
                    file=sys.stderr,
                )
                continue
            if name not in seen:
                normalized.append(name)
                seen.add(name)
    return tuple(normalized)


# --- Tag-rules YAML loader -------------------------------------------------


def _load_tag_rules(path: Path) -> tuple[TagRule, ...]:
    """
    Parse a YAML tag-rules file. Shape:

        strategy: directory        # or "prefix"
        rules:
          - dir: api-reference     # (for directory strategy)
            tag: api_reference
          - prefix: "idea-"        # (for prefix strategy)
            tag: idea

    Unknown rule kinds in the file are skipped with a warning.
    """
    import yaml

    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError) as e:
        raise SystemExit(f"error: failed to read tag rules — {e}")

    strategy = str(data.get("strategy", "directory")).strip()
    raw_rules = data.get("rules") or []
    if not isinstance(raw_rules, list):
        raise SystemExit("error: 'rules' in tag-rules file must be a list")

    rules: list[TagRule] = []
    for entry in raw_rules:
        if not isinstance(entry, dict):
            continue
        tag = str(entry.get("tag", "")).strip()
        if not tag:
            continue
        if "dir" in entry:
            rules.append(TagRule(kind="dir", match=str(entry["dir"]), tag=tag))
        elif "prefix" in entry:
            rules.append(TagRule(kind="prefix", match=str(entry["prefix"]), tag=tag))
        else:
            # Honour the `strategy` hint if the rule entry didn't
            # specify its own kind — shorthand `{tag: x, match: y}`
            # with strategy=directory at the top level.
            match = str(entry.get("match", "")).strip()
            if match and strategy in ("dir", "directory"):
                rules.append(TagRule(kind="dir", match=match, tag=tag))
            elif match and strategy == "prefix":
                rules.append(TagRule(kind="prefix", match=match, tag=tag))

    return tuple(rules)


# --- Preview + confirm -----------------------------------------------------


def _format_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def _print_preview(
    args: argparse.Namespace,
    tag_rules: tuple[TagRule, ...],
    ssg_plugins: tuple[str, ...],
) -> tuple[int, bool]:
    """Run the scan, print a preview block, return (dest-file-count, is-vault)."""
    print(f"source: {args.source.resolve()}")
    print(f"dest:   {args.dest.resolve()}")
    print()
    print("scanning…")

    scan_result = scan(
        args.source,
        include=args.include,
        exclude=args.exclude,
        max_depth=args.max_depth,
        max_files=args.max_files,
    )

    md_count = len(scan_result.markdown)
    md_dirs = len(scan_result.markdown_dirs)
    md_bytes = sum(m.size for m in scan_result.markdown)
    media_count = len(scan_result.media)
    media_bytes = sum(m.size for m in scan_result.media)
    ext_counts = scan_result.media_by_extension

    print(f"  {md_count} markdown files across {md_dirs} directories "
          f"({_format_bytes(md_bytes)})")
    if media_count:
        ext_summary = " · ".join(f"{n} {ext}" for ext, n in ext_counts.items())
        print(f"  {media_count} media files ({ext_summary}) "
              f"across {len(scan_result.media_dirs)} directories "
              f"({_format_bytes(media_bytes)})")
    print(f"  total: {_format_bytes(scan_result.total_bytes)}")
    print()

    # Mode
    augment_resolved = (
        args.augment_only
        if args.augment_only is not None
        else scan_result.is_existing_vault
    )
    if augment_resolved:
        print("mode: AUGMENT-ONLY (existing vault detected or forced)")
        print("  • every source file is COPIED to dest (source is read-only)")
        print("  • frontmatter is merged additively — existing keys preserved")
        print("  • wikilinks, inline #tags, note bodies: unchanged")
    else:
        print("mode: full convert")
        print("  • derives title / description / tags / source / modified")
        print("  • rewrites `[text](other.md)` → `[[other|text]]` in-set only")
        print("  • mirrors media tree to dest")
    print()

    # Tag rules summary
    print(f"tag rules: {len(tag_rules)} "
          f"({'from --tags' if args.tags else 'default: one per top-level dir'})")
    print()

    # SSG plugins summary (either "will apply" when explicit, or a
    # hint when detected-but-not-requested).
    if ssg_plugins:
        print(f"ssg plugins: {', '.join(ssg_plugins)} (will apply)")
        print()
    detected = detect_ssgs(args.source)
    missing_hints = [s for s in detected if s not in ssg_plugins]
    if missing_hints:
        for name in missing_hints:
            cfg = which_config(args.source, name)
            cfg_display = f"found {cfg.name}" if cfg else "detected"
            print(f"detected SSG: {name} ({cfg_display})")
            print(f"  → run with --ssg {name} to apply {name} shortcode transforms")
        print()

    # Symlinks & depth
    if scan_result.symlink_count:
        unique_list = sorted(scan_result.symlinks_skipped)
        print(f"symlinks: skipped {scan_result.symlink_count} "
              f"({len(unique_list)} unique locations)")
        shown = unique_list[:5]
        for p in shown:
            print(f"  - {p}")
        if len(unique_list) > len(shown):
            print(f"  … and {len(unique_list) - len(shown)} more")
        print()

    if scan_result.depth_limit_reached:
        print(f"depth limit: stopped descent at {len(scan_result.depth_limit_reached)} "
              f"directory(ies) deeper than {args.max_depth}")
        for p in list(scan_result.depth_limit_reached)[:5]:
            print(f"  - {p}")
        if len(scan_result.depth_limit_reached) > 5:
            print(f"  … and {len(scan_result.depth_limit_reached) - 5} more")
        print()

    if scan_result.file_limit_reached:
        print(f"file limit: stopped admitting files at the {args.max_files:,} cap.")
        print(f"  → rerun with --max-files N to scan a larger tree.")
        print()

    # Security policy banner — always visible in the preview so the
    # user knows what strict-by-default will do before they hit `y`.
    # Real counts come from the post-convert summary (we can't scan
    # bodies at preview time without doubling the I/O).
    _print_policy_banner(args)

    # Destination state
    dest_existing_count = 0
    try:
        if args.dest.is_dir():
            dest_existing_count = sum(1 for _ in args.dest.rglob("*") if _.is_file())
    except OSError:
        pass
    if dest_existing_count == 0 and not args.dest.exists():
        print(f"dest directory: does not exist (will be created)")
    elif dest_existing_count == 0:
        print(f"dest directory: exists and is empty")
    else:
        print(f"dest directory: CONTAINS {dest_existing_count} existing file(s) — "
              f"will be overwritten")
    print()

    return dest_existing_count, augment_resolved


def _print_policy_banner(args: argparse.Namespace) -> None:
    """
    Print a short description of the strict-by-default security
    policy, so the user knows what will be stripped before confirming.
    Only shown when at least one strict default is active.
    """
    strict = []
    relaxed = []
    if args.allow_unsafe_html:
        relaxed.append("--allow-unsafe-html")
    else:
        strict.append("strip unsafe HTML in body (<script>, <iframe>, on*=, javascript: URLs)")
    if args.allow_frontmatter_html:
        relaxed.append("--allow-frontmatter-html")
    else:
        strict.append("strip HTML tags in frontmatter values")
    if args.allow_active_content:
        relaxed.append("--allow-active-content")
    else:
        strict.append("strip active content (dataview, dataviewjs, tasks, excalidraw, templater)")

    if strict:
        print("security policy (strict by default):")
        for line in strict:
            print(f"  • {line}")
        print("  rationale: sources may be untrusted. If you know this "
              "content is yours")
        print("  (or you need a feature we stripped), rerun with the "
              "corresponding")
        print("  --allow-* flag. Summary after convert lists exactly what to add.")
    if relaxed:
        print(f"relaxed by flags: {', '.join(relaxed)}")
    if strict or relaxed:
        print()


def _print_strip_summary(result: ConvertResult, args: argparse.Namespace) -> None:
    """
    Post-convert summary of everything the strict defaults caught, plus
    a "rerun with these flags to preserve" hint block so the user knows
    exactly how to opt back in per category.
    """
    body = result.sanitize_body
    fm = result.sanitize_frontmatter
    active = result.active_content

    lines: list[str] = []
    replay_hints: list[tuple[str, str]] = []  # (flag, rationale)

    if body.total and not args.allow_unsafe_html:
        parts = []
        if body.elements_stripped:
            parts.append(f"{body.elements_stripped} dangerous element(s)")
        if body.event_handlers_stripped:
            parts.append(f"{body.event_handlers_stripped} event handler(s)")
        if body.dangerous_urls_neutralised:
            parts.append(f"{body.dangerous_urls_neutralised} dangerous URL(s)")
        if body.markdown_links_neutralised:
            parts.append(f"{body.markdown_links_neutralised} unsafe markdown link(s)")
        lines.append(f"  stripped unsafe HTML: {body.total} total — {', '.join(parts)}")
        replay_hints.append(("--allow-unsafe-html", f"preserve these {body.total} pattern(s)"))

    if fm.total and not args.allow_frontmatter_html:
        lines.append(f"  stripped frontmatter HTML: {fm.total} tag(s) across string values")
        replay_hints.append(("--allow-frontmatter-html", f"preserve these {fm.total} tag(s)"))

    if active.total and not args.allow_active_content:
        summary = " · ".join(active.summary())
        lines.append(f"  stripped active content: {active.total} block(s) — {summary}")
        replay_hints.append(("--allow-active-content", f"preserve these {active.total} block(s)"))

    # Files skipped due to the size cap — not a strip, but same UX
    # shape ("here's the flag to change next time").
    if result.markdown_size_skipped:
        n = len(result.markdown_size_skipped)
        cap_mb = args.max_file_size if args.max_file_size else MAX_FILE_SIZE_BYTES // (1024 * 1024)
        lines.append(f"  skipped {n} markdown file(s) larger than {cap_mb} MB")
        for p in result.markdown_size_skipped[:5]:
            lines.append(f"    - {p}")
        if n > 5:
            lines.append(f"    … and {n - 5} more")
        replay_hints.append(("--max-file-size BIGGER_MB", f"include the {n} oversized file(s)"))

    if lines:
        print()
        print("security / policy summary:")
        for line in lines:
            print(line)

    if replay_hints:
        print()
        print("to preserve what was skipped / stripped, rerun with:")
        for flag, why in replay_hints:
            print(f"  {flag:<30}  {why}")


def _confirm(prompt: str) -> bool:
    try:
        answer = input(prompt).strip().lower()
    except EOFError:
        return False
    return answer in {"y", "yes"}


# --- Main ------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    # Pre-flight path-invariant check — before any I/O so the user hits
    # an immediate refusal rather than a partially-done write.
    try:
        source_abs = args.source.resolve()
    except (OSError, ValueError):
        print(f"error: invalid source path — {args.source}", file=sys.stderr)
        return 2

    if not source_abs.is_dir():
        print(f"error: source is not a directory — {source_abs}", file=sys.stderr)
        return 2

    dest_abs = args.dest.resolve()
    if source_abs == dest_abs:
        print("error: source and destination must be different directories. "
              "Pass a new dest path; the converter never edits in place.",
              file=sys.stderr)
        return 2
    if dest_abs.is_relative_to(source_abs):
        print("error: destination must not be inside source. "
              "Regenerations would recursively include our own output.",
              file=sys.stderr)
        return 2
    if source_abs.is_relative_to(dest_abs):
        print("error: source must not be inside destination.",
              file=sys.stderr)
        return 2

    # Tag rules
    if args.tags:
        tag_rules = _load_tag_rules(args.tags)
    else:
        tag_rules = default_directory_rules(args.source)

    # SSG plugins — normalize + validate before the preview so any
    # warning messages appear before the scan output.
    ssg_plugins = _normalize_ssg_names(args.ssg)

    # Preview
    dest_count, augment_mode = _print_preview(args, tag_rules, ssg_plugins)

    # Dry-run short-circuits before confirm.
    if args.dry_run:
        print("(--dry-run) preview only, no files written.")
        return 0

    # Overwrite gate.
    if dest_count > 0 and args.yes and not args.force:
        print("error: destination is non-empty. Use --force with --yes to overwrite.",
              file=sys.stderr)
        return 2

    # Confirm (skipped under --yes).
    if not args.yes:
        if not _confirm("proceed? [y/N]: "):
            print("aborted.")
            return 1

    # Run.
    max_file_size_bytes = (
        args.max_file_size * 1024 * 1024
        if args.max_file_size is not None
        else MAX_FILE_SIZE_BYTES
    )
    config = ConvertConfig(
        source_root=args.source,
        dest_root=args.dest,
        tag_rules=tag_rules,
        augment_only=args.augment_only,
        include=tuple(args.include) if args.include else None,
        exclude=tuple(args.exclude) if args.exclude else None,
        max_depth=args.max_depth,
        ssg_plugins=ssg_plugins,
        max_file_size_bytes=max_file_size_bytes,
        allow_unsafe_html=args.allow_unsafe_html,
        allow_frontmatter_html=args.allow_frontmatter_html,
        allow_active_content=args.allow_active_content,
    )

    print()
    print("converting…")
    result = convert(config)

    # Summary
    print(f"  written: {len(result.markdown_written)} markdown")
    if result.media.copied:
        print(f"  copied:  {len(result.media.copied)} media "
              f"({_format_bytes(result.media.bytes_copied)})")
    if result.markdown_failed:
        print(f"  failed:  {len(result.markdown_failed)} markdown", file=sys.stderr)
        for p in result.markdown_failed[:10]:
            print(f"    - {p}", file=sys.stderr)
        if len(result.markdown_failed) > 10:
            print(f"    … and {len(result.markdown_failed) - 10} more", file=sys.stderr)
    if result.media.skipped:
        print(f"  skipped: {len(result.media.skipped)} media (I/O errors)",
              file=sys.stderr)

    # Policy summary + replay hints. Shown last so it's the thing the
    # user sees when scrolling up from the prompt.
    _print_strip_summary(result, args)

    return 0 if result.ok else 1


if __name__ == "__main__":
    sys.exit(main())
