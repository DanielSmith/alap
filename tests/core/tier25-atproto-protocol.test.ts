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

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseAtUri,
  atUriToDestinations,
  atprotoHandler,
} from '../../src/protocols/atproto';
import type { AlapConfig } from '../../src/core/types';

/**
 * Tier 25: :atproto: protocol handler — AT URI parsing, destination
 * generation, API command handlers, auth plumbing, and error cases.
 */

const mockConfig = (overrides?: Record<string, unknown>): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: {
    atproto: { cache: 5, ...overrides },
  },
  allLinks: {},
});

const mockFetch = (data: unknown, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(data),
  });

const mockFetchError = (message: string) =>
  vi.fn().mockRejectedValue(new Error(message));

// ═══════════════════════════════════════════════════════════════
// Sample API responses
// ═══════════════════════════════════════════════════════════════

const sampleProfile = {
  did: 'did:plc:abc123',
  handle: 'eff.org',
  displayName: 'Electronic Frontier Foundation',
  avatar: 'https://cdn.bsky.app/img/avatar/eff.jpg',
  description: 'Fighting for digital rights',
  followersCount: 50000,
  followsCount: 200,
  postsCount: 4000,
};

const samplePost = {
  uri: 'at://did:plc:abc123/app.bsky.feed.post/3xyz789',
  author: {
    did: 'did:plc:abc123',
    handle: 'eff.org',
    displayName: 'EFF',
    avatar: 'https://cdn.bsky.app/img/avatar/eff.jpg',
  },
  record: {
    text: 'This is a post about digital rights and online freedom.',
    createdAt: '2026-03-28T12:00:00Z',
  },
  indexedAt: '2026-03-28T12:01:00Z',
};

const sampleFeed = {
  feed: [
    { post: samplePost },
    {
      post: {
        uri: 'at://did:plc:abc123/app.bsky.feed.post/3abc456',
        author: samplePost.author,
        record: { text: 'Another post', createdAt: '2026-03-27T10:00:00Z' },
        indexedAt: '2026-03-27T10:01:00Z',
      },
    },
  ],
};

const sampleActors = {
  actors: [
    sampleProfile,
    {
      did: 'did:plc:def456',
      handle: 'archive.org',
      displayName: 'Internet Archive',
      avatar: 'https://cdn.bsky.app/img/avatar/ia.jpg',
      description: 'Preserving the web',
      followersCount: 30000,
      followsCount: 100,
      postsCount: 1500,
    },
  ],
};

const sampleThread = {
  thread: { post: samplePost },
};

const sampleSearchPosts = {
  posts: [samplePost],
};

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('Tier 25: :atproto: Protocol Handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------
  // AT URI Parsing (pure, no mocking)
  // -----------------------------------------------------------

  describe('parseAtUri', () => {
    it('parses a post URI', () => {
      const result = parseAtUri('at://did:plc:abc123/app.bsky.feed.post/3xyz789');
      expect(result).toEqual({
        authority: 'did:plc:abc123',
        collection: 'app.bsky.feed.post',
        rkey: '3xyz789',
      });
    });

    it('parses a profile URI with handle', () => {
      const result = parseAtUri('at://pfrazee.com/app.bsky.actor.profile/self');
      expect(result).toEqual({
        authority: 'pfrazee.com',
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
      });
    });

    it('parses a bare authority (profile shorthand)', () => {
      const result = parseAtUri('at://eff.org');
      expect(result).toEqual({
        authority: 'eff.org',
        collection: undefined,
        rkey: undefined,
      });
    });

    it('parses authority with collection but no rkey', () => {
      const result = parseAtUri('at://did:plc:abc123/app.bsky.feed.post');
      expect(result).toEqual({
        authority: 'did:plc:abc123',
        collection: 'app.bsky.feed.post',
        rkey: undefined,
      });
    });

    it('returns null for non-at:// URIs', () => {
      expect(parseAtUri('https://bsky.app/profile/eff.org')).toBeNull();
      expect(parseAtUri('http://example.com')).toBeNull();
      expect(parseAtUri('')).toBeNull();
    });

    it('returns null for at:// with empty path', () => {
      expect(parseAtUri('at://')).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // Destination generation (pure, no mocking)
  // -----------------------------------------------------------

  describe('atUriToDestinations', () => {
    it('generates post destinations with client, devtool, and raw', () => {
      const links = atUriToDestinations({
        authority: 'did:plc:abc123',
        collection: 'app.bsky.feed.post',
        rkey: '3xyz789',
      });

      expect(links).toHaveLength(3);
      expect(links[0].url).toContain('bsky.app/profile/did:plc:abc123/post/3xyz789');
      expect(links[0].tags).toContain('client');
      expect(links[1].url).toContain('pdsls.dev');
      expect(links[1].tags).toContain('devtool');
      expect(links[2].url).toContain('getPostThread');
      expect(links[2].tags).toContain('raw');
    });

    it('generates profile destinations for bare authority', () => {
      const links = atUriToDestinations({ authority: 'eff.org' });

      expect(links).toHaveLength(3);
      expect(links[0].url).toContain('bsky.app/profile/eff.org');
      expect(links[1].url).toContain('pdsls.dev/at/eff.org');
      expect(links[2].url).toContain('getProfile?actor=eff.org');
    });

    it('generates profile destinations for explicit profile collection', () => {
      const links = atUriToDestinations({
        authority: 'pfrazee.com',
        collection: 'app.bsky.actor.profile',
      });

      expect(links).toHaveLength(3);
      expect(links[0].url).toContain('bsky.app/profile/pfrazee.com');
    });

    it('generates generic destinations for unknown collections', () => {
      const links = atUriToDestinations({
        authority: 'did:plc:abc123',
        collection: 'app.bsky.graph.follow',
        rkey: 'xyz',
      });

      expect(links).toHaveLength(2);
      expect(links[0].tags).toContain('devtool');
      expect(links[1].tags).toContain('raw');
      expect(links[1].url).toContain('getRecord');
    });
  });

  // -----------------------------------------------------------
  // Profile handler
  // -----------------------------------------------------------

  describe('profile command', () => {
    it('returns Option of Choice: bsky, pdsls, and raw JSON', async () => {
      globalThis.fetch = mockFetch(sampleProfile);
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());

      expect(links).toHaveLength(3);

      // Bluesky client
      expect(links[0].label).toBe('Electronic Frontier Foundation — Bluesky');
      expect(links[0].url).toContain('bsky.app/profile/eff.org');
      expect(links[0].description).toBe('Fighting for digital rights');
      expect(links[0].thumbnail).toContain('avatar');
      expect(links[0].tags).toContain('client');
      expect(links[0].meta?.handle).toBe('eff.org');
      expect(links[0].meta?.did).toBe('did:plc:abc123');
      expect(links[0].meta?.followers).toBe(50000);

      // pdsls.dev inspector
      expect(links[1].label).toBe('Electronic Frontier Foundation — pdsls.dev inspector');
      expect(links[1].url).toContain('pdsls.dev');
      expect(links[1].tags).toContain('devtool');

      // Raw JSON
      expect(links[2].label).toBe('Electronic Frontier Foundation — raw JSON');
      expect(links[2].url).toContain('getProfile');
      expect(links[2].tags).toContain('raw');
    });

    it('falls back to handle when displayName is missing', async () => {
      globalThis.fetch = mockFetch({ ...sampleProfile, displayName: undefined });
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());

      expect(links[0].label).toBe('eff.org — Bluesky');
    });

    it('returns empty for missing actor', async () => {
      const links = await atprotoHandler(['profile'], mockConfig());
      expect(links).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Feed handler
  // -----------------------------------------------------------

  describe('feed command', () => {
    it('fetches and maps a feed', async () => {
      globalThis.fetch = mockFetch(sampleFeed);
      const links = await atprotoHandler(['feed', 'eff.org'], mockConfig());

      expect(links).toHaveLength(2);
      expect(links[0].url).toContain('bsky.app/profile/eff.org/post/3xyz789');
      expect(links[0].tags).toContain('post');
      expect(links[0].meta?.atUri).toBe('at://did:plc:abc123/app.bsky.feed.post/3xyz789');
      expect(links[1].url).toContain('/post/3abc456');
    });

    it('truncates long labels to 80 chars', async () => {
      const longPost = {
        feed: [{
          post: {
            ...samplePost,
            record: { text: 'A'.repeat(200), createdAt: '2026-03-28T12:00:00Z' },
          },
        }],
      };
      globalThis.fetch = mockFetch(longPost);
      const links = await atprotoHandler(['feed', 'eff.org'], mockConfig());

      expect(links[0].label!.length).toBeLessThanOrEqual(80);
      expect(links[0].label!.endsWith('\u2026')).toBe(true);
    });

    it('passes limit as query param', async () => {
      globalThis.fetch = mockFetch(sampleFeed);
      await atprotoHandler(['feed', 'eff.org', 'limit=5'], mockConfig());

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('limit=5');
    });

    it('uses default limit of 10', async () => {
      globalThis.fetch = mockFetch(sampleFeed);
      await atprotoHandler(['feed', 'eff.org'], mockConfig());

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('limit=10');
    });

    it('returns empty for missing actor', async () => {
      const links = await atprotoHandler(['feed'], mockConfig());
      expect(links).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // People handler
  // -----------------------------------------------------------

  describe('people command', () => {
    it('fetches and maps actor search results', async () => {
      globalThis.fetch = mockFetch(sampleActors);
      const links = await atprotoHandler(['people', 'digital rights'], mockConfig());

      expect(links).toHaveLength(2);
      expect(links[0].label).toBe('Electronic Frontier Foundation');
      expect(links[0].tags).toContain('profile');
      expect(links[1].label).toBe('Internet Archive');
      expect(links[1].url).toContain('bsky.app/profile/archive.org');
    });

    it('passes query and limit', async () => {
      globalThis.fetch = mockFetch(sampleActors);
      await atprotoHandler(['people', 'atproto', 'limit=5'], mockConfig());

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('q=atproto');
      expect(url).toContain('limit=5');
    });

    it('resolves search aliases from config', async () => {
      globalThis.fetch = mockFetch(sampleActors);
      const config = mockConfig({
        searches: { open_source: 'open source' },
      });
      await atprotoHandler(['people', 'open_source'], config);

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('q=open+source');
    });

    it('uses literal value when no alias matches', async () => {
      globalThis.fetch = mockFetch(sampleActors);
      const config = mockConfig({
        searches: { open_source: 'open source' },
      });
      await atprotoHandler(['people', 'atproto'], config);

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('q=atproto');
    });

    it('returns empty for missing query', async () => {
      const links = await atprotoHandler(['people'], mockConfig());
      expect(links).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Thread handler
  // -----------------------------------------------------------

  describe('thread command', () => {
    it('resolves a single post by AT URI', async () => {
      globalThis.fetch = mockFetch(sampleThread);
      const uri = 'at://did:plc:abc123/app.bsky.feed.post/3xyz789';
      const links = await atprotoHandler(['thread', uri], mockConfig());

      expect(links).toHaveLength(1);
      expect(links[0].url).toContain('/post/3xyz789');
    });

    it('returns empty for invalid URI', async () => {
      const links = await atprotoHandler(['thread', 'not-a-uri'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('returns empty for missing URI', async () => {
      const links = await atprotoHandler(['thread'], mockConfig());
      expect(links).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Search handler (auth required)
  // -----------------------------------------------------------

  describe('search command', () => {
    it('searches posts when authenticated', async () => {
      globalThis.fetch = mockFetch(sampleSearchPosts);
      const config = mockConfig({ accessJwt: 'test-token-123' });
      const links = await atprotoHandler(['search', 'cats'], config);

      expect(links).toHaveLength(1);
      expect(links[0].tags).toContain('post');

      // Verify auth header was sent
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const options = fetchCall[1];
      expect(options.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('returns empty without auth token', async () => {
      const links = await atprotoHandler(['search', 'cats'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('returns empty with null auth token', async () => {
      const config = mockConfig({ accessJwt: null });
      const links = await atprotoHandler(['search', 'cats'], config);
      expect(links).toHaveLength(0);
    });

    it('returns empty for missing query', async () => {
      const config = mockConfig({ accessJwt: 'token' });
      const links = await atprotoHandler(['search'], config);
      expect(links).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Error cases
  // -----------------------------------------------------------

  describe('error handling', () => {
    it('returns empty for unknown command', async () => {
      const links = await atprotoHandler(['unknowncommand', 'arg'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('returns empty on network failure', async () => {
      globalThis.fetch = mockFetchError('Network error');
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('returns empty on non-200 response', async () => {
      globalThis.fetch = mockFetch(null, false, 404);
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('returns empty on non-JSON content-type', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'text/html' },
        json: () => Promise.resolve({}),
      });
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('handles empty feed gracefully', async () => {
      globalThis.fetch = mockFetch({ feed: [] });
      const links = await atprotoHandler(['feed', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('handles empty actors list gracefully', async () => {
      globalThis.fetch = mockFetch({ actors: [] });
      const links = await atprotoHandler(['people', 'nonexistent'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('handles missing thread post gracefully', async () => {
      globalThis.fetch = mockFetch({ thread: {} });
      const uri = 'at://did:plc:abc123/app.bsky.feed.post/3xyz789';
      const links = await atprotoHandler(['thread', uri], mockConfig());
      expect(links).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------
  // Security
  // -----------------------------------------------------------

  describe('security', () => {
    it('always uses credentials: omit (no cookies leaked)', async () => {
      globalThis.fetch = mockFetch(sampleProfile);
      await atprotoHandler(['profile', 'eff.org'], mockConfig());

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.credentials).toBe('omit');
    });

    it('uses credentials: omit even with auth token', async () => {
      globalThis.fetch = mockFetch(sampleSearchPosts);
      const config = mockConfig({ accessJwt: 'token' });
      await atprotoHandler(['search', 'cats'], config);

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.credentials).toBe('omit');
    });

    it('only sends auth header for search command', async () => {
      globalThis.fetch = mockFetch(sampleProfile);
      const config = mockConfig({ accessJwt: 'secret-token' });
      await atprotoHandler(['profile', 'eff.org'], config);

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.headers.Authorization).toBeUndefined();
    });

    it('fetches from public API for unauthenticated requests', async () => {
      globalThis.fetch = mockFetch(sampleFeed);
      await atprotoHandler(['feed', 'eff.org'], mockConfig());

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('public.api.bsky.app');
    });

    it('fetches from PDS for authenticated requests', async () => {
      globalThis.fetch = mockFetch(sampleSearchPosts);
      const config = mockConfig({ accessJwt: 'token' });
      await atprotoHandler(['search', 'cats'], config);

      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(url).toContain('bsky.social');
      expect(url).not.toContain('public.api.bsky.app');
    });

    it('rejects non-JSON content-type', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'text/html; charset=utf-8' },
        json: () => Promise.resolve({}),
      });
      const links = await atprotoHandler(['feed', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('rejects oversized responses', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: (h: string) => h === 'content-type' ? 'application/json' : '2000000' },
        json: () => Promise.resolve(sampleFeed),
      });
      const links = await atprotoHandler(['feed', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });

    it('does not leak token as falsy string', async () => {
      const config = mockConfig({ accessJwt: '' });
      const links = await atprotoHandler(['search', 'cats'], config);
      expect(links).toHaveLength(0);
    });

    it('generated URLs only point to known Bluesky domains', async () => {
      globalThis.fetch = mockFetch(sampleProfile);
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());

      for (const link of links) {
        const url = new URL(link.url);
        expect(
          ['bsky.app', 'pdsls.dev', 'public.api.bsky.app'].includes(url.hostname),
        ).toBe(true);
      }
    });

    it('XSS in displayName is not rendered as HTML (stored as text)', async () => {
      const xssProfile = {
        ...sampleProfile,
        displayName: '<script>alert("xss")</script>',
      };
      globalThis.fetch = mockFetch(xssProfile);
      const links = await atprotoHandler(['profile', 'evil.example'], mockConfig());

      // The label contains the raw string, not sanitized HTML —
      // Alap renders via textContent so this is safe, but the label
      // itself must not strip or transform the characters.
      expect(links[0].label).toContain('<script>');
    });

    it('handles abort timeout gracefully', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);
      const links = await atprotoHandler(['profile', 'eff.org'], mockConfig());
      expect(links).toHaveLength(0);
    });
  });
});
