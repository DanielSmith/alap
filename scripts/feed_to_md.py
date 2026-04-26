#!/usr/bin/env python3
"""
Copyright 2026 Daniel Smith — Apache 2.0

RSS / Atom feed → markdown directory.

    pnpm run feed:to-md <feed.xml> <output-dir> [flags]

Produces one `.md` file per feed item, filename
`YYYY-MM-DD-slug.md`, with YAML frontmatter carrying feed metadata
(title, item_url, published, author, tags, feed_title, feed_url,
guid). The resulting directory is ordinary markdown — feed it to
`vault_convert.py` for the final vault pass.

    pnpm run feed:to-md feed.xml /tmp/feed-md/
    pnpm run vault:convert /tmp/feed-md/ ~/vaults/feed --yes

Matches `vault_convert.py`'s preview → confirm → execute flow:
prints a scan summary, pauses for `y/N`, then writes.

Flags:
    --yes / -y   Skip the confirm prompt.
    --dry-run    Parse and preview, don't write.
    --force      With --yes, overwrite a non-empty output directory.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# scripts/lib on sys.path so `feed_from_xml` imports resolve.
_THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_THIS_DIR / "lib"))

from feed_from_xml.parse import ParseResult, parse_file  # noqa: E402
from feed_from_xml.render import RenderedItem, render_items  # noqa: E402
from feed_from_xml.security import (  # noqa: E402
    MAX_FEED_BYTES,
    MAX_ITEMS,
    FeedTooLargeError,
)


# --- CLI arg parsing -------------------------------------------------------


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        prog="feed_to_md",
        description=(
            "Convert an RSS or Atom feed XML file into a directory of "
            "markdown files — one per item. The output is ordinary "
            "markdown; pipe into `vault_convert.py` for vault shape."
        ),
    )
    ap.add_argument("feed", type=Path,
                    help="Path to the feed XML file (RSS 2.0 or Atom 1.0).")
    ap.add_argument("output", type=Path,
                    help="Output directory. Created if missing.")
    ap.add_argument("-y", "--yes", action="store_true",
                    help="Skip the confirm prompt.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Parse and preview, don't write.")
    ap.add_argument("--force", action="store_true",
                    help="With --yes, overwrite non-empty output directory.")

    # Resource caps. See `feed_from_xml.security`.
    ap.add_argument("--max-feed-size", type=int, default=None, metavar="MB",
                    help="Feed XML size cap, in MB. Default: "
                         f"{MAX_FEED_BYTES // (1024 * 1024)}. Files larger "
                         f"than this are refused without being read.")
    ap.add_argument("--max-items", type=int, default=MAX_ITEMS,
                    help=f"Maximum items processed per feed "
                         f"(default: {MAX_ITEMS:,}).")

    # Strict-by-default security flags. Each defaults to OFF (the
    # converter strips / neutralises the corresponding content).
    ap.add_argument("--allow-unsafe-html", action="store_true",
                    help="Preserve `javascript:` / `data:text/html` "
                         "URL schemes in body markdown (link and "
                         "image destinations). Default: neutralised "
                         "to `#`.")
    ap.add_argument("--allow-frontmatter-html", action="store_true",
                    help="Preserve HTML tags in frontmatter string "
                         "values (title, author, tags). Default: "
                         "stripped.")
    return ap.parse_args(argv)


# --- Preview + confirm -----------------------------------------------------


def _print_policy_banner(args: argparse.Namespace) -> None:
    """Preview-time banner listing active strict defaults + flag
    opt-ins. Mirrors `vault_convert.py` so the user sees what's
    stripped before confirming."""
    strict: list[str] = []
    relaxed: list[str] = []
    if args.allow_unsafe_html:
        relaxed.append("--allow-unsafe-html")
    else:
        strict.append(
            "neutralise `javascript:` / `data:text/html` URL schemes "
            "in body links"
        )
    if args.allow_frontmatter_html:
        relaxed.append("--allow-frontmatter-html")
    else:
        strict.append("strip HTML tags in frontmatter values")
    strict.append("neutralise dangerous URL schemes in item_url / feed_url")
    strict.append(
        f"refuse feeds > {args.max_feed_size or (MAX_FEED_BYTES // (1024 * 1024))} MB "
        f"or > {args.max_items:,} items"
    )
    strict.append("harden filenames against reserved / hidden / control chars")

    if strict:
        print("security policy (strict by default):")
        for line in strict:
            print(f"  • {line}")
        print("  rationale: feed XML is attacker-controlled. If you know the")
        print("  source is yours (or you need a stripped feature), rerun with")
        print("  the matching --allow-* flag. Summary after run lists counts.")
    if relaxed:
        print(f"relaxed by flags: {', '.join(relaxed)}")
    if strict or relaxed:
        print()


def _print_preview(
    feed_path: Path,
    output_path: Path,
    result: ParseResult,
) -> int:
    """Print a preview block; return the count of existing files at the
    output path so the caller can decide about overwrite."""
    print(f"feed:   {feed_path.resolve()}")
    print(f"output: {output_path.resolve()}")
    print()

    if result.malformed:
        print("  malformed feed — no items recovered.")
        for w in result.warnings:
            print(f"  ! {w}")
        return 0

    print(f"feed title: {result.meta.title or '(untitled)'}")
    if result.meta.url:
        print(f"feed url:   {result.meta.url}")
    print()

    full_count = sum(1 for i in result.items if not i.body_is_summary)
    summary_count = sum(1 for i in result.items if i.body_is_summary)
    dated = sum(1 for i in result.items if i.published is not None)
    undated = len(result.items) - dated

    print(f"  {len(result.items)} items to write")
    if full_count:
        print(f"    {full_count} with full content")
    if summary_count:
        print(f"    {summary_count} with summary only (flagged in frontmatter)")
    if dated:
        print(f"    {dated} dated")
    if undated:
        print(f"    {undated} undated (filename prefix: undated-)")
    if result.duplicates_dropped:
        print(f"  {result.duplicates_dropped} duplicate GUID(s) dropped")
    if result.items_capped:
        print(f"  item cap reached — additional items skipped")
    print()

    # Destination state.
    existing = 0
    try:
        if output_path.is_dir():
            existing = sum(1 for _ in output_path.rglob("*") if _.is_file())
    except OSError:
        pass
    if existing == 0 and not output_path.exists():
        print("output: does not exist (will be created)")
    elif existing == 0:
        print("output: exists and is empty")
    else:
        print(f"output: CONTAINS {existing} existing file(s) — will be overwritten")
    print()
    return existing


def _confirm(prompt: str) -> bool:
    try:
        answer = input(prompt).strip().lower()
    except EOFError:
        return False
    return answer in {"y", "yes"}


# --- Write -----------------------------------------------------------------


def _write_rendered(
    rendered: tuple[tuple[RenderedItem, list[str]], ...],
    output_path: Path,
) -> tuple[list[str], list[str]]:
    """
    Write every rendered item into `output_path`. Returns
    `(written_filenames, warning_lines)`.

    Any single-file write failure is captured as a warning and the
    run continues — a network share hiccup on one file shouldn't lose
    all 200 others. The warnings print after the run so the user can
    decide whether to rerun.
    """
    output_path.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    warnings: list[str] = []
    for item, item_warnings in rendered:
        warnings.extend(item_warnings)
        target = output_path / item.filename
        try:
            target.write_text(item.content, encoding="utf-8")
            written.append(item.filename)
        except OSError as e:
            warnings.append(f"failed to write {item.filename}: {e}")
    return written, warnings


# --- Main ------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    # Pre-flight path checks.
    if not args.feed.exists():
        print(f"error: feed file does not exist — {args.feed}", file=sys.stderr)
        return 2
    if not args.feed.is_file():
        print(f"error: feed path is not a file — {args.feed}", file=sys.stderr)
        return 2

    try:
        feed_abs = args.feed.resolve()
        output_abs = args.output.resolve()
    except (OSError, ValueError):
        print("error: invalid path", file=sys.stderr)
        return 2

    # Defensive: refuse to write output *into* the feed's directory if
    # the feed is under it — unlikely but keeps surprise low. (The feed
    # file is a sibling, not an ancestor, so the check is strict.)
    if feed_abs == output_abs:
        print("error: feed and output paths must differ.", file=sys.stderr)
        return 2

    # Parse — enforcing the size cap before the read.
    max_feed_bytes = (
        args.max_feed_size * 1024 * 1024
        if args.max_feed_size is not None
        else MAX_FEED_BYTES
    )
    print("parsing…")
    try:
        result = parse_file(
            args.feed,
            max_feed_bytes=max_feed_bytes,
            max_items=args.max_items,
        )
    except FeedTooLargeError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except OSError as e:
        print(f"error: could not read feed — {e}", file=sys.stderr)
        return 2
    print()

    existing_count = _print_preview(args.feed, args.output, result)
    _print_policy_banner(args)

    if result.malformed:
        return 1

    if not result.items:
        print("no items to write.")
        return 0

    if args.dry_run:
        print("(--dry-run) preview only, no files written.")
        return 0

    if existing_count > 0 and args.yes and not args.force:
        print("error: output is non-empty. Use --force with --yes to overwrite.",
              file=sys.stderr)
        return 2

    if not args.yes:
        if not _confirm("proceed? [y/N]: "):
            print("aborted.")
            return 1

    # Render + write.
    rendered = render_items(
        result.items,
        result.meta,
        allow_unsafe_html=args.allow_unsafe_html,
        allow_frontmatter_html=args.allow_frontmatter_html,
    )
    print()
    print("writing…")
    written, warnings = _write_rendered(rendered, args.output)

    print(f"  wrote: {len(written)} markdown file(s)")
    if warnings:
        print()
        print("warnings:")
        for w in warnings:
            print(f"  ! {w}")
    if result.warnings:
        for w in result.warnings:
            print(f"  ! {w}")

    _print_strip_summary(rendered, args)
    return 0


def _print_strip_summary(
    rendered: tuple[tuple[RenderedItem, list[str]], ...],
    args: argparse.Namespace,
) -> None:
    """Post-write summary of every strict default that caught something,
    plus a replay-hint block listing the `--allow-*` flags a user could
    pass on a rerun to preserve that content."""
    body_total = 0
    fm_total = 0
    url_total = 0
    for item, _warnings in rendered:
        body_total += item.body_report.total
        fm_total += item.frontmatter_report.total
        url_total += item.dangerous_urls_in_frontmatter

    lines: list[str] = []
    replay_hints: list[tuple[str, str]] = []

    if body_total and not args.allow_unsafe_html:
        lines.append(f"  neutralised body HTML/URLs: {body_total} pattern(s)")
        replay_hints.append(
            ("--allow-unsafe-html", f"preserve these {body_total} pattern(s)")
        )
    if fm_total and not args.allow_frontmatter_html:
        lines.append(f"  stripped frontmatter HTML: {fm_total} tag(s)")
        replay_hints.append(
            ("--allow-frontmatter-html", f"preserve these {fm_total} tag(s)")
        )
    if url_total:
        # Always on — URL-scheme neutralisation in URL fields is not
        # behind a flag (no legitimate reason to publish `javascript:`
        # as an `item_url` value).
        lines.append(
            f"  neutralised dangerous URL schemes in item_url / "
            f"feed_url / guid: {url_total}"
        )

    if lines:
        print()
        print("security / policy summary:")
        for line in lines:
            print(line)

    if replay_hints:
        print()
        print("to preserve what was stripped, rerun with:")
        for flag, why in replay_hints:
            print(f"  {flag:<30}  {why}")


if __name__ == "__main__":
    sys.exit(main())
