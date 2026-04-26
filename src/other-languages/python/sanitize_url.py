# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
URL sanitizer — Python port of src/core/sanitizeUrl.ts.

Blocks dangerous URI schemes (javascript:, data:, vbscript:, blob:)
to prevent XSS when rendering links from untrusted configs.

Allows: http, https, mailto, tel, relative URLs, empty string.
"""

from __future__ import annotations

import re
from typing import Sequence

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_DANGEROUS_SCHEME = re.compile(r"^(javascript|data|vbscript|blob)\s*:", re.IGNORECASE)
_SCHEME_MATCH = re.compile(r"^([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:")

_DEFAULT_SCHEMES: tuple[str, ...] = ("http", "https")
_STRICT_SCHEMES: tuple[str, ...] = ("http", "https", "mailto")


def sanitize_url(url: str) -> str:
    """Return *url* unchanged if safe, or ``'about:blank'`` if dangerous.

    Allows: http, https, mailto, tel, relative URLs, empty string.
    Blocks: javascript, data, vbscript, blob (and case / whitespace variants).
    """
    if not url:
        return url

    normalized = _CONTROL_CHARS.sub("", url).strip()

    if _DANGEROUS_SCHEME.match(normalized):
        return "about:blank"

    return url


def sanitize_url_strict(url: str) -> str:
    """Strict URL sanitizer — http / https / mailto only, plus relative URLs.

    Use for links whose origin has not been verified as author-tier: protocol
    handler results, storage-loaded configs, etc. Blocks ``tel:``, ``ftp:``,
    ``blob:``, ``data:``, ``javascript:``, custom schemes, and anything else
    that is not in the tight allowlist.
    """
    return sanitize_url_with_schemes(url, _STRICT_SCHEMES)


def sanitize_url_with_schemes(url: str, allowed_schemes: Sequence[str] | None = None) -> str:
    """Sanitize *url* against a configurable scheme allowlist.

    First applies the standard dangerous-scheme blocklist via
    :func:`sanitize_url`. Then, if *allowed_schemes* is provided, verifies
    the URL's scheme is in the list. Relative URLs (no scheme) always pass
    through.

    Default *allowed_schemes* is ``('http', 'https')``.
    """
    base = sanitize_url(url)
    if base == "about:blank":
        return base
    if not base:
        return base

    schemes = tuple(allowed_schemes) if allowed_schemes is not None else _DEFAULT_SCHEMES

    # Normalise the URL the same way sanitize_url did, so scheme detection
    # is not fooled by leading whitespace or control characters.
    normalized = _CONTROL_CHARS.sub("", base).strip()
    match = _SCHEME_MATCH.match(normalized)
    if match:
        scheme = match.group(1).lower()
        if scheme not in schemes:
            return "about:blank"

    return base
