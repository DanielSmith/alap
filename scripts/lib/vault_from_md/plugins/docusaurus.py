"""
Copyright 2026 Daniel Smith — Apache 2.0

Docusaurus / MDX transforms.

This plugin spans two eras of Docusaurus syntax: the proprietary forms
that shipped through 3.x, and the stricter native-MDX forms that
Docusaurus 3.10 is pushing toward for 4.x. We handle both so user
content mid-transition converts cleanly either way.

Transforms:

    :::note\\ncontent\\n:::              → > [!note]\\n> content
    :::warning Pay Attention\\n…\\n:::   → > [!warning] Pay Attention\\n> …
    :::warning[Pay Attention]\\n…\\n:::  → same (directive form, Docusaurus 3.10+)
    :::note{.cls #id}\\n…\\n:::          → > [!note]\\n> …    (shortcut discarded)

    ## Heading {#my-id}                → ## Heading         (legacy ID syntax)
    ## Heading {/* #my-id */}          → ## Heading         (MDX-native ID)

    <!-- html comment -->              → (stripped)
    {/* jsx comment */}                → (stripped)

    import X from '...';               → (stripped if at body top)
    import { A, B } from '...';        → (stripped if at body top)

    <Tabs>…</Tabs>                     → (outer tags stripped, content kept)
    <TabItem value="x" label="Y">…</TabItem> → (tags stripped; label discarded)

Unknown `<Component />` JSX passes through as literal text. A future
pass could extract `<TabItem label="…">` into a heading, but v1 keeps
it simple — strip, retain inner text.

**Important non-concern:** this plugin reads Docusaurus-authored
markdown. It does not invoke Docusaurus or its toolchain, has no npm
contact, and carries no dependency on using Docusaurus to build sites.
See `docs/obsidian-conversion--plan.md` § Context for the reasoning.

Idempotent: rewritten shapes don't match their source patterns again.
Pass-through JSX and stripped imports/comments stay gone on re-run.
"""

from __future__ import annotations

import re


# --- Patterns -------------------------------------------------------------

# Admonition — one regex that handles all four header shapes:
#   :::type
#   :::type Legacy title
#   :::type[Directive title]
#   :::type{.cls #id} or :::type[Directive title]{.cls #id}
_ADMONITION_RE = re.compile(
    r"^:::(\w+)"                        # 1: type
    r"(?:\[([^\]]*)\])?"                # 2: directive title (optional)
    r"(?:\{[^}]*\})?"                   # class/id shortcut (discarded, non-capturing)
    r"(?:[ \t]+([^\n\[\{]*?))?"         # 3: legacy title (optional)
    r"[ \t]*\n"                         # end of header line
    r"(.*?)"                            # 4: body (non-greedy, multi-line)
    r"\n:::[ \t]*$",                    # closing fence on its own line
    re.MULTILINE | re.DOTALL,
)

# Heading IDs — legacy proprietary form `## Heading {#my-id}`.
_HEADING_ID_LEGACY_RE = re.compile(
    r"^(#{1,6}[ \t]+.+?)[ \t]*\{#[^}]*\}[ \t]*$",
    re.MULTILINE,
)

# Heading IDs — MDX-native form `## Heading {/* #my-id */}`.
_HEADING_ID_MDX_RE = re.compile(
    r"^(#{1,6}[ \t]+.+?)[ \t]*\{/\*[ \t]*#[^*]*\*/\}[ \t]*$",
    re.MULTILINE,
)

# HTML comments — MDX v3 doesn't support these but legacy content may.
# Obsidian renders them as literal text; better to strip.
_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)

# MDX v3 JSX comments — `{/* ... */}`. Also strip.
_JSX_COMMENT_RE = re.compile(r"\{/\*.*?\*/\}", re.DOTALL)

# Leading MDX import lines. Only stripped from the very top of the
# body (before any content), where Docusaurus places them. An `import`
# mid-document is probably a literal in prose — leave it alone.
_LEADING_IMPORTS_RE = re.compile(
    r"\A(?:[ \t]*import[ \t]+[^\n]+\n+)+"
)

# `<Tabs>…</Tabs>` wrapper — keep inner content, drop tags. Attrs on
# the opening tag are tolerated and discarded.
_TABS_WRAPPER_RE = re.compile(
    r"<Tabs\b[^>]*>(.*?)</Tabs>",
    re.DOTALL,
)

# `<TabItem value="x" label="Y">…</TabItem>` — keep inner content,
# drop tags. Tab labels are lost in v1; could be upgraded to headings
# later.
_TABITEM_WRAPPER_RE = re.compile(
    r"<TabItem\b[^>]*>(.*?)</TabItem>",
    re.DOTALL,
)


# --- Entry point ----------------------------------------------------------


def transform(body: str) -> str:
    """Apply every Docusaurus / MDX rewrite. Idempotent."""
    # 1. Strip leading imports first — they're the most likely to
    #    contain `{...}` braces that later patterns might misread.
    body = _LEADING_IMPORTS_RE.sub("", body)

    # 2. Strip comments (both forms) before anything else, so comment
    #    bodies don't get interpreted by subsequent patterns.
    body = _HTML_COMMENT_RE.sub("", body)
    body = _JSX_COMMENT_RE.sub("", body)

    # 3. Heading-ID strip (both forms).
    body = _HEADING_ID_LEGACY_RE.sub(r"\1", body)
    body = _HEADING_ID_MDX_RE.sub(r"\1", body)

    # 4. Admonitions — one regex covers legacy + directive + shortcut.
    body = _ADMONITION_RE.sub(_admonition_sub, body)

    # 5. Known JSX wrappers, outer first so nested TabItems stay in
    #    the Tabs-stripped remainder for their own pass.
    body = _TABS_WRAPPER_RE.sub(r"\1", body)
    body = _TABITEM_WRAPPER_RE.sub(r"\1", body)

    return body


# --- Per-pattern substitution ---------------------------------------------


def _admonition_sub(m: re.Match[str]) -> str:
    kind = m.group(1).lower()
    # Title can come from either bracketed (directive) or legacy form.
    title = m.group(2) if m.group(2) is not None else m.group(3)
    raw_body = m.group(4).strip("\n")

    header = f"> [!{kind}]"
    if title and title.strip():
        header += f" {title.strip()}"

    body_quoted = _prefix_lines(raw_body, "> ")
    if body_quoted:
        return f"{header}\n{body_quoted}"
    return header


# --- Helpers --------------------------------------------------------------


def _prefix_lines(text: str, prefix: str) -> str:
    """
    Prefix every line with `prefix`. Blank lines get a bare-prefix
    marker (`>` without trailing space) so Obsidian keeps the callout
    contiguous rather than breaking into segments.
    """
    if not text:
        return ""
    lines = text.split("\n")
    out: list[str] = []
    for line in lines:
        if line.strip() == "":
            out.append(prefix.rstrip())
        else:
            out.append(f"{prefix}{line}")
    return "\n".join(out)
