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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AlapProvider, AlapLink, useAlap } from '../../../src/ui/react';
import { testConfig } from '../../fixtures/links';
import type { AlapConfig } from '../../../src/core/types';

// Helper to render with provider
function renderWithProvider(
  ui: React.ReactElement,
  config: AlapConfig = testConfig,
  providerProps: Record<string, unknown> = {},
) {
  return render(
    <AlapProvider config={config} {...providerProps}>
      {ui}
    </AlapProvider>,
  );
}

beforeEach(() => {
  cleanup();
});

// --- Provider ---

describe('AlapProvider', () => {
  it('throws when useAlap is called outside provider', () => {
    function Bad() {
      useAlap();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useAlap() must be used within an <AlapProvider>');
  });
});

// --- useAlap hook ---

describe('useAlap()', () => {
  it('query returns item IDs', () => {
    let result: string[] = [];
    function Spy() {
      const { query } = useAlap();
      result = query('.car');
      return null;
    }
    renderWithProvider(<Spy />);
    expect(result).toContain('vwbug');
    expect(result).toContain('bmwe36');
    expect(result).toContain('miata');
  });

  it('resolve returns full link objects', () => {
    let result: Array<{ id: string; url: string }> = [];
    function Spy() {
      const { resolve } = useAlap();
      result = resolve('vwbug');
      return null;
    }
    renderWithProvider(<Spy />);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vwbug');
    expect(result[0].url).toBe('https://example.com/vwbug');
  });

  it('getLinks returns link objects by ID', () => {
    let result: Array<{ id: string }> = [];
    function Spy() {
      const { getLinks } = useAlap();
      result = getLinks(['brooklyn', 'manhattan']);
      return null;
    }
    renderWithProvider(<Spy />);
    expect(result).toHaveLength(2);
    expect(result.map(l => l.id)).toEqual(['brooklyn', 'manhattan']);
  });
});

// --- AlapLink: trigger rendering ---

describe('AlapLink — trigger', () => {
  it('renders trigger with correct ARIA attributes', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('tabindex')).toBe('0');
  });

  it('applies className to trigger', () => {
    renderWithProvider(<AlapLink query=".car" className="my-trigger">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    expect(trigger.className).toBe('my-trigger');
  });
});

// --- AlapLink: menu open/close ---

describe('AlapLink — menu lifecycle', () => {
  it('click opens menu with correct items', () => {
    renderWithProvider(<AlapLink query=".nyc + .bridge">bridges</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'bridges' });
    fireEvent.click(trigger);

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBe(2);
    const labels = menuItems.map(el => el.textContent);
    expect(labels).toContain('Brooklyn Bridge');
    expect(labels).toContain('Manhattan Bridge');
  });

  it('sets aria-expanded to true when open', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggle: second click closes menu', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    fireEvent.click(trigger);
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    fireEvent.click(trigger);
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not open menu for empty results', () => {
    renderWithProvider(<AlapLink query=".nonexistent">nothing</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'nothing' });
    fireEvent.click(trigger);
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('menu items have correct href and target', () => {
    renderWithProvider(<AlapLink query="vwbug">car</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'car' }));

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem.getAttribute('href')).toBe('https://example.com/vwbug');
    expect(menuItem.getAttribute('target')).toBe('fromAlap');
  });

  it('renders image items correctly', () => {
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
    renderWithProvider(<AlapLink query=".img">images</AlapLink>, configWithImage);
    fireEvent.click(screen.getByRole('button', { name: 'images' }));

    const img = screen.getByAltText('A picture');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/pic.jpg');
  });
});

// --- AlapLink: CSS classes ---

describe('AlapLink — styling', () => {
  it('applies alapelem class to menu container', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('alapelem');
  });

  it('merges menuClassName with alapelem', () => {
    renderWithProvider(
      <AlapLink query=".car" menuClassName="dark-theme">cars</AlapLink>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('alapelem');
    expect(menu.className).toContain('dark-theme');
  });

  it('applies provider defaultMenuClassName', () => {
    renderWithProvider(
      <AlapLink query=".car">cars</AlapLink>,
      testConfig,
      { defaultMenuClassName: 'global-menu' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('global-menu');
  });

  it('menuStyle overrides provider defaultMenuStyle', () => {
    renderWithProvider(
      <AlapLink query=".car" menuStyle={{ background: 'red' }}>cars</AlapLink>,
      testConfig,
      { defaultMenuStyle: { background: 'blue', color: 'white' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const menu = screen.getByRole('menu');
    expect(menu.style.background).toBe('red');
    expect(menu.style.color).toBe('white');
  });

  it('applies cssClass from link items to list items', () => {
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
    renderWithProvider(<AlapLink query=".test">test</AlapLink>, configWithClass);
    fireEvent.click(screen.getByRole('button', { name: 'test' }));
    const li = screen.getByRole('menuitem').closest('li');
    expect(li?.className).toContain('alapListElem');
    expect(li?.className).toContain('highlight-blue');
  });
});

// --- AlapLink: keyboard navigation ---

describe('AlapLink — keyboard', () => {
  it('Enter opens menu', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('Space opens menu', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('ArrowDown navigates to next item', () => {
    renderWithProvider(<AlapLink query=".nyc + .bridge">bridges</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'bridges' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const items = screen.getAllByRole('menuitem');
    // Keyboard open focuses first item
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowDown wraps from last to first', () => {
    renderWithProvider(<AlapLink query=".nyc + .bridge">bridges</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'bridges' }));

    const items = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    items[items.length - 1].focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowUp navigates to previous item', () => {
    renderWithProvider(<AlapLink query=".nyc + .bridge">bridges</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'bridges' }));

    const items = screen.getAllByRole('menuitem');
    items[1].focus();
    fireEvent.keyDown(items[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('ArrowUp wraps from first to last', () => {
    renderWithProvider(<AlapLink query=".nyc + .bridge">bridges</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'bridges' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('Home focuses first item', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));

    const items = screen.getAllByRole('menuitem');
    items[2].focus();
    fireEvent.keyDown(items[2], { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('End focuses last item', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));

    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('Escape closes menu', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    const trigger = screen.getByRole('button', { name: 'cars' });
    fireEvent.click(trigger);

    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'Escape' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('Tab closes menu', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));

    const items = screen.getAllByRole('menuitem');
    fireEvent.keyDown(items[0], { key: 'Tab' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });
});

// --- AlapLink: dismissal ---

describe('AlapLink — dismissal', () => {
  it('click outside closes menu', () => {
    renderWithProvider(
      <div>
        <AlapLink query=".car">cars</AlapLink>
        <button data-testid="outside">outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('outside'));
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('Escape on document closes menu', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });
});

// --- AlapLink: list type ---

describe('AlapLink — list type', () => {
  it('uses ul by default', () => {
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const list = screen.getByRole('menu').querySelector('ul');
    expect(list).not.toBeNull();
  });

  it('respects listType prop', () => {
    renderWithProvider(<AlapLink query=".car" listType="ol">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const list = screen.getByRole('menu').querySelector('ol');
    expect(list).not.toBeNull();
  });

  it('respects config listType', () => {
    const olConfig: AlapConfig = {
      settings: { listType: 'ol' },
      allLinks: testConfig.allLinks,
    };
    renderWithProvider(<AlapLink query=".car">cars</AlapLink>, olConfig);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const list = screen.getByRole('menu').querySelector('ol');
    expect(list).not.toBeNull();
  });
});

// --- AlapLink: macro support ---

describe('AlapLink — macros', () => {
  it('resolves named macros', () => {
    renderWithProvider(<AlapLink query="@cars">cars</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'cars' }));
    const items = screen.getAllByRole('menuitem');
    const labels = items.map(el => el.textContent);
    expect(labels).toContain('VW Bug');
    expect(labels).toContain('BMW E36');
  });
});

// --- AlapLink: operators ---

describe('AlapLink — expressions', () => {
  it('handles intersection', () => {
    renderWithProvider(<AlapLink query=".coffee + .sf">sf coffee</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'sf coffee' }));
    const items = screen.getAllByRole('menuitem');
    const labels = items.map(el => el.textContent);
    expect(labels).toContain('Aqus Cafe');
    expect(labels).toContain('Blue Bottle');
    expect(labels).not.toContain('Acre Coffee');
  });

  it('handles subtraction', () => {
    renderWithProvider(<AlapLink query=".bridge - .nyc">non-nyc bridges</AlapLink>);
    fireEvent.click(screen.getByRole('button', { name: 'non-nyc bridges' }));
    const items = screen.getAllByRole('menuitem');
    const labels = items.map(el => el.textContent);
    expect(labels).toContain('Golden Gate');
    expect(labels).toContain('Tower Bridge');
    expect(labels).not.toContain('Brooklyn Bridge');
  });
});
