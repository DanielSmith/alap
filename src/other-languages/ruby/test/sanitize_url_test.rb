# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class SanitizeUrlLooseTest < Minitest::Test
  def test_https_passes
    assert_equal "https://example.com", Alap::SanitizeUrl.call("https://example.com")
  end

  def test_http_passes
    assert_equal "http://example.com", Alap::SanitizeUrl.call("http://example.com")
  end

  def test_mailto_passes
    assert_equal "mailto:a@b.com", Alap::SanitizeUrl.call("mailto:a@b.com")
  end

  def test_tel_passes
    assert_equal "tel:+15551234", Alap::SanitizeUrl.call("tel:+15551234")
  end

  def test_relative_passes
    assert_equal "/foo/bar", Alap::SanitizeUrl.call("/foo/bar")
  end

  def test_empty_passes
    assert_equal "", Alap::SanitizeUrl.call("")
  end

  def test_javascript_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("javascript:alert(1)")
  end

  def test_javascript_case_insensitive
    assert_equal "about:blank", Alap::SanitizeUrl.call("JAVASCRIPT:alert(1)")
    assert_equal "about:blank", Alap::SanitizeUrl.call("JavaScript:alert(1)")
  end

  def test_data_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("data:text/html,x")
  end

  def test_vbscript_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("vbscript:alert(1)")
  end

  def test_blob_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("blob:https://example.com/abc")
  end

  def test_control_char_disguised_newline
    assert_equal "about:blank", Alap::SanitizeUrl.call("java\nscript:alert(1)")
  end

  def test_control_char_disguised_tab
    assert_equal "about:blank", Alap::SanitizeUrl.call("java\tscript:alert(1)")
  end

  def test_control_char_disguised_null
    assert_equal "about:blank", Alap::SanitizeUrl.call("java\x00script:alert(1)")
  end

  def test_whitespace_before_colon_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("javascript :alert(1)")
  end
end

class SanitizeUrlStrictTest < Minitest::Test
  def test_https_passes
    assert_equal "https://example.com", Alap::SanitizeUrl.strict("https://example.com")
  end

  def test_http_passes
    assert_equal "http://example.com", Alap::SanitizeUrl.strict("http://example.com")
  end

  def test_mailto_passes
    assert_equal "mailto:a@b.com", Alap::SanitizeUrl.strict("mailto:a@b.com")
  end

  def test_relative_passes
    assert_equal "/foo", Alap::SanitizeUrl.strict("/foo")
  end

  def test_empty_passes
    assert_equal "", Alap::SanitizeUrl.strict("")
  end

  def test_tel_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.strict("tel:+15551234")
  end

  def test_ftp_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.strict("ftp://example.com")
  end

  def test_custom_scheme_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.strict("obsidian://open?vault=foo")
  end

  def test_javascript_still_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.strict("javascript:alert(1)")
  end

  def test_data_still_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.strict("data:text/html,x")
  end

  def test_control_char_disguised_still_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.strict("java\nscript:alert(1)")
  end
end

class SanitizeUrlWithSchemesTest < Minitest::Test
  def test_default_allows_http_https
    assert_equal "http://example.com", Alap::SanitizeUrl.with_schemes("http://example.com")
    assert_equal "https://example.com", Alap::SanitizeUrl.with_schemes("https://example.com")
  end

  def test_default_blocks_mailto
    # Default allowlist is http / https only
    assert_equal "about:blank", Alap::SanitizeUrl.with_schemes("mailto:a@b.com")
  end

  def test_custom_allowlist_permits_obsidian
    assert_equal(
      "obsidian://open?vault=foo",
      Alap::SanitizeUrl.with_schemes("obsidian://open?vault=foo", %w[http https obsidian]),
    )
  end

  def test_custom_allowlist_blocks_unlisted
    assert_equal(
      "about:blank",
      Alap::SanitizeUrl.with_schemes("ftp://example.com", %w[http https]),
    )
  end

  def test_relative_passes_regardless
    assert_equal "/foo", Alap::SanitizeUrl.with_schemes("/foo", %w[http])
  end

  def test_dangerous_blocked_even_if_in_allowlist
    # Defence-in-depth: dangerous-scheme blocklist runs first, so an
    # allowlist that contains "javascript" still blocks javascript: URLs.
    assert_equal(
      "about:blank",
      Alap::SanitizeUrl.with_schemes("javascript:alert(1)", %w[javascript]),
    )
  end

  def test_empty_allowlist_rejects_scheme_bearing
    assert_equal "about:blank", Alap::SanitizeUrl.with_schemes("http://example.com", [])
  end

  def test_empty_allowlist_passes_relative
    assert_equal "/foo", Alap::SanitizeUrl.with_schemes("/foo", [])
  end

  def test_case_insensitive_scheme_match
    assert_equal(
      "HTTPS://example.com",
      Alap::SanitizeUrl.with_schemes("HTTPS://example.com", %w[https]),
    )
  end
end
