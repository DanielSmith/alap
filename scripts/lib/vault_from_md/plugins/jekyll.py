"""
Copyright 2026 Daniel Smith — Apache 2.0

Jekyll / Liquid tag transforms.

Converts the most common Liquid templating shapes to plain markdown:

    {% highlight lang %}…{% endhighlight %}   → ```lang\\n…\\n```
    {% raw %}…{% endraw %}                    → …  (delimiters stripped)
    {% comment %}…{% endcomment %}            → (stripped entirely)
    {% include X.html %}                      → (stripped)
    {% link X %} / {% post_url X %}           → X   (wikilink rewriter handles if internal)
    {{ page.x }} / {{ site.x }}               → (stripped — usually evaluates empty)

Unknown liquid tags pass through as literal text.

**Raw-block protection.** Jekyll's `{% raw %}…{% endraw %}` deliberately
stops Liquid from interpreting its contents. We mirror that semantics:
raw blocks are stashed out of the stream BEFORE other patterns run, so
a `{{ page.title }}` example inside a raw block survives untouched.

Idempotent: once matched patterns are rewritten to plain markdown the
shapes never contain `{%…%}` or `{{…}}` Liquid markers again. Raw
blocks are restored with delimiters stripped, leaving their interior
as plain markdown — also safe to re-run.
"""

from __future__ import annotations

import re


# --- Patterns -------------------------------------------------------------

_COMMENT_RE = re.compile(
    r"\{%\s*comment\s*%\}.*?\{%\s*endcomment\s*%\}",
    re.DOTALL,
)

_RAW_RE = re.compile(
    r"\{%\s*raw\s*%\}(.*?)\{%\s*endraw\s*%\}",
    re.DOTALL,
)

_HIGHLIGHT_RE = re.compile(
    r"\{%\s*highlight\s+(\S+)(?:\s+[^%]*)?\s*%\}(.*?)\{%\s*endhighlight\s*%\}",
    re.DOTALL,
)

_INCLUDE_RE = re.compile(
    r"\{%\s*include\s+[^%]+?\s*%\}"
)

_LINK_RE = re.compile(
    r"\{%\s*link\s+([^%]+?)\s*%\}"
)

_POST_URL_RE = re.compile(
    r"\{%\s*post_url\s+([^%]+?)\s*%\}"
)

# `{{ page.x }}`, `{{ site.x }}`, `{{ page.x | filter }}` — evaluate to
# empty in a note context (no build pipeline runs). Matches the full
# expression including any filters up to the closing braces.
_VAR_OUTPUT_RE = re.compile(
    r"\{\{\s*(?:page|site)\.[^}]*\}\}"
)

# NUL-delimited placeholder for stashing raw blocks.
_PLACEHOLDER_FMT = "\x00{}\x00"
_PLACEHOLDER_RE = re.compile(r"\x00(\d+)\x00")


# --- Entry point ----------------------------------------------------------


def transform(body: str) -> str:
    """
    Apply every Jekyll/Liquid rewrite in a fixed order.
    Returns transformed body. Idempotent.
    """
    # 1. Strip comments outright. Their contents are gone; no risk of
    #    later patterns matching anything inside them.
    body = _COMMENT_RE.sub("", body)

    # 2. Stash raw blocks so their interior is invisible to later
    #    patterns. We still strip the delimiters on restore, so the
    #    body between `{% raw %}` and `{% endraw %}` reappears as
    #    plain markdown.
    placeholders: list[str] = []

    def stash_raw(match: re.Match[str]) -> str:
        idx = len(placeholders)
        placeholders.append(match.group(1))  # body only; delimiters dropped
        return _PLACEHOLDER_FMT.format(idx)

    body = _RAW_RE.sub(stash_raw, body)

    # 3. Known tags.
    body = _HIGHLIGHT_RE.sub(_highlight_sub, body)
    body = _INCLUDE_RE.sub("", body)
    body = _LINK_RE.sub(lambda m: m.group(1).strip(), body)
    body = _POST_URL_RE.sub(lambda m: m.group(1).strip(), body)

    # 4. Variable outputs that we can't meaningfully evaluate.
    body = _VAR_OUTPUT_RE.sub("", body)

    # 5. Restore stashed raw blocks.
    def restore_raw(match: re.Match[str]) -> str:
        return placeholders[int(match.group(1))]

    return _PLACEHOLDER_RE.sub(restore_raw, body)


# --- Per-pattern substitution functions ------------------------------------


def _highlight_sub(m: re.Match[str]) -> str:
    lang = m.group(1).strip().strip('"').strip("'")
    content = m.group(2).strip("\n")
    return f"```{lang}\n{content}\n```"
