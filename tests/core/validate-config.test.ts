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

import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/core/validateConfig';

describe('validateConfig', () => {
  // --- Valid configs pass through ---

  it('passes a minimal valid config through', () => {
    const config = {
      allLinks: {
        brooklyn: { label: 'Brooklyn Bridge', url: 'https://example.com/brooklyn', tags: ['nyc'] },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.brooklyn.label).toBe('Brooklyn Bridge');
    expect(result.allLinks.brooklyn.url).toBe('https://example.com/brooklyn');
    expect(result.allLinks.brooklyn.tags).toEqual(['nyc']);
  });

  it('preserves settings, macros, and searchPatterns', () => {
    const config = {
      settings: { listType: 'ul', menuTimeout: 5000 },
      macros: { fav: { linkItems: '.coffee' } },
      searchPatterns: { wiki: { pattern: 'wikipedia\\.org', options: { fields: 'u' } } },
      allLinks: { a: { label: 'A', url: '/a' } },
    };
    const result = validateConfig(config);
    expect(result.settings?.listType).toBe('ul');
    expect(result.macros?.fav.linkItems).toBe('.coffee');
    expect(result.searchPatterns?.wiki).toBeDefined();
  });

  // --- Structural validation ---

  it('throws on null input', () => {
    expect(() => validateConfig(null)).toThrow('expected an object');
  });

  it('throws on non-object input', () => {
    expect(() => validateConfig('not a config')).toThrow('expected an object');
  });

  it('throws when allLinks is missing', () => {
    expect(() => validateConfig({ settings: {} })).toThrow('allLinks must be a non-null object');
  });

  it('throws when allLinks is an array', () => {
    expect(() => validateConfig({ allLinks: [] })).toThrow('allLinks must be a non-null object');
  });

  it('throws when allLinks is null', () => {
    expect(() => validateConfig({ allLinks: null })).toThrow('allLinks must be a non-null object');
  });

  it('skips links with missing url', () => {
    const config = {
      allLinks: {
        noUrl: { label: 'No URL' },
        valid: { label: 'Valid', url: '/valid' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.valid).toBeDefined();
    expect(result.allLinks.noUrl).toBeUndefined();
  });

  it('skips links that are not objects', () => {
    const config = {
      allLinks: {
        bad: 'not an object',
        valid: { label: 'Valid', url: '/valid' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.valid).toBeDefined();
    expect(result.allLinks.bad).toBeUndefined();
  });

  // --- URL sanitization ---

  it('sanitizes javascript: URLs in links', () => {
    const config = {
      allLinks: {
        xss: { label: 'XSS', url: 'javascript:alert(1)' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.xss.url).toBe('about:blank');
  });

  it('sanitizes javascript: in image field', () => {
    const config = {
      allLinks: {
        img: { label: 'Img', url: '/safe', image: 'javascript:alert(1)' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.img.image).toBe('about:blank');
  });

  it('leaves safe URLs unchanged', () => {
    const config = {
      allLinks: {
        safe: { label: 'Safe', url: 'https://example.com' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.safe.url).toBe('https://example.com');
  });

  // --- Tags validation ---

  it('filters non-string values from tags array', () => {
    const config = {
      allLinks: {
        item: { label: 'Item', url: '/item', tags: ['good', 42, null, 'also_good'] },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.tags).toEqual(['good', 'also_good']);
  });

  it('ignores tags that are not an array', () => {
    const config = {
      allLinks: {
        item: { label: 'Item', url: '/item', tags: 'not-an-array' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.tags).toBeUndefined();
  });

  // --- Hyphen rejection ---

  it('skips item IDs with hyphens', () => {
    const config = {
      allLinks: {
        good_item: { label: 'Good', url: '/good' },
        'bad-item': { label: 'Bad', url: '/bad' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.good_item).toBeDefined();
    expect(result.allLinks['bad-item']).toBeUndefined();
  });

  it('skips macros with hyphens', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      macros: {
        good_macro: { linkItems: '.tag' },
        'bad-macro': { linkItems: '.tag' },
      },
    };
    const result = validateConfig(config);
    expect(result.macros!.good_macro).toBeDefined();
    expect(result.macros!['bad-macro']).toBeUndefined();
  });

  it('skips search patterns with hyphens', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      searchPatterns: {
        good_pattern: 'bridge',
        'bad-pattern': 'bridge',
      },
    };
    const result = validateConfig(config);
    expect(result.searchPatterns!.good_pattern).toBeDefined();
    expect(result.searchPatterns!['bad-pattern']).toBeUndefined();
  });

  it('strips hyphenated tags but keeps the link', () => {
    const config = {
      allLinks: {
        item: { label: 'Item', url: '/item', tags: ['good', 'bad-tag', 'also_good'] },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item).toBeDefined();
    expect(result.allLinks.item.tags).toEqual(['good', 'also_good']);
  });

  it('allows hyphens in non-expression fields', () => {
    const config = {
      allLinks: {
        item: {
          label: 'Blue Bottle - Oakland',
          url: 'https://blue-bottle.com/my-page',
          cssClass: 'card-style',
          description: 'A high-end roaster',
          tags: ['coffee'],
        },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.label).toBe('Blue Bottle - Oakland');
    expect(result.allLinks.item.url).toBe('https://blue-bottle.com/my-page');
    expect(result.allLinks.item.cssClass).toBe('card-style');
    expect(result.allLinks.item.description).toBe('A high-end roaster');
  });

  // --- Regex pattern validation ---

  it('removes dangerous regex patterns (string shorthand)', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      searchPatterns: {
        safe: 'bridge',
        evil: '(a+)+$',
      },
    };
    const result = validateConfig(config);
    expect(result.searchPatterns?.safe).toBe('bridge');
    expect(result.searchPatterns?.evil).toBeUndefined();
  });

  it('removes dangerous regex patterns (object form)', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      searchPatterns: {
        evil: { pattern: '(a+)+$', options: { fields: 'u' } },
      },
    };
    const result = validateConfig(config);
    expect(result.searchPatterns?.evil).toBeUndefined();
  });

  it('keeps safe regex patterns', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      searchPatterns: {
        wiki: { pattern: 'wikipedia\\.org', options: { fields: 'u' } },
      },
    };
    const result = validateConfig(config);
    expect(result.searchPatterns?.wiki).toBeDefined();
  });

  // --- Prototype pollution defense ---

  it('drops __proto__ key from allLinks', () => {
    const config = {
      allLinks: JSON.parse('{"__proto__": {"label": "evil", "url": "/evil"}, "safe": {"label": "Safe", "url": "/safe"}}'),
    };
    const result = validateConfig(config);
    expect(result.allLinks.safe).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(result.allLinks, '__proto__')).toBe(false);
  });

  it('drops __proto__ key from settings', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      settings: JSON.parse('{"__proto__": {"polluted": true}, "menuTimeout": 3000}'),
    };
    const result = validateConfig(config);
    expect(result.settings?.menuTimeout).toBe(3000);
    const plain: Record<string, unknown> = {};
    expect((plain as any).polluted).toBeUndefined();
  });

  it('drops __proto__ key from macros', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      macros: JSON.parse('{"__proto__": {"linkItems": "evil"}, "good": {"linkItems": ".coffee"}}'),
    };
    const result = validateConfig(config);
    expect(result.macros?.good).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(result.macros, '__proto__')).toBe(false);
  });

  // --- Macros validation ---

  it('skips macros with missing linkItems', () => {
    const config = {
      allLinks: { a: { label: 'A', url: '/a' } },
      macros: {
        good: { linkItems: '.coffee' },
        bad: { notLinkItems: '.tea' },
      },
    };
    const result = validateConfig(config);
    expect(result.macros?.good).toBeDefined();
    expect(result.macros?.bad).toBeUndefined();
  });

  // --- Thumbnail sanitization ---

  it('sanitizes javascript: in thumbnail field', () => {
    const config = {
      allLinks: {
        item: { label: 'Item', url: '/safe', thumbnail: 'javascript:alert(1)' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.thumbnail).toBe('about:blank');
  });

  it('leaves safe thumbnail URLs unchanged', () => {
    const config = {
      allLinks: {
        item: { label: 'Item', url: '/safe', thumbnail: 'images/photo.jpg' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.thumbnail).toBe('images/photo.jpg');
  });

  // --- Meta passthrough and sanitization ---

  it('preserves meta object on links', () => {
    const config = {
      allLinks: {
        item: {
          label: 'Item',
          url: '/safe',
          meta: { photoCredit: 'Jane Doe', rating: 5 },
        },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.meta).toEqual({ photoCredit: 'Jane Doe', rating: 5 });
  });

  it('sanitizes javascript: in meta URL fields', () => {
    const config = {
      allLinks: {
        item: {
          label: 'Item',
          url: '/safe',
          meta: {
            photoCreditUrl: 'javascript:alert(1)',
            sourceUrl: 'data:text/html,<script>alert(1)</script>',
            photoCredit: 'Safe text',
          },
        },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.meta?.photoCreditUrl).toBe('about:blank');
    expect(result.allLinks.item.meta?.sourceUrl).toBe('about:blank');
    expect(result.allLinks.item.meta?.photoCredit).toBe('Safe text');
  });

  it('leaves safe meta URL fields unchanged', () => {
    const config = {
      allLinks: {
        item: {
          label: 'Item',
          url: '/safe',
          meta: { photoCreditUrl: 'https://unsplash.com/@photographer' },
        },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.meta?.photoCreditUrl).toBe('https://unsplash.com/@photographer');
  });

  it('ignores meta if not a plain object', () => {
    const config = {
      allLinks: {
        item: { label: 'Item', url: '/safe', meta: 'not an object' },
      },
    };
    const result = validateConfig(config);
    expect(result.allLinks.item.meta).toBeUndefined();
  });

  // --- Does not mutate input ---

  it('does not mutate the input config', () => {
    const config = {
      allLinks: {
        xss: { label: 'XSS', url: 'javascript:alert(1)' },
      },
    };
    const original = JSON.parse(JSON.stringify(config));
    validateConfig(config);
    expect(config).toEqual(original);
  });
});
