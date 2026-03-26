/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * SSRF (Server-Side Request Forgery) guard for server-side contexts.
 *
 * When :web: protocol runs in Node/Bun (AOT baker, SSR), fetch requests
 * originate from the server's network. A malicious config could target
 * internal services or cloud metadata endpoints. This utility blocks
 * requests to private/reserved IP ranges.
 *
 * Browser-side usage does not need this — CORS provides equivalent protection.
 *
 * Usage (in server-side entrypoints):
 *
 *   import { isPrivateHost } from './ssrf-guard';
 *
 *   if (isPrivateHost(url)) {
 *     // reject the request
 *   }
 */

/**
 * Private and reserved IPv4 CIDR ranges.
 * Each entry is [networkAddress, prefixBits].
 */
const PRIVATE_RANGES: [number, number][] = [
  [ipToNum('127.0.0.0'), 8],     // Loopback
  [ipToNum('10.0.0.0'), 8],      // RFC 1918
  [ipToNum('172.16.0.0'), 12],   // RFC 1918
  [ipToNum('192.168.0.0'), 16],  // RFC 1918
  [ipToNum('169.254.0.0'), 16],  // Link-local / cloud metadata
  [ipToNum('0.0.0.0'), 8],       // "This" network
  [ipToNum('100.64.0.0'), 10],   // Shared address space (CGN)
  [ipToNum('192.0.0.0'), 24],    // IETF protocol assignments
  [ipToNum('192.0.2.0'), 24],    // Documentation (TEST-NET-1)
  [ipToNum('198.51.100.0'), 24], // Documentation (TEST-NET-2)
  [ipToNum('203.0.113.0'), 24],  // Documentation (TEST-NET-3)
  [ipToNum('224.0.0.0'), 4],     // Multicast
  [ipToNum('240.0.0.0'), 4],     // Reserved
];

/** Convert dotted IPv4 string to a 32-bit number. */
function ipToNum(ip: string): number {
  const parts = ip.split('.');
  return ((+parts[0]) << 24 | (+parts[1]) << 16 | (+parts[2]) << 8 | (+parts[3])) >>> 0;
}

/** Check if an IPv4 address falls within any private/reserved range. */
function isPrivateIPv4(ip: string): boolean {
  const num = ipToNum(ip);
  for (const [network, prefix] of PRIVATE_RANGES) {
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    if ((num & mask) === (network & mask)) return true;
  }
  return false;
}

/** IPv6 loopback and link-local patterns. */
const IPV6_PRIVATE_RE = /^(::1|fe80:|fc00:|fd00:|::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.))/i;

/**
 * Check if a URL's hostname resolves to a private or reserved address.
 *
 * This is a **syntactic** check — it inspects the hostname string, not DNS.
 * It catches direct IP usage (e.g., `http://169.254.169.254/`) and known
 * private patterns. It does NOT protect against DNS rebinding attacks where
 * a public hostname resolves to a private IP.
 *
 * For full protection, combine with DNS resolution validation at the
 * network layer (e.g., a custom fetch agent that checks resolved IPs).
 */
export function isPrivateHost(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return true; // Malformed URLs are rejected
  }

  // Strip IPv6 brackets
  const clean = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;

  // localhost variants
  if (clean === 'localhost' || clean.endsWith('.localhost')) return true;

  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) {
    return isPrivateIPv4(clean);
  }

  // IPv6
  if (IPV6_PRIVATE_RE.test(clean)) return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x) — already covered by regex above

  return false;
}
