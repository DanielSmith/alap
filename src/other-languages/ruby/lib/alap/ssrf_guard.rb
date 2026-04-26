# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "ipaddr"
require "uri"

module Alap
  # SSRF (Server-Side Request Forgery) guard.
  #
  # Blocks requests to private/reserved IP ranges when the :web: protocol
  # runs in a server-side context (AOT baker, SSR).
  #
  # This is a syntactic check — it inspects the hostname string, not DNS.
  module SsrfGuard
    PRIVATE_RANGES = [
      IPAddr.new("10.0.0.0/8"),
      IPAddr.new("172.16.0.0/12"),
      IPAddr.new("192.168.0.0/16"),
      IPAddr.new("127.0.0.0/8"),
      IPAddr.new("169.254.0.0/16"),
      IPAddr.new("0.0.0.0/8"),
      IPAddr.new("100.64.0.0/10"),
      IPAddr.new("224.0.0.0/4"),     # multicast
      IPAddr.new("240.0.0.0/4"),     # reserved
      IPAddr.new("::1/128"),         # IPv6 loopback
      IPAddr.new("fe80::/10"),       # IPv6 link-local
      IPAddr.new("fc00::/7"),        # IPv6 unique local
      IPAddr.new("ff00::/8"),        # IPv6 multicast
    ].freeze

    # Returns +true+ if +url+ targets a private, reserved, or loopback host.
    # Malformed URLs return +true+ (fail closed).
    def self.private_host?(url)
      uri = URI.parse(url)
      hostname = uri.host
    rescue URI::InvalidURIError
      return true
    else
      return true if hostname.nil? || hostname.empty?

      # Strip IPv6 brackets
      hostname = hostname.delete_prefix("[").delete_suffix("]")

      # Localhost variants
      return true if hostname == "localhost" || hostname.end_with?(".localhost")

      # Try parsing as an IP address
      begin
        addr = IPAddr.new(hostname)
      rescue IPAddr::InvalidAddressError
        # Not an IP literal — regular domain name
        return false
      end

      # Check IPv4-mapped IPv6 (::ffff:x.x.x.x)
      if addr.ipv6? && addr.ipv4_mapped?
        addr = addr.native
      end

      PRIVATE_RANGES.any? { |range| range.include?(addr) }
    end
  end
end
