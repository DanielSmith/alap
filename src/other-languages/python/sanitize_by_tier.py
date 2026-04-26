# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
Tier-aware sanitizers — Python port of src/core/sanitizeByTier.ts.

Consumers (renderers, lens/lightbox equivalents, anything that takes a
validated link and renders or forwards it) read provenance off each
link and apply the appropriate rule: strict on anything that crossed a
trust boundary (storage adapter, protocol handler, unstamped), loose on
author-tier links the developer hand-wrote.

Fail-closed policy: a link with no provenance stamp is treated as
untrusted. ``validate_config`` stamps every link it returns, so the
only way an unstamped link ends up here is if it bypassed validation —
a code path that should not exist in normal use.
"""

from __future__ import annotations

from typing import Any, Mapping

from link_provenance import is_author_tier
from sanitize_url import sanitize_url, sanitize_url_strict


def sanitize_url_by_tier(url: str, link: Mapping[str, Any]) -> str:
    """Loose sanitize for author-tier, strict otherwise.

    Author-tier gets :func:`sanitize_url` (permits ``tel:``, ``mailto:``,
    and any custom developer-intended scheme that is not explicitly
    dangerous). Everything else — including unstamped — gets
    :func:`sanitize_url_strict` (``http`` / ``https`` / ``mailto`` only).
    """
    if is_author_tier(link):
        return sanitize_url(url)
    return sanitize_url_strict(url)


def sanitize_css_class_by_tier(
    css_class: str | None, link: Mapping[str, Any]
) -> str | None:
    """Author keeps its ``cssClass``; everything else drops it.

    Attacker-controlled class names can target CSS selectors that exfil
    data via ``content: attr(...)``, trigger layout-driven side channels,
    or overlay visible UI to mislead the user. There is no narrow
    allowlist that beats "do not let untrusted input pick a class at all."
    """
    if css_class is None:
        return None
    if is_author_tier(link):
        return css_class
    return None


def sanitize_target_window_by_tier(
    target_window: str | None, link: Mapping[str, Any]
) -> str | None:
    """Author passes ``targetWindow`` through (including ``None``);
    everything else clamps to ``_blank`` unconditionally.

    Even when a non-author link did not specify its own target, we still
    clamp to ``_blank`` rather than let it inherit the author's named-
    window default (e.g. ``'fromAlap'``). Letting a storage- or protocol-
    tier link ride into an author-reserved window would let it overwrite
    whatever the author had open there.
    """
    if is_author_tier(link):
        return target_window
    return "_blank"
