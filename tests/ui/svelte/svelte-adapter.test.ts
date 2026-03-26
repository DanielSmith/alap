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

import { describe, it, expect, beforeEach, vi, tick } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { testConfig } from '../../fixtures/links';
import type { AlapConfig } from '../../../src/core/types';
import AlapTestHarness from './AlapTestHarness.svelte';
import AlapHookSpy from './AlapHookSpy.svelte';
import AlapNoProvider from './AlapNoProvider.svelte';

// Helper to render AlapLink inside AlapProvider
function renderLink(
  query: string,
  slotText: string,
  config: AlapConfig = testConfig,
  linkProps: Record<string, unknown> = {},
  providerProps: Record<string, unknown> = {},
) {
  return render(AlapTestHarness, {
    props: {
      config,
      query,
      slotText,
      ...linkProps,
      ...providerProps,
    },
  });
}

beforeEach(() => {
  cleanup();
});

// --- Provider ---

describe('AlapProvider', () => {
  it('throws when useAlap is called outside provider', () => {
    expect(() => render(AlapNoProvider)).toThrow('useAlap() must be used within an <AlapProvider>');
  });
});

// --- useAlap composable ---

describe('useAlap()', () => {
  it('query returns item IDs', () => {
    const { container } = render(AlapHookSpy, {
      props: { config: testConfig, expression: '.car', mode: 'query' },
    });
    const result = container.querySelector('[data-testid="result"]')?.textContent ?? '';
    expect(result).toContain('vwbug');
    expect(result).toContain('bmwe36');
    expect(result).toContain('miata');
  });

  it('resolve returns full link objects', () => {
    const { container } = render(AlapHookSpy, {
      props: { config: testConfig, expression: 'vwbug', mode: 'resolve' },
    });
    const result = container.querySelector('[data-testid="result"]')?.textContent ?? '';
    expect(result).toContain('vwbug');
    expect(result).toContain('https://example.com/vwbug');
  });

  it('getLinks returns link objects by ID', () => {
    const { container } = render(AlapHookSpy, {
      props: { config: testConfig, expression: 'brooklyn,manhattan', mode: 'getLinks' },
    });
    const result = container.querySelector('[data-testid="result"]')?.textContent ?? '';
    expect(result).toContain('brooklyn');
    expect(result).toContain('manhattan');
  });
});

// --- AlapLink: trigger rendering ---

describe('AlapLink — trigger', () => {
  it('renders trigger with correct ARIA attributes', () => {
    renderLink('.car', 'cars');
    const trigger = screen.getByRole('button', { name: 'cars' });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('tabindex')).toBe('0');
  });

  it('applies class to trigger', () => {
    renderLink('.car', 'cars', testConfig, { triggerClass: 'my-trigger' });
    const trigger = screen.getByRole('button', { name: 'cars' });
    expect(trigger.className).toContain('my-trigger');
  });
});

// --- AlapLink: menu open/close ---

describe('AlapLink — menu lifecycle', () => {
  it('click opens menu with correct items', async () => {
    renderLink('.nyc + .bridge', 'bridges');
    const trigger = screen.getByRole('button', { name: 'bridges' });
    await fireEvent.click(trigger);

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBe(2);
    const labels = menuItems.map(el => el.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Manhattan Bridge');
  });

  it('sets aria-expanded to true when open', async () => {
    renderLink('.car', 'cars');
    const trigger = screen.getByRole('button', { name: 'cars' });
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggle: second click closes menu', async () => {
    renderLink('.car', 'cars');
    const trigger = screen.getByRole('button', { name: 'cars' });
    await fireEvent.click(trigger);
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    await fireEvent.click(trigger);
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not open menu for empty results', async () => {
    renderLink('.nonexistent', 'nothing');
    const trigger = screen.getByRole('button', { name: 'nothing' });
    await fireEvent.click(trigger);
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('menu items have correct href and target', async () => {
    renderLink('vwbug', 'car');
    await fireEvent.click(screen.getByRole('button', { name: 'car' }));

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem.getAttribute('href')).toBe('https://example.com/vwbug');
    expect(menuItem.getAttribute('target')).toBe('fromAlap');
  });

  it('renders image items correctly', async () => {
    const configWithImage: AlapConfig = {
      allLinks: {
        pic: {
          url: 'https://example.com/pic',
          image: 'https://example.com/pic.jpg',
          altText: 'A picture',
          tags: ['img'],
        },
      },
    };
    renderLink('.img', 'images', configWithImage);
    await fireEvent.click(screen.getByRole('button', { name: 'images' }));

    const img = screen.getByAltText('A picture');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/pic.jpg');
  });
});

// --- AlapLink: CSS classes ---

describe('AlapLink — styling', () => {
  it('applies alapelem class to menu container', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('alapelem');
  });

  it('merges menuClassName with alapelem', async () => {
    renderLink('.car', 'cars', testConfig, { menuClassName: 'dark-theme' });
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('alapelem');
    expect(menu.className).toContain('dark-theme');
  });

  it('applies provider defaultMenuClassName', async () => {
    renderLink('.car', 'cars', testConfig, {}, { defaultMenuClassName: 'global-menu' });
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('global-menu');
  });

  it('applies cssClass from link items to list items', async () => {
    const configWithClass: AlapConfig = {
      allLinks: {
        styled: {
          label: 'Styled',
          url: 'https://example.com',
          cssClass: 'highlight-blue',
          tags: ['test'],
        },
      },
    };
    renderLink('.test', 'test', configWithClass);
    await fireEvent.click(screen.getByRole('button', { name: 'test' }));
    const li = screen.getByRole('menuitem').closest('li');
    expect(li?.className).toContain('alapListElem');
    expect(li?.className).toContain('highlight-blue');
  });
});

// --- AlapLink: keyboard navigation ---

describe('AlapLink — keyboard', () => {
  it('Enter opens menu', async () => {
    renderLink('.car', 'cars');
    const trigger = screen.getByRole('button', { name: 'cars' });
    await fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('Space opens menu', async () => {
    renderLink('.car', 'cars');
    const trigger = screen.getByRole('button', { name: 'cars' });
    await fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('Escape closes menu', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    await fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('Tab closes menu', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    await fireEvent.keyDown(menu, { key: 'Tab' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('ArrowDown navigates to next item', async () => {
    renderLink('.nyc + .bridge', 'bridges');
    await fireEvent.click(screen.getByRole('button', { name: 'bridges' }));

    const items = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    items[0].focus();
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowDown wraps from last to first', async () => {
    renderLink('.nyc + .bridge', 'bridges');
    await fireEvent.click(screen.getByRole('button', { name: 'bridges' }));

    const items = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    items[items.length - 1].focus();
    await fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowUp wraps from first to last', async () => {
    renderLink('.nyc + .bridge', 'bridges');
    await fireEvent.click(screen.getByRole('button', { name: 'bridges' }));

    const items = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    items[0].focus();
    await fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('Home focuses first item', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));

    const items = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    items[2].focus();
    await fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('End focuses last item', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));

    const items = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    items[0].focus();
    await fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });
});

// --- AlapLink: dismissal ---

describe('AlapLink — dismissal', () => {
  it('click outside closes menu', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    await fireEvent.click(document.body);
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('Escape on document closes menu', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });
});

// --- AlapLink: list type ---

describe('AlapLink — list type', () => {
  it('uses ul by default', async () => {
    renderLink('.car', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const list = screen.getByRole('menu').querySelector('ul');
    expect(list).not.toBeNull();
  });

  it('respects listType prop', async () => {
    renderLink('.car', 'cars', testConfig, { listType: 'ol' });
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const list = screen.getByRole('menu').querySelector('ol');
    expect(list).not.toBeNull();
  });

  it('respects config listType', async () => {
    const olConfig: AlapConfig = {
      settings: { listType: 'ol' },
      allLinks: testConfig.allLinks,
    };
    renderLink('.car', 'cars', olConfig);
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const list = screen.getByRole('menu').querySelector('ol');
    expect(list).not.toBeNull();
  });
});

// --- AlapLink: macro support ---

describe('AlapLink — macros', () => {
  it('resolves named macros', async () => {
    renderLink('@cars', 'cars');
    await fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const items = screen.getAllByRole('menuitem');
    const labels = items.map(el => el.textContent);
    expect(labels).toContain('VW Bug');
    expect(labels).toContain('BMW E36');
  });
});

// --- AlapLink: expressions ---

describe('AlapLink — expressions', () => {
  it('handles intersection', async () => {
    renderLink('.coffee + .sf', 'sf coffee');
    await fireEvent.click(screen.getByRole('button', { name: 'sf coffee' }));
    const items = screen.getAllByRole('menuitem');
    const labels = items.map(el => el.textContent);
    expect(labels).toContain('Aqus Cafe');
    expect(labels).toContain('Blue Bottle');
    expect(labels).not.toContain('Acre Coffee');
  });

  it('handles subtraction', async () => {
    renderLink('.bridge - .nyc', 'non-nyc bridges');
    await fireEvent.click(screen.getByRole('button', { name: 'non-nyc bridges' }));
    const items = screen.getAllByRole('menuitem');
    const labels = items.map(el => el.textContent);
    expect(labels).toContain('Golden Gate');
    expect(labels).toContain('Tower Bridge');
    expect(labels).not.toContain('Brooklyn Bridge');
  });
});
