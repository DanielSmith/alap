# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Tests for sanitize_url, sanitize_url_strict, sanitize_url_with_schemes."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sanitize_url import sanitize_url, sanitize_url_strict, sanitize_url_with_schemes


# ---------------------------------------------------------------------------
# sanitize_url (loose)
# ---------------------------------------------------------------------------


class TestSanitizeUrlLoose:
    def test_https_passes(self):
        assert sanitize_url("https://example.com") == "https://example.com"

    def test_http_passes(self):
        assert sanitize_url("http://example.com") == "http://example.com"

    def test_mailto_passes(self):
        assert sanitize_url("mailto:user@example.com") == "mailto:user@example.com"

    def test_tel_passes(self):
        assert sanitize_url("tel:+15551234") == "tel:+15551234"

    def test_relative_passes(self):
        assert sanitize_url("/foo/bar") == "/foo/bar"

    def test_empty_passes(self):
        assert sanitize_url("") == ""

    def test_javascript_blocked(self):
        assert sanitize_url("javascript:alert(1)") == "about:blank"

    def test_javascript_case_insensitive(self):
        assert sanitize_url("JAVASCRIPT:alert(1)") == "about:blank"
        assert sanitize_url("JavaScript:alert(1)") == "about:blank"

    def test_data_blocked(self):
        assert sanitize_url("data:text/html,<script>alert(1)</script>") == "about:blank"

    def test_vbscript_blocked(self):
        assert sanitize_url("vbscript:alert(1)") == "about:blank"

    def test_blob_blocked(self):
        assert sanitize_url("blob:https://example.com/abc") == "about:blank"

    def test_control_char_disguised_scheme_blocked(self):
        # java\nscript:alert(1) — embedded newline must not bypass the check
        assert sanitize_url("java\nscript:alert(1)") == "about:blank"

    def test_tab_disguised_scheme_blocked(self):
        assert sanitize_url("java\tscript:alert(1)") == "about:blank"

    def test_null_disguised_scheme_blocked(self):
        assert sanitize_url("java\x00script:alert(1)") == "about:blank"

    def test_whitespace_before_colon_blocked(self):
        assert sanitize_url("javascript :alert(1)") == "about:blank"


# ---------------------------------------------------------------------------
# sanitize_url_strict — http / https / mailto only
# ---------------------------------------------------------------------------


class TestSanitizeUrlStrict:
    def test_https_passes(self):
        assert sanitize_url_strict("https://example.com") == "https://example.com"

    def test_http_passes(self):
        assert sanitize_url_strict("http://example.com") == "http://example.com"

    def test_mailto_passes(self):
        assert sanitize_url_strict("mailto:a@b.com") == "mailto:a@b.com"

    def test_relative_passes(self):
        assert sanitize_url_strict("/foo") == "/foo"

    def test_empty_passes(self):
        assert sanitize_url_strict("") == ""

    def test_tel_blocked(self):
        assert sanitize_url_strict("tel:+15551234") == "about:blank"

    def test_ftp_blocked(self):
        assert sanitize_url_strict("ftp://example.com") == "about:blank"

    def test_custom_scheme_blocked(self):
        assert sanitize_url_strict("obsidian://open?vault=foo") == "about:blank"

    def test_javascript_still_blocked(self):
        assert sanitize_url_strict("javascript:alert(1)") == "about:blank"

    def test_data_still_blocked(self):
        assert sanitize_url_strict("data:text/html,x") == "about:blank"

    def test_control_char_disguised_still_blocked(self):
        assert sanitize_url_strict("java\nscript:alert(1)") == "about:blank"


# ---------------------------------------------------------------------------
# sanitize_url_with_schemes — configurable allowlist
# ---------------------------------------------------------------------------


class TestSanitizeUrlWithSchemes:
    def test_default_allows_http_https(self):
        assert sanitize_url_with_schemes("http://example.com") == "http://example.com"
        assert sanitize_url_with_schemes("https://example.com") == "https://example.com"

    def test_default_blocks_mailto(self):
        # Default allowlist is http / https only
        assert sanitize_url_with_schemes("mailto:a@b.com") == "about:blank"

    def test_custom_allowlist_permits_obsidian(self):
        assert (
            sanitize_url_with_schemes("obsidian://open?vault=foo", ["http", "https", "obsidian"])
            == "obsidian://open?vault=foo"
        )

    def test_custom_allowlist_blocks_unlisted(self):
        assert sanitize_url_with_schemes("ftp://example.com", ["http", "https"]) == "about:blank"

    def test_relative_passes_regardless(self):
        assert sanitize_url_with_schemes("/foo", ["http"]) == "/foo"

    def test_dangerous_blocked_even_if_in_allowlist(self):
        # Defence-in-depth: sanitize_url's dangerous-scheme blocklist runs
        # first, so even an allowlist that contains 'javascript' still blocks
        # javascript: URLs.
        assert sanitize_url_with_schemes("javascript:alert(1)", ["javascript"]) == "about:blank"

    def test_empty_allowlist_rejects_scheme_bearing(self):
        assert sanitize_url_with_schemes("http://example.com", []) == "about:blank"

    def test_empty_allowlist_passes_relative(self):
        assert sanitize_url_with_schemes("/foo", []) == "/foo"

    def test_case_insensitive_scheme_match(self):
        assert sanitize_url_with_schemes("HTTPS://example.com", ["https"]) == "HTTPS://example.com"
