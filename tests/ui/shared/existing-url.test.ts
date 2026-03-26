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
import { resolveExistingUrlMode, injectExistingUrl } from '../../../src/ui/shared/existingUrl';
import type { AlapLink } from '../../../src/core/types';

function makeLinks(...ids: string[]): Array<{ id: string } & AlapLink> {
  return ids.map(id => ({ id, label: id, url: `https://example.com/${id}` }));
}

function makeAnchor(href?: string, dataExisting?: string): HTMLElement {
  const a = document.createElement('a');
  if (href) a.setAttribute('href', href);
  if (dataExisting) a.setAttribute('data-alap-existing', dataExisting);
  return a;
}

describe('resolveExistingUrlMode', () => {
  it('defaults to prepend when no setting and no attribute', () => {
    const el = makeAnchor();
    expect(resolveExistingUrlMode(el, undefined)).toBe('prepend');
  });

  it('uses global setting when no per-anchor attribute', () => {
    const el = makeAnchor();
    expect(resolveExistingUrlMode(el, 'ignore')).toBe('ignore');
    expect(resolveExistingUrlMode(el, 'append')).toBe('append');
  });

  it('per-anchor attribute overrides global setting', () => {
    const el = makeAnchor(undefined, 'ignore');
    expect(resolveExistingUrlMode(el, 'prepend')).toBe('ignore');
  });

  it('per-anchor attribute overrides undefined global', () => {
    const el = makeAnchor(undefined, 'append');
    expect(resolveExistingUrlMode(el, undefined)).toBe('append');
  });

  it('ignores invalid attribute values', () => {
    const el = makeAnchor(undefined, 'bogus');
    expect(resolveExistingUrlMode(el, 'append')).toBe('append');
  });
});

describe('injectExistingUrl', () => {
  const links = makeLinks('a', 'b');

  it('prepends the existing href as first item', () => {
    const el = makeAnchor('https://original.com/page');
    const result = injectExistingUrl(links, el, 'prepend');
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('_existing');
    expect(result[0].url).toBe('https://original.com/page');
    expect(result[0].label).toBe('original.com/page');
    expect(result[1].id).toBe('a');
  });

  it('appends the existing href as last item', () => {
    const el = makeAnchor('https://original.com/page');
    const result = injectExistingUrl(links, el, 'append');
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('a');
    expect(result[2].id).toBe('_existing');
    expect(result[2].url).toBe('https://original.com/page');
  });

  it('ignores the href entirely in ignore mode', () => {
    const el = makeAnchor('https://original.com/page');
    const result = injectExistingUrl(links, el, 'ignore');
    expect(result).toHaveLength(2);
    expect(result).toEqual(links);
  });

  it('skips injection when href is empty', () => {
    const el = makeAnchor('');
    const result = injectExistingUrl(links, el, 'prepend');
    expect(result).toHaveLength(2);
  });

  it('skips injection when href is #', () => {
    const el = makeAnchor('#');
    const result = injectExistingUrl(links, el, 'prepend');
    expect(result).toHaveLength(2);
  });

  it('skips injection when no href attribute', () => {
    const el = makeAnchor();
    const result = injectExistingUrl(links, el, 'prepend');
    expect(result).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const el = makeAnchor('https://original.com');
    const original = [...links];
    injectExistingUrl(links, el, 'prepend');
    expect(links).toEqual(original);
  });

  it('handles root URL label (no path)', () => {
    const el = makeAnchor('https://example.com/');
    const result = injectExistingUrl(links, el, 'prepend');
    expect(result[0].label).toBe('example.com');
  });

  it('handles relative href', () => {
    const el = makeAnchor('/some/path');
    const result = injectExistingUrl(links, el, 'prepend');
    expect(result[0].id).toBe('_existing');
    expect(result[0].url).toBe('/some/path');
  });
});
