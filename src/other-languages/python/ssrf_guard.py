# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""
SSRF (Server-Side Request Forgery) guard — Python port of src/protocols/ssrf-guard.ts.

When the :web: protocol runs in a server-side context (AOT baker, SSR),
fetch requests originate from the server's network.  A malicious config
could target internal services or cloud metadata endpoints.  This utility
blocks requests to private/reserved IP ranges.

Browser-side usage does not need this — CORS provides equivalent protection.

This is a **syntactic** check — it inspects the hostname string, not DNS.
It catches direct IP usage (e.g. ``http://169.254.169.254/``) and known
private patterns.  It does NOT protect against DNS rebinding attacks where
a public hostname resolves to a private IP.

For full protection, combine with DNS resolution validation at the
network layer.
"""

from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

# Ranges that Python's ipaddress module does not flag via its boolean
# properties but the TypeScript original blocks.
_EXTRA_PRIVATE_RANGES = (
    ipaddress.IPv4Network("0.0.0.0/8"),     # "This" network
    ipaddress.IPv4Network("100.64.0.0/10"),  # Shared / CGN (RFC 6598)
)


def is_private_host(url: str) -> bool:
    """Return ``True`` if *url* targets a private, reserved, or loopback host.

    Malformed URLs return ``True`` (fail closed).
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname  # already lowercased, brackets stripped
    except Exception:
        return True  # Malformed → reject

    if not hostname:
        return True  # No hostname → reject

    # Strip IPv6 brackets (urlparse normally handles this, but be safe).
    if hostname.startswith("[") and hostname.endswith("]"):
        hostname = hostname[1:-1]

    # --- localhost variants ---
    if hostname == "localhost" or hostname.endswith(".localhost"):
        return True

    # --- Try parsing as an IP address ---
    try:
        addr = ipaddress.ip_address(hostname)
    except ValueError:
        # Not an IP literal — a regular domain name.
        return False

    # --- IPv6 handling ---
    if isinstance(addr, ipaddress.IPv6Address):
        # Check IPv4-mapped addresses (::ffff:x.x.x.x).
        mapped = addr.ipv4_mapped
        if mapped is not None:
            return _is_private_ipv4(mapped)
        return (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
        )

    # --- IPv4 handling ---
    return _is_private_ipv4(addr)


def _is_private_ipv4(addr: ipaddress.IPv4Address) -> bool:
    """Check an IPv4 address against all private/reserved categories.

    Explicitly checks extra ranges (0.0.0.0/8, 100.64.0.0/10) that
    ``ipaddress`` does not flag via its boolean properties.
    """
    for network in _EXTRA_PRIVATE_RANGES:
        if addr in network:
            return True
    return (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
    )
