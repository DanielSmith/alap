import { describe, it, expect } from 'vitest';
import {
  buildFetchPlan,
  parseJsonApiResponse,
  parseOembedResponse,
} from '../../editors/shared/meta/fetch-strategy';
import { DEFAULT_RULE } from '../../editors/shared/meta/meta-rules';
import type { SiteRule } from '../../editors/shared/meta/meta-rules';

// --- buildFetchPlan ---

describe('buildFetchPlan', () => {
  it('returns html_scrape plan for default strategy', () => {
    const plan = buildFetchPlan('https://example.com/article', DEFAULT_RULE);
    expect(plan.strategy).toBe('html_scrape');
    expect(plan.url).toBe('https://example.com/article');
    expect(plan.expectedFormat).toBe('html');
  });

  it('appends .json for json_api strategy', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'reddit.com',
      strategy: 'json_api',
      strategyConfig: { jsonUrlTransform: '${url}.json' },
    };
    const plan = buildFetchPlan('https://reddit.com/r/javascript/comments/abc', rule);
    expect(plan.strategy).toBe('json_api');
    expect(plan.url).toBe('https://reddit.com/r/javascript/comments/abc.json');
    expect(plan.expectedFormat).toBe('json');
  });

  it('uses default .json transform when no template given', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'reddit.com',
      strategy: 'json_api',
      strategyConfig: {},
    };
    const plan = buildFetchPlan('https://reddit.com/r/test', rule);
    expect(plan.url).toBe('https://reddit.com/r/test.json');
  });

  it('builds oembed URL with encoded original URL', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'instagram.com',
      strategy: 'oembed',
      strategyConfig: { oembedUrl: 'https://api.instagram.com/oembed?url=${url}' },
    };
    const original = 'https://instagram.com/p/abc123';
    const plan = buildFetchPlan(original, rule);
    expect(plan.strategy).toBe('oembed');
    expect(plan.url).toBe(`https://api.instagram.com/oembed?url=${encodeURIComponent(original)}`);
    expect(plan.expectedFormat).toBe('json');
  });

  it('rewrites URL for abstract_redirect strategy', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'arxiv.org',
      strategy: 'abstract_redirect',
      strategyConfig: { urlRewrite: '/pdf/→/abs/' },
    };
    const plan = buildFetchPlan('https://arxiv.org/pdf/2301.00001', rule);
    expect(plan.strategy).toBe('abstract_redirect');
    expect(plan.url).toBe('https://arxiv.org/abs/2301.00001');
    expect(plan.expectedFormat).toBe('html');
  });

  it('handles abstract_redirect with arrow notation', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'arxiv.org',
      strategy: 'abstract_redirect',
      strategyConfig: { urlRewrite: '/pdf/ -> /abs/' },
    };
    const plan = buildFetchPlan('https://arxiv.org/pdf/2301.00001', rule);
    expect(plan.url).toBe('https://arxiv.org/abs/2301.00001');
  });

  it('returns original URL when abstract_redirect has no rewrite', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'example.org',
      strategy: 'abstract_redirect',
      strategyConfig: {},
    };
    const plan = buildFetchPlan('https://example.org/doc', rule);
    expect(plan.url).toBe('https://example.org/doc');
  });

  it('builds at_protocol plan', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'bsky.app',
      strategy: 'at_protocol',
      strategyConfig: { apiEndpoint: 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${url}' },
    };
    const original = 'at://did:plc:abc/app.bsky.feed.post/123';
    const plan = buildFetchPlan(original, rule);
    expect(plan.strategy).toBe('at_protocol');
    expect(plan.expectedFormat).toBe('json');
    expect(plan.url).toContain(encodeURIComponent(original));
  });

  it('handles null strategyConfig gracefully', () => {
    const rule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'reddit.com',
      strategy: 'json_api',
      strategyConfig: null,
    };
    const plan = buildFetchPlan('https://reddit.com/r/test', rule);
    expect(plan.url).toBe('https://reddit.com/r/test.json');
  });
});

// --- parseJsonApiResponse ---

describe('parseJsonApiResponse', () => {
  it('extracts fields using dotted paths', () => {
    const data = [
      { data: { children: [{ data: { title: 'Hello Reddit', author: 'testuser' } }] } },
    ];
    const config = {
      jsonPath: {
        title: '0.data.children.0.data.title',
        meta_author: '0.data.children.0.data.author',
      },
    };
    const raw = parseJsonApiResponse(data, config);
    expect(raw.title).toBe('Hello Reddit');
    expect(raw.meta_author).toBe('testuser');
  });

  it('handles missing paths gracefully', () => {
    const data = { title: 'hi' };
    const config = {
      jsonPath: { title: 'nonexistent.path.here' },
    };
    const raw = parseJsonApiResponse(data, config);
    expect(raw.title).toBeUndefined();
  });

  it('extracts number values', () => {
    const data = { stats: { score: 42 } };
    const config = { jsonPath: { score: 'stats.score' } };
    const raw = parseJsonApiResponse(data, config);
    expect(raw.score).toBe(42);
  });

  it('extracts array of strings', () => {
    const data = { meta: { tags: ['javascript', 'web'] } };
    const config = { jsonPath: { tags: 'meta.tags' } };
    const raw = parseJsonApiResponse(data, config);
    expect(raw.tags).toEqual(['javascript', 'web']);
  });

  it('returns empty when no jsonPath config', () => {
    const raw = parseJsonApiResponse({ title: 'hi' }, {});
    expect(Object.keys(raw)).toHaveLength(0);
  });

  it('handles null data', () => {
    const raw = parseJsonApiResponse(null, { jsonPath: { title: 'title' } });
    expect(Object.keys(raw)).toHaveLength(0);
  });

  it('navigates array indices in path', () => {
    const data = { items: ['first', 'second', 'third'] };
    const config = { jsonPath: { item: 'items.1' } };
    const raw = parseJsonApiResponse(data, config);
    expect(raw.item).toBe('second');
  });
});

// --- parseOembedResponse ---

describe('parseOembedResponse', () => {
  it('maps standard oEmbed fields', () => {
    const data = {
      title: 'My Video',
      author_name: 'Creator',
      author_url: 'https://example.com/creator',
      provider_name: 'YouTube',
      thumbnail_url: 'https://img.example.com/thumb.jpg',
      type: 'video',
      html: '<iframe src="..."></iframe>',
      width: 640,
      height: 480,
      thumbnail_width: 320,
      thumbnail_height: 240,
    };
    const raw = parseOembedResponse(data);

    expect(raw.oembed_title).toBe('My Video');
    expect(raw.oembed_author).toBe('Creator');
    expect(raw.oembed_author_url).toBe('https://example.com/creator');
    expect(raw.og_site_name).toBe('YouTube');
    expect(raw.oembed_thumbnail).toBe('https://img.example.com/thumb.jpg');
    expect(raw.oembed_type).toBe('video');
    expect(raw.oembed_html).toBe('<iframe src="..."></iframe>');
    expect(raw.oembed_width).toBe(640);
    expect(raw.oembed_height).toBe(480);
    expect(raw.oembed_thumb_width).toBe(320);
    expect(raw.oembed_thumb_height).toBe(240);
  });

  it('handles minimal oEmbed response', () => {
    const raw = parseOembedResponse({ title: 'Just a Title' });
    expect(raw.oembed_title).toBe('Just a Title');
    expect(raw.oembed_author).toBeUndefined();
    expect(raw.oembed_thumbnail).toBeUndefined();
  });

  it('returns empty for null input', () => {
    const raw = parseOembedResponse(null);
    expect(Object.keys(raw)).toHaveLength(0);
  });

  it('returns empty for non-object input', () => {
    const raw = parseOembedResponse('not an object');
    expect(Object.keys(raw)).toHaveLength(0);
  });

  it('skips non-string fields where string expected', () => {
    const raw = parseOembedResponse({ title: 123, author_name: true });
    expect(raw.oembed_title).toBeUndefined();
    expect(raw.oembed_author).toBeUndefined();
  });
});
