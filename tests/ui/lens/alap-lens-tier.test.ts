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
import { AlapLens } from '../../../src/ui-lens/AlapLens';
import { validateConfig } from '../../../src/core/validateConfig';
import type { AlapConfig, GenerateHandler, AlapLink } from '../../../src/core/types';

/**
 * Phase 6 Step 3 — tier-aware sanitization in AlapLens.
 *
 * Focus: the Surface 1-2 regression. A `:web:` (or any protocol) response
 * can include a `_display:"links"` meta array whose elements are arbitrary
 * URL strings. Before Phase 6 the lens rendered those as `<a href=url>`
 * with no sanitization — a `javascript:` string landed in the DOM as a
 * clickable XSS trigger.
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

function clickTrigger(trigger: HTMLElement): void {
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function getPanel(): HTMLElement | null {
  return document.querySelector('.alap-lens-panel');
}

function queryAllMetaAnchors(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('.alap-lens-meta-link'));
}

function queryVisitAnchor(): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>('.alap-lens-visit');
}

function queryCreditAnchor(): HTMLAnchorElement | null {
  const row = document.querySelector('.alap-lens-credit a');
  return row as HTMLAnchorElement | null;
}

describe('AlapLens — tier-aware sanitization', () => {
  let lens: AlapLens;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    lens?.destroy();
  });

  describe('Surface 1-2: _display:"links" array on a protocol-tier parent', () => {
    it('strips javascript: from meta-array links on protocol-tier results', async () => {
      const hostileHandler: GenerateHandler = async (): Promise<AlapLink[]> => [
        {
          url: 'https://example.com/a',
          label: 'Hostile',
          meta: {
            related: [
              'javascript:alert(1)',
              'https://ok.example.com/legit',
              'tel:+14155551212',
            ],
            // Explicit hint — exactly the Surface 1-2 attack shape: the
            // handler chooses the 'links' display to get anchor rendering
            // regardless of what the auto-detect would pick.
            related_display: 'links',
          },
        },
      ];

      const config: AlapConfig = validateConfig({
        allLinks: {},
      });
      // Trigger must exist BEFORE lens construction — the lens binds its
      // click handlers at ctor time via a document query.
      const trigger = createTrigger('t', ':hostile:');
      lens = new AlapLens(config, { handlers: { hostile: hostileHandler } });
      clickTrigger(trigger);
      // Wait for progressive resolve; the lens opens sync with placeholder,
      // then re-renders when the handler settles.
      await new Promise((r) => setTimeout(r, 50));

      expect(getPanel()).not.toBeNull();
      const anchors = queryAllMetaAnchors();
      expect(anchors.length).toBe(3);
      const hrefs = anchors.map((a) => a.getAttribute('href'));
      // javascript: and tel: both blocked under strict sanitize for
      // protocol tier. https: passes.
      expect(hrefs[0]).toBe('about:blank');
      expect(hrefs[1]).toBe('https://ok.example.com/legit');
      expect(hrefs[2]).toBe('about:blank');
    });

    it('keeps meta-array anchors clickable for author-tier parents', async () => {
      const config: AlapConfig = validateConfig({
        allLinks: {
          home: {
            url: 'https://example.com/',
            label: 'Home',
            meta: {
              related: [
                'https://friend.example.com/a',
                'tel:+14155551212',
              ],
              related_display: 'links',
            },
          },
        },
      });
      const trigger = createTrigger('t', 'home');
      lens = new AlapLens(config);
      clickTrigger(trigger);
      await new Promise((r) => setTimeout(r, 10));

      const anchors = queryAllMetaAnchors();
      expect(anchors.length).toBe(2);
      // Author tier keeps both — including tel: which strict would block.
      expect(anchors[0].getAttribute('href')).toBe('https://friend.example.com/a');
      expect(anchors[1].getAttribute('href')).toBe('tel:+14155551212');
    });
  });

  describe('visit button URL + target', () => {
    it('clamps protocol-tier visit target to _blank even when link sets _top', async () => {
      const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
        {
          url: 'https://example.com/evil',
          label: 'evil',
          targetWindow: '_top',
        },
      ];
      const config: AlapConfig = validateConfig({ allLinks: {} });
      const trigger = createTrigger('t', ':evil:');
      lens = new AlapLens(config, { handlers: { evil: handler } });
      clickTrigger(trigger);
      await new Promise((r) => setTimeout(r, 50));

      const visit = queryVisitAnchor();
      expect(visit).not.toBeNull();
      expect(visit!.target).toBe('_blank');
    });

    it('preserves author-tier visit target', async () => {
      const config: AlapConfig = validateConfig({
        allLinks: {
          home: {
            url: 'https://example.com/',
            label: 'Home',
            targetWindow: '_self',
          },
        },
      });
      const trigger = createTrigger('t', 'home');
      lens = new AlapLens(config);
      clickTrigger(trigger);
      await new Promise((r) => setTimeout(r, 10));

      const visit = queryVisitAnchor();
      expect(visit!.target).toBe('_self');
    });

    it('strict-sanitizes protocol-tier visit URL (tel: blocked)', async () => {
      const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
        { url: 'tel:+14155551212', label: 'call' },
      ];
      const config: AlapConfig = validateConfig({ allLinks: {} });
      const trigger = createTrigger('t', ':phone:');
      lens = new AlapLens(config, { handlers: { phone: handler } });
      clickTrigger(trigger);
      await new Promise((r) => setTimeout(r, 50));

      const visit = queryVisitAnchor();
      expect(visit!.getAttribute('href')).toBe('about:blank');
    });
  });

  describe('photo-credit anchor URL', () => {
    it('strict-sanitizes protocol-tier photoCreditUrl', async () => {
      const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
        {
          url: 'https://example.com/a',
          label: 'Hostile',
          thumbnail: 'https://example.com/t.jpg',
          meta: {
            photoCredit: 'Attacker',
            photoCreditUrl: 'javascript:alert(1)',
          },
        },
      ];
      const config: AlapConfig = validateConfig({ allLinks: {} });
      const trigger = createTrigger('t', ':credit:');
      lens = new AlapLens(config, { handlers: { credit: handler } });
      clickTrigger(trigger);
      await new Promise((r) => setTimeout(r, 50));

      const creditAnchor = queryCreditAnchor();
      expect(creditAnchor).not.toBeNull();
      expect(creditAnchor!.getAttribute('href')).toBe('about:blank');
    });
  });
});
