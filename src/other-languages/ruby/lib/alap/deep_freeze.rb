# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

module Alap
  # Recursive immutability — Ruby port of src/core/deepFreeze.ts.
  #
  # Walks +obj+ recursively and calls +.freeze+ on every Hash and Array
  # it encounters. Strings are deliberately not frozen: JS strings are
  # immutable primitives (there is nothing to freeze), so matching TS
  # semantics means locking containers only. Freezing strings here
  # would also propagate-freeze the caller's input strings, since
  # +Alap::DeepClone+ shares string references (Ruby strings are
  # reference types; copying every string on clone would be wasteful
  # and pointless). Hash / Array assignment is what we need to prevent
  # — +result["url"] = "javascript:..."+ — not leaf-string edits.
  #
  # Freezes in place, matching TypeScript +Object.freeze+ semantics.
  # Pair with +Alap::DeepClone.call+ on intake — clone detaches from
  # the caller, freeze locks the container shape on return.
  module DeepFreeze
    # Recursively freeze +obj+ and return it. Already-frozen sub-objects
    # are left alone.
    def self.call(obj)
      case obj
      when Hash
        unless obj.frozen?
          obj.each_value { |v| call(v) }
          obj.freeze
        end
      when Array
        unless obj.frozen?
          obj.each { |v| call(v) }
          obj.freeze
        end
      end
      obj
    end
  end
end
