import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ssrf_guard import is_private_host


# ---------------------------------------------------------------------------
# Public hosts (should return False)
# ---------------------------------------------------------------------------

def test_public_ip():
    assert is_private_host("https://8.8.8.8/path") is False


def test_public_domain():
    assert is_private_host("https://example.com") is False


# ---------------------------------------------------------------------------
# Localhost variants (should return True)
# ---------------------------------------------------------------------------

def test_localhost():
    assert is_private_host("http://localhost/admin") is True


def test_localhost_with_port():
    assert is_private_host("http://localhost:8080") is True


def test_subdomain_of_localhost():
    assert is_private_host("http://foo.localhost/bar") is True


# ---------------------------------------------------------------------------
# Private IPv4 ranges (should return True)
# ---------------------------------------------------------------------------

def test_loopback_127():
    assert is_private_host("http://127.0.0.1") is True


def test_private_10():
    assert is_private_host("http://10.0.0.1") is True


def test_private_172_16():
    assert is_private_host("http://172.16.0.1") is True


def test_private_192_168():
    assert is_private_host("http://192.168.1.1") is True


def test_link_local_169_254():
    assert is_private_host("http://169.254.169.254/latest/meta-data") is True


# ---------------------------------------------------------------------------
# IPv6 (should return True)
# ---------------------------------------------------------------------------

def test_ipv6_loopback():
    assert is_private_host("http://[::1]/admin") is True


# ---------------------------------------------------------------------------
# Malformed URL (fail closed → True)
# ---------------------------------------------------------------------------

def test_malformed_url():
    assert is_private_host("not a url at all") is True


# ---------------------------------------------------------------------------
# IPv4-mapped IPv6 addresses (should return True)
# ---------------------------------------------------------------------------

def test_ipv4_mapped_ipv6_loopback():
    assert is_private_host("http://[::ffff:127.0.0.1]") is True


def test_ipv4_mapped_ipv6_private_10():
    assert is_private_host("http://[::ffff:10.0.0.1]") is True


# ---------------------------------------------------------------------------
# 0.0.0.0 bypass
# ---------------------------------------------------------------------------

def test_zero_address():
    assert is_private_host("http://0.0.0.0/") is True


def test_zero_address_with_port():
    assert is_private_host("http://0.0.0.0:8080/") is True
