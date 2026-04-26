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
import { stampProvenance } from '../../../src/core/linkProvenance';
import type { AlapLink } from '../../../src/core/types';

type LinkWithId = { id: string } & AlapLink;

/**
 * Phase 6 Step 2 — buildMenuList reads provenance and applies
 * tier-appropriate sanitization. Closes Surface 2-1 (cssClass
 * on protocol:* links) and Surface 3-1 (targetWindow clamp) for
 * the menu path, and hardens image URL sanitization per tier.
 */

function stamp<T extends AlapLink>(link: T, tier: Parameters<typeof stampProvenance>[1]): T {
  stampProvenance(link, tier);
  return link;
}

function firstAnchor(ul: HTMLElement): HTMLAnchorElement {
  const a = ul.querySelector('a');
  if (!a) throw new Error('no <a> rendered');
  return a as HTMLAnchorElement;
}

function firstLi(ul: HTMLElement): HTMLLIElement {
  const li = ul.querySelector('li');
  if (!li) throw new Error('no <li> rendered');
  return li as HTMLLIElement;
}

describe('buildMenuList — rel attribute (Surface 3-2)', () => {
  it('every anchor carries rel="noopener noreferrer" regardless of tier', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'a', label: 'a', url: 'https://example.com/a' }, 'author'),
      stamp({ id: 'b', label: 'b', url: 'https://example.com/b' }, 'protocol:web'),
      stamp({ id: 'c', label: 'c', url: 'https://example.com/c' }, 'storage:local'),
      { id: 'd', label: 'd', url: 'https://example.com/d' }, // unstamped
    ];
    const ul = buildMenuList(links);
    const anchors = Array.from(ul.querySelectorAll('a'));
    expect(anchors.length).toBe(4);
    for (const a of anchors) {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});

describe('buildMenuList — tier-aware URL sanitization', () => {
  it('author-tier: loose scheme allowed (tel: passes through)', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'call', label: 'Call', url: 'tel:+14155551212' }, 'author'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).getAttribute('href')).toBe('tel:+14155551212');
  });

  it('protocol-tier: tel: gets blocked (strict sanitize)', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'call', label: 'Call', url: 'tel:+14155551212' }, 'protocol:web'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).getAttribute('href')).toBe('about:blank');
  });

  it('protocol-tier: javascript: URL blocked', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'evil', label: 'evil', url: 'javascript:alert(1)' }, 'protocol:web'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).getAttribute('href')).toBe('about:blank');
  });

  it('storage-tier: custom scheme blocked', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'odd', label: 'odd', url: 'ftp://example.com/' }, 'storage:local'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).getAttribute('href')).toBe('about:blank');
  });

  it('unstamped: fail-closed strict sanitize', () => {
    const links: LinkWithId[] = [
      // Intentionally unstamped — bypassed validateConfig.
      { id: 'call', label: 'Call', url: 'tel:+14155551212' },
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).getAttribute('href')).toBe('about:blank');
  });

  it('protocol-tier image URL: javascript: blocked', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'pic', url: 'https://example.com/', image: 'javascript:alert(1)' }, 'protocol:web'),
    ];
    const ul = buildMenuList(links);
    const img = ul.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toBe('about:blank');
  });
});

describe('buildMenuList — tier-aware cssClass', () => {
  it('author-tier: cssClass passes through', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/', cssClass: 'highlight' }, 'author'),
    ];
    const ul = buildMenuList(links);
    const li = firstLi(ul);
    expect(li.className).toBe('alapListElem highlight');
  });

  it('protocol-tier: cssClass dropped; base class survives', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/', cssClass: 'attacker-chosen' }, 'protocol:web'),
    ];
    const ul = buildMenuList(links);
    const li = firstLi(ul);
    expect(li.className).toBe('alapListElem');
  });

  it('storage-tier: cssClass dropped', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/', cssClass: 'from-storage' }, 'storage:remote'),
    ];
    const ul = buildMenuList(links);
    const li = firstLi(ul);
    expect(li.className).toBe('alapListElem');
  });

  it('unstamped: cssClass dropped', () => {
    const links: LinkWithId[] = [
      { id: 'x', label: 'x', url: 'https://example.com/', cssClass: 'unstamped' },
    ];
    const ul = buildMenuList(links);
    const li = firstLi(ul);
    expect(li.className).toBe('alapListElem');
  });
});

describe('buildMenuList — tier-aware targetWindow', () => {
  it('author-tier: targetWindow preserved (including _self, _top)', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/', targetWindow: '_self' }, 'author'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).target).toBe('_self');
  });

  it('protocol-tier: targetWindow clamped to _blank regardless of input', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/', targetWindow: '_top' }, 'protocol:web'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).target).toBe('_blank');
  });

  it('protocol-tier: no targetWindow → clamped to _blank, does NOT inherit defaultTargetWindow', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/' }, 'protocol:web'),
    ];
    // Author sets a named-window default; non-author must not ride into it.
    const ul = buildMenuList(links, { defaultTargetWindow: 'authorSharedWindow' });
    expect(firstAnchor(ul).target).toBe('_blank');
  });

  it('author-tier: no targetWindow falls through to defaultTargetWindow', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/' }, 'author'),
    ];
    const ul = buildMenuList(links, { defaultTargetWindow: 'authorWindow' });
    expect(firstAnchor(ul).target).toBe('authorWindow');
  });

  it('storage-tier: clamped to _blank', () => {
    const links: LinkWithId[] = [
      stamp({ id: 'x', label: 'x', url: 'https://example.com/', targetWindow: '_parent' }, 'storage:local'),
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).target).toBe('_blank');
  });

  it('unstamped: clamped to _blank (fail-closed)', () => {
    const links: LinkWithId[] = [
      { id: 'x', label: 'x', url: 'https://example.com/', targetWindow: '_top' },
    ];
    const ul = buildMenuList(links);
    expect(firstAnchor(ul).target).toBe('_blank');
  });
});
