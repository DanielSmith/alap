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
import { buildMenuList } from '../../../src/ui/shared/buildMenuList';
import type { AlapLink } from '../../../src/core/types';

type LinkWithId = { id: string } & AlapLink;

const baseLinks: LinkWithId[] = [
  { id: 'brooklyn', label: 'Brooklyn Bridge', url: 'https://example.com/brooklyn', tags: ['nyc', 'bridge'] },
  { id: 'goldengate', label: 'Golden Gate', url: 'https://example.com/gg', tags: ['sf', 'bridge'] },
];

describe('buildMenuList', () => {
  // --- Basic rendering (existing behavior) ---

  it('builds a <ul> by default', () => {
    const list = buildMenuList(baseLinks);
    expect(list.tagName.toLowerCase()).toBe('ul');
    expect(list.children.length).toBe(2);
  });

  it('builds an <ol> when listType is "ol"', () => {
    const list = buildMenuList(baseLinks, { listType: 'ol' });
    expect(list.tagName.toLowerCase()).toBe('ol');
  });

  it('creates <a> elements with role="menuitem"', () => {
    const list = buildMenuList(baseLinks);
    const anchors = list.querySelectorAll('a[role="menuitem"]');
    expect(anchors.length).toBe(2);
    expect((anchors[0] as HTMLAnchorElement).href).toContain('/brooklyn');
  });

  it('renders image instead of text when link has image field', () => {
    const links: LinkWithId[] = [
      { id: 'photo', label: 'Photo', url: 'https://example.com', image: '/img/photo.jpg', altText: 'A photo' },
    ];
    const list = buildMenuList(links);
    const img = list.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('/img/photo.jpg');
    expect(img!.alt).toBe('A photo');
  });

  it('applies cssClass to <li> elements', () => {
    const links: LinkWithId[] = [
      { id: 'styled', label: 'Styled', url: 'https://example.com', cssClass: 'highlight-blue' },
    ];
    const list = buildMenuList(links);
    const li = list.querySelector('li');
    expect(li!.className).toBe('alapListElem highlight-blue');
  });

  it('applies liAttributes and aAttributes', () => {
    const list = buildMenuList(baseLinks, {
      liAttributes: { part: 'item' },
      aAttributes: { part: 'link' },
    });
    const li = list.querySelector('li');
    const a = list.querySelector('a');
    expect(li!.getAttribute('part')).toBe('item');
    expect(a!.getAttribute('part')).toBe('link');
  });

  it('applies maxVisibleItems scroll constraint', () => {
    const manyLinks: LinkWithId[] = Array.from({ length: 15 }, (_, i) => ({
      id: `item${i}`, label: `Item ${i}`, url: `https://example.com/${i}`, tags: [],
    }));
    const list = buildMenuList(manyLinks, { maxVisibleItems: 5 });
    expect(list.style.overflowY).toBe('auto');
    expect(list.style.maxHeight).toBeTruthy();
  });

  // --- data-alap-guid ---

  it('renders data-alap-guid when link has guid', () => {
    const links: LinkWithId[] = [
      { id: 'item1', label: 'Item', url: 'https://example.com', guid: 'a1b2c3d4-0001-4000-a000-000000000001' },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.getAttribute('data-alap-guid')).toBe('a1b2c3d4-0001-4000-a000-000000000001');
  });

  it('omits data-alap-guid when link has no guid', () => {
    const list = buildMenuList(baseLinks);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.hasAttribute('data-alap-guid')).toBe(false);
  });

  // --- data-alap-thumbnail ---

  it('renders data-alap-thumbnail when link has thumbnail', () => {
    const links: LinkWithId[] = [
      { id: 'item1', label: 'Item', url: 'https://example.com', thumbnail: '/img/preview.jpg' },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.getAttribute('data-alap-thumbnail')).toBe('/img/preview.jpg');
  });

  it('omits data-alap-thumbnail when link has no thumbnail', () => {
    const list = buildMenuList(baseLinks);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.hasAttribute('data-alap-thumbnail')).toBe(false);
  });

  it('thumbnail is not rendered as visible content (no <img>)', () => {
    const links: LinkWithId[] = [
      { id: 'item1', label: 'Item', url: 'https://example.com', thumbnail: '/img/preview.jpg' },
    ];
    const list = buildMenuList(links);
    const img = list.querySelector('img');
    expect(img).toBeNull(); // thumbnail is metadata, not content
  });

  // --- data-alap-hooks (per-link) ---

  it('renders data-alap-hooks from per-link hooks array', () => {
    const links: LinkWithId[] = [
      { id: 'item1', label: 'Item', url: 'https://example.com', hooks: ['item-hover', 'item-context'] },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.getAttribute('data-alap-hooks')).toBe('item-hover item-context');
  });

  it('renders data-alap-hooks from globalHooks when link has no hooks', () => {
    const list = buildMenuList(baseLinks, { globalHooks: ['item-hover'] });
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.getAttribute('data-alap-hooks')).toBe('item-hover');
  });

  it('per-link hooks override globalHooks', () => {
    const links: LinkWithId[] = [
      { id: 'item1', label: 'Item', url: 'https://example.com', hooks: ['item-context'] },
    ];
    const list = buildMenuList(links, { globalHooks: ['item-hover', 'item-context'] });
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.getAttribute('data-alap-hooks')).toBe('item-context');
  });

  it('omits data-alap-hooks when neither link hooks nor globalHooks are set', () => {
    const list = buildMenuList(baseLinks);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.hasAttribute('data-alap-hooks')).toBe(false);
  });

  it('omits data-alap-hooks when hooks array is empty', () => {
    const links: LinkWithId[] = [
      { id: 'item1', label: 'Item', url: 'https://example.com', hooks: [] },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.hasAttribute('data-alap-hooks')).toBe(false);
  });

  it('omits data-alap-hooks when globalHooks is empty', () => {
    const list = buildMenuList(baseLinks, { globalHooks: [] });
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.hasAttribute('data-alap-hooks')).toBe(false);
  });

  // --- All three attributes together ---

  it('renders all three data attributes on a fully-decorated item', () => {
    const links: LinkWithId[] = [
      {
        id: 'full',
        label: 'Full Item',
        url: 'https://example.com',
        guid: 'uuid-1234',
        thumbnail: '/img/thumb.jpg',
        hooks: ['item-hover', 'item-context'],
      },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a[role="menuitem"]');
    expect(a!.getAttribute('data-alap-guid')).toBe('uuid-1234');
    expect(a!.getAttribute('data-alap-thumbnail')).toBe('/img/thumb.jpg');
    expect(a!.getAttribute('data-alap-hooks')).toBe('item-hover item-context');
  });

  // --- URL sanitization (SEC-1, SEC-2) ---

  it('sanitizes javascript: URLs in href', () => {
    const links: LinkWithId[] = [
      { id: 'xss', label: 'XSS', url: 'javascript:alert(1)', tags: [] },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('about:blank');
  });

  it('sanitizes data: URLs in href', () => {
    const links: LinkWithId[] = [
      { id: 'data', label: 'Data', url: 'data:text/html,<script>alert(1)</script>', tags: [] },
    ];
    const list = buildMenuList(links);
    const a = list.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('about:blank');
  });

  it('sanitizes javascript: URLs in image src', () => {
    const links: LinkWithId[] = [
      { id: 'img-xss', label: 'Img', url: 'https://example.com', image: 'javascript:alert(1)', tags: [] },
    ];
    const list = buildMenuList(links);
    const img = list.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('about:blank');
  });

  it('allows safe URLs through unchanged', () => {
    const list = buildMenuList(baseLinks);
    const a = list.querySelector('a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toContain('https://example.com/brooklyn');
  });

  it('mixed items: decorated and plain coexist', () => {
    const links: LinkWithId[] = [
      { id: 'plain', label: 'Plain', url: 'https://example.com' },
      { id: 'decorated', label: 'Decorated', url: 'https://example.com', guid: 'uuid-5678', hooks: ['item-hover'] },
    ];
    const list = buildMenuList(links);
    const anchors = list.querySelectorAll('a[role="menuitem"]');

    // First item: no data attributes
    expect(anchors[0].hasAttribute('data-alap-guid')).toBe(false);
    expect(anchors[0].hasAttribute('data-alap-hooks')).toBe(false);

    // Second item: has guid and hooks
    expect(anchors[1].getAttribute('data-alap-guid')).toBe('uuid-5678');
    expect(anchors[1].getAttribute('data-alap-hooks')).toBe('item-hover');
  });
});
