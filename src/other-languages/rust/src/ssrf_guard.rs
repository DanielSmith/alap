// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

//! SSRF (Server-Side Request Forgery) guard for server-side contexts.
//!
//! When the `:web:` protocol runs server-side, fetch requests originate from
//! the server's network. A malicious config could target internal services or
//! cloud metadata endpoints. This module blocks requests to private/reserved
//! IP ranges.
//!
//! This is a **syntactic** check — it inspects the hostname string, not DNS.

/// Private and reserved IPv4 CIDR ranges: `(network_address, prefix_bits)`.
const PRIVATE_RANGES: [(u32, u32); 13] = [
    (ip_to_num(127, 0, 0, 0), 8),     // Loopback
    (ip_to_num(10, 0, 0, 0), 8),      // RFC 1918
    (ip_to_num(172, 16, 0, 0), 12),   // RFC 1918
    (ip_to_num(192, 168, 0, 0), 16),  // RFC 1918
    (ip_to_num(169, 254, 0, 0), 16),  // Link-local / cloud metadata
    (ip_to_num(0, 0, 0, 0), 8),       // "This" network
    (ip_to_num(100, 64, 0, 0), 10),   // Shared address space (CGN)
    (ip_to_num(192, 0, 0, 0), 24),    // IETF protocol assignments
    (ip_to_num(192, 0, 2, 0), 24),    // Documentation (TEST-NET-1)
    (ip_to_num(198, 51, 100, 0), 24), // Documentation (TEST-NET-2)
    (ip_to_num(203, 0, 113, 0), 24),  // Documentation (TEST-NET-3)
    (ip_to_num(224, 0, 0, 0), 4),     // Multicast
    (ip_to_num(240, 0, 0, 0), 4),     // Reserved
];

/// Convert four IPv4 octets to a 32-bit number (const-compatible).
const fn ip_to_num(a: u32, b: u32, c: u32, d: u32) -> u32 {
    (a << 24) | (b << 16) | (c << 8) | d
}

/// Parse a dotted-decimal IPv4 string into a 32-bit number.
fn parse_ipv4(ip: &str) -> Option<u32> {
    let mut parts = ip.splitn(4, '.');
    let a = parts.next()?.parse::<u32>().ok()?;
    let b = parts.next()?.parse::<u32>().ok()?;
    let c = parts.next()?.parse::<u32>().ok()?;
    let d = parts.next()?.parse::<u32>().ok()?;
    if a > 255 || b > 255 || c > 255 || d > 255 {
        return None;
    }
    Some(ip_to_num(a, b, c, d))
}

/// Check if a dotted-decimal IPv4 address is in `PRIVATE_RANGES`.
fn is_private_ipv4(ip: &str) -> bool {
    let Some(num) = parse_ipv4(ip) else {
        return true; // unparseable → fail closed
    };
    for &(network, prefix) in &PRIVATE_RANGES {
        let mask = if prefix == 0 {
            0
        } else {
            0xFFFF_FFFF_u32 << (32 - prefix)
        };
        if (num & mask) == (network & mask) {
            return true;
        }
    }
    false
}

/// Returns true if `s` looks like a dotted-decimal IPv4 address.
fn looks_like_ipv4(s: &str) -> bool {
    let mut dots = 0;
    for ch in s.chars() {
        if ch == '.' {
            dots += 1;
        } else if !ch.is_ascii_digit() {
            return false;
        }
    }
    dots == 3
}

/// Returns `true` if the hostname looks like an obfuscated IP address
/// (hex octets like `0x7f.0.0.1`, octal like `0177.0.0.1`, or a bare
/// integer like `2130706433`). These bypass dotted-decimal parsing but
/// resolve to real IPs in browsers and HTTP clients.
fn looks_like_obfuscated_ip(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }

    // Bare integer (e.g., 2130706433 = 127.0.0.1)
    if s.chars().all(|c| c.is_ascii_digit()) && s.len() > 3 {
        return true;
    }

    // Hex octets: contains 0x (e.g., 0x7f.0.0.1)
    let lower = s.to_ascii_lowercase();
    if lower.contains("0x") && s.chars().all(|c| c.is_ascii_hexdigit() || c == '.' || c == 'x' || c == 'X') {
        return true;
    }

    // Octal: dotted format where any octet has a leading zero (e.g., 0177.0.0.1)
    // but not "0" itself
    if looks_like_ipv4(s) {
        for octet in s.split('.') {
            if octet.len() > 1 && octet.starts_with('0') {
                return true;
            }
        }
    }

    false
}

/// Extract the hostname from a URL string without a URL-parsing crate.
///
/// Looks for `://`, then takes everything up to the next `/`, `?`, `#`, or
/// end-of-string. Port suffixes (`:1234`) are stripped. Returns `None` for
/// malformed URLs (no `://` found).
fn extract_hostname(url: &str) -> Option<&str> {
    let after_scheme = url.find("://").map(|i| &url[i + 3..])?;

    // Skip optional userinfo (user:pass@)
    let after_userinfo = if let Some(at) = after_scheme.find('@') {
        let before_at = &after_scheme[..at];
        // Only treat as userinfo if there's no `/` before the `@`
        if !before_at.contains('/') {
            &after_scheme[at + 1..]
        } else {
            after_scheme
        }
    } else {
        after_scheme
    };

    // Find end of authority
    let end = after_userinfo
        .find(['/', '?', '#'])
        .unwrap_or(after_userinfo.len());
    let authority = &after_userinfo[..end];

    // Handle IPv6 bracket notation — port comes after the closing bracket
    if authority.starts_with('[') {
        let bracket_end = authority.find(']')?;
        return Some(&authority[..bracket_end + 1]);
    }

    // Strip port for non-bracketed hosts
    match authority.rfind(':') {
        Some(colon) => Some(&authority[..colon]),
        None => Some(authority),
    }
}

/// Check if a URL targets a private or reserved network address.
///
/// Returns `true` (fail closed) for malformed URLs, localhost, private IPv4
/// ranges, and private IPv6 patterns. This is a syntactic check — it does not
/// resolve DNS.
#[must_use]
pub fn is_private_host(url: &str) -> bool {
    let Some(raw_host) = extract_hostname(url) else {
        return true; // malformed → fail closed
    };

    if raw_host.is_empty() {
        return true; // no hostname → fail closed
    }

    // Strip IPv6 brackets
    let clean = if raw_host.starts_with('[') && raw_host.ends_with(']') {
        &raw_host[1..raw_host.len() - 1]
    } else {
        raw_host
    };

    // Localhost variants
    if clean.eq_ignore_ascii_case("localhost")
        || clean
            .to_ascii_lowercase()
            .ends_with(".localhost")
    {
        return true;
    }

    // Reject non-standard IP encodings (hex, octal, integer) that could
    // bypass the dotted-decimal parser. If a hostname contains only hex
    // digits, dots, and 'x' characters, or is a bare integer, treat it
    // as suspicious and block it.
    if looks_like_obfuscated_ip(clean) {
        return true;
    }

    // IPv4
    if looks_like_ipv4(clean) {
        return is_private_ipv4(clean);
    }

    // IPv6 patterns
    let lower = clean.to_ascii_lowercase();
    if lower == "::1"
        || lower.starts_with("fe80:")
        || lower.starts_with("fc00:")
        || lower.starts_with("fd00:")
    {
        return true;
    }

    // IPv4-mapped IPv6  (::ffff:x.x.x.x)
    if let Some(mapped) = lower.strip_prefix("::ffff:") {
        if looks_like_ipv4(mapped) {
            return is_private_ipv4(mapped);
        }
        // Non-dotted mapped form — treat as private conservatively
        return true;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Helpers ──────────────────────────────────────────────────────

    #[test]
    fn ip_to_num_basic() {
        assert_eq!(ip_to_num(127, 0, 0, 1), 0x7F00_0001);
        assert_eq!(ip_to_num(192, 168, 1, 1), 0xC0A8_0101);
    }

    // ── Malformed / missing ─────────────────────────────────────────

    #[test]
    fn malformed_url_returns_true() {
        assert!(is_private_host("not-a-url"));
        assert!(is_private_host(""));
        assert!(is_private_host("://"));
    }

    // ── Localhost ───────────────────────────────────────────────────

    #[test]
    fn localhost_variants() {
        assert!(is_private_host("http://localhost/path"));
        assert!(is_private_host("http://LOCALHOST/path"));
        assert!(is_private_host("http://foo.localhost/path"));
        assert!(is_private_host("http://sub.foo.localhost"));
    }

    // ── IPv4 private ranges ────────────────────────────────────────

    #[test]
    fn ipv4_loopback() {
        assert!(is_private_host("http://127.0.0.1/"));
        assert!(is_private_host("http://127.255.255.255/"));
    }

    #[test]
    fn ipv4_rfc1918() {
        assert!(is_private_host("http://10.0.0.1/"));
        assert!(is_private_host("http://172.16.0.1/"));
        assert!(is_private_host("http://172.31.255.255/"));
        assert!(is_private_host("http://192.168.0.1/"));
        assert!(is_private_host("http://192.168.255.255/"));
    }

    #[test]
    fn ipv4_link_local() {
        assert!(is_private_host("http://169.254.169.254/")); // cloud metadata
    }

    #[test]
    fn ipv4_other_reserved() {
        assert!(is_private_host("http://0.0.0.0/"));
        assert!(is_private_host("http://100.64.0.1/"));
        assert!(is_private_host("http://192.0.0.1/"));
        assert!(is_private_host("http://192.0.2.1/"));
        assert!(is_private_host("http://198.51.100.1/"));
        assert!(is_private_host("http://203.0.113.1/"));
        assert!(is_private_host("http://224.0.0.1/"));   // multicast
        assert!(is_private_host("http://240.0.0.1/"));   // reserved
    }

    #[test]
    fn ipv4_public_is_ok() {
        assert!(!is_private_host("http://8.8.8.8/"));
        assert!(!is_private_host("http://1.1.1.1/"));
        assert!(!is_private_host("http://93.184.216.34/")); // example.com
    }

    #[test]
    fn ipv4_172_outside_range() {
        // 172.32.0.0 is outside the 172.16.0.0/12 block
        assert!(!is_private_host("http://172.32.0.1/"));
    }

    // ── IPv6 ───────────────────────────────────────────────────────

    #[test]
    fn ipv6_loopback() {
        assert!(is_private_host("http://[::1]/"));
    }

    #[test]
    fn ipv6_link_local_and_private() {
        assert!(is_private_host("http://[fe80::1]/path"));
        assert!(is_private_host("http://[fc00::1]/"));
        assert!(is_private_host("http://[fd00::1]/"));
    }

    #[test]
    fn ipv6_mapped_ipv4() {
        assert!(is_private_host("http://[::ffff:127.0.0.1]/"));
        assert!(is_private_host("http://[::ffff:10.0.0.1]/"));
        assert!(is_private_host("http://[::ffff:192.168.1.1]/"));
        assert!(!is_private_host("http://[::ffff:8.8.8.8]/"));
    }

    // ── Public hostnames ───────────────────────────────────────────

    #[test]
    fn public_hostnames_pass() {
        assert!(!is_private_host("https://example.com/path"));
        assert!(!is_private_host("https://sub.example.com/path?q=1"));
        assert!(!is_private_host("https://example.com:8080/path"));
    }

    // ── URL with port ──────────────────────────────────────────────

    #[test]
    fn strips_port() {
        assert!(is_private_host("http://127.0.0.1:8080/"));
        assert!(!is_private_host("http://8.8.8.8:53/"));
    }

    // ── extract_hostname edge cases ────────────────────────────────

    #[test]
    fn hostname_with_userinfo() {
        assert!(is_private_host("http://user:pass@127.0.0.1/"));
    }

    // ── Obfuscated IP encodings ──────────────────────────────────

    #[test]
    fn hex_ip_blocked() {
        assert!(is_private_host("http://0x7f.0.0.1/"));
        assert!(is_private_host("http://0x7f000001/"));
    }

    #[test]
    fn octal_ip_blocked() {
        assert!(is_private_host("http://0177.0.0.1/"));
    }

    #[test]
    fn bare_integer_ip_blocked() {
        assert!(is_private_host("http://2130706433/")); // 127.0.0.1
    }

    #[test]
    fn zero_zero_zero_zero() {
        assert!(is_private_host("http://0.0.0.0/"));
        assert!(is_private_host("http://0.0.0.0:8080/"));
    }

    #[test]
    fn hostname_no_trailing_slash() {
        assert!(!is_private_host("http://example.com"));
        assert!(is_private_host("http://localhost"));
    }
}
