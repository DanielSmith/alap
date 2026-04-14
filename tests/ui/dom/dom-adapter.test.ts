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
import { AlapUI } from '../../../src/ui/dom/AlapUI';
import { testConfig } from '../../fixtures/links';

describe('DOM Adapter — AlapUI', () => {
  let ui: AlapUI;

  function createTrigger(id: string, expression: string): HTMLElement {
    const a = document.createElement('a');
    a.id = id;
    a.className = 'alap';
    a.setAttribute('data-alap-linkitems', expression);
    a.textContent = id;
    document.body.appendChild(a);
    return a;
  }

  function getMenu(): HTMLElement | null {
    return document.getElementById('alapelem');
  }

  function getMenuItems(): HTMLElement[] {
    const menu = getMenu();
    if (!menu) return [];
    return Array.from(menu.querySelectorAll<HTMLElement>('a[role="menuitem"]'));
  }

  function clickTrigger(trigger: HTMLElement): void {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui?.destroy();
  });

  // --- Container setup ---

  it('creates a hidden menu container on init', () => {
    createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    const menu = getMenu();
    expect(menu).not.toBeNull();
    expect(menu!.style.display).toBe('none');
    expect(menu!.getAttribute('role')).toBe('menu');
  });

  // --- Trigger ARIA ---

  it('sets ARIA attributes on triggers', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    expect(trigger.getAttribute('role')).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('tabindex')).toBe('0');
  });

  // --- Click opens menu ---

  it('opens menu on trigger click', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const menu = getMenu();
    expect(menu!.style.display).toBe('block');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders correct items for expression', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const items = getMenuItems();
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('VW Bug');
    expect(items[1].textContent).toBe('BMW E36');
  });

  it('renders items for class query', () => {
    const trigger = createTrigger('bridges', '.bridge');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const items = getMenuItems();
    expect(items.length).toBeGreaterThanOrEqual(3);
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Golden Gate');
  });

  it('renders items for operator expression', () => {
    const trigger = createTrigger('nycbridge', '.nyc + .bridge');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const items = getMenuItems();
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Manhattan Bridge');
    expect(labels).not.toContain('Golden Gate');
  });

  // --- CSS classes ---

  it('applies alapelem and alap_{id} classes to menu', () => {
    const trigger = createTrigger('bridges', '.bridge');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const menu = getMenu();
    expect(menu!.classList.contains('alapelem')).toBe(true);
    expect(menu!.classList.contains('alap_bridges')).toBe(true);
  });

  it('applies alapListElem class to list items', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const lis = getMenu()!.querySelectorAll('li');
    for (const li of lis) {
      expect(li.classList.contains('alapListElem')).toBe(true);
    }
  });

  // --- Menu item attributes ---

  it('sets correct href and target on menu links', () => {
    const trigger = createTrigger('cars', 'vwbug');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const items = getMenuItems();
    expect(items[0].getAttribute('href')).toBe('https://example.com/vwbug');
    expect(items[0].getAttribute('target')).toBe('fromAlap');
  });

  it('sets menuitem role on links', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);

    const items = getMenuItems();
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('menuitem');
    }
  });

  // --- Dismissal ---

  it('closes menu on Escape key', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    expect(getMenu()!.style.display).toBe('block');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(getMenu()!.style.display).toBe('none');
  });

  it('closes menu on click outside', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    expect(getMenu()!.style.display).toBe('block');

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getMenu()!.style.display).toBe('none');
  });

  it('resets aria-expanded on close', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  // --- Keyboard navigation ---

  it('navigates items with ArrowDown', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const items = getMenuItems();

    // First item should be focused after keyboard open
    expect(document.activeElement).toBe(items[0]);

    getMenu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
  });

  it('wraps ArrowDown from last to first', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    const items = getMenuItems();

    // Move to last
    items[items.length - 1].focus();

    getMenu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  it('navigates with ArrowUp', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    const items = getMenuItems();

    // Focus second item
    items[1].focus();

    getMenu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  it('Home key focuses first item', () => {
    const trigger = createTrigger('bridges', '.bridge');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    const items = getMenuItems();
    items[items.length - 1].focus();

    getMenu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
  });

  it('End key focuses last item', () => {
    const trigger = createTrigger('bridges', '.bridge');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    const items = getMenuItems();

    getMenu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  // --- Focus behavior ---

  it('does not focus first item on mouse open', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    // Focus the trigger so we can detect focus NOT moving to menu item
    trigger.focus();
    clickTrigger(trigger);

    const items = getMenuItems();
    expect(items.length).toBeGreaterThan(0);
    expect(document.activeElement).not.toBe(items[0]);
  });

  it('focuses first item on keyboard open', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const items = getMenuItems();
    expect(document.activeElement).toBe(items[0]);
  });

  it('does not focus trigger when closing a menu that was never open', () => {
    const t1 = createTrigger('cars', '@cars');
    const t2 = createTrigger('bridges', '.bridge');
    ui = new AlapUI(testConfig);

    // Focus t1, then close menu (which was never opened for any trigger)
    t1.focus();
    expect(document.activeElement).toBe(t1);

    // Close via escape — nothing is open, should not move focus
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    // Focus should stay on t1, not jump to t2
    expect(document.activeElement).toBe(t1);
  });

  it('returns focus to trigger after closing an open menu', () => {
    const trigger = createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    expect(getMenu()!.style.display).not.toBe('none');

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(trigger);
  });

  it('positions image menu at center on keyboard open', () => {
    const img = document.createElement('img');
    img.className = 'alap';
    img.id = 'testimg';
    img.setAttribute('data-alap-linkitems', '.coffee');
    // Mock getBoundingClientRect for the image
    img.getBoundingClientRect = () => ({
      top: 100, left: 200, bottom: 300, right: 400,
      width: 200, height: 200, x: 200, y: 100, toJSON() {},
    });
    document.body.appendChild(img);
    ui = new AlapUI(testConfig);

    img.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const menu = getMenu()!;
    // Menu should be visible (not at 0,0 default)
    expect(menu.style.display).not.toBe('none');
    // The top value should be based on image center (y=200), not 0
    const top = parseFloat(menu.style.top);
    expect(top).toBeGreaterThan(0);
  });

  // --- Empty results ---

  it('does not open menu for empty results', () => {
    const trigger = createTrigger('nothing', '.nonexistent');
    ui = new AlapUI(testConfig);

    clickTrigger(trigger);
    expect(getMenu()!.style.display).toBe('none');
  });

  // --- Switching triggers ---

  it('updates menu when clicking a different trigger', () => {
    const t1 = createTrigger('cars', '@cars');
    const t2 = createTrigger('bridges', '.nyc + .bridge');
    ui = new AlapUI(testConfig);

    clickTrigger(t1);
    let items = getMenuItems();
    expect(items[0].textContent).toBe('VW Bug');

    clickTrigger(t2);
    items = getMenuItems();
    const labels = items.map(i => i.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).not.toContain('VW Bug');
  });

  // --- destroy ---

  it('removes container on destroy', () => {
    createTrigger('cars', '@cars');
    ui = new AlapUI(testConfig);

    expect(getMenu()).not.toBeNull();
    ui.destroy();
    expect(getMenu()).toBeNull();
  });

  // --- refresh ---

  it('picks up new triggers after refresh', () => {
    ui = new AlapUI(testConfig);

    // Add a trigger after init
    const trigger = createTrigger('late', '.coffee');
    ui.refresh();

    expect(trigger.getAttribute('role')).toBe('button');
    clickTrigger(trigger);
    expect(getMenuItems().length).toBeGreaterThan(0);
  });
});
