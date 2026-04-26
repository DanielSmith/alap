/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Tier 28: :hn: protocol handler — mapping primitives, segment dispatch,
 * sub-mode handlers (listings, user, search, item), limit precedence,
 * $preset / bare-name resolution, graceful degradation on fetch failures,
 * source-indicator stamping, and security fixes (numeric-id filtering,
 * objectID shape validation).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { hnHandler } from '../../src/protocols/hn';
import { fetchJson } from '../../src/protocols/hn/fetch';
import {
  mapItem,
  mapAlgoliaHit,
  truncate,
  hnItemUrl,
} from '../../src/protocols/hn/mapping';
import type { AlapConfig } from '../../src/core/types';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const mockConfig = (overrides?: Record<string, unknown>): AlapConfig => ({
  settings: { listType: 'ul' },
  protocols: {
    hn: { cache: 10, ...overrides },
  },
  allLinks: {},
});

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: () => Promise.resolve(body),
});

const errorResponse = (status: number) => ({
  ok: false,
  status,
  statusText: 'Error',
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(null),
});

// ═══════════════════════════════════════════════════════════════
// Sample fixture data
// ═══════════════════════════════════════════════════════════════

const sampleStory = {
  id: 8863,
  type: 'story' as const,
  by: 'pg',
  time: 1175714200,
  title: 'My YC app: Dropbox - Throw away your USB drive',
  url: 'https://www.getdropbox.com/u/2/screencast.html',
  score: 104,
  descendants: 71,
  kids: [8952, 9224],
};

const sampleAskHn = {
  id: 121003,
  type: 'story' as const,
  by: 'tel',
  time: 1203647620,
  title: 'Ask HN: The Arc Effect',
  text: '<i>A note for admins:</i> <a href="http://example">link</a> you should...',
  score: 25,
  descendants: 16,
};

const sampleDeadItem = {
  id: 9999,
  type: 'story' as const,
  dead: true,
  title: 'Moderated out',
};

const sampleDeletedItem = {
  id: 9998,
  type: 'story' as const,
  deleted: true,
};

const sampleComment = {
  id: 2921983,
  type: 'comment' as const,
  by: 'norvig',
  time: 1314211127,
  text: 'A comment',
};

// ═══════════════════════════════════════════════════════════════
// Pure-function unit tests
// ═══════════════════════════════════════════════════════════════

describe('truncate', () => {
  it('returns input unchanged when within max', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('truncates with single-character ellipsis', () => {
    const result = truncate('this string is too long', 10);
    expect(result).toHaveLength(10);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('handles exactly-max length without truncating', () => {
    expect(truncate('exactly10c', 10)).toBe('exactly10c');
  });
});

describe('hnItemUrl', () => {
  it('builds canonical HN discussion URL from numeric id', () => {
    expect(hnItemUrl(8863)).toBe('https://news.ycombinator.com/item?id=8863');
  });

  it('accepts string id', () => {
    expect(hnItemUrl('121003')).toBe('https://news.ycombinator.com/item?id=121003');
  });
});

describe('mapItem', () => {
  it('maps a link-bearing story to an AlapLink with external URL', () => {
    const link = mapItem(sampleStory);
    expect(link).not.toBeNull();
    expect(link!.url).toBe(sampleStory.url);
    expect(link!.label).toBe(sampleStory.title);
    expect(link!.tags).toEqual(['hn', 'story']);
    expect(link!.meta?.id).toBe(sampleStory.id);
    expect(link!.meta?.author).toBe('pg');
    expect(link!.meta?.score).toBe(104);
    expect(link!.meta?.comments).toBe(71);
    expect(link!.meta?.hnUrl).toBe(hnItemUrl(sampleStory.id));
  });

  it('maps an Ask HN self-post to the HN discussion URL', () => {
    const link = mapItem(sampleAskHn);
    expect(link).not.toBeNull();
    expect(link!.url).toBe(hnItemUrl(sampleAskHn.id));
    // Body HTML gets stripped.
    expect(link!.description).toBe('A note for admins: link you should...');
  });

  it('converts Unix-seconds time to milliseconds for :time: compatibility', () => {
    const link = mapItem(sampleStory);
    expect(link!.createdAt).toBe(sampleStory.time * 1000);
  });

  it('returns null for dead items', () => {
    expect(mapItem(sampleDeadItem)).toBeNull();
  });

  it('returns null for deleted items', () => {
    expect(mapItem(sampleDeletedItem)).toBeNull();
  });

  it('returns null for comments', () => {
    expect(mapItem(sampleComment)).toBeNull();
  });

  it('returns null for pollopts', () => {
    expect(mapItem({ id: 1, type: 'pollopt' })).toBeNull();
  });

  it('returns null for items without a title', () => {
    // Defensive filter — HN occasionally returns partial records or
    // types that lack a title; surfacing them as "(untitled)" is noise.
    expect(mapItem({ id: 1, type: 'story', time: 1 })).toBeNull();
    // @ts-expect-error — testing non-string title
    expect(mapItem({ id: 2, type: 'story', title: 123 })).toBeNull();
  });

  it('returns null for null / undefined / missing id', () => {
    expect(mapItem(null)).toBeNull();
    expect(mapItem(undefined)).toBeNull();
    // @ts-expect-error — testing runtime guard for a bad id
    expect(mapItem({ id: 'not-a-number' })).toBeNull();
  });

  it('falls back to HN discussion URL when url field is not http(s)', () => {
    const link = mapItem({ ...sampleStory, url: 'javascript:alert(1)' });
    expect(link!.url).toBe(hnItemUrl(sampleStory.id));
  });
});

describe('mapAlgoliaHit', () => {
  const hit = {
    objectID: '8863',
    title: 'My YC app',
    url: 'https://example.com/post',
    author: 'pg',
    points: 104,
    num_comments: 71,
    created_at_i: 1175714200,
    story_text: 'some body text',
  };

  it('maps a hit to an AlapLink', () => {
    const link = mapAlgoliaHit(hit);
    expect(link).not.toBeNull();
    expect(link!.url).toBe(hit.url);
    expect(link!.label).toBe(hit.title);
    expect(link!.tags).toEqual(['hn', 'search']);
    expect(link!.meta?.id).toBe('8863');
    expect(link!.meta?.hnUrl).toBe(hnItemUrl('8863'));
    expect(link!.createdAt).toBe(hit.created_at_i * 1000);
    expect(link!.description).toBe('some body text');
  });

  it('rejects a hit with a non-numeric objectID', () => {
    // Security fix: URL-template injection defense.
    expect(mapAlgoliaHit({ ...hit, objectID: 'evil"onclick' })).toBeNull();
    expect(mapAlgoliaHit({ ...hit, objectID: '1; drop' })).toBeNull();
    expect(mapAlgoliaHit({ ...hit, objectID: '1abc' })).toBeNull();
  });

  it('returns null on missing objectID or null input', () => {
    expect(mapAlgoliaHit({ ...hit, objectID: '' })).toBeNull();
    expect(mapAlgoliaHit(null)).toBeNull();
    expect(mapAlgoliaHit(undefined)).toBeNull();
  });

  it('falls back to discussion URL when hit.url is missing', () => {
    const link = mapAlgoliaHit({ ...hit, url: undefined });
    expect(link!.url).toBe(hnItemUrl('8863'));
  });
});

// ═══════════════════════════════════════════════════════════════
// Handler integration tests (fetch mocked)
// ═══════════════════════════════════════════════════════════════

describe(':hn: handler', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // Listing sub-modes
  // -------------------------------------------------------------

  describe('listing sub-modes (top, new, best, ask, show, job)', () => {
    it('fetches top IDs then hydrates each item', async () => {
      const topIds = [1001, 1002, 1003];
      const items: Record<number, unknown> = {
        1001: { id: 1001, type: 'story', title: 'First',  url: 'https://ex/1', time: 1700000000, by: 'a', score: 42, descendants: 5 },
        1002: { id: 1002, type: 'story', title: 'Second', url: 'https://ex/2', time: 1700000100, by: 'b', score: 17, descendants: 2 },
        1003: { id: 1003, type: 'story', title: 'Third',  url: 'https://ex/3', time: 1700000200, by: 'c', score:  9, descendants: 0 },
      };

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('topstories.json')) return Promise.resolve(jsonResponse(topIds));
        const match = url.match(/item\/(\d+)\.json/);
        if (match) return Promise.resolve(jsonResponse(items[parseInt(match[1], 10)]));
        return Promise.reject(new Error(`unexpected URL ${url}`));
      }) as typeof fetch;

      const links = await hnHandler(['top'], mockConfig());
      expect(links).toHaveLength(3);
      expect(links[0].label).toBe('First');
      expect(links[0].url).toBe('https://ex/1');
      expect(links[0].meta?.source).toBe('hn');
      expect(links[0].cssClass).toContain('source_hn');
    });

    it('named limit=N caps the fan-out', async () => {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('newstories.json')) return Promise.resolve(jsonResponse(ids));
        return Promise.resolve(jsonResponse({ id: 1, type: 'story', title: 'x', time: 1 }));
      });
      globalThis.fetch = fetchMock as typeof fetch;

      await hnHandler(['new', 'limit=3'], mockConfig());

      // 1 listing fetch + 3 item fetches = 4 calls total.
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('config.defaults.limit is used when no named limit is given', async () => {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('beststories.json')) return Promise.resolve(jsonResponse(ids));
        return Promise.resolve(jsonResponse({ id: 1, type: 'story', title: 'x', time: 1 }));
      });
      globalThis.fetch = fetchMock as typeof fetch;

      await hnHandler(['best'], mockConfig({ defaults: { limit: 5 } }));

      // 1 listing + 5 items
      expect(fetchMock).toHaveBeenCalledTimes(6);
    });

    it('named limit wins over config default (precedence)', async () => {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('askstories.json')) return Promise.resolve(jsonResponse(ids));
        return Promise.resolve(jsonResponse({ id: 1, type: 'story', title: 'x', time: 1 }));
      });
      globalThis.fetch = fetchMock as typeof fetch;

      await hnHandler(['ask', 'limit=2'], mockConfig({ defaults: { limit: 10 } }));

      // named=2 should beat defaults.limit=10
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('filters non-numeric ids out of the listing response (security fix)', async () => {
      const hostileIds: unknown = [1001, 'evil', null, 1002];
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('showstories.json')) return Promise.resolve(jsonResponse(hostileIds));
        const match = url.match(/item\/(\d+)\.json/);
        if (match) return Promise.resolve(jsonResponse({
          id: parseInt(match[1], 10), type: 'story', title: `item ${match[1]}`, time: 1,
        }));
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });
      globalThis.fetch = fetchMock as typeof fetch;

      const links = await hnHandler(['show'], mockConfig());

      // Only 2 numeric ids should result in item fetches.
      expect(links).toHaveLength(2);
      // 1 listing + 2 items = 3 fetches. Non-numeric ids never hit the network.
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  // -------------------------------------------------------------
  // User submissions
  // -------------------------------------------------------------

  describe(':hn:user:', () => {
    it('fetches the user record then hydrates submitted items', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/user/pg.json')) return Promise.resolve(jsonResponse({
          id: 'pg', submitted: [2001, 2002], karma: 1_000_000,
        }));
        const match = url.match(/item\/(\d+)\.json/);
        if (match) return Promise.resolve(jsonResponse({
          id: parseInt(match[1], 10), type: 'story', title: `pg post ${match[1]}`, time: 1,
        }));
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });
      globalThis.fetch = fetchMock as typeof fetch;

      const links = await hnHandler(['user', 'pg'], mockConfig());
      expect(links).toHaveLength(2);
      expect(links[0].label).toBe('pg post 2001');
      expect(links[0].meta?.source).toBe('hn');
    });

    it('warns and returns [] when username is missing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = vi.fn() as typeof fetch;

      const links = await hnHandler(['user'], mockConfig());
      expect(links).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('returns [] when user has no submitted array', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ id: 'pg' })) as typeof fetch;
      const links = await hnHandler(['user', 'pg'], mockConfig());
      expect(links).toEqual([]);
    });
  });

  // -------------------------------------------------------------
  // Search via Algolia ($preset resolution)
  // -------------------------------------------------------------

  describe(':hn:search:', () => {
    it('resolves $preset through the searches map', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
        hits: [{ objectID: '42', title: 'A paper', url: 'https://ex/paper',
          author: 'x', points: 10, created_at_i: 1700000000 }],
      }));
      globalThis.fetch = fetchMock as typeof fetch;

      const links = await hnHandler(
        ['search', '$ai_papers'],
        mockConfig({ searches: { ai_papers: 'artificial intelligence papers' } }),
      );
      expect(links).toHaveLength(1);

      const calledUrl = (fetchMock.mock.calls[0][0] as string);
      // URL-encoded space → +. URL constructor encodes with %20 or +; both fine.
      expect(calledUrl).toMatch(/query=artificial(\+|%20)intelligence(\+|%20)papers/);
    });

    it('accepts bare name (without the $ sigil)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hits: [] }));
      globalThis.fetch = fetchMock as typeof fetch;

      await hnHandler(
        ['search', 'ai_papers'],
        mockConfig({ searches: { ai_papers: 'artificial intelligence papers' } }),
      );

      const calledUrl = (fetchMock.mock.calls[0][0] as string);
      expect(calledUrl).toMatch(/query=artificial/);
    });

    it('treats an unknown key as a literal search term', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hits: [] }));
      globalThis.fetch = fetchMock as typeof fetch;

      await hnHandler(['search', 'rust'], mockConfig());

      const calledUrl = (fetchMock.mock.calls[0][0] as string);
      expect(calledUrl).toContain('query=rust');
    });

    it('restricts Algolia to stories (tags=story) so comments never fill the menu', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hits: [] }));
      globalThis.fetch = fetchMock as typeof fetch;

      await hnHandler(['search', 'rust'], mockConfig());

      const calledUrl = (fetchMock.mock.calls[0][0] as string);
      expect(calledUrl).toContain('tags=story');
    });

    it('warns and returns [] when query is missing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = vi.fn() as typeof fetch;

      const links = await hnHandler(['search'], mockConfig());
      expect(links).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('drops hits with non-numeric objectID (security fix)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
        hits: [
          { objectID: '42',            title: 'ok',     url: 'https://ex/1' },
          { objectID: 'evil"injected', title: 'hostile', url: 'https://ex/2' },
          { objectID: '99',            title: 'ok too', url: 'https://ex/3' },
        ],
      })) as typeof fetch;

      const links = await hnHandler(['search', 'x'], mockConfig());
      expect(links).toHaveLength(2);
      expect(links.every((l) => /^\d+$/.test(String(l.meta?.id)))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Items — zero or more ids, each as a positional segment
  //   :hn:items:                → no-op
  //   :hn:items:8863:           → one
  //   :hn:items:8863:8845:828:  → three
  // -------------------------------------------------------------

  describe(':hn:items:', () => {
    const itemFetch = (items: Record<number, unknown>) =>
      vi.fn().mockImplementation((url: string) => {
        const match = url.match(/item\/(\d+)\.json/);
        if (match) return Promise.resolve(jsonResponse(items[parseInt(match[1], 10)]));
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });

    it('fetches one item when a single positional id is given', async () => {
      globalThis.fetch = itemFetch({ [sampleStory.id]: sampleStory }) as typeof fetch;
      const links = await hnHandler(['items', String(sampleStory.id)], mockConfig());
      expect(links).toHaveLength(1);
      expect(links[0].url).toBe(sampleStory.url);
    });

    it('fetches multiple items when ids are positional segments', async () => {
      const items = {
        8863: { id: 8863, type: 'story', title: 'First',  url: 'https://ex/1', time: 1 },
        8845: { id: 8845, type: 'story', title: 'Second', url: 'https://ex/2', time: 1 },
        828:  { id: 828,  type: 'story', title: 'Third',  url: 'https://ex/3', time: 1 },
      };
      const fetchMock = itemFetch(items);
      globalThis.fetch = fetchMock as typeof fetch;

      // Tokenizer hands the handler ['items', '8863', '8845', '828'] for
      // the expression :hn:items:8863:8845:828:
      const links = await hnHandler(['items', '8863', '8845', '828'], mockConfig());
      expect(links).toHaveLength(3);
      expect(links.map((l) => l.label)).toEqual(['First', 'Second', 'Third']);
      // Three parallel item fetches — one per id.
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('is a no-op when no ids are provided', async () => {
      globalThis.fetch = vi.fn() as typeof fetch;
      const links = await hnHandler(['items'], mockConfig());
      expect(links).toEqual([]);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('drops non-numeric positional segments', async () => {
      const items = {
        8863: { id: 8863, type: 'story', title: 'Only real', url: 'https://ex/1', time: 1 },
      };
      const fetchMock = itemFetch(items);
      globalThis.fetch = fetchMock as typeof fetch;

      const links = await hnHandler(['items', '8863', 'not-an-id', ''], mockConfig());
      expect(links).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('warns and returns [] when every positional is non-numeric', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = vi.fn() as typeof fetch;

      const links = await hnHandler(['items', 'abc', 'xyz'], mockConfig());
      expect(links).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('ignores named args (id count defines the request)', async () => {
      // limit=99 is meaningless here — the positional ids are the list.
      const items = {
        8863: { id: 8863, type: 'story', title: 'One', url: 'https://ex/1', time: 1 },
      };
      const fetchMock = itemFetch(items);
      globalThis.fetch = fetchMock as typeof fetch;

      const links = await hnHandler(['items', '8863', 'limit=99'], mockConfig());
      expect(links).toHaveLength(1);
    });

    it('caps lists longer than HN_ITEMS_MAX (rate-limit defense)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Build a 10-id list; cap is 6.
      const ids = Array.from({ length: 10 }, (_, i) => String(i + 1));
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        const match = url.match(/item\/(\d+)\.json/);
        if (match) return Promise.resolve(jsonResponse({
          id: parseInt(match[1], 10), type: 'story', title: `item ${match[1]}`, time: 1,
        }));
        return Promise.reject(new Error(`unexpected URL ${url}`));
      });
      globalThis.fetch = fetchMock as typeof fetch;

      const links = await hnHandler(['items', ...ids], mockConfig());
      expect(links).toHaveLength(6);
      expect(fetchMock).toHaveBeenCalledTimes(6);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('capping at 6'));
    });
  });

  // -------------------------------------------------------------
  // Unknown command
  // -------------------------------------------------------------

  describe('unknown commands', () => {
    it('warns and returns [] on unknown sub-mode', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      globalThis.fetch = vi.fn() as typeof fetch;

      const links = await hnHandler(['bogus'], mockConfig());
      expect(links).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------
  // Graceful degradation
  // -------------------------------------------------------------

  describe('graceful degradation', () => {
    it('returns [] on HTTP 500 from the listing endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(errorResponse(500)) as typeof fetch;
      const links = await hnHandler(['top'], mockConfig());
      expect(links).toEqual([]);
    });

    it('returns [] when listing response is not an array', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse('not an array')) as typeof fetch;
      const links = await hnHandler(['top'], mockConfig());
      expect(links).toEqual([]);
    });

    it('returns [] when a network error is thrown', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('DNS failure')) as typeof fetch;
      const links = await hnHandler(['top'], mockConfig());
      expect(links).toEqual([]);
    });
  });

  // -------------------------------------------------------------
  // Source indicator
  // -------------------------------------------------------------

  describe('source indicators', () => {
    it('stamps source_hn on cssClass and source:"hn" on meta for every link', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('topstories.json')) return Promise.resolve(jsonResponse([1]));
        return Promise.resolve(jsonResponse(sampleStory));
      }) as typeof fetch;

      const links = await hnHandler(['top'], mockConfig());
      expect(links).toHaveLength(1);
      expect(links[0].cssClass).toContain('source_hn');
      expect(links[0].meta?.source).toBe('hn');
    });
  });

  // -------------------------------------------------------------
  // fetchJson safeguards — tested directly because the SSRF guard
  // and timeout live there, not in the handler dispatch.
  // -------------------------------------------------------------

  describe('fetchJson safeguards', () => {
    it('refuses private-host URLs via the SSRF guard (never calls fetch)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as typeof fetch;

      // Loopback (v4 + v6), RFC 1918, link-local / cloud metadata.
      expect(await fetchJson('http://127.0.0.1/x')).toBeNull();
      expect(await fetchJson('http://[::1]/x')).toBeNull();
      expect(await fetchJson('http://10.0.0.5/x')).toBeNull();
      expect(await fetchJson('http://169.254.169.254/latest/meta-data')).toBeNull();
      expect(await fetchJson('http://localhost/x')).toBeNull();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('refusing unsafe URL'));
    });

    it('still fetches public URLs when the SSRF guard permits them', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([1, 2, 3]));
      globalThis.fetch = fetchMock as typeof fetch;

      const result = await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json');

      expect(result).toEqual([1, 2, 3]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('enforces WEB_FETCH_TIMEOUT_MS via AbortController (never-resolving fetch → null)', async () => {
      vi.useFakeTimers();
      try {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Simulate a hung server: resolve only if the caller aborts.
        globalThis.fetch = vi.fn((_url: string, opts?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }),
        ) as typeof fetch;

        const pending = fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json');

        // Advance past the 10 000 ms timeout; the AbortController fires,
        // the fetch promise rejects, the catch branch warns + returns null.
        await vi.advanceTimersByTimeAsync(10_001);

        expect(await pending).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('timeout after 10000ms'));
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
