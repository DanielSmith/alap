# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

# Test config — mirrors tests/fixtures/links.ts
TEST_CONFIG = {
  "settings" => { "listType" => "ul", "menuTimeout" => 5000 },
  "macros" => {
    "cars" => { "linkItems" => "vwbug, bmwe36" },
    "nycbridges" => { "linkItems" => ".nyc + .bridge" },
    "everything" => { "linkItems" => ".nyc | .sf" },
  },
  "searchPatterns" => {
    "bridges" => "bridge",
    "germanCars" => {
      "pattern" => "VW|BMW",
      "options" => { "fields" => "l", "limit" => 5 },
    },
  },
  "allLinks" => {
    "vwbug" => {
      "label" => "VW Bug",
      "url" => "https://example.com/vwbug",
      "tags" => %w[car vw germany],
    },
    "bmwe36" => {
      "label" => "BMW E36",
      "url" => "https://example.com/bmwe36",
      "tags" => %w[car bmw germany],
    },
    "miata" => {
      "label" => "Mazda Miata",
      "url" => "https://example.com/miata",
      "tags" => %w[car mazda japan],
    },
    "brooklyn" => {
      "label" => "Brooklyn Bridge",
      "url" => "https://example.com/brooklyn",
      "tags" => %w[nyc bridge landmark],
    },
    "manhattan" => {
      "label" => "Manhattan Bridge",
      "url" => "https://example.com/manhattan",
      "tags" => %w[nyc bridge],
    },
    "highline" => {
      "label" => "The High Line",
      "url" => "https://example.com/highline",
      "tags" => %w[nyc park landmark],
    },
    "centralpark" => {
      "label" => "Central Park",
      "url" => "https://example.com/centralpark",
      "tags" => %w[nyc park],
    },
    "goldengate" => {
      "label" => "Golden Gate",
      "url" => "https://example.com/goldengate",
      "tags" => %w[sf bridge landmark],
    },
    "dolores" => {
      "label" => "Dolores Park",
      "url" => "https://example.com/dolores",
      "tags" => %w[sf park],
    },
    "towerbridge" => {
      "label" => "Tower Bridge",
      "url" => "https://example.com/towerbridge",
      "tags" => %w[london bridge landmark],
    },
    "aqus" => {
      "label" => "Aqus Cafe",
      "url" => "https://example.com/aqus",
      "tags" => %w[coffee sf],
    },
    "bluebottle" => {
      "label" => "Blue Bottle",
      "url" => "https://example.com/bluebottle",
      "tags" => %w[coffee sf nyc],
    },
    "acre" => {
      "label" => "Acre Coffee",
      "url" => "https://example.com/acre",
      "tags" => %w[coffee],
    },
  },
}.freeze

# ---------------------------------------------------------------------------
# Tier 1 — Operands
# ---------------------------------------------------------------------------

class TestOperands < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_single_item_id
    assert_equal %w[vwbug], @parser.query("vwbug")
  end

  def test_single_class
    result = @parser.query(".car")
    assert_equal %w[bmwe36 miata vwbug], result.sort
  end

  def test_nonexistent_item
    assert_equal [], @parser.query("doesnotexist")
  end

  def test_nonexistent_class
    assert_equal [], @parser.query(".doesnotexist")
  end
end

# ---------------------------------------------------------------------------
# Tier 2 — Commas
# ---------------------------------------------------------------------------

class TestCommas < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_two_items
    assert_equal %w[vwbug bmwe36], @parser.query("vwbug, bmwe36")
  end

  def test_three_items
    assert_equal %w[vwbug bmwe36 miata], @parser.query("vwbug, bmwe36, miata")
  end

  def test_item_and_class
    result = @parser.query("vwbug, .sf")
    assert_equal "vwbug", result[0]
    assert_includes result, "goldengate"
    assert_includes result, "dolores"
  end

  def test_deduplication
    assert_equal %w[vwbug], @parser.query("vwbug, vwbug")
  end
end

# ---------------------------------------------------------------------------
# Tier 3 — Operators
# ---------------------------------------------------------------------------

class TestOperators < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_intersection
    result = @parser.query(".nyc + .bridge")
    assert_equal %w[brooklyn manhattan], result.sort
  end

  def test_union
    result = @parser.query(".nyc | .sf")
    assert_includes result, "brooklyn"
    assert_includes result, "goldengate"
  end

  def test_subtraction
    result = @parser.query(".nyc - .bridge")
    refute_includes result, "brooklyn"
    refute_includes result, "manhattan"
    assert_includes result, "highline"
    assert_includes result, "centralpark"
  end
end

# ---------------------------------------------------------------------------
# Tier 4 — Chained operators
# ---------------------------------------------------------------------------

class TestChained < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_three_way_intersection
    assert_equal %w[brooklyn], @parser.query(".nyc + .bridge + .landmark")
  end

  def test_union_then_subtract
    result = @parser.query(".nyc | .sf - .bridge")
    # Left-to-right: (.nyc | .sf) - .bridge
    refute_includes result, "brooklyn"
    refute_includes result, "manhattan"
    refute_includes result, "goldengate"
    assert_includes result, "highline"
  end
end

# ---------------------------------------------------------------------------
# Tier 5 — Mixed
# ---------------------------------------------------------------------------

class TestMixed < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_item_and_class_intersection
    assert_equal %w[brooklyn], @parser.query("brooklyn + .landmark")
  end

  def test_class_union_with_item
    result = @parser.query(".car | goldengate")
    assert_includes result, "vwbug"
    assert_includes result, "goldengate"
  end
end

# ---------------------------------------------------------------------------
# Tier 6 — Macros
# ---------------------------------------------------------------------------

class TestMacros < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_named_macro
    result = @parser.query("@cars")
    assert_equal %w[bmwe36 vwbug], result.sort
  end

  def test_macro_with_operators
    result = @parser.query("@nycbridges")
    assert_equal %w[brooklyn manhattan], result.sort
  end

  def test_unknown_macro
    assert_equal [], @parser.query("@nonexistent")
  end

end

# ---------------------------------------------------------------------------
# Tier 7 — Parentheses
# ---------------------------------------------------------------------------

class TestParentheses < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_basic_grouping
    with_parens = @parser.query(".nyc | (.sf + .bridge)")
    assert_includes with_parens, "highline"
    assert_includes with_parens, "centralpark"
    assert_includes with_parens, "goldengate"
  end

  def test_nested_parens
    result = @parser.query("((.nyc + .bridge) | (.sf + .bridge))")
    assert_equal %w[brooklyn goldengate manhattan], result.sort
  end

  def test_parens_with_subtraction
    result = @parser.query("(.nyc | .sf) - .park")
    refute_includes result, "centralpark"
    refute_includes result, "dolores"
    assert_includes result, "brooklyn"
  end
end

# ---------------------------------------------------------------------------
# Tier 8 — Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases < Minitest::Test
  def setup
    @parser = Alap::ExpressionParser.new(TEST_CONFIG)
  end

  def test_empty_string
    assert_equal [], @parser.query("")
  end

  def test_whitespace_only
    assert_equal [], @parser.query("   ")
  end

  def test_nil_expression
    assert_equal [], @parser.query(nil)
  end

  def test_empty_config
    p = Alap::ExpressionParser.new("allLinks" => {})
    assert_equal [], p.query(".car")
  end

  def test_no_alllinks
    p = Alap::ExpressionParser.new({})
    assert_equal [], p.query("vwbug")
  end
end

# ---------------------------------------------------------------------------
# Tier 9 — Protocols
# ---------------------------------------------------------------------------

TAG_PROTOCOL = ->(segments, link, _item_id) {
  return false if segments.empty?
  (link["tags"] || []).include?(segments[0])
}

THROWING_PROTOCOL = ->(_segments, _link, _item_id) {
  raise "boom"
}

PROTOCOL_CONFIG = TEST_CONFIG.merge(
  "protocols" => {
    "hastag" => { "handler" => TAG_PROTOCOL },
    "broken" => { "handler" => THROWING_PROTOCOL },
  }
)

class TestProtocols < Minitest::Test
  def test_protocol_tokenization
    parser = Alap::ExpressionParser.new({})
    tokens = parser.send(:tokenize, ":time:7d:")
    assert_equal 1, tokens.length
    assert_equal "PROTOCOL", tokens[0].type
    assert_equal "time|7d", tokens[0].value
  end

  def test_protocol_multi_arg_tokenization
    parser = Alap::ExpressionParser.new({})
    tokens = parser.send(:tokenize, ":time:7d:newest:")
    assert_equal 1, tokens.length
    assert_equal "PROTOCOL", tokens[0].type
    assert_equal "time|7d|newest", tokens[0].value
  end

  def test_protocol_resolution
    parser = Alap::ExpressionParser.new(PROTOCOL_CONFIG)
    result = parser.query(":hastag:coffee:")
    assert_equal %w[acre aqus bluebottle], result.sort
  end

  def test_unknown_protocol
    parser = Alap::ExpressionParser.new(PROTOCOL_CONFIG)
    result = parser.query(":nonexistent:arg:")
    assert_equal [], result
  end

  def test_protocol_handler_throws
    parser = Alap::ExpressionParser.new(PROTOCOL_CONFIG)
    result = parser.query(":broken:arg:")
    assert_equal [], result
  end

  def test_protocol_with_tag_intersection
    parser = Alap::ExpressionParser.new(PROTOCOL_CONFIG)
    result = parser.query(":hastag:coffee: + .sf")
    assert_equal %w[aqus bluebottle], result.sort
  end

  def test_protocol_with_tag_union
    parser = Alap::ExpressionParser.new(PROTOCOL_CONFIG)
    result = parser.query(":hastag:coffee: | .bridge")
    assert_includes result, "acre"
    assert_includes result, "brooklyn"
    assert_includes result, "goldengate"
  end

  def test_protocol_no_config
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(":hastag:coffee:")
    assert_equal [], result
  end
end

# ---------------------------------------------------------------------------
# Tier 10 — Refiners
# ---------------------------------------------------------------------------

class TestRefiners < Minitest::Test
  def test_refiner_tokenization
    parser = Alap::ExpressionParser.new({})
    tokens = parser.send(:tokenize, "*sort*")
    assert_equal 1, tokens.length
    assert_equal "REFINER", tokens[0].type
    assert_equal "sort", tokens[0].value
  end

  def test_refiner_with_arg_tokenization
    parser = Alap::ExpressionParser.new({})
    tokens = parser.send(:tokenize, "*sort:label*")
    assert_equal 1, tokens.length
    assert_equal "sort:label", tokens[0].value
  end

  def test_sort_refiner_default
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(".car *sort*")
    labels = result.map { |r| TEST_CONFIG["allLinks"][r]["label"] }
    assert_equal labels.sort_by(&:downcase), labels
  end

  def test_sort_refiner_by_url
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(".car *sort:url*")
    urls = result.map { |r| TEST_CONFIG["allLinks"][r]["url"] }
    assert_equal urls.sort_by(&:downcase), urls
  end

  def test_reverse_refiner
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    normal = parser.query(".car *sort*")
    reversed_result = parser.query(".car *sort* *reverse*")
    assert_equal normal.reverse, reversed_result
  end

  def test_limit_refiner
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(".car *sort* *limit:2*")
    assert_equal 2, result.length
  end

  def test_limit_zero
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(".car *limit:0*")
    assert_equal [], result
  end

  def test_skip_refiner
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    full = parser.query(".car *sort*")
    skipped = parser.query(".car *sort* *skip:1*")
    assert_equal full[1..], skipped
  end

  def test_shuffle_refiner
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(".car *shuffle*")
    assert_equal %w[bmwe36 miata vwbug], result.sort
  end

  def test_unique_refiner
    config = {
      "allLinks" => {
        "a" => { "label" => "A", "url" => "https://same.com", "tags" => ["t"] },
        "b" => { "label" => "B", "url" => "https://same.com", "tags" => ["t"] },
        "c" => { "label" => "C", "url" => "https://other.com", "tags" => ["t"] },
      },
    }
    parser = Alap::ExpressionParser.new(config)
    result = parser.query(".t *unique:url*")
    urls = result.map { |r| config["allLinks"][r]["url"] }
    assert_equal urls.uniq.length, urls.length
    assert_equal 2, result.length
  end

  def test_unknown_refiner
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query(".car *bogus*")
    assert_equal %w[bmwe36 miata vwbug], result.sort
  end

  def test_refiner_in_parenthesized_group
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query("(.car *sort* *limit:1*), goldengate")
    assert_equal 2, result.length
    assert_includes result, "goldengate"
  end

  def test_refiner_chained_sort_limit
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    sorted_all = parser.query(".car *sort*")
    sorted_limited = parser.query(".car *sort* *limit:2*")
    assert_equal sorted_all[0, 2], sorted_limited
  end
end

# ---------------------------------------------------------------------------
# Tier 11 — Hyphenated identifiers
# ---------------------------------------------------------------------------

class TestHyphenatedIdentifiers < Minitest::Test
  def test_hyphen_parsed_as_without
    config = {
      "allLinks" => {
        "my" => { "label" => "My", "url" => "https://my.com", "tags" => [] },
        "item" => { "label" => "Item", "url" => "https://item.com", "tags" => [] },
      },
    }
    parser = Alap::ExpressionParser.new(config)
    result = parser.query("my-item")
    assert_equal %w[my], result
  end

  def test_hyphen_in_class_context
    parser = Alap::ExpressionParser.new(TEST_CONFIG)
    result = parser.query("vwbug - miata")
    assert_equal %w[vwbug], result
  end
end

# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------

class TestConvenience < Minitest::Test
  def test_resolve_expression
    results = Alap.resolve_expression(TEST_CONFIG, ".car + .germany")
    ids = results.map { |r| r["id"] }.sort
    assert_equal %w[bmwe36 vwbug], ids
    results.each do |r|
      assert r.key?("id")
      assert r.key?("label")
      assert r.key?("url")
    end
  end

  def test_cherry_pick_links
    result = Alap.cherry_pick_links(TEST_CONFIG, "vwbug, miata")
    assert result.key?("vwbug")
    assert result.key?("miata")
    refute result.key?("bmwe36")
  end

  def test_merge_configs
    config1 = {
      "allLinks" => { "a" => { "label" => "A", "url" => "https://a.com" } },
      "macros" => { "m1" => { "linkItems" => "a" } },
    }
    config2 = {
      "allLinks" => { "b" => { "label" => "B", "url" => "https://b.com" } },
      "macros" => { "m2" => { "linkItems" => "b" } },
    }
    merged = Alap.merge_configs(config1, config2)
    assert merged["allLinks"].key?("a")
    assert merged["allLinks"].key?("b")
    assert merged["macros"].key?("m1")
    assert merged["macros"].key?("m2")
  end

  def test_merge_configs_later_wins
    config1 = { "allLinks" => { "a" => { "label" => "Old", "url" => "https://old.com" } } }
    config2 = { "allLinks" => { "a" => { "label" => "New", "url" => "https://new.com" } } }
    merged = Alap.merge_configs(config1, config2)
    assert_equal "New", merged["allLinks"]["a"]["label"]
  end
end

# ---------------------------------------------------------------------------
# URL sanitization
# ---------------------------------------------------------------------------

class TestSanitizeUrl < Minitest::Test
  def test_safe_urls
    assert_equal "https://example.com", Alap::SanitizeUrl.call("https://example.com")
    assert_equal "http://example.com", Alap::SanitizeUrl.call("http://example.com")
    assert_equal "mailto:user@example.com", Alap::SanitizeUrl.call("mailto:user@example.com")
    assert_equal "/relative/path", Alap::SanitizeUrl.call("/relative/path")
    assert_equal "", Alap::SanitizeUrl.call("")
  end

  def test_javascript_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("javascript:alert(1)")
    assert_equal "about:blank", Alap::SanitizeUrl.call("JAVASCRIPT:alert(1)")
    assert_equal "about:blank", Alap::SanitizeUrl.call("JavaScript:void(0)")
  end

  def test_data_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("data:text/html,<h1>Hi</h1>")
  end

  def test_vbscript_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("vbscript:MsgBox")
  end

  def test_blob_blocked
    assert_equal "about:blank", Alap::SanitizeUrl.call("blob:https://example.com/uuid")
  end

  def test_control_chars_stripped
    assert_equal "about:blank", Alap::SanitizeUrl.call("java\nscript:alert(1)")
    assert_equal "about:blank", Alap::SanitizeUrl.call("java\tscript:alert(1)")
  end

  def test_sanitize_in_resolve
    config = {
      "allLinks" => {
        "bad" => { "label" => "Evil", "url" => "javascript:alert(1)", "tags" => ["test"] },
        "good" => { "label" => "Good", "url" => "https://example.com", "tags" => ["test"] },
      },
    }
    results = Alap.resolve_expression(config, ".test")
    urls = results.each_with_object({}) { |r, h| h[r["id"]] = r["url"] }
    assert_equal "about:blank", urls["bad"]
    assert_equal "https://example.com", urls["good"]
  end

  def test_sanitize_in_cherry_pick
    config = {
      "allLinks" => {
        "bad" => { "label" => "Evil", "url" => "javascript:alert(1)", "tags" => ["test"] },
      },
    }
    result = Alap.cherry_pick_links(config, ".test")
    assert_equal "about:blank", result["bad"]["url"]
  end
end
