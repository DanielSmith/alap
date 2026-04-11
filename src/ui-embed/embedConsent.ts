/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Per-domain embed consent tracking via localStorage.
 * Three policies control embed loading behavior:
 *   - 'block'  — never load, ignores stored consent
 *   - 'allow'  — always load for allowlisted domains
 *   - 'prompt' — load only if the user has granted consent for the domain
 */

import { EMBED_CONSENT_KEY } from '../constants';

export type EmbedPolicy = 'prompt' | 'allow' | 'block';

/**
 * Read the consent set from localStorage.
 * Returns an empty set if storage is unavailable or corrupted.
 */
function readConsentSet(): Set<string> {
  try {
    const raw = localStorage.getItem(EMBED_CONSENT_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

/**
 * Write the consent set to localStorage.
 */
function writeConsentSet(domains: Set<string>): void {
  try {
    localStorage.setItem(EMBED_CONSENT_KEY, JSON.stringify([...domains]));
  } catch {
    // localStorage may be full or disabled — fail silently
  }
}

/**
 * Check whether an embed should be loaded for the given domain and policy.
 *
 * - 'block'  → always false
 * - 'allow'  → always true (caller should verify the domain is allowlisted first)
 * - 'prompt' → true only if the user has previously granted consent
 */
export function shouldLoadEmbed(domain: string, policy: EmbedPolicy): boolean {
  if (policy === 'block') return false;
  if (policy === 'allow') return true;
  return hasConsent(domain);
}

/**
 * Grant persistent consent for a domain.
 */
export function grantConsent(domain: string): void {
  const domains = readConsentSet();
  domains.add(domain.toLowerCase());
  writeConsentSet(domains);
}

/**
 * Revoke consent for a domain.
 */
export function revokeConsent(domain: string): void {
  const domains = readConsentSet();
  domains.delete(domain.toLowerCase());
  writeConsentSet(domains);
}

/**
 * Check if the user has previously granted consent for a domain.
 */
export function hasConsent(domain: string): boolean {
  const domains = readConsentSet();
  return domains.has(domain.toLowerCase());
}
