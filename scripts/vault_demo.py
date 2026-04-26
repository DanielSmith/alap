#!/usr/bin/env python3
"""
Copyright 2026 Daniel Smith — Apache 2.0

Convert all six example source flavours under
`examples/sites/obsidian/sources/` into topic subdirectories of
`examples/sites/obsidian/vault/`. Invoked via `pnpm run vault:demo`.

Each source uses its corresponding SSG plugin (or none for `vanilla`
and `untrusted-demo`). Topic subdirectories give Alap menu queries
something to discriminate by — `birds/`, `cooking/`, etc. as paths.

Idempotent: rerunning overwrites the per-topic subdirectories from
their respective sources. The `vault:docs` sister script populates
the rest of the vault from `docs/`, so the two scripts coexist
without stepping on each other.
"""

from __future__ import annotations

import sys
from pathlib import Path

_THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_THIS_DIR / "lib"))

from vault_from_md.convert import ConvertConfig, convert  # noqa: E402


REPO_ROOT = _THIS_DIR.parent
SOURCES_ROOT = REPO_ROOT / "examples" / "sites" / "obsidian-shared" / "sources"
VAULT_ROOT = REPO_ROOT / "examples" / "sites" / "obsidian-shared" / "AlapDocs"


# (source-subdir, dest-subdir, ssg-plugin tuple)
DEMOS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("hugo",           "birds",            ("hugo",)),
    ("jekyll",         "cooking",          ("jekyll",)),
    ("mkdocs",         "films",            ("mkdocs",)),
    ("docusaurus",     "novels",           ("docusaurus",)),
    ("vanilla",        "bach",             ()),
    ("untrusted-demo", "untrusted-strict", ()),
)


def run_demo(source_name: str, dest_subdir: str, ssg: tuple[str, ...]) -> tuple[bool, int, int]:
    source_dir = SOURCES_ROOT / source_name
    dest_dir = VAULT_ROOT / dest_subdir
    if not source_dir.is_dir():
        print(f"  SKIP {source_name}: source not found at {source_dir}", file=sys.stderr)
        return (False, 0, 0)

    config = ConvertConfig(
        source_root=source_dir,
        dest_root=dest_dir,
        ssg_plugins=ssg,
        augment_only=False,
    )
    plugin_label = "(" + ", ".join(ssg) + ")" if ssg else "(no plugin)"
    print(f"  {source_name:18}{plugin_label:20} → {dest_subdir}")
    result = convert(config)
    return (result.ok, len(result.scan.markdown), len(result.markdown_written))


def main() -> int:
    if not SOURCES_ROOT.is_dir():
        print(f"error: sources directory not found — {SOURCES_ROOT}", file=sys.stderr)
        return 1

    print(f"sources:  {SOURCES_ROOT}")
    print(f"dest:     {VAULT_ROOT}")
    print()
    print("Converting six demo sources into topic subdirectories:")

    total_scanned = 0
    total_written = 0
    failed: list[str] = []
    for source_name, dest_subdir, ssg in DEMOS:
        ok, scanned, written = run_demo(source_name, dest_subdir, ssg)
        total_scanned += scanned
        total_written += written
        if not ok:
            failed.append(source_name)

    print()
    print(f"scanned:  {total_scanned} markdown")
    print(f"written:  {total_written} markdown files")
    if failed:
        print(f"failed:   {', '.join(failed)}", file=sys.stderr)

    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
