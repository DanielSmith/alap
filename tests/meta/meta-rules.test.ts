import { describe, it, expect } from 'vitest';
import {
  normalizeTag,
  getRuleForDomain,
  applyRule,
  sanitizeRaw,
  DEFAULT_RULE,
} from '../../editors/shared/meta/meta-rules';
import { SEED_RULES } from '../../editors/shared/meta/seed-rules';
import type { SiteRule } from '../../editors/shared/meta/meta-rules';

// --- normalizeTag ---

describe('normalizeTag', () => {
  it('lowercases', () => {
    expect(normalizeTag('Politics')).toBe('politics');
  });

  it('replaces spaces with underscores', () => {
    expect(normalizeTag('New York')).toBe('new_york');
  });

  it('replaces hyphens with underscores (dash is WITHOUT operator)', () => {
    expect(normalizeTag('sci-fi')).toBe('sci_fi');
  });

  it('strips exclamation marks', () => {
    expect(normalizeTag('moulin_rouge!')).toBe('moulin_rouge');
  });

  it('strips question marks', () => {
    expect(normalizeTag('why?')).toBe('why');
  });

  it('strips parentheses', () => {
    expect(normalizeTag('music (live)')).toBe('music_live');
  });

  it('strips ampersands', () => {
    expect(normalizeTag('rock & roll')).toBe('rock_roll');
  });

  it('strips quotes', () => {
    expect(normalizeTag('"quoted"')).toBe('quoted');
  });

  it('collapses multiple underscores', () => {
    expect(normalizeTag('one - - two')).toBe('one_two');
  });

  it('trims leading/trailing underscores', () => {
    expect(normalizeTag(' -hello- ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(normalizeTag('')).toBe('');
  });

  it('preserves numbers', () => {
    expect(normalizeTag('web3')).toBe('web3');
  });

  it('handles unicode by stripping non-ascii', () => {
    expect(normalizeTag('café')).toBe('caf');
  });

  it('handles multiple spaces', () => {
    expect(normalizeTag('one   two   three')).toBe('one_two_three');
  });
});

// --- getRuleForDomain ---

describe('getRuleForDomain', () => {
  it('returns exact match from seed rules', () => {
    const rule = getRuleForDomain('cnn.com', SEED_RULES);
    expect(rule.domain).toBe('cnn.com');
  });

  it('strips www. prefix', () => {
    const rule = getRuleForDomain('www.cnn.com', SEED_RULES);
    expect(rule.domain).toBe('cnn.com');
  });

  it('is case insensitive', () => {
    const rule = getRuleForDomain('CNN.COM', SEED_RULES);
    expect(rule.domain).toBe('cnn.com');
  });

  it('returns default for unknown domain', () => {
    const rule = getRuleForDomain('unknown-blog.example.com');
    expect(rule.domain).toBe('_default');
  });

  it('matches subdomain against bare domain rule', () => {
    const rule = getRuleForDomain('edition.cnn.com', SEED_RULES);
    expect(rule.domain).toBe('cnn.com');
  });

  it('prefers exact subdomain match over bare domain', () => {
    const subdomainRule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'food.example.org',
    };
    const bareRule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'example.org',
    };

    const rule = getRuleForDomain('food.example.org', [subdomainRule, bareRule]);
    expect(rule.domain).toBe('food.example.org');
  });

  it('falls back to bare domain when subdomain has no specific rule', () => {
    const bareRule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'example.org',
    };

    const rule = getRuleForDomain('cooking.example.org', [bareRule]);
    expect(rule.domain).toBe('example.org');
  });

  it('rules parameter takes priority over default', () => {
    const overrideRule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'cnn.com',
      strategy: 'oembed',
    };

    const rule = getRuleForDomain('cnn.com', [overrideRule]);
    expect(rule.strategy).toBe('oembed');
  });

  it('returns default when rules is empty and domain unknown', () => {
    const rule = getRuleForDomain('niche-blog.net', []);
    expect(rule.domain).toBe('_default');
  });
});

// --- sanitizeRaw ---

describe('sanitizeRaw', () => {
  it('passes through clean strings', () => {
    const result = sanitizeRaw({ title: 'Hello World' });
    expect(result.title).toBe('Hello World');
  });

  it('passes through numbers', () => {
    const result = sanitizeRaw({ count: 42 });
    expect(result.count).toBe(42);
  });

  it('passes through null', () => {
    const result = sanitizeRaw({ empty: null });
    expect(result.empty).toBeNull();
  });

  it('drops fields with script tags', () => {
    const result = sanitizeRaw({ title: '<script>alert("xss")</script>' });
    expect(result.title).toBeUndefined();
  });

  it('drops fields with javascript: URIs', () => {
    const result = sanitizeRaw({ url: 'javascript:alert(1)' });
    expect(result.url).toBeUndefined();
  });

  it('drops fields with event handlers', () => {
    const result = sanitizeRaw({ title: 'hello onload=alert(1)' });
    expect(result.title).toBeUndefined();
  });

  it('drops fields with data:text/html', () => {
    const result = sanitizeRaw({ url: 'data:text/html,<script>alert(1)</script>' });
    expect(result.url).toBeUndefined();
  });

  it('drops fields with entity-encoded script tags (obfuscation)', () => {
    const result = sanitizeRaw({ title: '&#x3c;script&#x3e;alert(1)' });
    expect(result.title).toBeUndefined();
  });

  it('allows harmless HTML entities like &mdash;', () => {
    const result = sanitizeRaw({ title: 'Rust and Go vs everything else &mdash; Bitfield' });
    expect(result.title).toBe('Rust and Go vs everything else &mdash; Bitfield');
  });

  it('allows numeric entities like &#8212; (em dash)', () => {
    const result = sanitizeRaw({ title: 'Hello &#8212; World' });
    expect(result.title).toBe('Hello &#8212; World');
  });

  it('strips HTML tags from clean values', () => {
    const result = sanitizeRaw({ title: 'Hello <b>World</b>' });
    expect(result.title).toBe('Hello World');
  });

  it('filters unsafe values from arrays', () => {
    const result = sanitizeRaw({
      tags: ['good', '<script>bad</script>', 'also_good'],
    });
    expect(result.tags).toEqual(['good', 'also_good']);
  });

  it('drops array field entirely if all values unsafe', () => {
    const result = sanitizeRaw({
      tags: ['<script>bad</script>', 'javascript:void(0)'],
    });
    expect(result.tags).toBeUndefined();
  });

  it('sets empty string values to null', () => {
    const result = sanitizeRaw({ title: '  ' });
    expect(result.title).toBeNull();
  });
});

// --- applyRule ---

describe('applyRule', () => {
  const baseRaw = {
    og_title: 'OG Title',
    twitter_title: 'Twitter Title',
    title_tag: 'Title Tag',
    og_description: 'OG Description',
    meta_description: 'Meta Description',
    og_images: ['https://example.com/img.jpg'],
    twitter_image: 'https://example.com/tw.jpg',
    og_site_name: 'Example Site',
    og_type: 'article',
    og_locale: 'en_US',
    canonical_url: 'https://example.com/article',
    article_author: 'Jane Doe, John Smith',
    article_published_time: '2026-03-15T10:00:00Z',
    article_modified_time: '2026-03-16T12:00:00Z',
  };

  it('resolves title by priority (og_title first)', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.title).toBe('OG Title');
  });

  it('falls back to next title in priority', () => {
    const { og_title, ...raw } = baseRaw;
    const result = applyRule(raw, 'example.com');
    expect(result.title).toBe('Twitter Title');
  });

  it('falls back to hostname when no title found', () => {
    const result = applyRule({}, 'example.com');
    expect(result.title).toBe('example.com');
  });

  it('resolves description', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.description).toBe('OG Description');
  });

  it('resolves thumbnail URL', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.thumbnail).toBe('https://example.com/img.jpg');
  });

  it('resolves canonical URL', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.canonicalUrl).toBe('https://example.com/article');
  });

  it('uses canonical URL as primary url', () => {
    const result = applyRule(baseRaw, 'example.com', 'https://example.com/original');
    expect(result.url).toBe('https://example.com/article');
  });

  it('falls back to originalUrl when no canonical', () => {
    const { canonical_url, ...raw } = baseRaw;
    const result = applyRule(raw, 'example.com', 'https://example.com/original');
    expect(result.url).toBe('https://example.com/original');
  });

  it('splits authors by comma', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.authors).toEqual(['Jane Doe', 'John Smith']);
  });

  it('adds authors as tags', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.tags).toContain('jane_doe');
    expect(result.tags).toContain('john_smith');
  });

  it('resolves published date', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.publishedDate).toBe('2026-03-15T10:00:00Z');
  });

  it('resolves modified date', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.modifiedDate).toBe('2026-03-16T12:00:00Z');
  });

  it('normalizes locale as tag', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.locale).toBe('en_us');
  });

  it('includes hostname as tag by default', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.tags).toContain('example_com');
  });

  it('includes og_site_name in tags', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.tags).toContain('example_site');
  });

  it('resolves site name', () => {
    const result = applyRule(baseRaw, 'example.com');
    expect(result.siteName).toBe('Example Site');
  });

  it('rejects thumbnail with javascript: URL', () => {
    const result = applyRule(
      { og_images: ['javascript:alert(1)'] },
      'example.com',
    );
    expect(result.thumbnail).toBeNull();
  });

  it('uses site-specific rule when domain matches', () => {
    const raw = {
      ...baseRaw,
      meta_section: 'politics',
      meta_keywords: [],
    };
    const result = applyRule(raw, 'cnn.com', undefined, SEED_RULES);
    expect(result.tags).toContain('politics');
  });

  it('respects tags_skip', () => {
    const raw = {
      ...baseRaw,
      meta_keywords: ['ignored'],
    };
    const result = applyRule(raw, 'cnn.com', undefined, SEED_RULES);
    expect(result.tags).not.toContain('ignored');
  });

  it('uses rules parameter when provided', () => {
    const customRule: SiteRule = {
      ...DEFAULT_RULE,
      domain: 'custom.org',
      tag_hostname: false,
    };
    const result = applyRule(baseRaw, 'custom.org', undefined, [customRule]);
    expect(result.tags).not.toContain('custom_org');
  });

  it('resolves geo from place: properties', () => {
    const raw = {
      place_latitude: '40.7128',
      place_longitude: '-74.0060',
    };
    const result = applyRule(raw, 'example.com');
    expect(result.latitude).toBeCloseTo(40.7128);
    expect(result.longitude).toBeCloseTo(-74.006);
  });

  it('resolves geo from compound geo.position field', () => {
    const raw = { geo_position: '40.7128;-74.0060' };
    const result = applyRule(raw, 'example.com');
    expect(result.latitude).toBeCloseTo(40.7128);
    expect(result.longitude).toBeCloseTo(-74.006);
  });

  it('resolves geo from ICBM field', () => {
    const raw = { icbm: '40.7128, -74.0060' };
    const result = applyRule(raw, 'example.com');
    expect(result.latitude).toBeCloseTo(40.7128);
    expect(result.longitude).toBeCloseTo(-74.006);
  });

  it('deduplicates tags', () => {
    const raw = {
      og_site_name: 'example',
      og_type: 'example',
    };
    const result = applyRule(raw, 'example.com');
    const exampleCount = result.tags.filter(t => t === 'example').length;
    expect(exampleCount).toBe(1);
  });
});
