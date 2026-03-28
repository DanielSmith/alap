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

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlapMDXProvider, alapComponents, AlapLink } from '../src/index';
import type { AlapConfig } from 'alap/core';

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
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('provides engine context to AlapLink', () => {
    render(
      <AlapMDXProvider config={TEST_CONFIG}>
        <AlapLink query=".coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('cafes');
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
    expect(menuItems[0]).toHaveTextContent('Best Latte');
    expect(menuItems[1]).toHaveTextContent('Espresso Bar');
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
    expect(menuItems[0]).toHaveTextContent('Golden Gate');
  });

  it('passes menuTimeout to engine context', () => {
    // Smoke test — if menuTimeout weren't forwarded, AlapProvider would use default
    render(
      <AlapMDXProvider config={TEST_CONFIG} menuTimeout={1000}>
        <AlapLink query=".coffee">cafes</AlapLink>
      </AlapMDXProvider>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
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
