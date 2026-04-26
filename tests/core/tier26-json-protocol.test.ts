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
import { jsonHandler } from '../../src/protocols/json';
import { MAX_WEB_RESPONSE_BYTES } from '../../src/constants';
import type { AlapConfig } from '../../src/core/types';
import type { JsonSourceConfig } from '../../src/protocols/json';

/**
 * Tier 26: :json: protocol handler — tests explicit field mapping, root
 * navigation, envelope extraction, tag normalization, template interpolation,
 * HTML stripping, URL sanitization, and error handling.
 */

const mockConfig = (sources: Record<string, JsonSourceConfig>, overrides?: Record<string, unknown>): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: {
    json: {
      sources,
      ...overrides,
    },
  },
  allLinks: {},
});

const mockFetch = (data: unknown, ok = true, status = 200, headers?: Record<string, string>) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
    headers: {
      get: (name: string) => headers?.[name.toLowerCase()] ?? null,
    },
  });
};

describe('Tier 26: :json: Protocol Handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── 1. Bare array response ──────────────────────────────────────────

  describe('bare array response', () => {
    it('maps a bare array when no root is configured', async () => {
      const apiResponse = [
        { title: 'Brooklyn Bridge', href: 'https://example.com/brooklyn' },
        { title: 'Manhattan Bridge', href: 'https://example.com/manhattan' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        bridges: {
          url: 'https://api.example.com/bridges.json',
          fieldMap: { label: 'title', url: 'href' },
        },
      });
      const links = await jsonHandler(['bridges'], config);

      expect(links).toHaveLength(2);
      expect(links[0].label).toBe('Brooklyn Bridge');
      expect(links[0].url).toBe('https://example.com/brooklyn');
      expect(links[1].label).toBe('Manhattan Bridge');
    });
  });

  // ── 2. Object with root path ────────────────────────────────────────

  describe('root path navigation', () => {
    it('navigates to nested array via root dot-path', async () => {
      const apiResponse = {
        meta: { count: 2 },
        data: {
          items: [
            { name: 'Alpha', link: 'https://example.com/a' },
            { name: 'Beta', link: 'https://example.com/b' },
          ],
        },
      };
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        nested: {
          url: 'https://api.example.com/nested',
          root: 'data.items',
          fieldMap: { label: 'name', url: 'link' },
        },
      });
      const links = await jsonHandler(['nested'], config);

      expect(links).toHaveLength(2);
      expect(links[0].label).toBe('Alpha');
      expect(links[1].url).toBe('https://example.com/b');
    });
  });

  // ── 3. Envelope extraction ──────────────────────────────────────────

  describe('envelope extraction', () => {
    it('attaches envelope metadata to every item', async () => {
      const apiResponse = {
        title: 'My Bookmarks API',
        updated_at: '2026-04-07T12:00:00Z',
        items: [
          { name: 'Link A', url: 'https://a.com' },
          { name: 'Link B', url: 'https://b.com' },
        ],
      };
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        bookmarks: {
          url: 'https://api.example.com/bookmarks',
          root: 'items',
          envelope: {
            sourceLabel: 'title',
            updated: 'updated_at',
          },
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['bookmarks'], config);

      expect(links).toHaveLength(2);
      expect(links[0].meta?.sourceLabel).toBe('My Bookmarks API');
      expect(links[0].meta?.updated).toBe('2026-04-07T12:00:00Z');
      expect(links[1].meta?.sourceLabel).toBe('My Bookmarks API');
    });
  });

  // ── 4. Singleton wrapping ───────────────────────────────────────────

  describe('singleton wrapping', () => {
    it('wraps a singleton object at root in an array', async () => {
      const apiResponse = {
        latest: {
          name: 'Falcon 9',
          link: 'https://example.com/falcon9',
        },
      };
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        launch: {
          url: 'https://api.example.com/latest',
          root: 'latest',
          fieldMap: { label: 'name', url: 'link' },
        },
      });
      const links = await jsonHandler(['launch'], config);

      expect(links).toHaveLength(1);
      expect(links[0].label).toBe('Falcon 9');
    });
  });

  // ── 5. No root + object response ───────────────────────────────────

  describe('no root + object response', () => {
    it('returns empty and warns when response is an object without root', async () => {
      const apiResponse = { items: [{ name: 'A', url: 'https://a.com' }] };
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        ambiguous: {
          url: 'https://api.example.com/data',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['ambiguous'], config);

      expect(links).toHaveLength(0);
    });
  });

  // ── 6. Template interpolation in fieldMap ──────────────────────────

  describe('template interpolation', () => {
    it('interpolates ${field} in url and label mappings', async () => {
      const apiResponse = [
        { id: 42, author: 'Jane', title: 'Bridges of NYC' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        articles: {
          url: 'https://api.example.com/articles',
          fieldMap: {
            label: '${author} — ${title}',
            url: 'https://example.com/articles/${id}',
          },
        },
      });
      const links = await jsonHandler(['articles'], config);

      expect(links).toHaveLength(1);
      expect(links[0].label).toBe('Jane — Bridges of NYC');
      expect(links[0].url).toBe('https://example.com/articles/42');
    });

    it('drops items when a template field is missing', async () => {
      const apiResponse = [
        { id: 42 }, // no title or author
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        articles: {
          url: 'https://api.example.com/articles',
          fieldMap: {
            label: '${title}',
            url: 'https://example.com/articles/${missing_field}',
          },
        },
      });
      const links = await jsonHandler(['articles'], config);

      expect(links).toHaveLength(0);
    });
  });

  // ── 7. Envelope as template vars ───────────────────────────────────

  describe('envelope as template vars', () => {
    it('uses ${_envelope.field} in fieldMap templates', async () => {
      const apiResponse = {
        config: { iiif_url: 'https://images.example.com/iiif' },
        data: [
          { image_id: 'abc123', title: 'Starry Night', link: 'https://example.com/starry' },
        ],
      };
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        art: {
          url: 'https://api.example.com/artworks',
          root: 'data',
          envelope: { iiif_url: 'config.iiif_url' },
          fieldMap: {
            label: 'title',
            url: 'link',
            thumbnail: '${_envelope.iiif_url}/${image_id}/full/200,/0/default.jpg',
          },
        },
      });
      const links = await jsonHandler(['art'], config);

      expect(links).toHaveLength(1);
      expect(links[0].thumbnail).toBe('https://images.example.com/iiif/abc123/full/200,/0/default.jpg');
    });
  });

  // ── 8. Tag normalization ───────────────────────────────────────────

  describe('tag normalization', () => {
    it('splits comma-separated string into tags', async () => {
      const apiResponse = [
        { name: 'Margarita', url: 'https://example.com/marg', categories: 'IBA,Classic,Citrus' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        drinks: {
          url: 'https://api.example.com/drinks',
          fieldMap: { label: 'name', url: 'url', tags: 'categories' },
        },
      });
      const links = await jsonHandler(['drinks'], config);

      expect(links[0].tags).toEqual(['IBA', 'Classic', 'Citrus']);
    });

    it('uses array of strings directly', async () => {
      const apiResponse = [
        { name: 'Link', url: 'https://example.com', labels: ['css', 'frontend'] },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url', tags: 'labels' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links[0].tags).toEqual(['css', 'frontend']);
    });

    it('extracts field from array of objects via [].field', async () => {
      const apiResponse = [
        {
          name: 'Issue',
          url: 'https://example.com/issue',
          labels: [{ name: 'bug', color: 'red' }, { name: 'urgent', color: 'orange' }],
        },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        issues: {
          url: 'https://api.example.com/issues',
          fieldMap: { label: 'name', url: 'url', tags: 'labels[].name' },
        },
      });
      const links = await jsonHandler(['issues'], config);

      expect(links[0].tags).toEqual(['bug', 'urgent']);
    });
  });

  // ── 9. HTML stripping ─────────────────────────────────────────────

  describe('HTML stripping', () => {
    it('strips HTML tags from label and description', async () => {
      const apiResponse = [
        {
          name: '<b>Bold</b> Title',
          url: 'https://example.com',
          summary: '<p>A show about <em>nothing</em>.</p>',
        },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        shows: {
          url: 'https://api.example.com/shows',
          fieldMap: { label: 'name', url: 'url', description: 'summary' },
        },
      });
      const links = await jsonHandler(['shows'], config);

      expect(links[0].label).toBe('Bold Title');
      expect(links[0].description).toBe('A show about nothing.');
    });

    it('decodes HTML entities', async () => {
      const apiResponse = [
        { name: 'Tom &amp; Jerry', url: 'https://example.com' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        shows: {
          url: 'https://api.example.com/shows',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['shows'], config);

      expect(links[0].label).toBe('Tom & Jerry');
    });
  });

  // ── 10. Relative URLs + linkBase ──────────────────────────────────

  describe('relative URLs + linkBase', () => {
    it('prepends linkBase to relative URLs', async () => {
      const apiResponse = [
        { title: 'Fireball', path: '/api/2014/spells/fireball' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        spells: {
          url: 'https://api.example.com/spells',
          linkBase: 'https://dnd.example.com',
          fieldMap: { label: 'title', url: 'path' },
        },
      });
      const links = await jsonHandler(['spells'], config);

      expect(links[0].url).toBe('https://dnd.example.com/api/2014/spells/fireball');
    });

    it('handles linkBase with trailing slash', async () => {
      const apiResponse = [
        { title: 'Item', path: 'items/1' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          linkBase: 'https://example.com/',
          fieldMap: { label: 'title', url: 'path' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links[0].url).toBe('https://example.com/items/1');
    });

    it('does not prepend linkBase to absolute URLs', async () => {
      const apiResponse = [
        { title: 'Item', href: 'https://other.com/page' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          linkBase: 'https://example.com',
          fieldMap: { label: 'title', url: 'href' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links[0].url).toBe('https://other.com/page');
    });
  });

  // ── 11. allowedSchemes ─────────────────────────────────────────────

  describe('allowedSchemes', () => {
    it('allows obsidian:// when configured', async () => {
      const apiResponse = [
        { title: 'Note', path: 'obsidian://open?vault=V&file=F' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        vault: {
          url: 'https://api.example.com/search',
          allowedSchemes: ['http', 'https', 'obsidian'],
          fieldMap: { label: 'title', url: 'path' },
        },
      });
      const links = await jsonHandler(['vault'], config);

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('obsidian://open?vault=V&file=F');
    });

    it('blocks obsidian:// when not in allowedSchemes', async () => {
      const apiResponse = [
        { title: 'Note', path: 'obsidian://open?vault=V&file=F' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        vault: {
          url: 'https://localhost:27124/search',
          fieldMap: { label: 'title', url: 'path' },
          // default allowedSchemes: ['http', 'https']
        },
      });
      const links = await jsonHandler(['vault'], config);

      expect(links).toHaveLength(0);
    });

    it('always blocks javascript: regardless of allowedSchemes', async () => {
      const apiResponse = [
        { title: 'XSS', path: 'javascript:alert(1)' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        evil: {
          url: 'https://api.example.com/data',
          allowedSchemes: ['http', 'https', 'javascript'],
          fieldMap: { label: 'title', url: 'path' },
        },
      });
      const links = await jsonHandler(['evil'], config);

      expect(links).toHaveLength(0);
    });
  });

  // ── 12. Prototype pollution ────────────────────────────────────────

  describe('prototype pollution guard', () => {
    it('returns undefined for __proto__ in dot-path', async () => {
      const apiResponse = [
        { name: 'Safe', url: 'https://example.com', __proto__: { admin: true } },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          root: '__proto__',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(0);
    });
  });

  // ── 13. Missing fields ─────────────────────────────────────────────

  describe('missing fields', () => {
    it('drops items without a URL', async () => {
      const apiResponse = [
        { name: 'Has URL', url: 'https://example.com' },
        { name: 'No URL' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(1);
      expect(links[0].label).toBe('Has URL');
    });

    it('keeps items with URL but no label', async () => {
      const apiResponse = [
        { href: 'https://example.com/page' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { url: 'href' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('https://example.com/page');
      expect(links[0].label).toBeUndefined();
    });

    it('preserves optional fields when present', async () => {
      const apiResponse = [
        {
          name: 'Full Item',
          href: 'https://example.com',
          summary: 'A description',
          thumb: 'https://example.com/thumb.jpg',
          categories: ['a', 'b'],
        },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: {
            label: 'name',
            url: 'href',
            description: 'summary',
            thumbnail: 'thumb',
            tags: 'categories',
          },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links[0].description).toBe('A description');
      expect(links[0].thumbnail).toBe('https://example.com/thumb.jpg');
      expect(links[0].tags).toEqual(['a', 'b']);
    });
  });

  // ── 14. Source indicators ──────────────────────────────────────────

  describe('source indicators', () => {
    it('adds source_json class and meta.source to every link', async () => {
      const apiResponse = [
        { name: 'Link', url: 'https://example.com' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links[0].cssClass).toBe('source_json');
      expect(links[0].meta?.source).toBe('json');
    });
  });

  // ── 15. Error handling ─────────────────────────────────────────────

  describe('error handling', () => {
    it('returns empty for missing source', async () => {
      const config = mockConfig({
        existing: {
          url: 'https://api.example.com/data',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['nonexistent'], config);

      expect(links).toHaveLength(0);
    });

    it('returns empty when no sources configured', async () => {
      const config: AlapConfig = {
        protocols: { json: {} },
        allLinks: {},
      };
      const links = await jsonHandler(['anything'], config);

      expect(links).toHaveLength(0);
    });

    it('returns empty on fetch failure', async () => {
      globalThis.fetch = mockFetch(null, false, 500);

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(0);
    });

    it('returns empty on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(0);
    });
  });

  // ── 16. Content-type / size guards ─────────────────────────────────

  describe('response guards', () => {
    it('rejects non-JSON content type', async () => {
      globalThis.fetch = mockFetch([], true, 200, { 'content-type': 'text/html' });

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(0);
    });

    it('rejects oversized responses', async () => {
      globalThis.fetch = mockFetch([], true, 200, {
        'content-length': String(MAX_WEB_RESPONSE_BYTES + 1),
      });

      const config = mockConfig({
        items: {
          url: 'https://api.example.com/items',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      const links = await jsonHandler(['items'], config);

      expect(links).toHaveLength(0);
    });
  });

  // ── 17. Custom headers ─────────────────────────────────────────────

  describe('custom headers', () => {
    it('passes headers through to fetch', async () => {
      const apiResponse = [{ name: 'Secret', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        private_api: {
          url: 'https://api.example.com/private',
          headers: { Authorization: 'Bearer abc123', 'X-Custom': 'value' },
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['private_api'], config);

      const fetchCall = fetchSpy.mock.calls[0];
      const options = fetchCall[1] as RequestInit;
      expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer abc123');
      expect((options.headers as Record<string, string>)['X-Custom']).toBe('value');
    });
  });

  // ── 18. Positional args as URL template vars ──────────────────────

  describe('positional URL args', () => {
    it('fills ${1} in URL with first positional segment', async () => {
      const apiResponse = [{ name: 'Result', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        search: {
          url: 'https://api.example.com/search?q=${1}',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['search', 'bridges'], config);

      const fetchCall = fetchSpy.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/search?q=bridges');
    });

    it('fills multiple positional args', async () => {
      const apiResponse = [{ name: 'Result', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        search: {
          url: 'https://api.example.com/${1}/items/${2}',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['search', 'books', 'fiction'], config);

      const fetchCall = fetchSpy.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/books/items/fiction');
    });

    it('resolves $var from protocol vars', async () => {
      const apiResponse = [{ name: 'Result', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig(
        {
          search: {
            url: 'https://api.example.com/search?q=${1}',
            fieldMap: { label: 'name', url: 'url' },
          },
        },
        { vars: { miles_davis: 'miles davis' } },
      );
      await jsonHandler(['search', '$miles_davis'], config);

      const fetchCall = fetchSpy.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/search?q=miles%20davis');
    });

    it('decodes %20 in positional args', async () => {
      const apiResponse = [{ name: 'Result', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        search: {
          url: 'https://api.example.com/search?q=${1}',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['search', 'miles%20davis'], config);

      const fetchCall = fetchSpy.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/search?q=miles%20davis');
    });

    it('warns when $var is not found and passes through raw arg', async () => {
      const apiResponse = [{ name: 'Result', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        search: {
          url: 'https://api.example.com/search?q=${1}',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['search', '$nonexistent'], config);

      const fetchCall = fetchSpy.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/search?q=%24nonexistent');
    });
  });

  // ── Meta field mapping ─────────────────────────────────────────────

  describe('meta field mapping', () => {
    it('maps arbitrary fields to meta with type preservation', async () => {
      const apiResponse = [
        {
          name: 'Recipe',
          url: 'https://example.com/recipe',
          rating: 4.5,
          vegetarian: true,
          ingredients: ['flour', 'sugar', 'eggs'],
        },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        recipes: {
          url: 'https://api.example.com/recipes',
          fieldMap: {
            label: 'name',
            url: 'url',
            meta: {
              rating: 'rating',
              vegetarian: 'vegetarian',
              ingredients: 'ingredients',
            },
          },
        },
      });
      const links = await jsonHandler(['recipes'], config);

      expect(links[0].meta?.rating).toBe(4.5);
      expect(links[0].meta?.vegetarian).toBe(true);
      expect(links[0].meta?.ingredients).toEqual(['flour', 'sugar', 'eggs']);
    });
  });

  // ── Dot-path and bracket notation ──────────────────────────────────

  describe('dot-path and bracket notation', () => {
    it('accesses nested fields via dot-path', async () => {
      const apiResponse = [
        { name: { common: 'France' }, flags: { png: 'https://flags.com/fr.png' }, url: 'https://example.com/fr' },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        countries: {
          url: 'https://api.example.com/countries',
          fieldMap: { label: 'name.common', url: 'url', thumbnail: 'flags.png' },
        },
      });
      const links = await jsonHandler(['countries'], config);

      expect(links[0].label).toBe('France');
      expect(links[0].thumbnail).toBe('https://flags.com/fr.png');
    });

    it('accesses array elements via bracket index', async () => {
      const apiResponse = [
        { title: 'Article', url: 'https://example.com', images: [{ src: 'https://img.com/1.jpg' }] },
      ];
      globalThis.fetch = mockFetch(apiResponse);

      const config = mockConfig({
        articles: {
          url: 'https://api.example.com/articles',
          fieldMap: { label: 'title', url: 'url', thumbnail: 'images[0].src' },
        },
      });
      const links = await jsonHandler(['articles'], config);

      expect(links[0].thumbnail).toBe('https://img.com/1.jpg');
    });
  });

  // ── Credentials ────────────────────────────────────────────────────

  describe('credentials', () => {
    it('sends credentials when configured', async () => {
      const apiResponse = [{ name: 'Private', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        intranet: {
          url: 'https://intranet.example.com/api',
          credentials: true,
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['intranet'], config);

      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(options.credentials).toBe('include');
    });

    it('omits credentials by default', async () => {
      const apiResponse = [{ name: 'Public', url: 'https://example.com' }];
      const fetchSpy = mockFetch(apiResponse);
      globalThis.fetch = fetchSpy;

      const config = mockConfig({
        public_api: {
          url: 'https://api.example.com/data',
          fieldMap: { label: 'name', url: 'url' },
        },
      });
      await jsonHandler(['public_api'], config);

      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(options.credentials).toBe('omit');
    });
  });
});
