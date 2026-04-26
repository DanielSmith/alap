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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AlapLightbox } from '../../../src/ui-lightbox/AlapLightbox';
import { validateConfig } from '../../../src/core/validateConfig';
import type { AlapConfig, AlapLink, GenerateHandler } from '../../../src/core/types';

/**
 * Phase 6 Step 5 — tier-aware sanitization in AlapLightbox (DOM variant).
 * Three sanitize sites: photo-credit anchor, visit-button href, visit
 * target. No meta-links array — lightbox doesn't offer _display:"links".
 */

function createTrigger(id: string, expression: string): HTMLElement {
  const a = document.createElement('a');
  a.id = id;
  a.className = 'alap';
  a.setAttribute('data-alap-linkitems', expression);
  a.textContent = id;
  document.body.appendChild(a);
  return a;
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function visit(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>('.alap-lightbox-visit');
}

function creditAnchor(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>('.alap-lightbox-credit a');
}

describe('AlapLightbox — tier-aware sanitization', () => {
  let lightbox: AlapLightbox;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    lightbox?.destroy();
  });

  it('author-tier: visit URL and target preserved (tel: + _self)', () => {
    const config: AlapConfig = validateConfig({
      allLinks: {
        home: {
          url: 'tel:+14155551212',
          label: 'Call',
          targetWindow: '_self',
        },
      },
    });
    const trigger = createTrigger('t', 'home');
    lightbox = new AlapLightbox(config, { selector: '.alap' });
    click(trigger);

    expect(visit()!.getAttribute('href')).toBe('tel:+14155551212');
    expect(visit()!.target).toBe('_self');
  });

  it('protocol-tier: visit URL strict-sanitized (tel: blocked)', async () => {
    const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
      { url: 'tel:+14155551212', label: 'Call' },
    ];
    const config: AlapConfig = validateConfig({ allLinks: {} });
    const trigger = createTrigger('t', ':phone:');
    lightbox = new AlapLightbox(config, { selector: '.alap', handlers: { phone: handler } });
    click(trigger);
    await new Promise((r) => setTimeout(r, 50));

    expect(visit()!.getAttribute('href')).toBe('about:blank');
  });

  it('protocol-tier: visit target clamped to _blank', async () => {
    const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
      { url: 'https://example.com/a', label: 'evil', targetWindow: '_top' },
    ];
    const config: AlapConfig = validateConfig({ allLinks: {} });
    const trigger = createTrigger('t', ':evil:');
    lightbox = new AlapLightbox(config, { selector: '.alap', handlers: { evil: handler } });
    click(trigger);
    await new Promise((r) => setTimeout(r, 50));

    expect(visit()!.target).toBe('_blank');
  });

  it('protocol-tier: photoCreditUrl strict-sanitized', async () => {
    const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
      {
        url: 'https://example.com/a',
        label: 'Hostile',
        image: 'https://example.com/pic.jpg',
        meta: {
          photoCredit: 'Attacker',
          photoCreditUrl: 'javascript:alert(1)',
        },
      },
    ];
    const config: AlapConfig = validateConfig({ allLinks: {} });
    const trigger = createTrigger('t', ':credit:');
    lightbox = new AlapLightbox(config, { selector: '.alap', handlers: { credit: handler } });
    click(trigger);
    await new Promise((r) => setTimeout(r, 50));

    const link = creditAnchor();
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('about:blank');
  });
});
