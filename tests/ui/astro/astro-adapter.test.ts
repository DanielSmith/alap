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
import {
  registerConfig,
  updateRegisteredConfig,
  defineAlapLink,
} from '../../../src/ui/astro/index';
import type { AlapConfig, AlapLink, AlapMacro, AlapSettings } from '../../../src/ui/astro/index';
import { AlapLinkElement } from '../../../src/ui/web-component/AlapLinkElement';
import { testConfig } from '../../fixtures/links';

// Define once
defineAlapLink();

/**
 * Astro adapter tests.
 *
 * The .astro components (AlapLink.astro, AlapSetup.astro) require Astro's
 * compiler and can't run in vitest. These tests verify the TypeScript
 * exports and the runtime behavior that the Astro components depend on:
 *
 * - Re-exported registration functions work correctly
 * - Named configs (multiple AlapSetup instances) work
 * - The web component behaves correctly in the patterns AlapSetup creates
 */

describe('Astro Adapter — exports and runtime', () => {

  function createElement(query: string, configName?: string): AlapLinkElement {
    const el = document.createElement('alap-link') as AlapLinkElement;
    el.setAttribute('query', query);
    if (configName) el.setAttribute('config', configName);
    el.textContent = 'trigger';
    document.body.appendChild(el);
    return el;
  }

  function getMenu(el: AlapLinkElement): HTMLElement | null {
    return el.shadowRoot?.querySelector('.menu') ?? null;
  }

  function getMenuItems(el: AlapLinkElement): HTMLElement[] {
    const menu = getMenu(el);
    if (!menu) return [];
    return Array.from(menu.querySelectorAll<HTMLElement>('a[role="menuitem"]'));
  }

  function isOpen(el: AlapLinkElement): boolean {
    const menu = getMenu(el);
    return menu?.getAttribute('aria-hidden') === 'false';
  }

  function clickElement(el: HTMLElement): void {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // --- Type re-exports compile correctly ---

  it('re-exports core types', () => {
    // These are compile-time checks — if the imports above work, types are correct.
    // Use them in a way that proves they're real types, not `any`.
    const config: AlapConfig = {
      allLinks: {
        test: { url: 'https://example.com', label: 'Test' },
      },
    };
    const link: AlapLink = { url: 'https://example.com', tags: ['a'] };
    const macro: AlapMacro = { linkItems: '.a' };
    const settings: AlapSettings = { listType: 'ul', menuTimeout: 3000 };

    expect(config.allLinks.test.url).toBe('https://example.com');
    expect(link.tags).toEqual(['a']);
    expect(macro.linkItems).toBe('.a');
    expect(settings.listType).toBe('ul');
  });

  // --- Re-exported registerConfig works ---

  it('registerConfig registers the default config', () => {
    registerConfig(testConfig);
    const el = createElement('.coffee');
    clickElement(el);

    expect(isOpen(el)).toBe(true);
    const items = getMenuItems(el);
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  // --- Named configs (multiple AlapSetup pattern) ---

  it('supports multiple named configs', () => {
    const configA: AlapConfig = {
      allLinks: {
        alpha: { label: 'Alpha', url: 'https://example.com/alpha', tags: ['letter'] },
      },
    };
    const configB: AlapConfig = {
      allLinks: {
        beta: { label: 'Beta', url: 'https://example.com/beta', tags: ['letter'] },
      },
    };

    registerConfig(configA, 'first');
    registerConfig(configB, 'second');

    const elA = createElement('.letter', 'first');
    const elB = createElement('.letter', 'second');

    clickElement(elA);
    const itemsA = getMenuItems(elA);
    expect(itemsA).toHaveLength(1);
    expect(itemsA[0].textContent).toBe('Alpha');

    clickElement(elA); // close

    clickElement(elB);
    const itemsB = getMenuItems(elB);
    expect(itemsB).toHaveLength(1);
    expect(itemsB[0].textContent).toBe('Beta');
  });

  it('named configs are isolated from each other', () => {
    registerConfig(testConfig, 'main');

    const configOther: AlapConfig = {
      allLinks: {
        only: { label: 'Only Item', url: 'https://example.com/only', tags: ['coffee'] },
      },
    };
    registerConfig(configOther, 'other');

    // "main" should have full testConfig coffee items
    const elMain = createElement('.coffee', 'main');
    clickElement(elMain);
    expect(getMenuItems(elMain).length).toBeGreaterThanOrEqual(3);

    clickElement(elMain); // close

    // "other" should have just 1 coffee item
    const elOther = createElement('.coffee', 'other');
    clickElement(elOther);
    expect(getMenuItems(elOther)).toHaveLength(1);
    expect(getMenuItems(elOther)[0].textContent).toBe('Only Item');
  });

  // --- updateRegisteredConfig ---

  it('updateRegisteredConfig updates an existing config', () => {
    const initial: AlapConfig = {
      allLinks: {
        foo: { label: 'Foo', url: 'https://example.com/foo', tags: ['test'] },
      },
    };
    registerConfig(initial, 'dynamic');

    const el = createElement('.test', 'dynamic');
    clickElement(el);
    expect(getMenuItems(el)).toHaveLength(1);
    expect(getMenuItems(el)[0].textContent).toBe('Foo');
    clickElement(el); // close

    // Update config with additional item
    const updated: AlapConfig = {
      allLinks: {
        foo: { label: 'Foo', url: 'https://example.com/foo', tags: ['test'] },
        bar: { label: 'Bar', url: 'https://example.com/bar', tags: ['test'] },
      },
    };
    updateRegisteredConfig(updated, 'dynamic');

    clickElement(el);
    expect(getMenuItems(el)).toHaveLength(2);
  });

  it('updateRegisteredConfig creates config if not yet registered', () => {
    const config: AlapConfig = {
      allLinks: {
        fresh: { label: 'Fresh', url: 'https://example.com/fresh', tags: ['new'] },
      },
    };
    updateRegisteredConfig(config, 'brandnew');

    const el = createElement('.new', 'brandnew');
    clickElement(el);
    expect(getMenuItems(el)).toHaveLength(1);
    expect(getMenuItems(el)[0].textContent).toBe('Fresh');
  });

  // --- AlapSetup pattern simulation ---
  // This tests the DOM pattern that AlapSetup.astro creates

  it('simulates AlapSetup data attribute pattern', () => {
    const config: AlapConfig = {
      allLinks: {
        item1: { label: 'Item One', url: 'https://example.com/1', tags: ['demo'] },
        item2: { label: 'Item Two', url: 'https://example.com/2', tags: ['demo'] },
      },
    };

    // Simulate what AlapSetup.astro renders
    const setupEl = document.createElement('alap-setup');
    setupEl.setAttribute('data-config', JSON.stringify(config));
    setupEl.setAttribute('data-name', 'setup-test');
    setupEl.style.display = 'none';
    document.body.appendChild(setupEl);

    // Simulate the script that runs
    document.querySelectorAll('alap-setup').forEach((el) => {
      const parsed = JSON.parse(el.getAttribute('data-config')!);
      const name = el.getAttribute('data-name') || '_default';
      registerConfig(parsed, name);
    });

    // Now alap-link should work with that config
    const link = createElement('.demo', 'setup-test');
    clickElement(link);
    expect(getMenuItems(link)).toHaveLength(2);
    expect(getMenuItems(link)[0].textContent).toBe('Item One');
    expect(getMenuItems(link)[1].textContent).toBe('Item Two');
  });

  it('simulates multiple AlapSetup elements on one page', () => {
    const configs = [
      { name: 'nav', data: { allLinks: { home: { label: 'Home', url: '/', tags: ['nav'] } } } },
      { name: 'footer', data: { allLinks: { about: { label: 'About', url: '/about', tags: ['nav'] } } } },
    ];

    for (const { name, data } of configs) {
      const setupEl = document.createElement('alap-setup');
      setupEl.setAttribute('data-config', JSON.stringify(data));
      setupEl.setAttribute('data-name', name);
      document.body.appendChild(setupEl);
    }

    document.querySelectorAll('alap-setup').forEach((el) => {
      const parsed = JSON.parse(el.getAttribute('data-config')!);
      const name = el.getAttribute('data-name') || '_default';
      registerConfig(parsed, name);
    });

    const navLink = createElement('.nav', 'nav');
    clickElement(navLink);
    expect(getMenuItems(navLink)).toHaveLength(1);
    expect(getMenuItems(navLink)[0].textContent).toBe('Home');

    clickElement(navLink); // close

    const footerLink = createElement('.nav', 'footer');
    clickElement(footerLink);
    expect(getMenuItems(footerLink)).toHaveLength(1);
    expect(getMenuItems(footerLink)[0].textContent).toBe('About');
  });

  // --- defineAlapLink idempotency ---

  it('defineAlapLink is safe to call multiple times', () => {
    // Should not throw
    defineAlapLink();
    defineAlapLink();
    expect(customElements.get('alap-link')).toBe(AlapLinkElement);
  });
});
