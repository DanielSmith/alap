# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

module Alap
  # URL sanitizer — Ruby port of src/core/sanitizeUrl.ts.
  #
  # Blocks dangerous URI schemes (javascript:, data:, vbscript:, blob:)
  # to prevent XSS when rendering links from untrusted configs.
  #
  # Three entry points:
  #   - ::call(url)               — loose; allows http, https, mailto, tel,
  #                                 relative, empty string; blocks the
  #                                 dangerous set.
  #   - ::strict(url)             — http / https / mailto only (plus
  #                                 relative / empty).
  #   - ::with_schemes(url, list) — configurable scheme allowlist.
  module SanitizeUrl
    CONTROL_CHARS = /[\x00-\x1f\x7f]/
    DANGEROUS_SCHEME = /\A(javascript|data|vbscript|blob)\s*:/i
    SCHEME_MATCH = /\A([a-zA-Z][a-zA-Z0-9+\-.]*)\s*:/
    SAFE_FALLBACK = "about:blank"
    DEFAULT_SCHEMES = %w[http https].freeze
    STRICT_SCHEMES = %w[http https mailto].freeze

    # Returns +url+ unchanged if safe, or +SAFE_FALLBACK+ if dangerous.
    def self.call(url)
      return url if url.nil? || url.empty?

      normalized = url.gsub(CONTROL_CHARS, "").strip
      return SAFE_FALLBACK if DANGEROUS_SCHEME.match?(normalized)

      url
    end

    # Strict variant — permits only http / https / mailto (plus relative
    # URLs and empty). Intended for non-author-tier links where the
    # caller has not verified the scheme is a developer-intended one.
    def self.strict(url)
      with_schemes(url, STRICT_SCHEMES)
    end

    # Sanitize +url+ against a configurable scheme allowlist.
    #
    # Runs the dangerous-scheme blocklist first (defence-in-depth:
    # +javascript:+ is blocked even when it appears in the allowlist).
    # Relative URLs pass through unchanged regardless of the allowlist.
    # Default +allowed_schemes+ is +DEFAULT_SCHEMES+ (http / https).
    def self.with_schemes(url, allowed_schemes = nil)
      base = call(url)
      return base if base == SAFE_FALLBACK
      return base if base.nil? || base.empty?

      schemes = allowed_schemes || DEFAULT_SCHEMES

      normalized = base.gsub(CONTROL_CHARS, "").strip
      match = SCHEME_MATCH.match(normalized)
      if match
        scheme = match[1].downcase
        return SAFE_FALLBACK unless schemes.include?(scheme)
      end

      base
    end
  end
end
