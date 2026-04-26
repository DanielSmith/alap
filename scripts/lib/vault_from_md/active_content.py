"""
Copyright 2026 Daniel Smith — Apache 2.0

Active-content detection and optional stripping for converted vault
output.

**Threat model.** Obsidian's community-plugin ecosystem exposes
"active content" — fenced code blocks or inline syntax that runs
logic when the vault is opened. Popular examples:

- **Dataview** DQL queries (`` ```dataview ``) — read files across the
  vault and render tables. Not arbitrary code execution, but exposes
  the vault's structure.
- **Dataview JS** (`` ```dataviewjs ``) — executes arbitrary
  JavaScript in the plugin's sandbox. Can read files, issue fetch
  requests, modify the DOM.
- **Templater** (`<% … %>`) — arbitrary JS that can read/write vault
  files, spawn processes, and hit the network.
- **Excalidraw** (`` ```excalidraw ``) — JSON blobs describing
  drawings. Not executable per se, but the Excalidraw plugin can
  embed arbitrary linked files and scripts.
- **Tasks** (`` ```tasks ``) — query DSL, plugin-interpreted.

Obsidian itself doesn't run any of this unless the corresponding
community plugin is installed. But a user converting someone else's
content who then opens the output with Dataview/Templater installed
**does** execute the embedded logic on vault open.

**Strict default.** The converter strips every active-content block
by default. Users who legitimately want to preserve their own
Dataview queries or Templater templates (e.g. augmenting their own
vault) opt in via `--allow-active-content`.

**What's counted but never stripped automatically:** other
plugin-specific syntax we don't yet know about. The v1 pattern set
covers the five most-installed community plugins; adding more is
additive.

**Idempotent.** Stripped blocks are gone; re-running finds nothing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# --- Patterns -------------------------------------------------------------

# Fenced code blocks whose language tag signals active content. The
# language tag may be followed by options (`{type=table}`, etc.); we
# match anything up to the newline. Non-greedy body, line-start
# closing fence.
_DATAVIEW_RE = re.compile(
    r"^```dataview\b[^\n]*\n.*?^```\s*$",
    re.MULTILINE | re.DOTALL,
)
_DATAVIEWJS_RE = re.compile(
    r"^```dataviewjs\b[^\n]*\n.*?^```\s*$",
    re.MULTILINE | re.DOTALL,
)
_TASKS_RE = re.compile(
    r"^```tasks\b[^\n]*\n.*?^```\s*$",
    re.MULTILINE | re.DOTALL,
)
_EXCALIDRAW_RE = re.compile(
    r"^```excalidraw\b[^\n]*\n.*?^```\s*$",
    re.MULTILINE | re.DOTALL,
)

# Templater expressions — `<%= x %>`, `<% x %>`, `<%+ x %>`, `<%- x %>`,
# `<%~ x %>`, `<%* x %>`. All terminate with `%>`. Multi-line blocks
# (`<%* ... %>`) allowed via DOTALL. Non-greedy to the first `%>`.
_TEMPLATER_RE = re.compile(r"<%.*?%>", re.DOTALL)


# --- Report type ----------------------------------------------------------


@dataclass(frozen=True)
class ActiveContentReport:
    """
    Count of active-content patterns encountered in a body, keyed by
    plugin. Reported per-file by the convert orchestrator and summed
    across files for the CLI summary.
    """
    dataview: int = 0
    dataviewjs: int = 0
    tasks: int = 0
    excalidraw: int = 0
    templater: int = 0

    @property
    def total(self) -> int:
        return (
            self.dataview
            + self.dataviewjs
            + self.tasks
            + self.excalidraw
            + self.templater
        )

    def __add__(self, other: "ActiveContentReport") -> "ActiveContentReport":
        return ActiveContentReport(
            dataview=self.dataview + other.dataview,
            dataviewjs=self.dataviewjs + other.dataviewjs,
            tasks=self.tasks + other.tasks,
            excalidraw=self.excalidraw + other.excalidraw,
            templater=self.templater + other.templater,
        )

    def summary(self) -> list[str]:
        """Human-readable per-plugin breakdown, skipping zero counts.
        Returns a list of 'NAME: COUNT' strings the CLI can format."""
        parts: list[str] = []
        if self.dataview:
            parts.append(f"dataview: {self.dataview}")
        if self.dataviewjs:
            parts.append(f"dataviewjs: {self.dataviewjs}")
        if self.tasks:
            parts.append(f"tasks: {self.tasks}")
        if self.excalidraw:
            parts.append(f"excalidraw: {self.excalidraw}")
        if self.templater:
            parts.append(f"templater: {self.templater}")
        return parts


# --- Entry point ----------------------------------------------------------


def process_active_content(
    body: str,
    *,
    strip: bool,
) -> tuple[str, ActiveContentReport]:
    """
    Scan `body` for active-content patterns. When `strip` is True,
    remove each match entirely. Returns `(body, report)`; when
    `strip=False`, returned body is identical to input.

    Counts are always returned — whether the user opted to strip or
    allow, the CLI can report what was seen.
    """
    dataview = _count(_DATAVIEW_RE, body)
    dataviewjs = _count(_DATAVIEWJS_RE, body)
    tasks = _count(_TASKS_RE, body)
    excalidraw = _count(_EXCALIDRAW_RE, body)
    templater = _count(_TEMPLATER_RE, body)

    if strip:
        body = _DATAVIEW_RE.sub("", body)
        body = _DATAVIEWJS_RE.sub("", body)
        body = _TASKS_RE.sub("", body)
        body = _EXCALIDRAW_RE.sub("", body)
        body = _TEMPLATER_RE.sub("", body)

    return body, ActiveContentReport(
        dataview=dataview,
        dataviewjs=dataviewjs,
        tasks=tasks,
        excalidraw=excalidraw,
        templater=templater,
    )


def _count(pattern: re.Pattern[str], body: str) -> int:
    # `findall` returns a list of matches; its length is the count.
    return len(pattern.findall(body))
