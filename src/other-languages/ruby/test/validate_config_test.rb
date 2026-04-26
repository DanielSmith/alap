# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class TestValidateConfig < Minitest::Test
  def test_valid_config
    config = {
      "allLinks" => {
        "a" => { "label" => "A", "url" => "https://a.com", "tags" => %w[tag1] },
      },
    }
    result = Alap::ValidateConfig.call(config)
    assert result["allLinks"].key?("a")
    assert_equal "https://a.com", result["allLinks"]["a"]["url"]
  end

  def test_preserves_settings
    config = {
      "settings" => { "listType" => "ul", "menuTimeout" => 5000 },
      "allLinks" => { "a" => { "label" => "A", "url" => "https://a.com" } },
    }
    result = Alap::ValidateConfig.call(config)
    assert_equal "ul", result["settings"]["listType"]
  end

  def test_preserves_macros
    config = {
      "macros" => { "m1" => { "linkItems" => ".tag" } },
      "allLinks" => { "a" => { "label" => "A", "url" => "https://a.com" } },
    }
    result = Alap::ValidateConfig.call(config)
    assert result["macros"].key?("m1")
  end

  def test_raises_on_non_hash
    assert_raises(ArgumentError) { Alap::ValidateConfig.call("string") }
    assert_raises(ArgumentError) { Alap::ValidateConfig.call(nil) }
    assert_raises(ArgumentError) { Alap::ValidateConfig.call([]) }
  end

  def test_raises_on_missing_alllinks
    assert_raises(ArgumentError) { Alap::ValidateConfig.call({}) }
    assert_raises(ArgumentError) { Alap::ValidateConfig.call("allLinks" => nil) }
  end

  def test_skips_invalid_links
    config = {
      "allLinks" => {
        "good" => { "label" => "Good", "url" => "https://good.com" },
        "bad_string" => "not a hash",
        "bad_no_url" => { "label" => "No URL" },
      },
    }
    result = Alap::ValidateConfig.call(config)
    assert result["allLinks"].key?("good")
    refute result["allLinks"].key?("bad_string")
    refute result["allLinks"].key?("bad_no_url")
  end

  def test_sanitizes_urls
    config = {
      "allLinks" => {
        "a" => { "label" => "A", "url" => "javascript:alert(1)" },
      },
    }
    result = Alap::ValidateConfig.call(config)
    assert_equal "about:blank", result["allLinks"]["a"]["url"]
  end

  def test_rejects_hyphenated_ids
    config = {
      "allLinks" => {
        "my-item" => { "label" => "My Item", "url" => "https://a.com" },
        "good_item" => { "label" => "Good", "url" => "https://b.com" },
      },
    }
    result = Alap::ValidateConfig.call(config)
    refute result["allLinks"].key?("my-item")
    assert result["allLinks"].key?("good_item")
  end

  def test_strips_hyphenated_tags
    config = {
      "allLinks" => {
        "a" => { "label" => "A", "url" => "https://a.com", "tags" => %w[good new-york] },
      },
    }
    result = Alap::ValidateConfig.call(config)
    assert_includes result["allLinks"]["a"]["tags"], "good"
    refute_includes result["allLinks"]["a"]["tags"], "new-york"
  end

  def test_rejects_hyphenated_macros
    config = {
      "macros" => {
        "my-macro" => { "linkItems" => ".tag" },
        "good_macro" => { "linkItems" => ".tag" },
      },
      "allLinks" => { "a" => { "label" => "A", "url" => "https://a.com" } },
    }
    result = Alap::ValidateConfig.call(config)
    refute result["macros"].key?("my-macro")
    assert result["macros"].key?("good_macro")
  end

  def test_rejects_hyphenated_pattern_keys
    config = {
      "searchPatterns" => {
        "my-pattern" => "test",
        "good_pattern" => "test",
      },
      "allLinks" => { "a" => { "label" => "A", "url" => "https://a.com" } },
    }
    result = Alap::ValidateConfig.call(config)
    refute result["searchPatterns"].key?("my-pattern")
    assert result["searchPatterns"].key?("good_pattern")
  end

  def test_blocks_prototype_pollution
    config = {
      "allLinks" => {
        "__proto__" => { "label" => "Evil", "url" => "https://evil.com" },
        "good" => { "label" => "Good", "url" => "https://good.com" },
      },
    }
    result = Alap::ValidateConfig.call(config)
    refute result["allLinks"].key?("__proto__")
    assert result["allLinks"].key?("good")
  end

  def test_does_not_mutate_input
    config = {
      "allLinks" => {
        "a" => { "label" => "A", "url" => "https://a.com", "tags" => %w[tag1] },
      },
    }
    original_url = config["allLinks"]["a"]["url"].dup
    Alap::ValidateConfig.call(config)
    assert_equal original_url, config["allLinks"]["a"]["url"]
  end

  def test_whitelists_link_fields
    config = {
      "allLinks" => {
        "a" => {
          "label" => "A",
          "url" => "https://a.com",
          "tags" => %w[tag1],
          "evil_field" => "should be dropped",
          "description" => "kept",
        },
      },
    }
    result = Alap::ValidateConfig.call(config)
    link = result["allLinks"]["a"]
    assert link.key?("description")
    refute link.key?("evil_field")
  end
end

# ---------------------------------------------------------------------------
# 3.2 additions
# ---------------------------------------------------------------------------

def _minimal_config
  {
    "allLinks" => {
      "alpha" => { "url" => "https://example.com/alpha", "label" => "Alpha" },
    },
  }
end

class ValidateConfigProvenanceTest < Minitest::Test
  def test_default_stamps_author
    result = Alap::ValidateConfig.call(_minimal_config)
    link = result["allLinks"]["alpha"]
    assert Alap::LinkProvenance.author_tier?(link)
    assert_equal "author", Alap::LinkProvenance.get(link)
  end

  def test_storage_local_stamp
    result = Alap::ValidateConfig.call(_minimal_config, provenance: "storage:local")
    assert Alap::LinkProvenance.storage_tier?(result["allLinks"]["alpha"])
    assert_equal "storage:local", Alap::LinkProvenance.get(result["allLinks"]["alpha"])
  end

  def test_storage_remote_stamp
    result = Alap::ValidateConfig.call(_minimal_config, provenance: "storage:remote")
    assert_equal "storage:remote", Alap::LinkProvenance.get(result["allLinks"]["alpha"])
  end

  def test_protocol_stamp
    result = Alap::ValidateConfig.call(_minimal_config, provenance: "protocol:web")
    assert Alap::LinkProvenance.protocol_tier?(result["allLinks"]["alpha"])
    assert_equal "protocol:web", Alap::LinkProvenance.get(result["allLinks"]["alpha"])
  end

  def test_stamp_cannot_be_preset_by_input
    # Input tries to pre-stamp itself as author while being loaded from
    # storage:remote. The whitelist filters _provenance out, and stamp
    # runs after whitelist.
    cfg = {
      "allLinks" => {
        "a" => {
          "url" => "https://x.com",
          Alap::LinkProvenance::PROVENANCE_KEY => "author",
        },
      },
    }
    result = Alap::ValidateConfig.call(cfg, provenance: "storage:remote")
    assert_equal "storage:remote", Alap::LinkProvenance.get(result["allLinks"]["a"])
  end
end

class ValidateConfigHooksAllowlistTest < Minitest::Test
  def test_author_keeps_all_hooks_verbatim
    cfg = {
      "allLinks" => {
        "a" => { "url" => "/a", "hooks" => %w[hover click anything] },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    assert_equal %w[hover click anything], result["allLinks"]["a"]["hooks"]
  end

  def test_non_author_without_allowlist_strips_all_hooks
    # No settings.hooks declared + non-author → fail-closed, strip all.
    cfg = {
      "allLinks" => {
        "a" => { "url" => "/a", "hooks" => %w[hover click] },
      },
    }
    result = Alap::ValidateConfig.call(cfg, provenance: "storage:remote")
    refute result["allLinks"]["a"].key?("hooks")
  end

  def test_non_author_intersects_against_allowlist
    cfg = {
      "settings" => { "hooks" => %w[hover] },
      "allLinks" => {
        "a" => { "url" => "/a", "hooks" => %w[hover attacker_chosen] },
      },
    }
    result = Alap::ValidateConfig.call(cfg, provenance: "protocol:web")
    assert_equal %w[hover], result["allLinks"]["a"]["hooks"]
  end

  def test_non_author_fully_stripped_when_none_match
    cfg = {
      "settings" => { "hooks" => %w[approved_hook] },
      "allLinks" => {
        "a" => { "url" => "/a", "hooks" => %w[evil worse] },
      },
    }
    result = Alap::ValidateConfig.call(cfg, provenance: "storage:remote")
    refute result["allLinks"]["a"].key?("hooks")
  end
end

class ValidateConfigIdempotenceTest < Minitest::Test
  def test_revalidate_returns_same_instance
    first = Alap::ValidateConfig.call(_minimal_config, provenance: "storage:remote")
    second = Alap::ValidateConfig.call(first)
    assert_same first, second
  end

  def test_revalidate_preserves_provenance
    first = Alap::ValidateConfig.call(_minimal_config, provenance: "storage:remote")
    # Even if caller passes provenance: "author" on re-validate, the
    # original storage:remote stamp is kept via short-circuit.
    second = Alap::ValidateConfig.call(first, provenance: "author")
    assert_same first, second
    assert_equal "storage:remote", Alap::LinkProvenance.get(second["allLinks"]["alpha"])
  end

  def test_bare_hash_not_mistaken_for_validated
    # A plain Hash matching the shape of a validated one must NOT
    # short-circuit — it has no stamp and must go through validation.
    first = Alap::ValidateConfig.call(_minimal_config)
    lookalike = { "allLinks" => _minimal_config["allLinks"].dup }
    second = Alap::ValidateConfig.call(lookalike)
    refute_same first, second
  end
end

class ValidateConfigAssertNoHandlersTest < Minitest::Test
  def test_direct_call_rejects_generate_proc
    cfg = { "protocols" => { "web" => { "generate" => ->(_args, _cfg, _opts) { [] } } } }
    assert_raises(Alap::ConfigMigrationError) do
      Alap::ValidateConfig.assert_no_handlers_in_config(cfg)
    end
  end

  def test_direct_call_rejects_filter_lambda
    cfg = { "protocols" => { "custom" => { "filter" => lambda { |links| links } } } }
    assert_raises(Alap::ConfigMigrationError) do
      Alap::ValidateConfig.assert_no_handlers_in_config(cfg)
    end
  end

  def test_direct_call_rejects_handler_method
    klass = Class.new { def handle(*); []; end }
    cfg = { "protocols" => { "custom" => { "handler" => klass.new.method(:handle) } } }
    assert_raises(Alap::ConfigMigrationError) do
      Alap::ValidateConfig.assert_no_handlers_in_config(cfg)
    end
  end

  def test_permits_data_only_protocols
    cfg = { "protocols" => { "web" => { "keys" => { "books" => { "url" => "..." } } } } }
    Alap::ValidateConfig.assert_no_handlers_in_config(cfg)
    assert true
  end

  def test_no_protocols_field_is_ok
    Alap::ValidateConfig.assert_no_handlers_in_config({ "allLinks" => {} })
    assert true
  end

  def test_validate_config_raises_on_proc_in_protocols
    cfg = {
      "allLinks" => { "a" => { "url" => "/a" } },
      "protocols" => { "web" => { "generate" => ->(*_a) { [] } } },
    }
    assert_raises(Alap::ConfigMigrationError) do
      Alap::ValidateConfig.call(cfg)
    end
  end
end

class ValidateConfigDeepFreezeTest < Minitest::Test
  def test_result_hash_is_frozen
    result = Alap::ValidateConfig.call(_minimal_config)
    assert result.frozen?
  end

  def test_alllinks_frozen
    result = Alap::ValidateConfig.call(_minimal_config)
    assert result["allLinks"].frozen?
  end

  def test_link_frozen
    result = Alap::ValidateConfig.call(_minimal_config)
    assert result["allLinks"]["alpha"].frozen?
  end

  def test_top_level_assignment_raises
    result = Alap::ValidateConfig.call(_minimal_config)
    assert_raises(FrozenError) { result["settings"] = { "injected" => true } }
  end

  def test_nested_assignment_raises
    result = Alap::ValidateConfig.call(_minimal_config)
    assert_raises(FrozenError) { result["allLinks"]["alpha"]["url"] = "https://evil.com" }
  end
end

class ValidateConfigMetaUrlSanitizationTest < Minitest::Test
  def test_meta_url_key_sanitized
    cfg = {
      "allLinks" => {
        "a" => {
          "url" => "/a",
          "meta" => { "iconUrl" => "javascript:alert(1)" },
        },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    assert_equal "about:blank", result["allLinks"]["a"]["meta"]["iconUrl"]
  end

  def test_meta_url_case_insensitive_match
    cfg = {
      "allLinks" => {
        "a" => {
          "url" => "/a",
          "meta" => {
            "ImageURL" => "javascript:alert(1)",
            "AvatarUrl" => "data:text/html,x",
          },
        },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    assert_equal "about:blank", result["allLinks"]["a"]["meta"]["ImageURL"]
    assert_equal "about:blank", result["allLinks"]["a"]["meta"]["AvatarUrl"]
  end

  def test_meta_non_url_key_untouched
    cfg = {
      "allLinks" => {
        "a" => {
          "url" => "/a",
          "meta" => { "author" => "Someone", "rank" => 1, "body" => "plain text" },
        },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    assert_equal "Someone", result["allLinks"]["a"]["meta"]["author"]
    assert_equal 1, result["allLinks"]["a"]["meta"]["rank"]
  end

  def test_meta_blocked_keys_recursed
    cfg = {
      "allLinks" => {
        "a" => {
          "url" => "/a",
          "meta" => {
            "__proto__" => { "bad" => true },
            "__class__" => { "bad" => true },
            "legit" => "ok",
          },
        },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    meta = result["allLinks"]["a"]["meta"]
    refute meta.key?("__proto__")
    refute meta.key?("__class__")
    assert_equal "ok", meta["legit"]
  end
end

class ValidateConfigThumbnailSanitizationTest < Minitest::Test
  def test_thumbnail_sanitized
    cfg = {
      "allLinks" => {
        "a" => { "url" => "/a", "thumbnail" => "javascript:alert(1)" },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    assert_equal "about:blank", result["allLinks"]["a"]["thumbnail"]
  end

  def test_thumbnail_valid_url_preserved
    cfg = {
      "allLinks" => {
        "a" => { "url" => "/a", "thumbnail" => "https://example.com/thumb.jpg" },
      },
    }
    result = Alap::ValidateConfig.call(cfg)
    assert_equal "https://example.com/thumb.jpg", result["allLinks"]["a"]["thumbnail"]
  end
end

class ValidateConfigSanitizeLinkUrlsHelperTest < Minitest::Test
  def test_direct_call_sanitizes_url
    out = Alap::ValidateConfig.sanitize_link_urls({ "url" => "javascript:alert(1)" })
    assert_equal "about:blank", out["url"]
  end

  def test_direct_call_sanitizes_image
    out = Alap::ValidateConfig.sanitize_link_urls({ "url" => "/a", "image" => "data:text/html,x" })
    assert_equal "about:blank", out["image"]
  end

  def test_direct_call_sanitizes_thumbnail
    out = Alap::ValidateConfig.sanitize_link_urls({ "url" => "/a", "thumbnail" => "vbscript:bad" })
    assert_equal "about:blank", out["thumbnail"]
  end

  def test_direct_call_sanitizes_meta_url
    out = Alap::ValidateConfig.sanitize_link_urls(
      { "url" => "/a", "meta" => { "coverUrl" => "javascript:bad" } },
    )
    assert_equal "about:blank", out["meta"]["coverUrl"]
  end

  def test_direct_call_strips_blocked_meta_keys
    out = Alap::ValidateConfig.sanitize_link_urls(
      { "url" => "/a", "meta" => { "__proto__" => { "x" => 1 }, "ok" => "keep" } },
    )
    refute out["meta"].key?("__proto__")
    assert_equal "keep", out["meta"]["ok"]
  end
end
