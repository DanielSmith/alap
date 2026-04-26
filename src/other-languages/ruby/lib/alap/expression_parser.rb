# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "set"
require "time"

module Alap
  # Recursive descent parser for Alap's expression grammar:
  #
  #   query   = segment (',' segment)*
  #   segment = term (op term)* refiner*
  #   op      = '+' | '|' | '-'
  #   term    = '(' segment ')' | atom
  #   atom    = ITEM_ID | CLASS | DOM_REF | REGEX | PROTOCOL
  #   refiner = '*' name (':' arg)* '*'
  #
  # Supports: item IDs, .tag queries, @macro expansion, /regex/ search,
  # :protocol:args: expressions, *refiner:args* post-processing,
  # parenthesized grouping, + (AND/intersection), | (OR/union), - (WITHOUT/subtraction).
  class ExpressionParser
    MAX_DEPTH = 32
    MAX_TOKENS = 1024
    MAX_MACRO_EXPANSIONS = 10
    MAX_REGEX_QUERIES = 5
    MAX_SEARCH_RESULTS = 100
    REGEX_TIMEOUT_MS = 20
    MAX_REFINERS = 10
    REGEX_FIELD_CODES = "lutdka"
    PROTOCOL_DELIMITERS = " \t\n\r+|,()*/".freeze

    Token = Struct.new(:type, :value, keyword_init: true)
    ParseResult = Struct.new(:ids, :pos, keyword_init: true)

    attr_reader :config

    def initialize(config)
      @config = config
      @depth = 0
      @regex_count = 0
    end

    def update_config(config)
      @config = config
    end

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    # Parse +expression+ and return matching item IDs (deduplicated, order preserved).
    def query(expression, anchor_id: nil)
      return [] unless expression.is_a?(String)

      expr = expression.strip
      return [] if expr.empty?

      all_links = @config["allLinks"]
      return [] unless all_links.is_a?(Hash) && !all_links.empty?

      expanded = expand_macros(expr, anchor_id)
      return [] if expanded.empty?

      tokens = tokenize(expanded)
      return [] if tokens.empty?

      if tokens.length > MAX_TOKENS
        warn "[Alap] Expression has #{tokens.length} tokens (max #{MAX_TOKENS}). " \
             "Ignoring: \"#{expression[0, 60]}...\""
        return []
      end

      @depth = 0
      @regex_count = 0
      ids = parse_query(tokens)

      # Deduplicate, preserve order
      seen = Set.new
      ids.select { |id| seen.add?(id) }
    end

    # Return all item IDs carrying +class_name+ as a tag.
    def search_by_class(class_name)
      all_links = @config["allLinks"]
      return [] unless all_links.is_a?(Hash)

      all_links.each_with_object([]) do |(item_id, link), result|
        next unless link.is_a?(Hash)

        tags = link["tags"]
        result << item_id if tags.is_a?(Array) && tags.include?(class_name)
      end
    end

    # Search allLinks using a named regex from config.searchPatterns.
    def search_by_regex(pattern_key, field_opts = nil)
      @regex_count += 1
      if @regex_count > MAX_REGEX_QUERIES
        warn "[Alap] Regex query limit exceeded (max #{MAX_REGEX_QUERIES}). Skipping /#{pattern_key}/"
        return []
      end

      patterns = @config["searchPatterns"]
      unless patterns.is_a?(Hash) && patterns.key?(pattern_key)
        warn "[Alap] Search pattern \"#{pattern_key}\" not found in config.searchPatterns"
        return []
      end

      entry = patterns[pattern_key]
      spec = entry.is_a?(String) ? { "pattern" => entry } : entry

      pattern_str = spec["pattern"] || ""
      validation = ValidateRegex.call(pattern_str)
      unless validation["safe"]
        warn "[Alap] Unsafe regex \"#{pattern_str}\" in searchPatterns[\"#{pattern_key}\"]: #{validation["reason"]}"
        return []
      end

      begin
        compiled = Regexp.new(pattern_str, Regexp::IGNORECASE)
      rescue RegexpError
        warn "[Alap] Invalid regex \"#{pattern_str}\" in searchPatterns[\"#{pattern_key}\"]"
        return []
      end

      opts = spec["options"] || {}
      fields = parse_field_codes(field_opts || opts["fields"] || "a")

      all_links = @config["allLinks"]
      return [] unless all_links.is_a?(Hash)

      now_ms = (Time.now.to_f * 1000).to_i
      max_age = opts["age"] ? parse_age(opts["age"]) : 0
      limit = [opts.fetch("limit", MAX_SEARCH_RESULTS), MAX_SEARCH_RESULTS].min
      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      results = []

      all_links.each do |item_id, link|
        next unless link.is_a?(Hash)

        # Timeout guard
        elapsed_ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000
        if elapsed_ms > REGEX_TIMEOUT_MS
          warn "[Alap] Regex search /#{pattern_key}/ timed out after #{REGEX_TIMEOUT_MS}ms"
          break
        end

        # Age filter
        if max_age > 0
          ts = to_timestamp(link["createdAt"])
          next if ts.zero? || (now_ms - ts) > max_age
        end

        # Field matching
        if matches_fields?(compiled, item_id, link, fields)
          ts = link["createdAt"] ? to_timestamp(link["createdAt"]) : 0
          results << { "id" => item_id, "createdAt" => ts }
          if results.length >= MAX_SEARCH_RESULTS
            warn "[Alap] Regex search /#{pattern_key}/ hit #{MAX_SEARCH_RESULTS} result cap"
            break
          end
        end
      end

      # Sort
      sort_mode = opts["sort"]
      case sort_mode
      when "alpha"
        results.sort_by! { |r| r["id"] }
      when "newest"
        results.sort_by! { |r| -r["createdAt"] }
      when "oldest"
        results.sort_by! { |r| r["createdAt"] }
      end

      results.first(limit).map { |r| r["id"] }
    end

    private

    # ------------------------------------------------------------------
    # Protocol resolution
    # ------------------------------------------------------------------

    def resolve_protocol(value)
      parts = value.split("|")
      name = parts[0]
      segments = parts[1..]

      protocols = @config["protocols"] || {}
      unless protocols.is_a?(Hash) && protocols.key?(name)
        warn "[Alap] Unknown protocol \":#{name}:\" — skipping"
        return []
      end

      handler_entry = protocols[name]
      handler = handler_entry.is_a?(Hash) ? handler_entry["handler"] : handler_entry

      unless handler.respond_to?(:call)
        warn "[Alap] Protocol \":#{name}:\" has no callable handler — skipping"
        return []
      end

      all_links = @config["allLinks"] || {}
      results = []

      all_links.each do |item_id, link|
        next unless link.is_a?(Hash)

        begin
          results << item_id if handler.call(segments, link, item_id)
        rescue StandardError => e
          warn "[Alap] Protocol \":#{name}:\" handler threw for \"#{item_id}\": #{e.message}"
        end
      end

      results
    end

    # ------------------------------------------------------------------
    # Refiner application
    # ------------------------------------------------------------------

    def apply_refiners(ids, refiners)
      return ids if refiners.empty?

      all_links = @config["allLinks"] || {}
      links = ids.each_with_object([]) do |item_id, arr|
        link = all_links[item_id]
        arr << { "id" => item_id }.merge(link) if link.is_a?(Hash)
      end

      refiners.each do |refiner_token|
        name, arg = parse_refiner_step(refiner_token.value)

        case name
        when "sort"
          field_name = arg.empty? ? "label" : arg
          links.sort_by! { |lnk| (lnk[field_name] || "").to_s.downcase }
        when "reverse"
          links.reverse!
        when "limit"
          n = Integer(arg, exception: false) || 0
          links = links.first([n, 0].max)
        when "skip"
          n = Integer(arg, exception: false) || 0
          links = links.drop([n, 0].max)
        when "shuffle"
          links.shuffle!
        when "unique"
          field_name = arg.empty? ? "url" : arg
          seen = Set.new
          links.select! do |lnk|
            val = (lnk[field_name] || "").to_s
            seen.add?(val)
          end
        else
          warn "[Alap] Unknown refiner \"*#{name}*\" — skipping"
        end
      end

      links.map { |lnk| lnk["id"] }
    end

    def parse_refiner_step(value)
      if value.include?(":")
        name, arg = value.split(":", 2)
        [name, arg]
      else
        [value, ""]
      end
    end

    # ------------------------------------------------------------------
    # Field helpers
    # ------------------------------------------------------------------

    def parse_field_codes(codes)
      chars = codes.gsub(/[\s,]/, "").chars
      fields = Set.new

      chars.each do |ch|
        case ch
        when "l" then fields << "label"
        when "u" then fields << "url"
        when "t" then fields << "tags"
        when "d" then fields << "description"
        when "k" then fields << "id"
        when "a" then fields.merge(%w[label url tags description id])
        end
      end

      fields.empty? ? Set.new(%w[label url tags description id]) : fields
    end

    def matches_fields?(compiled, item_id, link, fields)
      return true if fields.include?("id") && compiled.match?(item_id)
      return true if fields.include?("label") && compiled.match?(link["label"].to_s)
      return true if fields.include?("url") && compiled.match?(link["url"].to_s)
      return true if fields.include?("description") && compiled.match?(link["description"].to_s)

      if fields.include?("tags")
        tags = link["tags"]
        return true if tags.is_a?(Array) && tags.any? { |t| compiled.match?(t.to_s) }
      end

      false
    end

    def parse_age(age)
      return 0 unless age.is_a?(String)

      match = age.match(/\A(\d+)\s*([dhwm])\z/i)
      return 0 unless match

      n = match[1].to_i
      unit = match[2].downcase

      case unit
      when "h" then n * 60 * 60 * 1000
      when "d" then n * 24 * 60 * 60 * 1000
      when "w" then n * 7 * 24 * 60 * 60 * 1000
      when "m" then n * 30 * 24 * 60 * 60 * 1000
      else 0
      end
    end

    def to_timestamp(value)
      return 0 if value.nil?
      return value.to_i if value.is_a?(Numeric)

      begin
        dt = Time.parse(value.to_s)
        (dt.to_f * 1000).to_i
      rescue ArgumentError, TypeError
        0
      end
    end

    # ------------------------------------------------------------------
    # Macro expansion
    # ------------------------------------------------------------------

    def expand_macros(expr, anchor_id)
      result = expr

      MAX_MACRO_EXPANSIONS.times do
        break unless result.include?("@")

        before = result
        result = result.gsub(/@(\w*)/) do |_match|
          name = Regexp.last_match(1)

          if name.empty?
            warn "[Alap] Bare \"@\" is no longer supported — use \"@macroname\" to reference a named macro in config.macros"
            next ""
          end

          macros = @config["macros"]
          unless macros.is_a?(Hash) && macros.key?(name)
            warn "[Alap] Macro \"@#{name}\" not found in config.macros"
            next ""
          end

          macro = macros[name]
          unless macro.is_a?(Hash) && macro["linkItems"].is_a?(String)
            warn "[Alap] Macro \"@#{name}\" not found in config.macros"
            next ""
          end

          macro["linkItems"]
        end

        break if result == before
      end

      if result.include?("@")
        warn "[Alap] Macro expansion hit #{MAX_MACRO_EXPANSIONS}-round limit — " \
             "possible circular reference in \"#{expr[0, 60]}\""
      end

      result
    end

    # ------------------------------------------------------------------
    # Tokenizer
    # ------------------------------------------------------------------

    def tokenize(expr)
      tokens = []
      i = 0
      n = expr.length

      while i < n
        ch = expr[i]

        if ch =~ /\s/
          i += 1
          next
        end

        case ch
        when "+"
          tokens << Token.new(type: "PLUS", value: "+")
          i += 1
          next
        when "|"
          tokens << Token.new(type: "PIPE", value: "|")
          i += 1
          next
        when "-"
          tokens << Token.new(type: "MINUS", value: "-")
          i += 1
          next
        when ","
          tokens << Token.new(type: "COMMA", value: ",")
          i += 1
          next
        when "("
          tokens << Token.new(type: "LPAREN", value: "(")
          i += 1
          next
        when ")"
          tokens << Token.new(type: "RPAREN", value: ")")
          i += 1
          next
        end

        # Class: .word
        if ch == "."
          i += 1
          word = +""
          while i < n && (expr[i] =~ /[a-zA-Z0-9_]/)
            word << expr[i]
            i += 1
          end
          tokens << Token.new(type: "CLASS", value: word) unless word.empty?
          next
        end

        # DOM ref: #word
        if ch == "#"
          i += 1
          word = +""
          while i < n && (expr[i] =~ /[a-zA-Z0-9_]/)
            word << expr[i]
            i += 1
          end
          tokens << Token.new(type: "DOM_REF", value: word) unless word.empty?
          next
        end

        # Regex search: /patternKey/options
        if ch == "/"
          i += 1
          key = +""
          while i < n && expr[i] != "/"
            key << expr[i]
            i += 1
          end
          opts = +""
          if i < n && expr[i] == "/"
            i += 1
            while i < n && REGEX_FIELD_CODES.include?(expr[i])
              opts << expr[i]
              i += 1
            end
          end
          unless key.empty?
            value = opts.empty? ? key : "#{key}|#{opts}"
            tokens << Token.new(type: "REGEX", value: value)
          end
          next
        end

        # Protocol: :name:arg1:arg2:
        if ch == ":"
          i += 1
          segments = +""
          while i < n && expr[i] != ":"
            segments << expr[i]
            i += 1
          end
          while i < n && expr[i] == ":"
            i += 1
            break if i >= n || PROTOCOL_DELIMITERS.include?(expr[i])

            segments << "|"
            while i < n && expr[i] != ":"
              segments << expr[i]
              i += 1
            end
          end
          tokens << Token.new(type: "PROTOCOL", value: segments) unless segments.empty?
          next
        end

        # Refiner: *name* or *name:arg*
        if ch == "*"
          i += 1
          content = +""
          while i < n && expr[i] != "*"
            content << expr[i]
            i += 1
          end
          i += 1 if i < n && expr[i] == "*"
          tokens << Token.new(type: "REFINER", value: content) unless content.empty?
          next
        end

        # Bare word: item ID
        if ch =~ /[a-zA-Z0-9_]/
          word = +""
          while i < n && (expr[i] =~ /[a-zA-Z0-9_]/)
            word << expr[i]
            i += 1
          end
          tokens << Token.new(type: "ITEM_ID", value: word)
          next
        end

        # Unknown character — skip
        i += 1
      end

      tokens
    end

    # ------------------------------------------------------------------
    # Parser
    # ------------------------------------------------------------------

    def parse_query(tokens)
      result = []
      pos = 0

      first = parse_segment(tokens, pos)
      result = first.ids
      pos = first.pos

      while pos < tokens.length && tokens[pos].type == "COMMA"
        pos += 1
        break if pos >= tokens.length

        nxt = parse_segment(tokens, pos)
        result += nxt.ids
        pos = nxt.pos
      end

      result
    end

    def parse_segment(tokens, pos)
      return ParseResult.new(ids: [], pos: pos) if pos >= tokens.length

      start_pos = pos
      first = parse_term(tokens, pos)
      result = first.ids
      pos = first.pos

      has_initial_term = pos > start_pos

      while pos < tokens.length
        tok = tokens[pos]
        break unless %w[PLUS PIPE MINUS].include?(tok.type)

        op = tok.type
        pos += 1
        break if pos >= tokens.length

        right = parse_term(tokens, pos)
        pos = right.pos

        if !has_initial_term
          result = right.ids
          has_initial_term = true
        elsif op == "PLUS"
          right_set = Set.new(right.ids)
          result = result.select { |x| right_set.include?(x) }
        elsif op == "PIPE"
          seen = Set.new(result)
          right.ids.each do |x|
            unless seen.include?(x)
              result << x
              seen << x
            end
          end
        elsif op == "MINUS"
          right_set = Set.new(right.ids)
          result = result.reject { |x| right_set.include?(x) }
        end
      end

      # Collect trailing refiners
      refiners = []
      while pos < tokens.length && tokens[pos].type == "REFINER"
        if refiners.length >= MAX_REFINERS
          warn "[Alap] Refiner limit exceeded (max #{MAX_REFINERS} per expression). " \
               "Skipping remaining refiners."
          pos += 1
          next
        end
        refiners << tokens[pos]
        pos += 1
      end

      result = apply_refiners(result, refiners) unless refiners.empty?

      ParseResult.new(ids: result, pos: pos)
    end

    def parse_term(tokens, pos)
      return ParseResult.new(ids: [], pos: pos) if pos >= tokens.length

      # Parenthesized group
      if tokens[pos].type == "LPAREN"
        @depth += 1
        if @depth > MAX_DEPTH
          warn "[Alap] Parentheses nesting exceeds max depth (#{MAX_DEPTH})."
          return ParseResult.new(ids: [], pos: tokens.length)
        end
        pos += 1
        inner = parse_segment(tokens, pos)
        pos = inner.pos
        pos += 1 if pos < tokens.length && tokens[pos].type == "RPAREN"
        @depth -= 1
        return ParseResult.new(ids: inner.ids, pos: pos)
      end

      parse_atom(tokens, pos)
    end

    def parse_atom(tokens, pos)
      return ParseResult.new(ids: [], pos: pos) if pos >= tokens.length

      token = tokens[pos]

      case token.type
      when "ITEM_ID"
        all_links = @config["allLinks"] || {}
        link = all_links[token.value]
        ids = link.is_a?(Hash) ? [token.value] : []
        warn "[Alap] Item ID \"#{token.value}\" not found in config.allLinks" if ids.empty?
        ParseResult.new(ids: ids, pos: pos + 1)

      when "CLASS"
        ParseResult.new(ids: search_by_class(token.value), pos: pos + 1)

      when "REGEX"
        if token.value.include?("|")
          pattern_key, field_opts = token.value.split("|", 2)
        else
          pattern_key = token.value
          field_opts = nil
        end
        ParseResult.new(ids: search_by_regex(pattern_key, field_opts), pos: pos + 1)

      when "PROTOCOL"
        ParseResult.new(ids: resolve_protocol(token.value), pos: pos + 1)

      when "DOM_REF"
        # Reserved for future use
        ParseResult.new(ids: [], pos: pos + 1)

      else
        # Not a recognized atom — don't consume
        ParseResult.new(ids: [], pos: pos)
      end
    end
  end
end
