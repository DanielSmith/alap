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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, config as vtConfig } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { AlapProvider, AlapLink, useAlap } from '../../../src/ui/vue';
import { testConfig } from '../../fixtures/links';
import type { AlapConfig } from '../../../src/core/types';

// Helper to mount with provider
function mountWithProvider(
  component: ReturnType<typeof defineComponent>,
  config: AlapConfig = testConfig,
  providerProps: Record<string, unknown> = {},
) {
  return mount(AlapProvider, {
    props: { config, ...providerProps },
    slots: {
      default: () => h(component),
    },
  });
}

// Helper: wrap AlapLink for simpler test mounting
function mountAlapLink(
  query: string,
  slotText: string,
  config: AlapConfig = testConfig,
  linkProps: Record<string, unknown> = {},
  providerProps: Record<string, unknown> = {},
) {
  return mount(AlapProvider, {
    props: { config, ...providerProps },
    slots: {
      default: () => h(AlapLink, { query, ...linkProps }, () => slotText),
    },
    attachTo: document.body,
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// --- Provider ---

describe('AlapProvider', () => {
  it('throws when useAlap is called outside provider', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Bad = defineComponent({
      setup() {
        useAlap();
        return () => null;
      },
    });
    expect(() => mount(Bad)).toThrow('useAlap() must be used within an <AlapProvider>');
    warnSpy.mockRestore();
  });
});

// --- useAlap composable ---

describe('useAlap()', () => {
  it('query returns item IDs', () => {
    let result: string[] = [];
    const Spy = defineComponent({
      setup() {
        const { query } = useAlap();
        result = query('.car');
        return () => null;
      },
    });
    mountWithProvider(Spy);
    expect(result).toContain('vwbug');
    expect(result).toContain('bmwe36');
    expect(result).toContain('miata');
  });

  it('resolve returns full link objects', () => {
    let result: Array<{ id: string; url: string }> = [];
    const Spy = defineComponent({
      setup() {
        const { resolve } = useAlap();
        result = resolve('vwbug');
        return () => null;
      },
    });
    mountWithProvider(Spy);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vwbug');
    expect(result[0].url).toBe('https://example.com/vwbug');
  });

  it('getLinks returns link objects by ID', () => {
    let result: Array<{ id: string }> = [];
    const Spy = defineComponent({
      setup() {
        const { getLinks } = useAlap();
        result = getLinks(['brooklyn', 'manhattan']);
        return () => null;
      },
    });
    mountWithProvider(Spy);
    expect(result).toHaveLength(2);
    expect(result.map(l => l.id)).toEqual(['brooklyn', 'manhattan']);
  });
});

// --- AlapLink: trigger rendering ---

describe('AlapLink — trigger', () => {
  it('renders trigger with correct ARIA attributes', () => {
    const wrapper = mountAlapLink('.car', 'cars');
    const trigger = wrapper.find('[role="button"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.text()).toBe('cars');
    expect(trigger.attributes('aria-haspopup')).toBe('true');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('tabindex')).toBe('0');
  });

  it('applies class to trigger', () => {
    const wrapper = mountAlapLink('.car', 'cars', testConfig, { class: 'my-trigger' });
    const trigger = wrapper.find('[role="button"]');
    expect(trigger.classes()).toContain('my-trigger');
  });
});

// --- AlapLink: menu open/close ---

describe('AlapLink — menu lifecycle', () => {
  it('click opens menu with correct items', async () => {
    const wrapper = mountAlapLink('.nyc + .bridge', 'bridges');
    await wrapper.find('[role="button"]').trigger('click');

    const menuItems = wrapper.findAll('[role="menuitem"]');
    expect(menuItems.length).toBe(2);
    const labels = menuItems.map(el => el.text());
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Manhattan Bridge');
  });

  it('sets aria-expanded to true when open', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    const trigger = wrapper.find('[role="button"]');
    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded')).toBe('true');
  });

  it('toggle: second click closes menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    const trigger = wrapper.find('[role="button"]');
    await trigger.trigger('click');
    expect(wrapper.findAll('[role="menuitem"]').length).toBeGreaterThan(0);

    await trigger.trigger('click');
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(0);
    expect(trigger.attributes('aria-expanded')).toBe('false');
  });

  it('does not open menu for empty results', async () => {
    const wrapper = mountAlapLink('.nonexistent', 'nothing');
    const trigger = wrapper.find('[role="button"]');
    await trigger.trigger('click');
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(0);
    expect(trigger.attributes('aria-expanded')).toBe('false');
  });

  it('menu items have correct href and target', async () => {
    const wrapper = mountAlapLink('vwbug', 'car');
    await wrapper.find('[role="button"]').trigger('click');

    const menuItem = wrapper.find('[role="menuitem"]');
    expect(menuItem.attributes('href')).toBe('https://example.com/vwbug');
    expect(menuItem.attributes('target')).toBe('fromAlap');
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
    const wrapper = mountAlapLink('.img', 'images', configWithImage);
    await wrapper.find('[role="button"]').trigger('click');

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://example.com/pic.jpg');
    expect(img.attributes('alt')).toBe('A picture');
  });
});

// --- AlapLink: CSS classes ---

describe('AlapLink — styling', () => {
  it('applies alapelem class to menu container', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    const menu = wrapper.find('[role="menu"]');
    expect(menu.classes()).toContain('alapelem');
  });

  it('merges menuClassName with alapelem', async () => {
    const wrapper = mountAlapLink('.car', 'cars', testConfig, { menuClassName: 'dark-theme' });
    await wrapper.find('[role="button"]').trigger('click');
    const menu = wrapper.find('[role="menu"]');
    expect(menu.classes()).toContain('alapelem');
    expect(menu.classes()).toContain('dark-theme');
  });

  it('applies provider defaultMenuClassName', async () => {
    const wrapper = mountAlapLink('.car', 'cars', testConfig, {}, { defaultMenuClassName: 'global-menu' });
    await wrapper.find('[role="button"]').trigger('click');
    const menu = wrapper.find('[role="menu"]');
    expect(menu.classes()).toContain('global-menu');
  });

  it('menuStyle overrides provider defaultMenuStyle', async () => {
    const wrapper = mountAlapLink(
      '.car', 'cars', testConfig,
      { menuStyle: { background: 'red' } },
      { defaultMenuStyle: { background: 'blue', color: 'white' } },
    );
    await wrapper.find('[role="button"]').trigger('click');
    const menu = wrapper.find('[role="menu"]');
    expect(menu.element.style.background).toBe('red');
    expect(menu.element.style.color).toBe('white');
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
    const wrapper = mountAlapLink('.test', 'test', configWithClass);
    await wrapper.find('[role="button"]').trigger('click');
    const li = wrapper.find('[role="menuitem"]').element.closest('li');
    expect(li?.className).toContain('alapListElem');
    expect(li?.className).toContain('highlight-blue');
  });
});

// --- AlapLink: keyboard navigation ---

describe('AlapLink — keyboard', () => {
  it('Enter opens menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.findAll('[role="menuitem"]').length).toBeGreaterThan(0);
  });

  it('Space opens menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('keydown', { key: ' ' });
    expect(wrapper.findAll('[role="menuitem"]').length).toBeGreaterThan(0);
  });

  it('ArrowDown navigates to next item', async () => {
    const wrapper = mountAlapLink('.nyc + .bridge', 'bridges');
    await wrapper.find('[role="button"]').trigger('click');
    await nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    expect(document.activeElement).toBe(items[0].element);

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1].element);
  });

  it('ArrowDown wraps from last to first', async () => {
    const wrapper = mountAlapLink('.nyc + .bridge', 'bridges');
    await wrapper.find('[role="button"]').trigger('click');
    await nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    (items[items.length - 1].element as HTMLElement).focus();
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0].element);
  });

  it('ArrowUp navigates to previous item', async () => {
    const wrapper = mountAlapLink('.nyc + .bridge', 'bridges');
    await wrapper.find('[role="button"]').trigger('click');
    await nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    (items[1].element as HTMLElement).focus();
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0].element);
  });

  it('ArrowUp wraps from first to last', async () => {
    const wrapper = mountAlapLink('.nyc + .bridge', 'bridges');
    await wrapper.find('[role="button"]').trigger('click');
    await nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1].element);
  });

  it('Home focuses first item', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    await nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    (items[2].element as HTMLElement).focus();
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(items[0].element);
  });

  it('End focuses last item', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    await nextTick();

    const items = wrapper.findAll('[role="menuitem"]');
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1].element);
  });

  it('Escape closes menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');

    const items = wrapper.findAll('[role="menuitem"]');
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(0);
  });

  it('Tab closes menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');

    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Tab' });
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(0);
  });
});

// --- AlapLink: dismissal ---

describe('AlapLink — dismissal', () => {
  it('click outside closes menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    expect(wrapper.findAll('[role="menuitem"]').length).toBeGreaterThan(0);

    // Simulate click outside
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(0);
  });

  it('Escape on document closes menu', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    expect(wrapper.findAll('[role="menuitem"]').length).toBeGreaterThan(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(0);
  });
});

// --- AlapLink: list type ---

describe('AlapLink — list type', () => {
  it('uses ul by default', async () => {
    const wrapper = mountAlapLink('.car', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    expect(wrapper.find('[role="menu"] ul').exists()).toBe(true);
  });

  it('respects listType prop', async () => {
    const wrapper = mountAlapLink('.car', 'cars', testConfig, { listType: 'ol' });
    await wrapper.find('[role="button"]').trigger('click');
    expect(wrapper.find('[role="menu"] ol').exists()).toBe(true);
  });

  it('respects config listType', async () => {
    const olConfig: AlapConfig = {
      settings: { listType: 'ol' },
      allLinks: testConfig.allLinks,
    };
    const wrapper = mountAlapLink('.car', 'cars', olConfig);
    await wrapper.find('[role="button"]').trigger('click');
    expect(wrapper.find('[role="menu"] ol').exists()).toBe(true);
  });
});

// --- AlapLink: macro support ---

describe('AlapLink — macros', () => {
  it('resolves named macros', async () => {
    const wrapper = mountAlapLink('@cars', 'cars');
    await wrapper.find('[role="button"]').trigger('click');
    const items = wrapper.findAll('[role="menuitem"]');
    const labels = items.map(el => el.text());
    expect(labels).toContain('VW Bug');
    expect(labels).toContain('BMW E36');
  });
});

// --- AlapLink: expressions ---

describe('AlapLink — expressions', () => {
  it('handles intersection', async () => {
    const wrapper = mountAlapLink('.coffee + .sf', 'sf coffee');
    await wrapper.find('[role="button"]').trigger('click');
    const items = wrapper.findAll('[role="menuitem"]');
    const labels = items.map(el => el.text());
    expect(labels).toContain('Aqus Cafe');
    expect(labels).toContain('Blue Bottle');
    expect(labels).not.toContain('Acre Coffee');
  });

  it('handles subtraction', async () => {
    const wrapper = mountAlapLink('.bridge - .nyc', 'non-nyc bridges');
    await wrapper.find('[role="button"]').trigger('click');
    const items = wrapper.findAll('[role="menuitem"]');
    const labels = items.map(el => el.text());
    expect(labels).toContain('Golden Gate');
    expect(labels).toContain('Tower Bridge');
    expect(labels).not.toContain('Brooklyn Bridge');
  });
});
