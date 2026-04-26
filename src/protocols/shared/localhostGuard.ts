/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Decides whether a host is loopback-only. Used by protocols that may
 * skip TLS verification (e.g. Obsidian's self-signed cert on 127.0.0.1):
 * relaxing certificate checks is acceptable for localhost but never for
 * remote hosts.
 */

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);

/**
 * Loopback prefix for IPv4 (127.0.0.0/8) — any 127.x.x.x address.
 */
const LOOPBACK_V4_PREFIX = '127.';

/**
 * Return true iff `host` resolves to a loopback address without DNS:
 * literal "localhost", any 127.x.x.x, or the IPv6 ::1.
 *
 * Case-insensitive. Accepts hosts with or without square brackets.
 */
export const isLocalhost = (host: string | undefined | null): boolean => {
  if (!host) return false;
  const h = host.trim().toLowerCase();
  if (!h) return false;
  if (LOOPBACK_HOSTS.has(h)) return true;
  if (h.startsWith(LOOPBACK_V4_PREFIX)) return true;
  return false;
};
