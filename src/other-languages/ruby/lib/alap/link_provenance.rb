# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "set"

module Alap
  # Provenance tier stamping — Ruby port of src/core/linkProvenance.ts.
  #
  # Links carry a provenance tier (where they came from) so downstream
  # sanitizers can apply strictness matched to the source's trustworthiness.
  #
  # Tiers, loosest to strictest:
  #   - "author"          — link came from the developer's hand-written config
  #   - "storage:local"   — loaded from a local storage adapter
  #   - "storage:remote"  — loaded from a remote config server
  #   - "protocol:<name>" — returned by a protocol handler
  #
  # TypeScript stores the stamp in a WeakMap keyed on runtime object
  # identity so an attacker-writable ".provenance" field on an incoming
  # link cannot pre-stamp itself for free. Ruby Hashes are hashable but
  # use structural equality, making identity-based WeakMaps awkward; this
  # port instead stamps a reserved "_provenance" key on the link Hash
  # directly. The safety property is preserved through the whitelist in
  # ValidateConfig: each link is built from a fixed set of known field
  # names, and "_provenance" is stamped *after* the whitelist step. An
  # incoming config carrying its own "_provenance" field is filtered out
  # by the whitelist before stamping.
  module LinkProvenance
    # Reserved key. The ValidateConfig whitelist intentionally excludes
    # this key so it cannot be pre-stamped from untrusted input.
    PROVENANCE_KEY = "_provenance"

    VALID_SINGLETONS = Set.new(%w[author storage:local storage:remote]).freeze

    # Stamp +link+ with its provenance tier. Overwrites any existing stamp.
    def self.stamp(link, tier)
      unless tier.is_a?(String) &&
             (VALID_SINGLETONS.include?(tier) || tier.start_with?("protocol:"))
        raise ArgumentError,
              "Invalid provenance tier: #{tier.inspect}. Must be one of " \
              "\"author\", \"storage:local\", \"storage:remote\", or \"protocol:<name>\"."
      end
      link[PROVENANCE_KEY] = tier
    end

    # Read a link's provenance tier, or +nil+ if unstamped.
    def self.get(link)
      value = link[PROVENANCE_KEY]
      value.is_a?(String) ? value : nil
    end

    def self.author_tier?(link)
      link[PROVENANCE_KEY] == "author"
    end

    def self.storage_tier?(link)
      prov = link[PROVENANCE_KEY]
      prov == "storage:local" || prov == "storage:remote"
    end

    def self.protocol_tier?(link)
      prov = link[PROVENANCE_KEY]
      prov.is_a?(String) && prov.start_with?("protocol:")
    end

    # Copy the provenance stamp from +src+ to +dest+. No-op if +src+ is
    # unstamped.
    def self.clone_to(src, dest)
      prov = src[PROVENANCE_KEY]
      dest[PROVENANCE_KEY] = prov if prov.is_a?(String)
    end
  end
end
