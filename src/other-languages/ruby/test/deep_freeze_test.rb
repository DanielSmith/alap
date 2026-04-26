# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class DeepFreezeTopLevelTest < Minitest::Test
  def test_empty_hash_frozen
    out = Alap::DeepFreeze.call({})
    assert out.frozen?
  end

  def test_hash_frozen
    out = Alap::DeepFreeze.call({ "a" => 1, "b" => 2 })
    assert out.frozen?
    assert_equal 1, out["a"]
    assert_equal 2, out["b"]
  end

  def test_array_frozen
    out = Alap::DeepFreeze.call([1, 2, 3])
    assert out.frozen?
    assert_equal [1, 2, 3], out
  end

  def test_primitives_pass_through
    # Integers, Symbols, nil, true, false are already frozen in Ruby.
    assert_equal 42, Alap::DeepFreeze.call(42)
    assert_equal :foo, Alap::DeepFreeze.call(:foo)
    assert_nil Alap::DeepFreeze.call(nil)
    assert_equal true, Alap::DeepFreeze.call(true)
  end

  def test_strings_not_frozen
    # JS primitive strings are immutable; matching TS semantics means
    # Ruby DeepFreeze locks containers but leaves strings alone.
    s = +"hello"
    out = Alap::DeepFreeze.call(s)
    refute out.frozen?
  end
end

class DeepFreezeRecursiveTest < Minitest::Test
  def test_nested_hash
    out = Alap::DeepFreeze.call({ "outer" => { "inner" => { "leaf" => 1 } } })
    assert out.frozen?
    assert out["outer"].frozen?
    assert out["outer"]["inner"].frozen?
  end

  def test_hash_of_arrays
    out = Alap::DeepFreeze.call({ "tags" => %w[a b] })
    assert out["tags"].frozen?
  end

  def test_array_of_hashes
    out = Alap::DeepFreeze.call([{ "a" => 1 }, { "b" => 2 }])
    assert out.frozen?
    out.each { |item| assert item.frozen? }
  end

  def test_deeply_nested_mix
    src = { "allLinks" => { "x" => { "url" => "/x", "tags" => %w[t1 t2], "meta" => { "rank" => 1 } } } }
    out = Alap::DeepFreeze.call(src)
    assert out.frozen?
    assert out["allLinks"].frozen?
    assert out["allLinks"]["x"].frozen?
    assert out["allLinks"]["x"]["tags"].frozen?
    assert out["allLinks"]["x"]["meta"].frozen?
  end
end

class DeepFreezeMutationTest < Minitest::Test
  def test_top_level_assignment_raises
    out = Alap::DeepFreeze.call({ "a" => 1 })
    assert_raises(FrozenError) { out["b"] = 2 }
  end

  def test_top_level_delete_raises
    out = Alap::DeepFreeze.call({ "a" => 1 })
    assert_raises(FrozenError) { out.delete("a") }
  end

  def test_nested_hash_assignment_raises
    out = Alap::DeepFreeze.call({ "inner" => { "a" => 1 } })
    assert_raises(FrozenError) { out["inner"]["b"] = 2 }
  end

  def test_frozen_array_cannot_be_appended
    out = Alap::DeepFreeze.call({ "tags" => ["a"] })
    assert_raises(FrozenError) { out["tags"] << "b" }
  end
end
