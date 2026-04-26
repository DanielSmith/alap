# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class LinkProvenanceStampAndGetTest < Minitest::Test
  def test_stamp_author_then_read
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "author")
    assert_equal "author", Alap::LinkProvenance.get(link)
  end

  def test_stamp_storage_local
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "storage:local")
    assert_equal "storage:local", Alap::LinkProvenance.get(link)
  end

  def test_stamp_storage_remote
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "storage:remote")
    assert_equal "storage:remote", Alap::LinkProvenance.get(link)
  end

  def test_stamp_protocol
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "protocol:web")
    assert_equal "protocol:web", Alap::LinkProvenance.get(link)
  end

  def test_unstamped_returns_nil
    assert_nil Alap::LinkProvenance.get({ "url" => "/a" })
  end

  def test_stamp_overwrites_existing
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "author")
    Alap::LinkProvenance.stamp(link, "protocol:web")
    assert_equal "protocol:web", Alap::LinkProvenance.get(link)
  end

  def test_stamp_uses_reserved_key
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "author")
    assert link.key?(Alap::LinkProvenance::PROVENANCE_KEY)
    assert_equal "author", link[Alap::LinkProvenance::PROVENANCE_KEY]
  end
end

class LinkProvenanceInvalidTierTest < Minitest::Test
  def test_rejects_unknown_tier
    assert_raises(ArgumentError) { Alap::LinkProvenance.stamp({ "url" => "/a" }, "admin") }
  end

  def test_rejects_typo_author
    assert_raises(ArgumentError) { Alap::LinkProvenance.stamp({ "url" => "/a" }, "Author") }
  end

  def test_rejects_empty
    assert_raises(ArgumentError) { Alap::LinkProvenance.stamp({ "url" => "/a" }, "") }
  end

  def test_rejects_non_string
    assert_raises(ArgumentError) { Alap::LinkProvenance.stamp({ "url" => "/a" }, 42) }
  end

  def test_accepts_any_protocol_suffix
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "protocol:custom_handler_42")
    assert_equal "protocol:custom_handler_42", Alap::LinkProvenance.get(link)
  end
end

class LinkProvenanceTierPredicatesTest < Minitest::Test
  def test_author_true_for_author
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "author")
    assert Alap::LinkProvenance.author_tier?(link)
    refute Alap::LinkProvenance.storage_tier?(link)
    refute Alap::LinkProvenance.protocol_tier?(link)
  end

  def test_storage_true_for_local
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "storage:local")
    refute Alap::LinkProvenance.author_tier?(link)
    assert Alap::LinkProvenance.storage_tier?(link)
    refute Alap::LinkProvenance.protocol_tier?(link)
  end

  def test_storage_true_for_remote
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "storage:remote")
    assert Alap::LinkProvenance.storage_tier?(link)
  end

  def test_protocol_true_for_protocol_web
    link = { "url" => "/a" }
    Alap::LinkProvenance.stamp(link, "protocol:web")
    refute Alap::LinkProvenance.author_tier?(link)
    refute Alap::LinkProvenance.storage_tier?(link)
    assert Alap::LinkProvenance.protocol_tier?(link)
  end

  def test_all_false_for_unstamped
    link = { "url" => "/a" }
    refute Alap::LinkProvenance.author_tier?(link)
    refute Alap::LinkProvenance.storage_tier?(link)
    refute Alap::LinkProvenance.protocol_tier?(link)
  end
end

class LinkProvenanceCloneToTest < Minitest::Test
  def test_copies_stamp
    src = { "url" => "/a" }
    Alap::LinkProvenance.stamp(src, "protocol:web")
    dest = { "url" => "/b" }
    Alap::LinkProvenance.clone_to(src, dest)
    assert_equal "protocol:web", Alap::LinkProvenance.get(dest)
  end

  def test_no_op_when_src_unstamped
    src = { "url" => "/a" }
    dest = { "url" => "/b" }
    Alap::LinkProvenance.clone_to(src, dest)
    assert_nil Alap::LinkProvenance.get(dest)
    refute dest.key?(Alap::LinkProvenance::PROVENANCE_KEY)
  end

  def test_overwrites_existing_stamp_on_dest
    src = { "url" => "/a" }
    Alap::LinkProvenance.stamp(src, "storage:remote")
    dest = { "url" => "/b" }
    Alap::LinkProvenance.stamp(dest, "author")
    Alap::LinkProvenance.clone_to(src, dest)
    assert_equal "storage:remote", Alap::LinkProvenance.get(dest)
  end
end
