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

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_DANGEROUS_SCHEME = re.compile(r"^(javascript|data|vbscript|blob)\s*:", re.IGNORECASE)


def sanitize_url(url: str) -> str:
    """Return *url* unchanged if safe, or ``'about:blank'`` if dangerous."""
    if not url:
        return url

    normalized = _CONTROL_CHARS.sub("", url).strip()

    if _DANGEROUS_SCHEME.match(normalized):
        return "about:blank"

    return url
