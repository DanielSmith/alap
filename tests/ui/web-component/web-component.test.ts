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
import { AlapLinkElement, registerConfig, defineAlapLink } from '../../../src/ui/web-component/AlapLinkElement';
import { testConfig } from '../../fixtures/links';

// Define once for all tests
defineAlapLink();

describe('Web Component — <alap-link>', () => {

  function createElement(query: string, id?: string): AlapLinkElement {
    const el = document.createElement('alap-link') as AlapLinkElement;
    el.setAttribute('query', query);
    if (id) el.id = id;
    el.textContent = 'trigger text';
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
    registerConfig(testConfig);
  });

  // --- Registration ---

  it('defines the custom element', () => {
    expect(customElements.get('alap-link')).toBe(AlapLinkElement);
  });

  // --- Shadow DOM structure ---

  it('has a shadow root with menu and slot', () => {
    const el = createElement('.coffee');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
    expect(getMenu(el)).not.toBeNull();
  });

  it('menu is hidden by default', () => {
    const el = createElement('.coffee');
    expect(isOpen(el)).toBe(false);
  });

  // --- ARIA on host ---

  it('sets ARIA attributes on host element', () => {
    const el = createElement('.coffee');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('aria-haspopup')).toBe('true');
    expect(el.getAttribute('aria-expanded')).toBe('false');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  // --- Click opens menu ---

  it('opens menu on click', () => {
    const el = createElement('.coffee');
    clickElement(el);

    expect(isOpen(el)).toBe(true);
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders correct items for class query', () => {
    const el = createElement('.coffee');
    clickElement(el);

    const items = getMenuItems(el);
    expect(items.length).toBeGreaterThanOrEqual(3);
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Aqus Cafe');
    expect(labels).toContain('Blue Bottle');
    expect(labels).toContain('Acre Coffee');
  });

  it('renders correct items for macro', () => {
    const el = createElement('@cars');
    clickElement(el);

    const items = getMenuItems(el);
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('VW Bug');
    expect(items[1].textContent).toBe('BMW E36');
  });

  it('renders correct items for operator expression', () => {
    const el = createElement('.nyc + .bridge');
    clickElement(el);

    const items = getMenuItems(el);
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Manhattan Bridge');
    expect(labels).not.toContain('Golden Gate');
  });

  // --- Toggle ---

  it('closes menu on second click', () => {
    const el = createElement('.coffee');

    clickElement(el);
    expect(isOpen(el)).toBe(true);

    clickElement(el);
    expect(isOpen(el)).toBe(false);
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  // --- Menu item attributes ---

  it('sets href and target on menu links', () => {
    const el = createElement('vwbug');
    clickElement(el);

    const items = getMenuItems(el);
    expect(items[0].getAttribute('href')).toBe('https://example.com/vwbug');
    expect(items[0].getAttribute('target')).toBe('fromAlap');
  });

  it('sets menuitem role on links', () => {
    const el = createElement('@cars');
    clickElement(el);

    for (const item of getMenuItems(el)) {
      expect(item.getAttribute('role')).toBe('menuitem');
    }
  });

  // --- ::part() exposure ---

  it('exposes menu part', () => {
    const el = createElement('.coffee');
    const menu = getMenu(el);
    expect(menu!.getAttribute('part')).toBe('menu');
  });

  it('exposes item and link parts', () => {
    const el = createElement('@cars');
    clickElement(el);

    const items = el.shadowRoot!.querySelectorAll('li');
    for (const li of items) {
      expect(li.getAttribute('part')).toBe('item');
    }

    const links = getMenuItems(el);
    for (const a of links) {
      expect(a.getAttribute('part')).toBe('link');
    }
  });

  // --- Dismissal ---

  it('closes menu on Escape key', () => {
    const el = createElement('.coffee');
    clickElement(el);
    expect(isOpen(el)).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isOpen(el)).toBe(false);
  });

  it('closes menu on click outside', () => {
    const el = createElement('.coffee');
    clickElement(el);
    expect(isOpen(el)).toBe(true);

    // Click on the document body (outside the element)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(isOpen(el)).toBe(false);
  });

  // --- Keyboard: Enter/Space opens ---

  it('opens menu on Enter key', () => {
    const el = createElement('.coffee');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(isOpen(el)).toBe(true);
  });

  it('opens menu on Space key', () => {
    const el = createElement('.coffee');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(isOpen(el)).toBe(true);
  });

  // --- Keyboard navigation ---

  it('navigates with ArrowDown', () => {
    const el = createElement('@cars');
    clickElement(el);

    const items = getMenuItems(el);
    const menu = getMenu(el)!;

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(el.shadowRoot!.activeElement).toBe(items[1]);
  });

  it('navigates with ArrowUp wrapping', () => {
    const el = createElement('@cars');
    clickElement(el);

    const items = getMenuItems(el);
    const menu = getMenu(el)!;

    // First item is focused. ArrowUp should wrap to last.
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(el.shadowRoot!.activeElement).toBe(items[items.length - 1]);
  });

  it('Home focuses first, End focuses last', () => {
    const el = createElement('.bridge');
    clickElement(el);

    const items = getMenuItems(el);
    const menu = getMenu(el)!;

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(el.shadowRoot!.activeElement).toBe(items[items.length - 1]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(el.shadowRoot!.activeElement).toBe(items[0]);
  });

  // --- Empty results ---

  it('does not open menu for empty results', () => {
    const el = createElement('.nonexistent');
    clickElement(el);
    expect(isOpen(el)).toBe(false);
  });

  // --- Missing config ---

  it('does not open without registered config', () => {
    // Register under a different name so _default is effectively missing
    registerConfig(testConfig, 'other');

    const el = document.createElement('alap-link') as AlapLinkElement;
    el.setAttribute('query', '.coffee');
    el.setAttribute('config', 'missing');
    el.textContent = 'test';
    document.body.appendChild(el);

    clickElement(el);
    expect(isOpen(el)).toBe(false);
  });

  // --- Attribute change ---

  it('closes menu when query attribute changes', () => {
    const el = createElement('.coffee');
    clickElement(el);
    expect(isOpen(el)).toBe(true);

    el.setAttribute('query', '.bridge');
    expect(isOpen(el)).toBe(false);
  });

  // --- Cleanup ---

  it('cleans up on disconnect', () => {
    const el = createElement('.coffee');
    clickElement(el);
    expect(isOpen(el)).toBe(true);

    el.remove();
    // Should not throw when document events fire after removal
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
});
