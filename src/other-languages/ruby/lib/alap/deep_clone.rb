# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "set"

module Alap
  # Deep-clone for plain config data — Ruby port of src/core/deepCloneData.ts.
  #
  # Detaches a config from the caller's input by recursively rebuilding
  # it, rejecting anything that is not plain data. Two reasons:
  #
  # 1. Detachment. Frameworks (Active Record instances, Hash subclasses,
  #    custom wrappers) carry behaviour that would otherwise leak into
  #    downstream immutability / serialization steps.
  # 2. Trust boundary. Config is *data*. Handlers are registered
  #    separately via the runtime registry. A callable in config is a
  #    shape error; rejecting it here surfaces the error before any
  #    downstream step has to cope with it.
  #
  # Allowed: Hash (string-keyed), Array, String, Integer, Float, Symbol,
  # true, false, nil.
  # Rejected: callables (Proc, Method, UnboundMethod), Hash/Array
  # subclasses, class instances, cycles, non-String Hash keys, and
  # structures that exceed the resource bounds.
  #
  # Resource bounds, matching src/core/deepCloneData.ts:
  #   - MAX_CLONE_DEPTH = 64   — rejects pathologically nested structures
  #   - MAX_CLONE_NODES = 10_000 — rejects node-count DoS bombs
  #
  # +__proto__+, +constructor+, +prototype+ keys (plus the Python-port
  # dunders retained for cross-port parity) are silently skipped during
  # clone.
  module DeepClone
    MAX_CLONE_DEPTH = 64
    MAX_CLONE_NODES = 10_000

    BLOCKED_KEYS = Set.new(%w[
      __proto__ constructor prototype
      __class__ __bases__ __mro__ __subclasses__
    ]).freeze

    class Error < TypeError; end

    # Deep-clone +value+ with exotic types rejected. Raises
    # +Alap::DeepClone::Error+ on callables, Hash/Array subclasses, class
    # instances, cycles, non-String keys, depth over +MAX_CLONE_DEPTH+,
    # or node count over +MAX_CLONE_NODES+.
    def self.call(value)
      seen = Set.new
      node_count = 0

      path_or_root = ->(path) { path.empty? ? "<root>" : path }

      clone_value = nil
      clone_value = lambda do |v, depth, path|
        # primitives — no clone, no count
        case v
        when nil, true, false then return v
        when Integer, Float, String, Symbol then return v
        end

        if v.is_a?(Proc) || v.is_a?(Method) || v.is_a?(UnboundMethod)
          raise Error,
                "deep_clone: callables are not permitted in config " \
                "(got #{v.class} at #{path_or_root.call(path)}). " \
                "Handlers must be registered separately via the runtime registry."
        end

        if depth > MAX_CLONE_DEPTH
          raise Error,
                "deep_clone: depth exceeds #{MAX_CLONE_DEPTH} " \
                "(at #{path_or_root.call(path)})"
        end

        node_count += 1
        if node_count > MAX_CLONE_NODES
          raise Error, "deep_clone: node count exceeds #{MAX_CLONE_NODES}"
        end

        vid = v.object_id
        if seen.include?(vid)
          raise Error,
                "deep_clone: cycle detected (at #{path_or_root.call(path)})"
        end
        seen.add(vid)

        begin
          # Strict type check (instance_of? rather than is_a?) so Hash /
          # Array subclasses are rejected — matches TS behaviour that
          # checks getPrototypeOf === Object.prototype.
          if v.instance_of?(Hash)
            out = {}
            v.each do |k, val|
              unless k.is_a?(String)
                raise Error,
                      "deep_clone: Hash keys must be Strings " \
                      "(got #{k.class} at #{path_or_root.call(path)})"
              end
              next if BLOCKED_KEYS.include?(k)
              sub_path = path.empty? ? k : "#{path}.#{k}"
              out[k] = clone_value.call(val, depth + 1, sub_path)
            end
            out
          elsif v.instance_of?(Array)
            v.each_with_index.map { |item, i| clone_value.call(item, depth + 1, "#{path}[#{i}]") }
          else
            raise Error,
                  "deep_clone: unsupported type in config: " \
                  "#{v.class} at #{path_or_root.call(path)}. " \
                  "Config must be plain data (Hash / Array / String / " \
                  "Integer / Float / Symbol / true / false / nil)."
          end
        ensure
          seen.delete(vid)
        end
      end

      clone_value.call(value, 0, "")
    end
  end
end
