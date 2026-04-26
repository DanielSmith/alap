# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

module Alap
  # Lightweight ReDoS guard for server-side regex parameters.
  #
  # Rejects patterns with nested quantifiers that cause catastrophic
  # backtracking: (a+)+, (a*)*b, (\w+\w+)+, etc.
  module ValidateRegex
    QUANTIFIER_AFTER = /\A(?:[?*+]|\{\d+(?:,\d*)?\})/
    QUANTIFIER_IN_BODY = /[?*+]|\{\d+(?:,\d*)?\}/

    # Returns { "safe" => true } or { "safe" => false, "reason" => "..." }.
    def self.call(pattern)
      begin
        Regexp.new(pattern)
      rescue RegexpError
        return { "safe" => false, "reason" => "Invalid regex syntax" }
      end

      group_starts = []
      i = 0

      while i < pattern.length
        ch = pattern[i]

        # Skip escaped characters
        if ch == "\\"
          i += 2
          next
        end

        # Skip character classes [...]
        if ch == "["
          i += 1
          i += 1 if i < pattern.length && pattern[i] == "^"
          i += 1 if i < pattern.length && pattern[i] == "]"
          while i < pattern.length && pattern[i] != "]"
            i += 1 if pattern[i] == "\\"
            i += 1
          end
          i += 1
          next
        end

        if ch == "("
          group_starts.push(i)
          i += 1
          next
        end

        if ch == ")"
          unless group_starts.empty?
            start = group_starts.pop
            after_group = pattern[(i + 1)..]
            if after_group && QUANTIFIER_AFTER.match?(after_group)
              body = pattern[(start + 1)...i]
              stripped = strip_escapes_and_classes(body)
              if QUANTIFIER_IN_BODY.match?(stripped)
                return { "safe" => false, "reason" => "Nested quantifier detected — potential ReDoS" }
              end
            end
          end
          i += 1
          next
        end

        i += 1
      end

      { "safe" => true }
    end

    def self.strip_escapes_and_classes(body)
      result = []
      i = 0

      while i < body.length
        if body[i] == "\\"
          i += 2
          next
        end

        if body[i] == "["
          i += 1
          i += 1 if i < body.length && body[i] == "^"
          i += 1 if i < body.length && body[i] == "]"
          while i < body.length && body[i] != "]"
            i += 1 if body[i] == "\\"
            i += 1
          end
          i += 1
          next
        end

        result << body[i]
        i += 1
      end

      result.join
    end
    private_class_method :strip_escapes_and_classes
  end
end
