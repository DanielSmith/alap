# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class TestValidateRegex < Minitest::Test
  def test_safe_simple_patterns
    assert Alap::ValidateRegex.call("bridge")["safe"]
    assert Alap::ValidateRegex.call("^foo$")["safe"]
    assert Alap::ValidateRegex.call("[a-z]+")["safe"]
    assert Alap::ValidateRegex.call("(foo|bar)")["safe"]
    assert Alap::ValidateRegex.call("\\d{3}")["safe"]
  end

  def test_invalid_syntax
    result = Alap::ValidateRegex.call("[invalid")
    refute result["safe"]
    assert_equal "Invalid regex syntax", result["reason"]
  end

  def test_nested_quantifiers_detected
    result = Alap::ValidateRegex.call("(a+)+")
    refute result["safe"]
    assert_match(/nested quantifier/i, result["reason"])
  end

  def test_nested_star_quantifiers
    result = Alap::ValidateRegex.call("(a*)*b")
    refute result["safe"]
  end

  def test_nested_word_quantifiers
    result = Alap::ValidateRegex.call('(\w+\w+)+')
    refute result["safe"]
  end

  def test_safe_groups_without_nesting
    assert Alap::ValidateRegex.call("(abc)+")["safe"]
    assert Alap::ValidateRegex.call("(a|b)+")["safe"]
  end
end
