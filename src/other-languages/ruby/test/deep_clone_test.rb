# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class DeepCloneAllowedShapesTest < Minitest::Test
  def test_empty_hash
    assert_equal({}, Alap::DeepClone.call({}))
  end

  def test_flat_hash
    src = { "url" => "/a", "label" => "A" }
    out = Alap::DeepClone.call(src)
    assert_equal src, out
    refute_same src, out
  end

  def test_nested_hash
    src = { "outer" => { "inner" => { "leaf" => 42 } } }
    out = Alap::DeepClone.call(src)
    assert_equal src, out
    refute_same src["outer"], out["outer"]
    refute_same src["outer"]["inner"], out["outer"]["inner"]
  end

  def test_array
    assert_equal [1, 2, 3], Alap::DeepClone.call([1, 2, 3])
  end

  def test_mixed
    src = {
      "allLinks" => {
        "a" => { "url" => "/a", "tags" => %w[nyc coffee], "meta" => { "rank" => 1 } },
      },
    }
    assert_equal src, Alap::DeepClone.call(src)
  end

  def test_primitives_pass_through
    assert_equal "hello", Alap::DeepClone.call("hello")
    assert_equal 42, Alap::DeepClone.call(42)
    assert_in_delta 3.14, Alap::DeepClone.call(3.14), 0.0001
    assert_equal true, Alap::DeepClone.call(true)
    assert_equal false, Alap::DeepClone.call(false)
    assert_nil Alap::DeepClone.call(nil)
    assert_equal :foo, Alap::DeepClone.call(:foo)
  end
end

class DeepCloneDetachmentTest < Minitest::Test
  def test_input_not_mutated_by_clone
    src = { "url" => "/a", "tags" => ["x"] }
    Alap::DeepClone.call(src)
    assert_equal({ "url" => "/a", "tags" => ["x"] }, src)
  end

  def test_mutation_of_output_does_not_affect_input
    src = { "tags" => %w[x y] }
    out = Alap::DeepClone.call(src)
    out["tags"] << "z"
    assert_equal %w[x y], src["tags"]
  end
end

class DeepCloneRejectionsTest < Minitest::Test
  def test_rejects_proc
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ "handler" => ->(x) { x } })
    end
  end

  def test_rejects_lambda
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ "handler" => lambda { |x| x } })
    end
  end

  def test_rejects_method
    klass = Class.new do
      def foo; end
    end
    m = klass.new.method(:foo)
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ "m" => m })
    end
  end

  def test_rejects_class_instance
    opaque = Class.new.new
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ "obj" => opaque })
    end
  end

  def test_rejects_set
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ "tags" => Set.new(%w[x y]) })
    end
  end

  def test_rejects_hash_subclass
    subclass_instance = Class.new(Hash).new
    subclass_instance["a"] = 1
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call(subclass_instance)
    end
  end

  def test_rejects_non_string_hash_key
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ 1 => "value" })
    end
  end

  def test_rejects_symbol_hash_key
    # Ruby-idiomatic symbol keys rejected — ValidateConfig expects JSON-shaped
    # string keys, so symbol keys are a shape error rather than silent coercion.
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call({ foo: "bar" })
    end
  end

  def test_rejects_cycle
    a = {}
    a["self"] = a
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call(a)
    end
  end

  def test_rejects_mutual_cycle
    a = {}
    b = { "back" => a }
    a["fwd"] = b
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call(a)
    end
  end

  def test_shared_reference_not_rejected
    shared = { "rank" => 1 }
    src = { "a" => shared, "b" => shared }
    out = Alap::DeepClone.call(src)
    assert_equal({ "a" => { "rank" => 1 }, "b" => { "rank" => 1 } }, out)
    refute_same out["a"], out["b"]
  end
end

class DeepCloneResourceBoundsTest < Minitest::Test
  def test_depth_at_limit_ok
    # 65 hashes deep — depths 0..64 — passes because check is depth > 64.
    payload = {}
    current = payload
    64.times do
      current["nested"] = {}
      current = current["nested"]
    end
    assert_instance_of Hash, Alap::DeepClone.call(payload)
  end

  def test_depth_over_limit_rejected
    payload = {}
    current = payload
    65.times do
      current["nested"] = {}
      current = current["nested"]
    end
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call(payload)
    end
  end

  def test_node_count_at_limit_ok
    # 1 array + 9,999 empty hashes = 10,000 nodes, at MAX_CLONE_NODES.
    payload = Array.new(9_999) { {} }
    out = Alap::DeepClone.call(payload)
    assert_equal 9_999, out.length
  end

  def test_node_count_over_limit_rejected
    payload = Array.new(10_001) { {} }
    assert_raises(Alap::DeepClone::Error) do
      Alap::DeepClone.call(payload)
    end
  end

  def test_primitives_do_not_count_as_nodes
    payload = (0...20_000).each_with_object({}) { |i, acc| acc["k#{i}"] = i }
    out = Alap::DeepClone.call(payload)
    assert_equal 20_000, out.length
  end
end

class DeepCloneBlockedKeysTest < Minitest::Test
  def test_proto_key_silently_skipped
    payload = { "url" => "/a", "__proto__" => { "hacked" => true } }
    out = Alap::DeepClone.call(payload)
    assert out.key?("url")
    refute out.key?("__proto__")
  end

  def test_constructor_key_silently_skipped
    out = Alap::DeepClone.call({ "url" => "/a", "constructor" => { "bad" => true } })
    refute out.key?("constructor")
  end

  def test_prototype_key_silently_skipped
    out = Alap::DeepClone.call({ "url" => "/a", "prototype" => { "bad" => true } })
    refute out.key?("prototype")
  end

  def test_python_dunder_keys_silently_skipped
    payload = { "url" => "/a", "__class__" => { "bad" => true } }
    out = Alap::DeepClone.call(payload)
    refute out.key?("__class__")
  end

  def test_blocked_keys_do_not_count_as_nodes
    pathological = {}
    current = pathological
    200.times do
      current["nested"] = {}
      current = current["nested"]
    end
    payload = { "url" => "/a", "__proto__" => pathological }
    out = Alap::DeepClone.call(payload)
    assert_equal({ "url" => "/a" }, out)
  end
end
