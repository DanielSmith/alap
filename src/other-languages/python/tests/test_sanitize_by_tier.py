# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Tests for sanitize_by_tier — tier-aware URL / cssClass / targetWindow."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from link_provenance import stamp_provenance
from sanitize_by_tier import (
    sanitize_css_class_by_tier,
    sanitize_target_window_by_tier,
    sanitize_url_by_tier,
)


def _stamped(tier: str) -> dict:
    link = {"url": "/a"}
    stamp_provenance(link, tier)
    return link


# ---------------------------------------------------------------------------
# sanitize_url_by_tier
# ---------------------------------------------------------------------------


class TestSanitizeUrlByTierAuthor:
    def test_author_keeps_https(self):
        assert sanitize_url_by_tier("https://example.com", _stamped("author")) == "https://example.com"

    def test_author_keeps_http(self):
        assert sanitize_url_by_tier("http://example.com", _stamped("author")) == "http://example.com"

    def test_author_keeps_tel(self):
        assert sanitize_url_by_tier("tel:+15551234", _stamped("author")) == "tel:+15551234"

    def test_author_keeps_mailto(self):
        assert sanitize_url_by_tier("mailto:a@b.com", _stamped("author")) == "mailto:a@b.com"

    def test_author_keeps_custom_scheme(self):
        assert (
            sanitize_url_by_tier("obsidian://open?vault=foo", _stamped("author"))
            == "obsidian://open?vault=foo"
        )

    def test_author_still_blocks_javascript(self):
        assert sanitize_url_by_tier("javascript:alert(1)", _stamped("author")) == "about:blank"

    def test_author_still_blocks_data(self):
        assert sanitize_url_by_tier("data:text/html,x", _stamped("author")) == "about:blank"

    def test_author_keeps_relative(self):
        assert sanitize_url_by_tier("/foo/bar", _stamped("author")) == "/foo/bar"


class TestSanitizeUrlByTierStorage:
    def test_storage_remote_keeps_https(self):
        assert (
            sanitize_url_by_tier("https://example.com", _stamped("storage:remote"))
            == "https://example.com"
        )

    def test_storage_remote_keeps_mailto(self):
        assert sanitize_url_by_tier("mailto:a@b.com", _stamped("storage:remote")) == "mailto:a@b.com"

    def test_storage_remote_rejects_tel(self):
        # tel: is the canonical "author-only" scheme
        assert sanitize_url_by_tier("tel:+15551234", _stamped("storage:remote")) == "about:blank"

    def test_storage_remote_rejects_custom_scheme(self):
        assert (
            sanitize_url_by_tier("obsidian://open?vault=foo", _stamped("storage:remote"))
            == "about:blank"
        )

    def test_storage_local_rejects_tel(self):
        assert sanitize_url_by_tier("tel:+15551234", _stamped("storage:local")) == "about:blank"

    def test_storage_remote_still_blocks_javascript(self):
        assert sanitize_url_by_tier("javascript:alert(1)", _stamped("storage:remote")) == "about:blank"


class TestSanitizeUrlByTierProtocol:
    def test_protocol_keeps_https(self):
        assert (
            sanitize_url_by_tier("https://example.com", _stamped("protocol:web"))
            == "https://example.com"
        )

    def test_protocol_rejects_tel(self):
        assert sanitize_url_by_tier("tel:+15551234", _stamped("protocol:web")) == "about:blank"

    def test_protocol_rejects_custom_scheme(self):
        assert (
            sanitize_url_by_tier("obsidian://open", _stamped("protocol:atproto"))
            == "about:blank"
        )

    def test_protocol_blocks_javascript(self):
        assert (
            sanitize_url_by_tier("javascript:alert(1)", _stamped("protocol:web"))
            == "about:blank"
        )


class TestSanitizeUrlByTierUnstamped:
    def test_unstamped_rejects_tel(self):
        # fail-closed: no stamp → treated as non-author → strict
        link = {"url": "/a"}
        assert sanitize_url_by_tier("tel:+15551234", link) == "about:blank"

    def test_unstamped_keeps_https(self):
        link = {"url": "/a"}
        assert sanitize_url_by_tier("https://example.com", link) == "https://example.com"

    def test_unstamped_blocks_javascript(self):
        link = {"url": "/a"}
        assert sanitize_url_by_tier("javascript:alert(1)", link) == "about:blank"


# ---------------------------------------------------------------------------
# sanitize_css_class_by_tier
# ---------------------------------------------------------------------------


class TestSanitizeCssClassByTier:
    def test_author_keeps_class(self):
        assert sanitize_css_class_by_tier("my-class", _stamped("author")) == "my-class"

    def test_author_keeps_multi_word(self):
        assert (
            sanitize_css_class_by_tier("primary special", _stamped("author"))
            == "primary special"
        )

    def test_author_none_stays_none(self):
        assert sanitize_css_class_by_tier(None, _stamped("author")) is None

    def test_storage_remote_drops_class(self):
        assert sanitize_css_class_by_tier("my-class", _stamped("storage:remote")) is None

    def test_storage_local_drops_class(self):
        assert sanitize_css_class_by_tier("my-class", _stamped("storage:local")) is None

    def test_protocol_drops_class(self):
        assert sanitize_css_class_by_tier("my-class", _stamped("protocol:web")) is None

    def test_protocol_none_stays_none(self):
        assert sanitize_css_class_by_tier(None, _stamped("protocol:web")) is None

    def test_unstamped_drops_class(self):
        link = {"url": "/a"}
        assert sanitize_css_class_by_tier("my-class", link) is None


# ---------------------------------------------------------------------------
# sanitize_target_window_by_tier
# ---------------------------------------------------------------------------


class TestSanitizeTargetWindowByTier:
    def test_author_keeps_self(self):
        assert sanitize_target_window_by_tier("_self", _stamped("author")) == "_self"

    def test_author_keeps_blank(self):
        assert sanitize_target_window_by_tier("_blank", _stamped("author")) == "_blank"

    def test_author_keeps_named_window(self):
        assert (
            sanitize_target_window_by_tier("fromAlap", _stamped("author"))
            == "fromAlap"
        )

    def test_author_passes_none_through(self):
        # Author-tier intentionally preserves None so the caller's
        # fallback chain still applies.
        assert sanitize_target_window_by_tier(None, _stamped("author")) is None

    def test_storage_clamps_self_to_blank(self):
        assert (
            sanitize_target_window_by_tier("_self", _stamped("storage:remote"))
            == "_blank"
        )

    def test_storage_clamps_named_window_to_blank(self):
        assert (
            sanitize_target_window_by_tier("fromAlap", _stamped("storage:remote"))
            == "_blank"
        )

    def test_storage_clamps_none_to_blank(self):
        # Non-author tier forces _blank even when input is None, so a
        # missing targetWindow does not inherit author-tier defaults.
        assert (
            sanitize_target_window_by_tier(None, _stamped("storage:remote"))
            == "_blank"
        )

    def test_storage_local_clamps(self):
        assert (
            sanitize_target_window_by_tier("_parent", _stamped("storage:local"))
            == "_blank"
        )

    def test_protocol_clamps(self):
        assert (
            sanitize_target_window_by_tier("fromAlap", _stamped("protocol:web"))
            == "_blank"
        )

    def test_unstamped_clamps(self):
        link = {"url": "/a"}
        assert sanitize_target_window_by_tier("_self", link) == "_blank"

    def test_unstamped_none_clamps(self):
        link = {"url": "/a"}
        assert sanitize_target_window_by_tier(None, link) == "_blank"
