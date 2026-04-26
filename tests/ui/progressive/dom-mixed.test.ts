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
import {
  asyncHandlers,
  buildAsyncConfig,
  clickTrigger,
  createTrigger,
  flushMicrotasks,
  getLoadingPlaceholders,
  getMenu,
  getMenuItems,
  makeDeferredHandler,
} from './helpers';
import type { AlapConfig, GenerateHandler } from '../../../src/core/types';

/**
 * Mixed-source progressive rendering.
 *
 * Covers contracts:
 *   4 — Static items render immediately alongside "Loading…" for `.tag, :async:`
 *   5 — Each async source gets its own placeholder
 *   6 — Placeholders are tail-appended (refiners don't see them)
 */

describe('Progressive async — mixed sources (AlapUI)', () => {
  let ui: AlapUI;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui?.destroy();
  });

  // --- Contract 4: static + async together ---

  it('renders static matches immediately alongside a Loading placeholder', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '.coffee, :mock:foo:');
    ui = new AlapUI(buildAsyncConfig({
      blueBottle: { label: 'Blue Bottle', url: 'https://example.com/bb', tags: ['coffee'] },
      sightglass: { label: 'Sightglass', url: 'https://example.com/sg', tags: ['coffee'] },
    }), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    // Static items visible on first paint.
    const items = getMenuItems();
    expect(items.map((el) => el.textContent?.trim()).sort()).toEqual(['Blue Bottle', 'Sightglass']);

    // Loading placeholder also present for the async source.
    expect(getLoadingPlaceholders()).toHaveLength(1);
  });

  it('leaves the static items in place and replaces only the placeholder when the async source settles', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '.coffee, :mock:foo:');
    ui = new AlapUI(buildAsyncConfig({
      blueBottle: { label: 'Blue Bottle', url: 'https://example.com/bb', tags: ['coffee'] },
    }), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    expect(getLoadingPlaceholders()).toHaveLength(1);

    mock.settle([{ label: 'HN Morning Roast', url: 'https://news.example.com/roast' }]);
    await flushMicrotasks();

    expect(getLoadingPlaceholders()).toHaveLength(0);
    const items = getMenuItems();
    expect(items.map((el) => el.textContent?.trim())).toContain('Blue Bottle');
    expect(items.map((el) => el.textContent?.trim())).toContain('HN Morning Roast');
  });

  // --- Contract 5: one placeholder per async source ---

  it('renders one placeholder per async token in the expression', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo: + :mock:bar:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    expect(getLoadingPlaceholders()).toHaveLength(2);
    expect(mock.callCount()).toBe(2);
    expect(mock.callArgs().map((a) => a[0]).sort()).toEqual(['bar', 'foo']);
  });

  it('replaces each placeholder independently as its own source settles', async () => {
    // Two async handlers under different sub-modes so tests can settle them independently.
    // `|` is union — intersection (`+`) over two disjoint generated sets would be empty.
    const fooHandler = makeDeferredHandler();
    const barHandler = makeDeferredHandler();
    const handler: GenerateHandler = async (segments, config) => {
      if (segments[0] === 'foo') return fooHandler.handler(segments, config);
      if (segments[0] === 'bar') return barHandler.handler(segments, config);
      return [];
    };

    const trigger = createTrigger('t', ':mock:foo: | :mock:bar:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(handler));

    clickTrigger(trigger);
    expect(getLoadingPlaceholders()).toHaveLength(2);

    // Settle `foo` only — one placeholder should remain.
    fooHandler.settle([{ label: 'Foo One', url: 'https://example.com/foo1' }]);
    await flushMicrotasks();
    expect(getLoadingPlaceholders()).toHaveLength(1);
    expect(getMenuItems().map((el) => el.textContent?.trim())).toContain('Foo One');

    // Now settle `bar` — last placeholder disappears, both items present.
    barHandler.settle([{ label: 'Bar One', url: 'https://example.com/bar1' }]);
    await flushMicrotasks();
    expect(getLoadingPlaceholders()).toHaveLength(0);
    const labels = getMenuItems().map((el) => el.textContent?.trim());
    expect(labels).toContain('Foo One');
    expect(labels).toContain('Bar One');
  });

  // --- Contract 6: placeholders are tail-positioned, not sorted into the middle ---

  it('always places Loading placeholders after all resolved items', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '.coffee, :mock:foo:');
    const config: AlapConfig = {
      settings: { listType: 'ul' },
      protocols: { mock: {} },
      allLinks: {
        a: { label: 'Alpha', url: 'https://example.com/a', tags: ['coffee'] },
        b: { label: 'Bravo', url: 'https://example.com/b', tags: ['coffee'] },
      },
    };
    ui = new AlapUI(config, asyncHandlers(mock.handler));

    clickTrigger(trigger);

    const menu = getMenu()!;
    const allEntries = Array.from(
      menu.querySelectorAll<HTMLElement>('a[role="menuitem"], [data-alap-placeholder]'),
    );
    // Resolved items come first, placeholder last.
    const lastEntry = allEntries[allEntries.length - 1];
    expect(lastEntry.getAttribute('data-alap-placeholder')).toBe('loading');
  });
});
