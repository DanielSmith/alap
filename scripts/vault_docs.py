#!/usr/bin/env python3
"""
Copyright 2026 Daniel Smith — Apache 2.0

Regenerate the `examples/sites/obsidian/vault/` snapshot from
`alap/docs/`. Invoked via `pnpm run vault:docs`.

Zero-arg wrapper around `vault_from_md.convert` — source, destination,
and tag rules are all repo-relative constants baked in here. No
confirmation prompt: this is a known project operation the maintainer
(or a pre-push hook, or CI) should be able to run without ceremony.

The tag ruleset reflects `alap/docs/`'s actual topic-directory layout.
Top-level files (`README.md`, `FAQ.md`, `start-*.md`, `alap-export-sizes.md`)
deliberately get no tag — they're meta/entry docs and the tag pane
doesn't need a `#root` bucket for them.
"""

from __future__ import annotations

import sys
from pathlib import Path

# scripts/lib on sys.path so `vault_from_md` imports resolve.
_THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_THIS_DIR / "lib"))

from vault_from_md.convert import ConvertConfig, convert  # noqa: E402
from vault_from_md.tags import TagRule  # noqa: E402


# Repo layout — scripts/ is one level under the repo root.
REPO_ROOT = _THIS_DIR.parent
SOURCE_DIR = REPO_ROOT / "docs"
DEST_DIR = REPO_ROOT / "examples" / "sites" / "obsidian-shared" / "AlapDocs"

# One rule per topic directory in `alap/docs/`. Hyphenated directory
# names map to underscored tags because `-` is Alap's WITHOUT operator
# and `.framework-guides` would parse as subtraction, not a single tag.
ALAP_DOCS_TAG_RULES: tuple[TagRule, ...] = (
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


def main() -> int:
    if not SOURCE_DIR.is_dir():
        print(f"error: source directory not found — {SOURCE_DIR}", file=sys.stderr)
        return 1

    config = ConvertConfig(
        source_root=SOURCE_DIR,
        dest_root=DEST_DIR,
        tag_rules=ALAP_DOCS_TAG_RULES,
        augment_only=False,  # alap/docs/ is cold markdown, not an existing vault
    )

    print(f"source:   {SOURCE_DIR}")
    print(f"dest:     {DEST_DIR}")
    print(f"tag rules: {len(ALAP_DOCS_TAG_RULES)} directory → tag mappings")
    print()

    result = convert(config)

    print(f"scanned:  {len(result.scan.markdown)} markdown, {len(result.scan.media)} media")
    print(f"written:  {len(result.markdown_written)} markdown files")
    if result.media.copied:
        print(f"copied:   {len(result.media.copied)} media files "
              f"({result.media.bytes_copied / 1_048_576:.2f} MB)")
    if result.markdown_failed:
        print(f"failed:   {len(result.markdown_failed)} markdown", file=sys.stderr)
        for p in result.markdown_failed:
            print(f"  - {p}", file=sys.stderr)
    if result.media.skipped:
        print(f"skipped:  {len(result.media.skipped)} media", file=sys.stderr)

    if result.scan.symlink_count:
        print(f"note:     skipped {result.scan.symlink_count} symlink(s) during walk")
    if result.scan.depth_limit_reached:
        print(f"note:     depth limit stopped descent at {len(result.scan.depth_limit_reached)} dir(s)")

    return 0 if result.ok else 1


if __name__ == "__main__":
    sys.exit(main())
