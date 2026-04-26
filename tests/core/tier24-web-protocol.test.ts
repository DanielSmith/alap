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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webHandler } from '../../src/protocols/web';
import { MAX_WEB_RESPONSE_BYTES, WEB_FETCH_TIMEOUT_MS } from '../../src/constants';
import type { AlapConfig } from '../../src/core/types';

/**
 * Tier 24: :web: protocol handler — tests URL building, field mapping,
 * search alias lookup, error handling, and response parsing.
 */

const mockConfig = (keys: AlapConfig['protocols']): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: { web: { ...keys } },
  allLinks: {},
});

const mockFetch = (data: unknown, ok = true, status = 200) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  });
};

describe('Tier 24: :web: Protocol Handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('basic fetch and mapping', () => {
    it('fetches from key URL and maps fields with defaults', async () => {
      const apiResponse = [
        { name: 'Brooklyn Bridge', url: 'https://example.com/brooklyn' },
        { name: 'Manhattan Bridge', url: 'https://example.com/manhattan' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        keys: { bridges: { url: 'https://api.example.com/bridges' } },
      });
      const links = await webHandler(['bridges'], config);

      expect(links).toHaveLength(2);
      expect(links[0].label).toBe('Brooklyn Bridge');
      expect(links[0].url).toBe('https://example.com/brooklyn');
      expect(links[1].label).toBe('Manhattan Bridge');
    });

    it('uses custom field mapping', async () => {
      const apiResponse = [
        { title: 'My Book', wiki: 'https://example.com/book', first_publish_year: 1999 },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        keys: {
          books: {
            url: 'https://api.example.com/search.json',
            map: {
              label: 'title',
              url: 'wiki',
              meta: { year: 'first_publish_year' },
            },
          },
        },
      });
      const links = await webHandler(['books'], config);

      expect(links).toHaveLength(1);
      expect(links[0].label).toBe('My Book');
      expect(links[0].url).toBe('https://example.com/book');
      expect(links[0].meta?.year).toBe(1999);
    });

    it('prepends linkBase to relative URLs', async () => {
      const apiResponse = [
        { title: 'A Book', key: '/works/OL12345W' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        keys: {
          books: {
            url: 'https://openlibrary.org/search.json',
            linkBase: 'https://openlibrary.org',
            map: { label: 'title', url: 'key' },
          },
        },
      });
      const links = await webHandler(['books'], config);

      expect(links[0].url).toBe('https://openlibrary.org/works/OL12345W');
    });

    it('does not prepend linkBase to absolute URLs', async () => {
      const apiResponse = [
        { name: 'Example', url: 'https://example.com/page' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        keys: {
          test: {
            url: 'https://api.example.com/test',
            linkBase: 'https://should-not-appear.com',
          },
        },
      });
      const links = await webHandler(['test'], config);

      expect(links[0].url).toBe('https://example.com/page');
    });

    it('maps nested fields with dot paths', async () => {
      const apiResponse = [
        { title: 'A Book', html_url: 'https://example.com/a', author_name: ['Alice', 'Bob'] },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        keys: {
          books: {
            url: 'https://api.example.com/search.json',
            map: {
              label: 'title',
              url: 'html_url',
              meta: { author: 'author_name.0' },
            },
          },
        },
      });
      const links = await webHandler(['books'], config);

      expect(links[0].meta?.author).toBe('Alice');
    });
  });

  describe('search aliases', () => {
    it('uses predefined search params from alias', async () => {
      globalThis.fetch = mockFetch([{ name: 'Result', url: 'https://example.com/r' }]);

      const config = mockConfig({
        keys: {
          books: {
            url: 'https://openlibrary.org/search.json',
            searches: {
              architecture: { q: 'urban frank gehry', limit: 10 },
            },
          },
        },
      });
      await webHandler(['books', 'architecture'], config);

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const parsed = new URL(calledUrl);
      expect(parsed.searchParams.get('q')).toBe('urban frank gehry');
      expect(parsed.searchParams.get('limit')).toBe('10');
    });

    it('named args override search alias params', async () => {
      globalThis.fetch = mockFetch([{ name: 'Result', url: 'https://example.com/r' }]);

      const config = mockConfig({
        keys: {
          books: {
            url: 'https://openlibrary.org/search.json',
            searches: {
              architecture: { q: 'urban frank gehry', limit: 10 },
            },
          },
        },
      });
      await webHandler(['books', 'architecture', 'limit=5'], config);

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const parsed = new URL(calledUrl);
      expect(parsed.searchParams.get('limit')).toBe('5');
    });
  });

  describe('response shapes', () => {
    it('handles nested response (e.g. { items: [...] })', async () => {
      globalThis.fetch = mockFetch({
        total_count: 2,
        items: [
          { name: 'Repo A', url: 'https://github.com/a' },
          { name: 'Repo B', url: 'https://github.com/b' },
        ],
      });

      const config = mockConfig({
        keys: { repos: { url: 'https://api.github.com/search' } },
      });
      const links = await webHandler(['repos'], config);
      expect(links).toHaveLength(2);
    });

    it('handles nested response with docs array', async () => {
      globalThis.fetch = mockFetch({
        numFound: 100,
        docs: [
          { title: 'Book A', url: 'https://example.com/a' },
        ],
      });

      const config = mockConfig({
        keys: {
          books: {
            url: 'https://openlibrary.org/search.json',
            map: { label: 'title', url: 'url' },
          },
        },
      });
      const links = await webHandler(['books'], config);
      expect(links).toHaveLength(1);
      expect(links[0].label).toBe('Book A');
    });

    it('skips items without a URL', async () => {
      globalThis.fetch = mockFetch([
        { name: 'Has URL', url: 'https://example.com/yes' },
        { name: 'No URL' },
        { name: 'Also has URL', url: 'https://example.com/also' },
      ]);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('returns empty on fetch failure', async () => {
      globalThis.fetch = mockFetch(null, false, 404);

      const config = mockConfig({
        keys: { bridges: { url: 'https://api.example.com/bridges' } },
      });
      const links = await webHandler(['bridges'], config);
      expect(links).toHaveLength(0);
    });

    it('returns empty on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

      const config = mockConfig({
        keys: { bridges: { url: 'https://api.example.com/bridges' } },
      });
      const links = await webHandler(['bridges'], config);
      expect(links).toHaveLength(0);
    });

    it('returns empty for missing key', async () => {
      const config = mockConfig({
        keys: { bridges: { url: 'https://api.example.com/bridges' } },
      });
      const links = await webHandler(['nonexistent'], config);
      expect(links).toHaveLength(0);
    });

    it('returns empty when no keys configured', async () => {
      const config = mockConfig({});
      const links = await webHandler(['anything'], config);
      expect(links).toHaveLength(0);
    });
  });

  describe('URL building', () => {
    it('builds URL with named args as query params', async () => {
      globalThis.fetch = mockFetch([]);

      const config = mockConfig({
        keys: { bridges: { url: 'https://api.example.com/bridges' } },
      });
      await webHandler(['bridges', 'borough=brooklyn', 'limit=10'], config);

      const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const parsed = new URL(calledUrl);
      expect(parsed.searchParams.get('borough')).toBe('brooklyn');
      expect(parsed.searchParams.get('limit')).toBe('10');
    });
  });

  describe('credentials', () => {
    it('defaults to credentials: omit', async () => {
      globalThis.fetch = mockFetch([]);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      await webHandler(['test'], config);

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.credentials).toBe('omit');
    });

    it('sends credentials: include when key opts in', async () => {
      globalThis.fetch = mockFetch([]);

      const config = mockConfig({
        keys: { intranet: { url: 'https://internal.corp/api', credentials: true } },
      });
      await webHandler(['intranet'], config);

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.credentials).toBe('include');
    });

    it('uses credentials: omit when explicitly set to false', async () => {
      globalThis.fetch = mockFetch([]);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test', credentials: false } },
      });
      await webHandler(['test'], config);

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.credentials).toBe('omit');
    });
  });

  describe('allowedOrigins', () => {
    it('allows fetch when origin matches allowedOrigins', async () => {
      globalThis.fetch = mockFetch([
        { name: 'Result', url: 'https://example.com/r' },
      ]);

      const config: AlapConfig = {
        settings: { listType: 'ul' },
        protocols: {
          web: {
            allowedOrigins: ['https://api.example.com'],
            keys: { test: { url: 'https://api.example.com/data' } },
          },
        },
        allLinks: {},
      };
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });

    it('blocks fetch when origin is not in allowedOrigins', async () => {
      globalThis.fetch = mockFetch([]);

      const config: AlapConfig = {
        settings: { listType: 'ul' },
        protocols: {
          web: {
            allowedOrigins: ['https://api.example.com'],
            keys: { test: { url: 'https://evil.com/data' } },
          },
        },
        allLinks: {},
      };
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(0);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('allows all origins when allowedOrigins is not set', async () => {
      globalThis.fetch = mockFetch([
        { name: 'Result', url: 'https://example.com/r' },
      ]);

      const config = mockConfig({
        keys: { test: { url: 'https://any-domain.com/data' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });

    it('allows all origins when allowedOrigins is empty', async () => {
      globalThis.fetch = mockFetch([
        { name: 'Result', url: 'https://example.com/r' },
      ]);

      const config: AlapConfig = {
        settings: { listType: 'ul' },
        protocols: {
          web: {
            allowedOrigins: [],
            keys: { test: { url: 'https://any-domain.com/data' } },
          },
        },
        allLinks: {},
      };
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });
  });

  describe('timeout', () => {
    it('passes an AbortSignal to fetch', async () => {
      globalThis.fetch = mockFetch([]);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      await webHandler(['test'], config);

      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(opts.signal).toBeDefined();
      expect(opts.signal).toBeInstanceOf(AbortSignal);
    });

    it('returns empty on abort/timeout', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(0);
    });
  });

  describe('content-type validation', () => {
    const mockFetchWithContentType = (data: unknown, contentType: string) => {
      return vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: (h: string) => h === 'content-type' ? contentType : null },
        json: () => Promise.resolve(data),
      });
    };

    it('allows application/json responses', async () => {
      globalThis.fetch = mockFetchWithContentType(
        [{ name: 'Test', url: 'https://example.com/t' }],
        'application/json',
      );

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });

    it('allows application/json with charset', async () => {
      globalThis.fetch = mockFetchWithContentType(
        [{ name: 'Test', url: 'https://example.com/t' }],
        'application/json; charset=utf-8',
      );

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });

    it('rejects text/html responses', async () => {
      globalThis.fetch = mockFetchWithContentType([], 'text/html');

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(0);
    });

    it('rejects binary responses', async () => {
      globalThis.fetch = mockFetchWithContentType([], 'application/octet-stream');

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(0);
    });

    it('allows responses when content-type header is absent', async () => {
      globalThis.fetch = mockFetch([
        { name: 'Test', url: 'https://example.com/t' },
      ]);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });
  });

  describe('response size guard', () => {
    const mockFetchWithHeaders = (data: unknown, contentLength: string) => {
      return vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: (h: string) => h === 'content-length' ? contentLength : null },
        json: () => Promise.resolve(data),
      });
    };

    it('allows responses within size limit', async () => {
      globalThis.fetch = mockFetchWithHeaders(
        [{ name: 'Test', url: 'https://example.com/t' }],
        '1024',
      );

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });

    it('rejects responses exceeding size limit', async () => {
      const oversized = String(MAX_WEB_RESPONSE_BYTES + 1);
      globalThis.fetch = mockFetchWithHeaders([], oversized);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(0);
    });

    it('allows responses when content-length header is absent', async () => {
      // Standard mockFetch has no headers — should still work
      globalThis.fetch = mockFetch([
        { name: 'Test', url: 'https://example.com/t' },
      ]);

      const config = mockConfig({
        keys: { test: { url: 'https://api.example.com/test' } },
      });
      const links = await webHandler(['test'], config);
      expect(links).toHaveLength(1);
    });
  });

  describe('linkBase normalization', () => {
    it('handles linkBase without trailing slash and path with leading slash', async () => {
      globalThis.fetch = mockFetch([
        { title: 'Test', key: '/works/123' },
      ]);

      const config = mockConfig({
        keys: {
          test: {
            url: 'https://api.example.com/search',
            linkBase: 'https://example.com',
            map: { label: 'title', url: 'key' },
          },
        },
      });
      const links = await webHandler(['test'], config);
      expect(links[0].url).toBe('https://example.com/works/123');
    });

    it('handles linkBase with trailing slash and path without leading slash', async () => {
      globalThis.fetch = mockFetch([
        { title: 'Test', key: 'works/123' },
      ]);

      const config = mockConfig({
        keys: {
          test: {
            url: 'https://api.example.com/search',
            linkBase: 'https://example.com/',
            map: { label: 'title', url: 'key' },
          },
        },
      });
      const links = await webHandler(['test'], config);
      expect(links[0].url).toBe('https://example.com/works/123');
    });

    it('handles both having slashes without doubling', async () => {
      globalThis.fetch = mockFetch([
        { title: 'Test', key: '/works/123' },
      ]);

      const config = mockConfig({
        keys: {
          test: {
            url: 'https://api.example.com/search',
            linkBase: 'https://example.com/',
            map: { label: 'title', url: 'key' },
          },
        },
      });
      const links = await webHandler(['test'], config);
      expect(links[0].url).toBe('https://example.com/works/123');
    });
  });
});
