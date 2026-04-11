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

import { describe, it, expect, beforeEach } from 'vitest';
import { shouldLoadEmbed, grantConsent, revokeConsent, hasConsent } from '../../../src/ui-embed/embedConsent';
import { EMBED_CONSENT_KEY } from '../../../src/constants';

beforeEach(() => {
  localStorage.clear();
});

// ── shouldLoadEmbed ────────────────────────────────────────────────

describe('shouldLoadEmbed', () => {
  it('returns false for block policy regardless of consent', () => {
    grantConsent('youtube.com');
    expect(shouldLoadEmbed('youtube.com', 'block')).toBe(false);
  });

  it('returns true for allow policy without consent', () => {
    expect(shouldLoadEmbed('youtube.com', 'allow')).toBe(true);
  });

  it('returns true for allow policy with consent', () => {
    grantConsent('youtube.com');
    expect(shouldLoadEmbed('youtube.com', 'allow')).toBe(true);
  });

  it('returns false for prompt policy without consent', () => {
    expect(shouldLoadEmbed('youtube.com', 'prompt')).toBe(false);
  });

  it('returns true for prompt policy with consent', () => {
    grantConsent('youtube.com');
    expect(shouldLoadEmbed('youtube.com', 'prompt')).toBe(true);
  });
});

// ── grantConsent / hasConsent ──────────────────────────────────────

describe('grantConsent and hasConsent', () => {
  it('grants consent for a domain', () => {
    grantConsent('youtube.com');
    expect(hasConsent('youtube.com')).toBe(true);
  });

  it('returns false for domains without consent', () => {
    expect(hasConsent('vimeo.com')).toBe(false);
  });

  it('handles multiple domains independently', () => {
    grantConsent('youtube.com');
    grantConsent('vimeo.com');
    expect(hasConsent('youtube.com')).toBe(true);
    expect(hasConsent('vimeo.com')).toBe(true);
    expect(hasConsent('spotify.com')).toBe(false);
  });

  it('normalizes domain to lowercase', () => {
    grantConsent('YouTube.COM');
    expect(hasConsent('youtube.com')).toBe(true);
  });

  it('is idempotent — granting twice does not duplicate', () => {
    grantConsent('youtube.com');
    grantConsent('youtube.com');
    const stored = JSON.parse(localStorage.getItem(EMBED_CONSENT_KEY) ?? '[]');
    expect(stored.filter((d: string) => d === 'youtube.com').length).toBe(1);
  });
});

// ── revokeConsent ──────────────────────────────────────────────────

describe('revokeConsent', () => {
  it('revokes previously granted consent', () => {
    grantConsent('youtube.com');
    expect(hasConsent('youtube.com')).toBe(true);
    revokeConsent('youtube.com');
    expect(hasConsent('youtube.com')).toBe(false);
  });

  it('does not affect other domains', () => {
    grantConsent('youtube.com');
    grantConsent('vimeo.com');
    revokeConsent('youtube.com');
    expect(hasConsent('vimeo.com')).toBe(true);
  });

  it('is safe to revoke a domain that was never granted', () => {
    revokeConsent('unknown.com');
    expect(hasConsent('unknown.com')).toBe(false);
  });
});

// ── localStorage edge cases ────────────────────────────────────────

describe('localStorage resilience', () => {
  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(EMBED_CONSENT_KEY, 'not json');
    expect(hasConsent('youtube.com')).toBe(false);
    // Should still be able to grant after corruption
    grantConsent('youtube.com');
    expect(hasConsent('youtube.com')).toBe(true);
  });

  it('handles non-array JSON in localStorage', () => {
    localStorage.setItem(EMBED_CONSENT_KEY, '{"youtube.com": true}');
    expect(hasConsent('youtube.com')).toBe(false);
  });

  it('filters non-string values in stored array', () => {
    localStorage.setItem(EMBED_CONSENT_KEY, '["youtube.com", 42, null, "vimeo.com"]');
    expect(hasConsent('youtube.com')).toBe(true);
    expect(hasConsent('vimeo.com')).toBe(true);
  });
});
