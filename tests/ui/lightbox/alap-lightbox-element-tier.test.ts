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
import { AlapLightboxElement, defineAlapLightbox } from '../../../src/ui-lightbox/AlapLightboxElement';
import { registerConfig, getEngine } from '../../../src/ui/shared/configRegistry';
import { validateConfig } from '../../../src/core/validateConfig';
import type { AlapConfig, AlapLink, GenerateHandler } from '../../../src/core/types';

/**
 * Phase 6 Step 5 — tier-aware sanitization in AlapLightboxElement.
 * Mirror of AlapLens web-component approach: sync engine.resolve() at
 * click time, so async protocol tests pre-resolve to warm the cache
 * before clicking.
 */

defineAlapLightbox();

function createElement(query: string): AlapLightboxElement {
  const el = document.createElement('alap-lightbox') as AlapLightboxElement;
  el.setAttribute('query', query);
  el.textContent = 'trigger';
  document.body.appendChild(el);
  return el;
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function visit(el: AlapLightboxElement): HTMLAnchorElement | null {
  return el.shadowRoot?.querySelector<HTMLAnchorElement>('.visit') ?? null;
}

function creditAnchor(el: AlapLightboxElement): HTMLAnchorElement | null {
  return el.shadowRoot?.querySelector<HTMLAnchorElement>('.credit a') ?? null;
}

let configCounter = 0;
function registerUnique(config: AlapConfig, handlers?: Record<string, GenerateHandler>): string {
  const name = `lightbox-element-tier-${++configCounter}`;
  registerConfig(config, name, handlers ? { handlers } : undefined);
  return name;
}

async function preResolveFor(configName: string, expression: string): Promise<void> {
  const engine = getEngine(configName);
  if (!engine) throw new Error(`no engine registered for "${configName}"`);
  await engine.preResolve([expression]);
}

describe('AlapLightboxElement — tier-aware sanitization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('author-tier: visit URL + target preserved (tel: + _self)', () => {
    const config = validateConfig({
      allLinks: {
        home: {
          url: 'tel:+14155551212',
          label: 'Call',
          targetWindow: '_self',
        },
      },
    });
    const name = registerUnique(config);
    const el = createElement('home');
    el.setAttribute('config', name);
    click(el);

    expect(visit(el)!.getAttribute('href')).toBe('tel:+14155551212');
    expect(visit(el)!.target).toBe('_self');
  });

  it('protocol-tier: visit URL strict-sanitized (tel: blocked)', async () => {
    const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
      { url: 'tel:+14155551212', label: 'Call' },
    ];
    const config = validateConfig({ allLinks: {} });
    const name = registerUnique(config, { phone: handler });
    await preResolveFor(name, ':phone:');
    const el = createElement(':phone:');
    el.setAttribute('config', name);
    click(el);

    expect(visit(el)!.getAttribute('href')).toBe('about:blank');
  });

  it('protocol-tier: visit target clamped to _blank', async () => {
    const handler: GenerateHandler = async (): Promise<AlapLink[]> => [
      { url: 'https://example.com/evil', label: 'evil', targetWindow: '_top' },
    ];
    const config = validateConfig({ allLinks: {} });
    const name = registerUnique(config, { evil: handler });
    await preResolveFor(name, ':evil:');
    const el = createElement(':evil:');
    el.setAttribute('config', name);
    click(el);

    expect(visit(el)!.target).toBe('_blank');
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
    const config = validateConfig({ allLinks: {} });
    const name = registerUnique(config, { credit: handler });
    await preResolveFor(name, ':credit:');
    const el = createElement(':credit:');
    el.setAttribute('config', name);
    click(el);

    const link = creditAnchor(el);
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('about:blank');
  });
});
