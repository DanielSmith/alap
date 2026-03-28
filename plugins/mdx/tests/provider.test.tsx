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

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AlapMDXProvider, alapComponents, AlapLink } from '../src/index';
import type { AlapConfig } from 'alap/core';

afterEach(() => {
  cleanup();
});

const TEST_CONFIG: AlapConfig = {
  allLinks: {
    latte: {
      label: 'Best Latte',
      url: 'https://example.com/latte',
      tags: ['coffee'],
    },
    espresso: {
      label: 'Espresso Bar',
      url: 'https://example.com/espresso',
      tags: ['coffee'],
    },
    bridge: {
      label: 'Golden Gate',
      url: 'https://example.com/gg',
      tags: ['landmark'],
    },
  },
  macros: {
    coffee: { linkItems: '.coffee' },
    landmarks: { linkItems: '.landmark' },
  },
};

describe('AlapMDXProvider', () => {
  it('renders children', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <p data-testid="child">hello</p>
      </AlapMDXProvider>,
    );
    expect(screen.getByTestId('child').textContent).toBe('hello');
  });

  it('provides engine context to AlapLink', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <AlapLink query=".coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger.textContent).toBe('cafes');
  });

  it('AlapLink resolves tag query and opens menu on click', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <AlapLink query=".coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);
    expect(menuItems[0].textContent).toBe('Best Latte');
    expect(menuItems[1].textContent).toBe('Espresso Bar');
  });

  it('AlapLink resolves macro query', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <AlapLink query="@coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);
  });

  it('AlapLink resolves direct item ID', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <AlapLink query="bridge">landmark</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(1);
    expect(menuItems[0].textContent).toBe('Golden Gate');
  });

  it('passes menuTimeout to engine context', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG} menuTimeout={1000}>
        <AlapLink query=".coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );

    expect(screen.getByRole('button')).toBeDefined();
  });

  it('passes defaultMenuClassName to menus', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG} defaultMenuClassName="my-menu">
        <AlapLink query=".coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('my-menu');
  });

  it('does not open menu when query matches nothing', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <AlapLink query=".nonexistent">nothing</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('resolves intersection expression via macro', () => {
    const config: AlapConfig = {
      allLinks: {
        a: { label: 'A', url: 'https://a.com', tags: ['x', 'y'] },
        b: { label: 'B', url: 'https://b.com', tags: ['x'] },
        c: { label: 'C', url: 'https://c.com', tags: ['y'] },
      },
      macros: { both: { linkItems: '.x + .y' } },
    };

    render(
      <AlapMDXProvider config={config}>
        <AlapLink query="@both">both tags</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(1);
    expect(menuItems[0].textContent).toBe('A');
  });

  it('renders image items with img tag', () => {
    const config: AlapConfig = {
      allLinks: {
        photo: {
          url: 'https://example.com/photo',
          image: 'https://example.com/img.jpg',
          altText: 'A photo',
          tags: ['media'],
        },
      },
    };

    render(
      <AlapMDXProvider config={config}>
        <AlapLink query=".media">photos</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/img.jpg');
    expect(img.getAttribute('alt')).toBe('A photo');
  });

  it('sanitizes javascript: URLs in menu items', () => {
    const config: AlapConfig = {
      allLinks: {
        bad: { label: 'Bad', url: 'javascript:alert(1)', tags: ['xss'] },
      },
    };

    render(
      <AlapMDXProvider config={config}>
        <AlapLink query=".xss">test</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const link = screen.getByRole('menuitem');
    expect(link.getAttribute('href')).toBe('about:blank');
  });

  it('updates menu when config changes', () => {
    const config1: AlapConfig = {
      allLinks: { a: { label: 'First', url: 'https://a.com', tags: ['t'] } },
    };
    const config2: AlapConfig = {
      allLinks: { b: { label: 'Second', url: 'https://b.com', tags: ['t'] } },
    };

    const { rerender } = render(
      <AlapMDXProvider config={config1}>
        <AlapLink query=".t">items</AlapLink>
      </AlapMDXProvider>,
    );

    rerender(
      <AlapMDXProvider config={config2}>
        <AlapLink query=".t">items</AlapLink>
      </AlapMDXProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(1);
    expect(menuItems[0].textContent).toBe('Second');
  });
});

describe('module exports', () => {
  it('remarkAlapMDX is exported and is a function', async () => {
    const mod = await import('../src/index');
    expect(typeof mod.remarkAlapMDX).toBe('function');
  });

  it('AlapMDXProvider is exported and is a function', async () => {
    const mod = await import('../src/index');
    expect(typeof mod.AlapMDXProvider).toBe('function');
  });

  it('alapComponents is exported with AlapLink', async () => {
    const mod = await import('../src/index');
    expect(mod.alapComponents).toHaveProperty('AlapLink');
  });
});

describe('alapComponents export', () => {
  it('contains AlapLink component', () => {
    expect(alapComponents).toHaveProperty('AlapLink');
    expect(typeof alapComponents.AlapLink).toBe('function');
  });

  it('AlapLink in alapComponents is the same as the direct export', () => {
    expect(alapComponents.AlapLink).toBe(AlapLink);
  });
});

describe('AlapLink re-export', () => {
  it('is importable from @alap/mdx index', () => {
    expect(AlapLink).toBeDefined();
    expect(typeof AlapLink).toBe('function');
  });
});
