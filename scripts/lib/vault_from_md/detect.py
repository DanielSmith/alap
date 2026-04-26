"""
Copyright 2026 Daniel Smith — Apache 2.0

Conventional-config-file based SSG detection.

Pure sniff logic — looks for the standard config file each SSG ships at
the root of its project directory. Results are surfaced in the CLI
preview as a hint, never used to auto-apply transforms. Opt-in stays
explicit via the `--ssg` flag.

Multiple detectors can fire on one source — rare (a repo shouldn't
normally host two SSG configs side-by-side) but not blocked. The CLI
lists every hit and leaves the choice to the user.
"""

from __future__ import annotations

from pathlib import Path

# Per-SSG config file families. First match wins; order within each
# family doesn't matter.
_HUGO_CONFIG_FILES = ("hugo.yaml", "hugo.yml", "hugo.toml", "hugo.json", "config.toml", "config.yaml", "config.yml")
_JEKYLL_CONFIG_FILES = ("_config.yml", "_config.yaml")
_MKDOCS_CONFIG_FILES = ("mkdocs.yml", "mkdocs.yaml")
_DOCUSAURUS_CONFIG_FILES = ("docusaurus.config.js", "docusaurus.config.ts", "docusaurus.config.mjs")


def detect_ssgs(source_root: Path) -> tuple[str, ...]:
    """
    Return the SSG names whose conventional config files exist at
    `source_root`. Order is stable (`hugo`, `jekyll`, `mkdocs`,
    `docusaurus`) regardless of which detectors fire.

    Missing / non-directory source returns `()` rather than raising —
    detection is meant to be a best-effort hint, not an assertion.
    """
    if not source_root.is_dir():
        return ()

    found: list[str] = []
    if _any_exists(source_root, _HUGO_CONFIG_FILES):
        found.append("hugo")
    if _any_exists(source_root, _JEKYLL_CONFIG_FILES):
        found.append("jekyll")
    if _any_exists(source_root, _MKDOCS_CONFIG_FILES):
        found.append("mkdocs")
    if _any_exists(source_root, _DOCUSAURUS_CONFIG_FILES):
        found.append("docusaurus")
    return tuple(found)


def which_config(source_root: Path, ssg: str) -> Path | None:
    """
    Return the specific config file path that triggered detection for
    `ssg`, or `None` if nothing matched. The CLI uses this to print
    "found hugo.toml" so users can see why we detected what we did.
    """
    family = _CONFIG_FAMILIES.get(ssg)
    if family is None:
        return None
    for name in family:
        candidate = source_root / name
        if candidate.is_file():
            return candidate
    return None


_CONFIG_FAMILIES: dict[str, tuple[str, ...]] = {
    "hugo": _HUGO_CONFIG_FILES,
    "jekyll": _JEKYLL_CONFIG_FILES,
    "mkdocs": _MKDOCS_CONFIG_FILES,
    "docusaurus": _DOCUSAURUS_CONFIG_FILES,
}


def _any_exists(source_root: Path, names: tuple[str, ...]) -> bool:
    return any((source_root / name).is_file() for name in names)
