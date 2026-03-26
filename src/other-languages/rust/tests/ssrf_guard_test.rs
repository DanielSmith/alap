// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

use alap_core::is_private_host;

// --- Public addresses (should return false) ---

#[test]
fn public_ip_returns_false() {
    assert!(!is_private_host("http://8.8.8.8/path"));
}

#[test]
fn public_domain_returns_false() {
    assert!(!is_private_host("https://example.com"));
}

// --- Localhost variants (should return true) ---

#[test]
fn localhost_returns_true() {
    assert!(is_private_host("http://localhost/"));
}

#[test]
fn localhost_with_port() {
    assert!(is_private_host("http://localhost:3000/"));
}

#[test]
fn subdomain_of_localhost() {
    assert!(is_private_host("http://api.localhost/"));
}

// --- Private IPv4 ranges (should return true) ---

#[test]
fn loopback_127x() {
    assert!(is_private_host("http://127.0.0.1/"));
}

#[test]
fn private_10x() {
    assert!(is_private_host("http://10.0.0.1/"));
}

#[test]
fn private_172_16x() {
    assert!(is_private_host("http://172.16.0.1/"));
}

#[test]
fn private_192_168x() {
    assert!(is_private_host("http://192.168.1.1/"));
}

#[test]
fn cloud_metadata_169_254x() {
    assert!(is_private_host("http://169.254.169.254/latest/"));
}

// --- IPv6 (should return true) ---

#[test]
fn ipv6_loopback() {
    assert!(is_private_host("http://[::1]/"));
}

// --- Malformed (should return true — fail closed) ---

#[test]
fn malformed_url_returns_true() {
    assert!(is_private_host("not a url"));
}

// --- IPv4-mapped IPv6 ---

#[test]
fn ipv4_mapped_ipv6_loopback() {
    assert!(is_private_host("http://[::ffff:127.0.0.1]/"));
}

#[test]
fn ipv4_mapped_ipv6_private() {
    assert!(is_private_host("http://[::ffff:10.0.0.1]/"));
}

// --- 0.0.0.0 bypass ---

#[test]
fn zero_address() {
    assert!(is_private_host("http://0.0.0.0/"));
    assert!(is_private_host("http://0.0.0.0:8080/"));
}

// --- Obfuscated IP encodings ---

#[test]
fn hex_ip_blocked() {
    assert!(is_private_host("http://0x7f.0.0.1/"));
}

#[test]
fn octal_ip_blocked() {
    assert!(is_private_host("http://0177.0.0.1/"));
}

#[test]
fn bare_integer_ip_blocked() {
    assert!(is_private_host("http://2130706433/"));
}
