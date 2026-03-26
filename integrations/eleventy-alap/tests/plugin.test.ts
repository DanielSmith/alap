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
import { eleventyAlapPlugin } from '../src/index';
import type { AlapConfig } from 'alap/core';

const testConfig: AlapConfig = {
  settings: { listType: 'ul' },
  macros: {
    favorites: { linkItems: 'brooklyn, bluebottle' },
  },
  allLinks: {
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://example.com/brooklyn',
      tags: ['nyc', 'bridge', 'landmark'],
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://example.com/manhattan',
      tags: ['nyc', 'bridge'],
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://example.com/goldengate',
      tags: ['sf', 'bridge', 'landmark'],
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://example.com/bluebottle',
      tags: ['coffee', 'sf'],
    },
    photo: {
      url: 'https://example.com/photo',
      image: '/img/photo.jpg',
      altText: 'A photo',
      tags: ['photo'],
    },
  },
};

// Mock Eleventy config — captures registered shortcodes and filters
function createMockEleventyConfig() {
  const shortcodes: Record<string, Function> = {};
  const pairedShortcodes: Record<string, Function> = {};
  const filters: Record<string, Function> = {};

  return {
    shortcodes,
    pairedShortcodes,
    filters,
    addShortcode(name: string, fn: Function) { shortcodes[name] = fn; },
    addPairedShortcode(name: string, fn: Function) { pairedShortcodes[name] = fn; },
    addFilter(name: string, fn: Function) { filters[name] = fn; },
  };
}

describe('eleventyAlapPlugin', () => {
  // --- Registration ---

  it('registers alap shortcode, alapLink paired shortcode, and two filters', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.shortcodes.alap).toBeTypeOf('function');
    expect(ec.pairedShortcodes.alapLink).toBeTypeOf('function');
    expect(ec.filters.alapResolve).toBeTypeOf('function');
    expect(ec.filters.alapCount).toBeTypeOf('function');
  });

  it('throws if config option is missing', () => {
    const ec = createMockEleventyConfig();
    expect(() => eleventyAlapPlugin(ec, undefined as any)).toThrow('config option is required');
  });

  // --- Static shortcode (alap) ---

  it('resolves a tag expression to a static list', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const html = ec.shortcodes.alap('.nyc + .bridge');
    expect(html).toContain('<ul class="alap-menu">');
    expect(html).toContain('Brooklyn Bridge');
    expect(html).toContain('Manhattan Bridge');
    expect(html).not.toContain('Golden Gate');
  });

  it('resolves a macro to a static list', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const html = ec.shortcodes.alap('@favorites');
    expect(html).toContain('Brooklyn Bridge');
    expect(html).toContain('Blue Bottle Coffee');
  });

  it('returns empty string for expression with no matches', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.shortcodes.alap('.nonexistent')).toBe('');
  });

  it('returns empty string for empty expression', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.shortcodes.alap('')).toBe('');
  });

  it('uses custom menuClass and itemClass', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig, menuClass: 'my-links', itemClass: 'my-item' });

    const html = ec.shortcodes.alap('.bridge');
    expect(html).toContain('<ul class="my-links">');
    expect(html).toContain('class="my-item"');
  });

  it('uses ol when listType is set', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig, listType: 'ol' });

    const html = ec.shortcodes.alap('.bridge');
    expect(html).toContain('<ol class="alap-menu">');
    expect(html).toContain('</ol>');
  });

  it('renders image items with img tag', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const html = ec.shortcodes.alap('.photo');
    expect(html).toContain('<img src="/img/photo.jpg"');
    expect(html).toContain('alt="A photo"');
  });

  it('includes target attribute on links', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const html = ec.shortcodes.alap('.coffee');
    expect(html).toContain('target="fromAlap"');
  });

  it('escapes HTML in labels and URLs', () => {
    const xssConfig: AlapConfig = {
      allLinks: {
        xss: { label: '<script>alert(1)</script>', url: 'https://example.com/safe', tags: ['test'] },
      },
    };
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: xssConfig });

    const html = ec.shortcodes.alap('.test');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('sanitizes javascript: URLs', () => {
    const badConfig: AlapConfig = {
      allLinks: {
        bad: { label: 'Bad', url: 'javascript:alert(1)', tags: ['test'] },
      },
    };
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: badConfig });

    const html = ec.shortcodes.alap('.test');
    expect(html).toContain('about:blank');
    expect(html).not.toContain('javascript:');
  });

  // --- Interactive shortcode (alapLink) ---

  it('wraps content in <alap-link> web component', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const html = ec.pairedShortcodes.alapLink('cafes', '.coffee');
    expect(html).toBe('<alap-link query=".coffee">cafes</alap-link>');
  });

  it('escapes query attribute in alapLink', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const html = ec.pairedShortcodes.alapLink('test', '"><script>');
    expect(html).toContain('query="&quot;&gt;&lt;script&gt;"');
  });

  it('returns content unchanged when query is empty', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.pairedShortcodes.alapLink('text', '')).toBe('text');
  });

  // --- Filters ---

  it('alapResolve returns array of resolved links', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    const links = ec.filters.alapResolve('.nyc + .bridge');
    expect(links).toHaveLength(2);
    expect(links[0].label).toBe('Brooklyn Bridge');
    expect(links[1].label).toBe('Manhattan Bridge');
  });

  it('alapResolve returns empty array for no matches', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.filters.alapResolve('.nonexistent')).toEqual([]);
  });

  it('alapResolve returns empty array for empty expression', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.filters.alapResolve('')).toEqual([]);
  });

  it('alapCount returns number of matching items', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.filters.alapCount('.bridge')).toBe(3);
    expect(ec.filters.alapCount('.nyc + .bridge')).toBe(2);
    expect(ec.filters.alapCount('.nonexistent')).toBe(0);
  });

  it('alapCount returns 0 for empty expression', () => {
    const ec = createMockEleventyConfig();
    eleventyAlapPlugin(ec, { config: testConfig });

    expect(ec.filters.alapCount('')).toBe(0);
  });

  // --- Default export ---

  it('exports eleventyAlapPlugin as default', async () => {
    const mod = await import('../src/index');
    expect(mod.default).toBe(mod.eleventyAlapPlugin);
  });
});
