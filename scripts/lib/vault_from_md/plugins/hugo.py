"""
Copyright 2026 Daniel Smith — Apache 2.0

Hugo shortcode transforms.

Converts the most common Hugo shortcodes to Obsidian-flavoured markdown:

    {{% heading "X" %}}            → ## X
    {{< note >}}…{{< /note >}}    → > [!note]\\n> …  (Obsidian callout)
    …warning / tip / info / caution / danger, both {{< >}} and {{% %}} forms
    {{% pageinfo %}}…{{% /pageinfo %}} → blockquote
    {{< figure src="X" alt="Y" >}} → ![Y](X)
    {{< toc >}}                    → (stripped — Obsidian has its own outline)
    {{< highlight lang >}}…{{< /highlight >}} → ```lang\\n…\\n```

Unknown shortcodes pass through as literal text — this is deliberately
not a Hugo transpiler. A v2 could extract shortcode titles
(`{{< note title="…" >}}`) and append them as Obsidian callout titles;
for now attrs are discarded.

Idempotent: once matched patterns are rewritten to plain markdown the
shapes never contain `{{…}}` markers again, so re-running this on the
output is a no-op. Pass-through shortcodes also don't match any of
our patterns, so they stay put.
"""

from __future__ import annotations

import re


# --- Patterns -------------------------------------------------------------

# The admonition types Hugo themes conventionally use. Both the Docsy
# set and the GitHub-flavoured-markdown set (note/warning/tip/info/
# caution/danger) map 1:1 to Obsidian callouts.
_ADMONITION_TYPES = r"note|warning|tip|info|caution|danger"

# Angle-bracket admonition: `{{< note >}}…{{< /note >}}`.
# Allows attrs between the type and the `>}}` (e.g. `title="…"`) but
# discards them in this pass. `[^>]{0,500}` bounds backtracking on
# pathological unclosed-tag input.
_ADMONITION_ANGLE_RE = re.compile(
    rf"\{{\{{<\s*({_ADMONITION_TYPES})(?:\s+[^>]{{0,500}})?\s*>\}}\}}(.*?)\{{\{{<\s*/\1\s*>\}}\}}",
    re.DOTALL,
)

# Percent admonition: `{{% note %}}…{{% /note %}}`.
_ADMONITION_PERCENT_RE = re.compile(
    rf"\{{\{{%\s*({_ADMONITION_TYPES})(?:\s+[^%]{{0,500}})?\s*%\}}\}}(.*?)\{{\{{%\s*/\1\s*%\}}\}}",
    re.DOTALL,
)

# Docsy's `{{% heading "X" %}}` — inline shortcode producing an H2.
_HEADING_RE = re.compile(
    r'\{\{%\s*heading\s+"([^"]*)"\s*%\}\}'
)

# Docsy's `{{% pageinfo %}}…{{% /pageinfo %}}` — blockquote.
_PAGEINFO_RE = re.compile(
    r"\{\{%\s*pageinfo\s*(?:%\}\}|\s+[^%]*%\}\})(.*?)\{\{%\s*/pageinfo\s*%\}\}",
    re.DOTALL,
)

# `{{< figure src="X" alt="Y" caption="…" … >}}` → markdown image.
_FIGURE_RE = re.compile(
    r"\{\{<\s*figure\s+([^>]*?)\s*>\}\}"
)
_FIGURE_ATTR_SRC = re.compile(r'src\s*=\s*"([^"]+)"')
_FIGURE_ATTR_ALT = re.compile(r'alt\s*=\s*"([^"]*)"')

# `{{< toc >}}` — strip (Obsidian has its own outline pane).
_TOC_RE = re.compile(r"\{\{<\s*toc\s*/?\s*>\}\}")

# `{{< highlight lang [opts] >}}…{{< /highlight >}}` → fenced code block.
_HIGHLIGHT_RE = re.compile(
    r"\{\{<\s*highlight\s+(\S+)(?:\s+[^>]*)?\s*>\}\}(.*?)\{\{<\s*/highlight\s*>\}\}",
    re.DOTALL,
)


# --- Entry point ----------------------------------------------------------


def transform(body: str) -> str:
    """
    Apply every Hugo shortcode rewrite to `body` in a fixed order.
    Returns transformed body. Idempotent.
    """
    # Headings first so the text inside doesn't accidentally look like
    # another pattern.
    body = _HEADING_RE.sub(_heading_sub, body)
    # Admonition forms.
    body = _ADMONITION_ANGLE_RE.sub(_admonition_sub, body)
    body = _ADMONITION_PERCENT_RE.sub(_admonition_sub, body)
    # Blockquote-like.
    body = _PAGEINFO_RE.sub(_pageinfo_sub, body)
    # Figure → image.
    body = _FIGURE_RE.sub(_figure_sub, body)
    # Highlight → fenced code.
    body = _HIGHLIGHT_RE.sub(_highlight_sub, body)
    # TOC strip last so nothing replaces into a line we then delete.
    body = _TOC_RE.sub("", body)
    return body


# --- Per-pattern substitution functions ------------------------------------


def _heading_sub(m: re.Match[str]) -> str:
    return f"## {m.group(1).strip()}"


def _admonition_sub(m: re.Match[str]) -> str:
    kind = m.group(1).lower()
    raw_body = m.group(2).strip("\n")
    return _build_callout(kind, raw_body)


def _pageinfo_sub(m: re.Match[str]) -> str:
    raw_body = m.group(1).strip("\n")
    return _prefix_lines(raw_body, "> ")


def _figure_sub(m: re.Match[str]) -> str:
    attrs = m.group(1)
    src_m = _FIGURE_ATTR_SRC.search(attrs)
    alt_m = _FIGURE_ATTR_ALT.search(attrs)
    if not src_m:
        # Malformed figure (no src) — leave the original shortcode alone
        # so the user sees something's off rather than silent data loss.
        return m.group(0)
    alt = alt_m.group(1) if alt_m else ""
    return f"![{alt}]({src_m.group(1)})"


def _highlight_sub(m: re.Match[str]) -> str:
    lang = m.group(1).strip().strip('"').strip("'")
    content = m.group(2).strip("\n")
    return f"```{lang}\n{content}\n```"


# --- Helpers --------------------------------------------------------------


def _build_callout(kind: str, body: str) -> str:
    """
    Emit an Obsidian-style callout:

        > [!kind]
        > body-line-one
        > body-line-two
    """
    return f"> [!{kind}]\n{_prefix_lines(body, '> ')}"


def _prefix_lines(text: str, prefix: str) -> str:
    """
    Prefix every line in `text` with `prefix`. Blank lines get a
    bare-prefix marker (`>` without trailing space) so Obsidian keeps
    the blockquote contiguous rather than breaking it into segments.
    """
    lines = text.split("\n")
    out = []
    for line in lines:
        if line.strip() == "":
            out.append(prefix.rstrip())
        else:
            out.append(f"{prefix}{line}")
    return "\n".join(out)
