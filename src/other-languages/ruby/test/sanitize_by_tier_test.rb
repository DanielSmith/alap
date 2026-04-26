# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

def stamped_link(tier)
  link = { "url" => "/a" }
  Alap::LinkProvenance.stamp(link, tier)
  link
end

# ---------------------------------------------------------------------------
# SanitizeByTier.url
# ---------------------------------------------------------------------------

class SanitizeByTierUrlAuthorTest < Minitest::Test
  def test_author_keeps_https
    assert_equal "https://example.com", Alap::SanitizeByTier.url("https://example.com", stamped_link("author"))
  end

  def test_author_keeps_http
    assert_equal "http://example.com", Alap::SanitizeByTier.url("http://example.com", stamped_link("author"))
  end

  def test_author_keeps_tel
    assert_equal "tel:+15551234", Alap::SanitizeByTier.url("tel:+15551234", stamped_link("author"))
  end

  def test_author_keeps_mailto
    assert_equal "mailto:a@b.com", Alap::SanitizeByTier.url("mailto:a@b.com", stamped_link("author"))
  end

  def test_author_keeps_custom_scheme
    assert_equal(
      "obsidian://open?vault=foo",
      Alap::SanitizeByTier.url("obsidian://open?vault=foo", stamped_link("author")),
    )
  end

  def test_author_still_blocks_javascript
    assert_equal "about:blank", Alap::SanitizeByTier.url("javascript:alert(1)", stamped_link("author"))
  end

  def test_author_still_blocks_data
    assert_equal "about:blank", Alap::SanitizeByTier.url("data:text/html,x", stamped_link("author"))
  end

  def test_author_keeps_relative
    assert_equal "/foo/bar", Alap::SanitizeByTier.url("/foo/bar", stamped_link("author"))
  end
end

class SanitizeByTierUrlStorageTest < Minitest::Test
  def test_storage_remote_keeps_https
    assert_equal(
      "https://example.com",
      Alap::SanitizeByTier.url("https://example.com", stamped_link("storage:remote")),
    )
  end

  def test_storage_remote_keeps_mailto
    assert_equal(
      "mailto:a@b.com",
      Alap::SanitizeByTier.url("mailto:a@b.com", stamped_link("storage:remote")),
    )
  end

  def test_storage_remote_rejects_tel
    assert_equal "about:blank", Alap::SanitizeByTier.url("tel:+15551234", stamped_link("storage:remote"))
  end

  def test_storage_remote_rejects_custom_scheme
    assert_equal(
      "about:blank",
      Alap::SanitizeByTier.url("obsidian://open?vault=foo", stamped_link("storage:remote")),
    )
  end

  def test_storage_local_rejects_tel
    assert_equal "about:blank", Alap::SanitizeByTier.url("tel:+15551234", stamped_link("storage:local"))
  end

  def test_storage_remote_still_blocks_javascript
    assert_equal(
      "about:blank",
      Alap::SanitizeByTier.url("javascript:alert(1)", stamped_link("storage:remote")),
    )
  end
end

class SanitizeByTierUrlProtocolTest < Minitest::Test
  def test_protocol_keeps_https
    assert_equal(
      "https://example.com",
      Alap::SanitizeByTier.url("https://example.com", stamped_link("protocol:web")),
    )
  end

  def test_protocol_rejects_tel
    assert_equal "about:blank", Alap::SanitizeByTier.url("tel:+15551234", stamped_link("protocol:web"))
  end

  def test_protocol_rejects_custom_scheme
    assert_equal "about:blank", Alap::SanitizeByTier.url("obsidian://open", stamped_link("protocol:atproto"))
  end

  def test_protocol_blocks_javascript
    assert_equal "about:blank", Alap::SanitizeByTier.url("javascript:alert(1)", stamped_link("protocol:web"))
  end
end

class SanitizeByTierUrlUnstampedTest < Minitest::Test
  def test_unstamped_rejects_tel
    link = { "url" => "/a" }
    assert_equal "about:blank", Alap::SanitizeByTier.url("tel:+15551234", link)
  end

  def test_unstamped_keeps_https
    link = { "url" => "/a" }
    assert_equal "https://example.com", Alap::SanitizeByTier.url("https://example.com", link)
  end

  def test_unstamped_blocks_javascript
    link = { "url" => "/a" }
    assert_equal "about:blank", Alap::SanitizeByTier.url("javascript:alert(1)", link)
  end
end

# ---------------------------------------------------------------------------
# SanitizeByTier.css_class
# ---------------------------------------------------------------------------

class SanitizeByTierCssClassTest < Minitest::Test
  def test_author_keeps_class
    assert_equal "my-class", Alap::SanitizeByTier.css_class("my-class", stamped_link("author"))
  end

  def test_author_keeps_multi_word
    assert_equal "primary special", Alap::SanitizeByTier.css_class("primary special", stamped_link("author"))
  end

  def test_author_nil_stays_nil
    assert_nil Alap::SanitizeByTier.css_class(nil, stamped_link("author"))
  end

  def test_storage_remote_drops_class
    assert_nil Alap::SanitizeByTier.css_class("my-class", stamped_link("storage:remote"))
  end

  def test_storage_local_drops_class
    assert_nil Alap::SanitizeByTier.css_class("my-class", stamped_link("storage:local"))
  end

  def test_protocol_drops_class
    assert_nil Alap::SanitizeByTier.css_class("my-class", stamped_link("protocol:web"))
  end

  def test_protocol_nil_stays_nil
    assert_nil Alap::SanitizeByTier.css_class(nil, stamped_link("protocol:web"))
  end

  def test_unstamped_drops_class
    link = { "url" => "/a" }
    assert_nil Alap::SanitizeByTier.css_class("my-class", link)
  end
end

# ---------------------------------------------------------------------------
# SanitizeByTier.target_window
# ---------------------------------------------------------------------------

class SanitizeByTierTargetWindowTest < Minitest::Test
  def test_author_keeps_self
    assert_equal "_self", Alap::SanitizeByTier.target_window("_self", stamped_link("author"))
  end

  def test_author_keeps_blank
    assert_equal "_blank", Alap::SanitizeByTier.target_window("_blank", stamped_link("author"))
  end

  def test_author_keeps_named_window
    assert_equal "fromAlap", Alap::SanitizeByTier.target_window("fromAlap", stamped_link("author"))
  end

  def test_author_passes_nil_through
    # Author-tier intentionally preserves nil so the caller's fallback
    # chain still applies.
    assert_nil Alap::SanitizeByTier.target_window(nil, stamped_link("author"))
  end

  def test_storage_clamps_self_to_blank
    assert_equal "_blank", Alap::SanitizeByTier.target_window("_self", stamped_link("storage:remote"))
  end

  def test_storage_clamps_named_window_to_blank
    assert_equal "_blank", Alap::SanitizeByTier.target_window("fromAlap", stamped_link("storage:remote"))
  end

  def test_storage_clamps_nil_to_blank
    # Non-author tier forces _blank even when input is nil, so a missing
    # targetWindow does not inherit author-tier defaults.
    assert_equal "_blank", Alap::SanitizeByTier.target_window(nil, stamped_link("storage:remote"))
  end

  def test_storage_local_clamps
    assert_equal "_blank", Alap::SanitizeByTier.target_window("_parent", stamped_link("storage:local"))
  end

  def test_protocol_clamps
    assert_equal "_blank", Alap::SanitizeByTier.target_window("fromAlap", stamped_link("protocol:web"))
  end

  def test_unstamped_clamps
    link = { "url" => "/a" }
    assert_equal "_blank", Alap::SanitizeByTier.target_window("_self", link)
  end

  def test_unstamped_nil_clamps
    link = { "url" => "/a" }
    assert_equal "_blank", Alap::SanitizeByTier.target_window(nil, link)
  end
end
