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
import { alapPlugin, type AlapDirectiveValue } from '../../../src/ui/alpine/index';
import { testConfig } from '../../fixtures/links';

/**
 * Alpine adapter tests.
 *
 * Since Alpine.js isn't installed as a test dependency, we simulate
 * what Alpine.directive() does: capture the directive callback, then
 * call it with the element and utilities Alpine would provide.
 */

type DirectiveCallback = (
  el: HTMLElement,
  directive: { expression: string; modifiers: string[] },
  utilities: {
    evaluate: (expr: string) => unknown;
    cleanup: (fn: () => void) => void;
  },
) => void;

// Capture the directive callback when the plugin registers it
let directiveCallback: DirectiveCallback;
const cleanupFns: Array<() => void> = [];

const fakeAlpine = {
  directive(name: string, cb: DirectiveCallback) {
    if (name === 'alap') {
      directiveCallback = cb;
    }
  },
};

// Register the plugin once
alapPlugin(fakeAlpine);

/** Set up an element with the x-alap directive */
function setupDirective(
  tag: string,
  opts: AlapDirectiveValue,
  id?: string,
): HTMLElement {
  const el = document.createElement(tag);
  if (id) el.id = id;
  el.textContent = 'trigger';
  document.body.appendChild(el);

  const localCleanups: Array<() => void> = [];

  directiveCallback(
    el,
    { expression: 'opts', modifiers: [] },
    {
      evaluate: () => opts,
      cleanup: (fn) => {
        localCleanups.push(fn);
        cleanupFns.push(fn);
      },
    },
  );

  return el;
}

function getMenu(): HTMLElement | null {
  return document.querySelector('.alapelem');
}

function getMenuItems(): HTMLElement[] {
  const menu = getMenu();
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>('a[role="menuitem"]'));
}

function isOpen(): boolean {
  const menu = getMenu();
  return menu?.getAttribute('aria-hidden') === 'false';
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('Alpine Adapter — x-alap directive', () => {

  beforeEach(() => {
    document.body.innerHTML = '';
    cleanupFns.length = 0;
  });

  afterEach(() => {
    // Run all cleanup functions (simulates Alpine removing elements)
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    document.body.innerHTML = '';
  });

  // --- Registration ---

  it('registers the x-alap directive', () => {
    expect(directiveCallback).toBeDefined();
  });

  // --- ARIA on trigger ---

  it('sets ARIA attributes on a span trigger', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    expect(el.getAttribute('aria-haspopup')).toBe('true');
    expect(el.getAttribute('aria-expanded')).toBe('false');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
  });

  it('does not override role on button elements', () => {
    const el = setupDirective('button', { query: '.coffee', config: testConfig });
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('tabindex')).toBeNull();
  });

  it('does not override role on anchor elements', () => {
    const el = setupDirective('a', { query: '.coffee', config: testConfig });
    expect(el.getAttribute('role')).toBeNull();
  });

  // --- Click opens menu ---

  it('opens menu on click', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    click(el);

    expect(isOpen()).toBe(true);
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders correct items for class query', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    click(el);

    const items = getMenuItems();
    expect(items.length).toBeGreaterThanOrEqual(3);
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Aqus Cafe');
    expect(labels).toContain('Blue Bottle');
    expect(labels).toContain('Acre Coffee');
  });

  it('renders correct items for macro', () => {
    const el = setupDirective('span', { query: '@cars', config: testConfig });
    click(el);

    const items = getMenuItems();
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('VW Bug');
    expect(items[1].textContent).toBe('BMW E36');
  });

  it('renders correct items for operator expression', () => {
    const el = setupDirective('span', { query: '.nyc + .bridge', config: testConfig });
    click(el);

    const items = getMenuItems();
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Manhattan Bridge');
    expect(labels).not.toContain('Golden Gate');
  });

  // --- Toggle ---

  it('closes menu on second click', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });

    click(el);
    expect(isOpen()).toBe(true);

    click(el);
    expect(isOpen()).toBe(false);
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  // --- Empty results ---

  it('does not open menu for empty results', () => {
    const el = setupDirective('span', { query: '.nonexistent', config: testConfig });
    click(el);
    expect(isOpen()).toBe(false);
  });

  // --- Dismissal ---

  it('closes menu on Escape key', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    click(el);
    expect(isOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isOpen()).toBe(false);
  });

  it('closes menu on click outside', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    click(el);
    expect(isOpen()).toBe(true);

    // Click on another element
    const other = document.createElement('div');
    document.body.appendChild(other);
    other.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(isOpen()).toBe(false);
  });

  // --- Keyboard: Enter/Space opens ---

  it('opens menu on Enter key', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(isOpen()).toBe(true);
  });

  it('opens menu on Space key', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(isOpen()).toBe(true);
  });

  // --- Keyboard navigation ---

  it('navigates with ArrowDown', () => {
    const el = setupDirective('span', { query: '@cars', config: testConfig });
    click(el);

    const menu = getMenu()!;
    const items = getMenuItems();

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
  });

  it('Home focuses first, End focuses last', () => {
    const el = setupDirective('span', { query: '.bridge', config: testConfig });
    click(el);

    const menu = getMenu()!;
    const items = getMenuItems();

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[items.length - 1]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  // --- Menu ARIA ---

  it('sets menu role and aria-hidden', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    click(el);

    const menu = getMenu()!;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-hidden')).toBe('false');
  });

  it('sets aria-labelledby when trigger has ID', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig }, 'my-trigger');
    click(el);

    const menu = getMenu()!;
    expect(menu.getAttribute('aria-labelledby')).toBe('my-trigger');
  });

  it('sets menuitem role on links', () => {
    const el = setupDirective('span', { query: '@cars', config: testConfig });
    click(el);

    for (const item of getMenuItems()) {
      expect(item.getAttribute('role')).toBe('menuitem');
    }
  });

  // --- Cleanup ---

  it('removes menu from DOM on cleanup', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig });
    click(el);
    expect(getMenu()).not.toBeNull();

    // Run cleanup (simulates Alpine removing the element)
    for (const fn of cleanupFns) fn();
    expect(getMenu()).toBeNull();
  });

  // --- Config options ---

  it('respects custom listType', () => {
    const el = setupDirective('span', { query: '.coffee', config: testConfig, listType: 'ol' });
    click(el);

    const menu = getMenu()!;
    expect(menu.querySelector('ol')).not.toBeNull();
    expect(menu.querySelector('ul')).toBeNull();
  });
});
