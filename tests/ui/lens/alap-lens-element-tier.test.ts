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

import { describe, it, expect, beforeEach } from 'vitest';
import { AlapLensElement, defineAlapLens } from '../../../src/ui-lens/AlapLensElement';
import { registerConfig, getEngine } from '../../../src/ui/shared/configRegistry';
import { validateConfig } from '../../../src/core/validateConfig';
import type { AlapConfig, AlapLink, GenerateHandler } from '../../../src/core/types';

/**
 * Phase 6 Step 4 — tier-aware sanitization in AlapLensElement (the
 * web-component variant). Mirror of Step 3's AlapLens coverage,
 * executed against the shadow-DOM render path.
 */

defineAlapLens();

function createElement(query: string): AlapLensElement {
  const el = document.createElement('alap-lens') as AlapLensElement;
  el.setAttribute('query', query);
  el.textContent = 'trigger';
  document.body.appendChild(el);
  return el;
}

function clickElement(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function metaLinks(el: AlapLensElement): HTMLAnchorElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLAnchorElement>('.meta-link') ?? []);
}

function visitAnchor(el: AlapLensElement): HTMLAnchorElement | null {
  return el.shadowRoot?.querySelector<HTMLAnchorElement>('.visit') ?? null;
}

function creditAnchor(el: AlapLensElement): HTMLAnchorElement | null {
  return el.shadowRoot?.querySelector<HTMLAnchorElement>('.credit a') ?? null;
}

// Unique config name per test so the configRegistry doesn't accumulate stale
// state across parallel describes.
let configCounter = 0;
function registerUnique(config: AlapConfig, handlers?: Record<string, GenerateHandler>): string {
  const name = `lens-element-tier-${++configCounter}`;
  registerConfig(config, name, handlers ? { handlers } : undefined);
  return name;
}

/**
 * <alap-lens> uses synchronous engine.resolve() at click time — it does
 * not go through the progressive trigger-click path that AlapLens (DOM
 * variant) uses. For protocol handlers, the first synchronous resolve
 * returns [] because the handler is still pending, and the overlay never
 * opens. Workaround: pre-resolve the expression (warms the engine's
 * generated-links cache), then the next sync resolve returns the cached
 * results and the overlay opens as expected.
 *
 * The gap itself is tracked separately — either the web-component should
 * grow a progressive path, or the consumer is expected to preResolve. For
 * now the tests pin the sanitize contract by pre-resolving, which matches
 * how a real async-aware caller would drive the element today.
 */
async function preResolveFor(configName: string, expression: string): Promise<void> {
  const engine = getEngine(configName);
  if (!engine) throw new Error(`no engine registered for "${configName}"`);
  await engine.preResolve([expression]);
}

describe('AlapLensElement — tier-aware sanitization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Surface 1-2 mirror: _display:"links" array on protocol-tier parent', () => {
    it('strips javascript: from meta-array anchors on protocol-tier results', async () => {
      const hostile: GenerateHandler = async (): Promise<AlapLink[]> => [
        {
          url: 'https://example.com/a',
          label: 'Hostile',
          meta: {
            related: ['javascript:alert(1)', 'https://ok.example.com/legit', 'tel:+14155551212'],
            related_display: 'links',
          },
        },
      ];
      const config = validateConfig({ allLinks: {} });
      const name = registerUnique(config, { hostile });
      await preResolveFor(name, ':hostile:');
      const el = createElement(':hostile:');
      el.setAttribute('config', name);
      clickElement(el);

      const anchors = metaLinks(el);
      expect(anchors.length).toBe(3);
      const hrefs = anchors.map((a) => a.getAttribute('href'));
      expect(hrefs[0]).toBe('about:blank');
      expect(hrefs[1]).toBe('https://ok.example.com/legit');
      expect(hrefs[2]).toBe('about:blank');
    });

    it('keeps meta-array anchors clickable for author-tier parents', async () => {
      const config = validateConfig({
        allLinks: {
          home: {
            url: 'https://example.com/',
            label: 'Home',
            meta: {
              related: ['https://friend.example.com/a', 'tel:+14155551212'],
              related_display: 'links',
            },
          },
        },
      });
      const name = registerUnique(config);
      const el = createElement('home');
      el.setAttribute('config', name);
      clickElement(el);
      await new Promise((r) => setTimeout(r, 10));

      const anchors = metaLinks(el);
      expect(anchors.length).toBe(2);
      expect(anchors[0].getAttribute('href')).toBe('https://friend.example.com/a');
      expect(anchors[1].getAttribute('href')).toBe('tel:+14155551212');
    });
  });

  describe('visit button URL + target', () => {
    it('clamps protocol-tier visit target to _blank when link sets _top', async () => {
      const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
        { url: 'https://example.com/evil', label: 'evil', targetWindow: '_top' },
      ];
      const config = validateConfig({ allLinks: {} });
      const name = registerUnique(config, { evil: handler });
      await preResolveFor(name, ':evil:');
      const el = createElement(':evil:');
      el.setAttribute('config', name);
      clickElement(el);

      const visit = visitAnchor(el);
      expect(visit).not.toBeNull();
      expect(visit!.target).toBe('_blank');
    });

    it('preserves author-tier visit target', async () => {
      const config = validateConfig({
        allLinks: {
          home: {
            url: 'https://example.com/',
            label: 'Home',
            targetWindow: '_self',
          },
        },
      });
      const name = registerUnique(config);
      const el = createElement('home');
      el.setAttribute('config', name);
      clickElement(el);
      await new Promise((r) => setTimeout(r, 10));

      expect(visitAnchor(el)!.target).toBe('_self');
    });

    it('strict-sanitizes protocol-tier visit URL (tel: blocked)', async () => {
      const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
        { url: 'tel:+14155551212', label: 'call' },
      ];
      const config = validateConfig({ allLinks: {} });
      const name = registerUnique(config, { phone: handler });
      await preResolveFor(name, ':phone:');
      const el = createElement(':phone:');
      el.setAttribute('config', name);
      clickElement(el);

      expect(visitAnchor(el)!.getAttribute('href')).toBe('about:blank');
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
      const config = validateConfig({ allLinks: {} });
      const name = registerUnique(config, { credit: handler });
      await preResolveFor(name, ':credit:');
      const el = createElement(':credit:');
      el.setAttribute('config', name);
      clickElement(el);

      const link = creditAnchor(el);
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe('about:blank');
    });
  });
});
