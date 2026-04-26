"""
Copyright 2026 Daniel Smith — Apache 2.0

HTML sanitization for converted vault output.

**Threat model.** A source markdown file may contain HTML embedded
by its author (markdown permits this) or crafted by an adversary
who controls that source. Obsidian renders note bodies in an
Electron context and sanitizes most things itself, but a
defense-in-depth strip at conversion time keeps obviously-hostile
content out of the vault entirely. Belts and braces.

**What's dangerous (stripped by default):**

- `<script>…</script>` — executable JS, no legitimate use in markdown.
- `<iframe>…</iframe>` — external-origin frame; can mount clickjacking,
  data exfil, or simple visual hijack.
- `<object>…</object>`, `<embed …/>` — legacy plugin surfaces.
- `<link>` with `rel="stylesheet"` — style injection.
- `on*=…` event-handler attributes on any tag — `onclick`, `onerror`,
  `onload`, `onmouseover`, etc.
- `href`/`src` attribute values starting with `javascript:`, `vbscript:`,
  or `data:text/html` — script-URL injection. Replaced with `#`.
- Markdown `[text](javascript:…)` links — same class, neutralised to
  `[text](#)`.

**What's left alone (judgment calls):**

- `<div>`, `<span>`, `<strong>`, `<em>`, `<a>` (with safe `href`),
  `<img>` (with safe `src`), `<details>`, `<summary>`, `<br>`, `<hr>`
  — standard markdown-extension HTML. Obsidian renders all of these.
- Inline CSS in `style=` attributes — Obsidian sanitises this layer at
  render time; stripping it would mangle a lot of legitimate content
  (pre-formatted tables, callouts, etc.).
- `data:image/*` URLs — legitimate for inline images; only the
  `data:text/html` family is gated.

**Opt-in to bypass.** The converter defaults to strict. Users who
need to preserve specific dangerous patterns (e.g. converting a
developer's own vault that happens to use `<script>` in a legit
offline context) pass `--allow-unsafe-html` for body content or
`--allow-frontmatter-html` for frontmatter values.

**Idempotent.** Once stripped, the patterns don't reappear in the
output; re-running is a no-op.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


# --- Body-content patterns ------------------------------------------------

# Elements whose presence is effectively always unsafe in a note body.
# Regex strips the entire element including its content — no attempt at
# partial sanitisation, because there's no legitimate "safe subset" of
# `<script>` (or the others) in a markdown document.
#
# The `[^>]{0,500}` bound is a ReDoS guard: without a cap, pathological
# inputs with many unclosed `<script` openings trigger quadratic
# backtracking. 500 chars of attributes in a single HTML tag is well
# past any realistic use (real elements have dozens of chars at most).
_DANGEROUS_ELEMENTS_RE = re.compile(
    r"<(?P<tag>script|iframe|object|embed)\b[^>]{0,500}(?:"
    r"/\s*>|"                                        # self-closing
    r">.*?</(?P=tag)\s*>"                            # paired
    r")",
    re.IGNORECASE | re.DOTALL,
)

# `<link rel="stylesheet" …>` — CSS injection surface. Self-closing
# only (link has no paired form). Other `<link>` uses (`rel="canonical"`)
# are stripped too; they're uncommon in markdown and not worth special-
# casing.
_LINK_ELEMENT_RE = re.compile(
    r"<link\b[^>]{0,500}/?>",
    re.IGNORECASE,
)

# Event-handler attributes: `onclick`, `onerror`, `onload`, `onmouseover`,
# `onmouseout`, `onfocus`, `onblur`, and dozens more. Any `on<word>=…`
# pattern inside a tag. Matches quoted and unquoted attribute values.
_EVENT_HANDLER_RE = re.compile(
    r"""
    \s+on\w+                    # ` onclick`, ` onerror`, ...
    \s*=\s*
    (?:
        "[^"]*"                 # double-quoted
        |
        '[^']*'                 # single-quoted
        |
        [^\s>]+                 # unquoted
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)

# `href="javascript:…"` / `src="javascript:…"` / same for vbscript /
# data:text/html. Neutralised to `href="#"` so the containing tag
# survives but the URL is inert.
_DANGEROUS_URL_SCHEMES_RE = re.compile(
    r"""
    (?P<attr>href|src|xlink:href)
    \s*=\s*
    (?P<quote>["'])
    \s*
    (?:javascript|vbscript|livescript):
    [^"']*
    (?P=quote)
    """,
    re.IGNORECASE | re.VERBOSE,
)

# `data:text/html…` and `data:application/xhtml…` — the text-family
# data URLs can contain active content. `data:image/…`, `data:audio/…`
# are left alone (legitimate inline media).
_DATA_TEXT_URL_RE = re.compile(
    r"""
    (?P<attr>href|src|xlink:href)
    \s*=\s*
    (?P<quote>["'])
    \s*
    data:(?:text/html|application/xhtml)
    [^"']*
    (?P=quote)
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Markdown link with a dangerous URL scheme: `[text](javascript:…)`.
# URLs can legitimately contain parens (`alert(1)`, function-ish
# payloads), so we allow one level of nesting in the body match
# before requiring the outer `)` — catches the common attack shape
# without breaking down on `javascript:alert(1)`.
_MARKDOWN_LINK_UNSAFE_RE = re.compile(
    r"""
    (?<!!)                                     # NOT image syntax
    \[
    (?P<text>[^\]\n]+)
    \]
    \(
    \s*
    (?:javascript|vbscript|livescript):        # dangerous scheme
    (?:                                        # URL body with ≤1-level paren nesting:
        [^()\n]*                                # non-paren run
        (?:\([^)\n]*\)[^()\n]*)*                # optionally: (nested) then more
    )
    \)
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Markdown image with a dangerous URL scheme: `![alt](javascript:…)`
# or `![alt](data:text/html,…)`. Image syntax was explicitly excluded
# from the link pattern above (images can't script-execute in
# markdown readers), but `data:text/html` URLs in img src — which
# some HTML→markdown converters emit from `<img src="data:text/html">` —
# are an escape hatch some renderers mis-handle. Neutralise them too.
_MARKDOWN_IMAGE_UNSAFE_RE = re.compile(
    r"""
    !\[
    (?P<alt>[^\]\n]*)
    \]
    \(
    \s*
    (?:
        (?:javascript|vbscript|livescript):
        |
        data:(?:text/html|application/xhtml)
    )
    (?:                                        # URL body with ≤1-level paren nesting:
        [^()\n]*
        (?:\([^)\n]*\)[^()\n]*)*
    )
    \)
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Frontmatter-value HTML — ANY tag in a string value. Frontmatter
# should be plain text metadata; HTML there is always suspicious.
_ANY_HTML_TAG_RE = re.compile(r"<[^>]+>")


# --- Result types ---------------------------------------------------------


@dataclass(frozen=True)
class SanitizeReport:
    """Counts of patterns stripped or neutralised. Reported per-file
    by the convert orchestrator and summed across files for the CLI."""
    elements_stripped: int = 0       # <script>, <iframe>, <object>, <embed>, <link>
    event_handlers_stripped: int = 0  # on*="..." attributes
    dangerous_urls_neutralised: int = 0  # javascript:/vbscript:/data:text/html
    markdown_links_neutralised: int = 0  # [text](javascript:...)

    @property
    def total(self) -> int:
        return (
            self.elements_stripped
            + self.event_handlers_stripped
            + self.dangerous_urls_neutralised
            + self.markdown_links_neutralised
        )

    def __add__(self, other: "SanitizeReport") -> "SanitizeReport":
        return SanitizeReport(
            elements_stripped=self.elements_stripped + other.elements_stripped,
            event_handlers_stripped=self.event_handlers_stripped + other.event_handlers_stripped,
            dangerous_urls_neutralised=self.dangerous_urls_neutralised + other.dangerous_urls_neutralised,
            markdown_links_neutralised=self.markdown_links_neutralised + other.markdown_links_neutralised,
        )


# --- Body sanitisation ----------------------------------------------------


def strip_unsafe_html(body: str) -> tuple[str, SanitizeReport]:
    """
    Remove or neutralise dangerous HTML/URL patterns in a markdown
    body. Returns `(sanitised_body, report)`.

    Idempotent: running on already-sanitised body is a no-op; patterns
    are gone, so nothing matches the second time.
    """
    elements = 0
    event_handlers = 0
    dangerous_urls = 0
    md_links = 0

    def _count_and_strip(pattern: re.Pattern[str], text: str) -> tuple[str, int]:
        new_text, n = pattern.subn("", text)
        return new_text, n

    body, n = _count_and_strip(_DANGEROUS_ELEMENTS_RE, body)
    elements += n
    body, n = _count_and_strip(_LINK_ELEMENT_RE, body)
    elements += n
    body, n = _count_and_strip(_EVENT_HANDLER_RE, body)
    event_handlers += n

    # Neutralise dangerous URL attribute values — keep the attr name
    # but replace the URL with `#` so the element still parses.
    def _neutralise_url(match: re.Match[str]) -> str:
        attr = match.group("attr")
        quote = match.group("quote")
        return f'{attr}={quote}#{quote}'

    body, n = _DANGEROUS_URL_SCHEMES_RE.subn(_neutralise_url, body)
    dangerous_urls += n
    body, n = _DATA_TEXT_URL_RE.subn(_neutralise_url, body)
    dangerous_urls += n

    # Markdown links — replace URL with `#`, keep text.
    def _neutralise_md_link(match: re.Match[str]) -> str:
        return f"[{match.group('text')}](#)"

    body, n = _MARKDOWN_LINK_UNSAFE_RE.subn(_neutralise_md_link, body)
    md_links += n

    # Markdown images with dangerous URL schemes — same treatment.
    def _neutralise_md_image(match: re.Match[str]) -> str:
        return f"![{match.group('alt')}](#)"

    body, n = _MARKDOWN_IMAGE_UNSAFE_RE.subn(_neutralise_md_image, body)
    md_links += n

    return body, SanitizeReport(
        elements_stripped=elements,
        event_handlers_stripped=event_handlers,
        dangerous_urls_neutralised=dangerous_urls,
        markdown_links_neutralised=md_links,
    )


# --- Frontmatter sanitisation ---------------------------------------------


def strip_frontmatter_html(data: dict[str, Any]) -> tuple[dict[str, Any], SanitizeReport]:
    """
    Strip HTML-ish tags from every string value in a frontmatter dict.
    Returns `(sanitised_data, report)`. The input dict is not mutated.

    Non-string values (lists, dicts, numbers, bools, None) pass through
    unchanged — frontmatter injection attacks via HTML only apply to
    string-valued fields (title, description, etc.). Recursion into
    nested dicts/lists is deliberately not supported in v1: frontmatter
    should be flat metadata, and going deeper invites edge cases we
    don't need yet.
    """
    elements = 0
    result: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, str):
            cleaned, n = _ANY_HTML_TAG_RE.subn("", value)
            result[key] = cleaned
            elements += n
        elif isinstance(value, list):
            # Strip tags from any string items in a list (e.g. tags:).
            new_list: list[Any] = []
            for item in value:
                if isinstance(item, str):
                    cleaned, n = _ANY_HTML_TAG_RE.subn("", item)
                    new_list.append(cleaned)
                    elements += n
                else:
                    new_list.append(item)
            result[key] = new_list
        else:
            result[key] = value
    return result, SanitizeReport(elements_stripped=elements)
