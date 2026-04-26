# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "minitest/autorun"
require_relative "../lib/alap"

class TestSsrfGuard < Minitest::Test
  # Public IPs should be allowed
  def test_public_ips_allowed
    refute Alap::SsrfGuard.private_host?("https://8.8.8.8/path")
    refute Alap::SsrfGuard.private_host?("https://1.1.1.1")
    refute Alap::SsrfGuard.private_host?("https://93.184.216.34")
  end

  # Public domains should be allowed
  def test_public_domains_allowed
    refute Alap::SsrfGuard.private_host?("https://example.com")
    refute Alap::SsrfGuard.private_host?("https://google.com/search")
  end

  # Localhost variants blocked
  def test_localhost_blocked
    assert Alap::SsrfGuard.private_host?("http://localhost")
    assert Alap::SsrfGuard.private_host?("http://localhost:3000")
    assert Alap::SsrfGuard.private_host?("http://foo.localhost")
    assert Alap::SsrfGuard.private_host?("http://127.0.0.1")
    assert Alap::SsrfGuard.private_host?("http://127.0.0.1:8080")
  end

  # Private IPv4 ranges blocked
  def test_private_ipv4_blocked
    assert Alap::SsrfGuard.private_host?("http://10.0.0.1")
    assert Alap::SsrfGuard.private_host?("http://172.16.0.1")
    assert Alap::SsrfGuard.private_host?("http://192.168.1.1")
    assert Alap::SsrfGuard.private_host?("http://169.254.169.254")  # AWS metadata
  end

  # 0.0.0.0/8 blocked
  def test_zero_network_blocked
    assert Alap::SsrfGuard.private_host?("http://0.0.0.0")
    assert Alap::SsrfGuard.private_host?("http://0.1.2.3")
  end

  # CGN / shared range blocked
  def test_cgn_blocked
    assert Alap::SsrfGuard.private_host?("http://100.64.0.1")
    assert Alap::SsrfGuard.private_host?("http://100.127.255.254")
  end

  # IPv6 loopback blocked
  def test_ipv6_loopback_blocked
    assert Alap::SsrfGuard.private_host?("http://[::1]")
  end

  # Malformed URLs fail closed
  def test_malformed_urls_blocked
    assert Alap::SsrfGuard.private_host?("")
    assert Alap::SsrfGuard.private_host?("not a url at all")
  end
end
