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
  clickTrigger,
  createTrigger,
  flushMicrotasks,
  getLoadingPlaceholders,
  getMenu,
  getMenuItems,
  makeDeferredHandler,
} from './helpers';
import type { AlapConfig } from '../../../src/core/types';

/**
 * Refiner interaction with progressive rendering.
 *
 * Covers contracts:
 *   15 — Refiners apply only to resolved items; placeholders are tail-positioned
 *        and not sorted/limited into the middle of the list.
 *   16 — Static items render pre-refined on first paint. When async arrives,
 *        refiners re-run on the combined set — items may reorder or drop.
 *        (Default behavior, `waitToRefine=false`.)
 *
 * Expressions use grouped `(| :mock:foo:)` unions rather than comma so refiners
 * apply across the whole set — in Alap's grammar, refiners bind to a single
 * segment, and the comma operator splits segments.
 */

describe('Progressive async — refiner interaction (AlapUI)', () => {
  let ui: AlapUI;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui?.destroy();
  });

  // --- Contract 15: placeholder always tails a sorted/limited list ---

  it('keeps the Loading placeholder at the tail even when a *sort* refiner is applied', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '(.fruit | :mock:foo:) *sort:label*');
    const config: AlapConfig = {
      settings: { listType: 'ul' },
      protocols: { mock: {} },
      allLinks: {
        bana: { label: 'Banana', url: 'https://example.com/banana', tags: ['fruit'] },
        appl: { label: 'Apple',  url: 'https://example.com/apple',  tags: ['fruit'] },
        cher: { label: 'Cherry', url: 'https://example.com/cherry', tags: ['fruit'] },
      },
    };
    ui = new AlapUI(config, asyncHandlers(mock.handler));

    clickTrigger(trigger);

    const menu = getMenu()!;
    const entries = Array.from(
      menu.querySelectorAll<HTMLElement>('a[role="menuitem"], [data-alap-placeholder]'),
    );

    // Resolved items first, sorted alphabetically — the refiner applied to the
    // full grouped union, but the async half is still pending so only the
    // static fruits are resolved.
    const resolvedLabels = entries
      .filter((el) => el.getAttribute('role') === 'menuitem')
      .map((el) => el.textContent?.trim());
    expect(resolvedLabels).toEqual(['Apple', 'Banana', 'Cherry']);

    // Placeholder is strictly last — it lives outside the refiner pipeline.
    expect(entries[entries.length - 1].getAttribute('data-alap-placeholder')).toBe('loading');
  });

  it('excludes placeholders from *limit:N* — limit applies only to resolved items', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '(.fruit | :mock:foo:) *limit:2*');
    const config: AlapConfig = {
      settings: { listType: 'ul' },
      protocols: { mock: {} },
      allLinks: {
        a: { label: 'Apple',  url: 'https://example.com/a', tags: ['fruit'] },
        b: { label: 'Banana', url: 'https://example.com/b', tags: ['fruit'] },
        c: { label: 'Cherry', url: 'https://example.com/c', tags: ['fruit'] },
      },
    };
    ui = new AlapUI(config, asyncHandlers(mock.handler));

    clickTrigger(trigger);

    // `*limit:2*` trims resolved items to 2; the placeholder still appears
    // (it's outside the refiner pipeline).
    expect(getMenuItems()).toHaveLength(2);
    expect(getLoadingPlaceholders()).toHaveLength(1);
  });

  // --- Contract 16: refiners re-run on re-render with fuller set ---

  it('re-runs refiners against the combined set when the async source lands (sort stays correct)', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '(.fruit | :mock:foo:) *sort:label*');
    const config: AlapConfig = {
      settings: { listType: 'ul' },
      protocols: { mock: {} },
      allLinks: {
        bana: { label: 'Banana', url: 'https://example.com/banana', tags: ['fruit'] },
        appl: { label: 'Apple',  url: 'https://example.com/apple',  tags: ['fruit'] },
      },
    };
    ui = new AlapUI(config, asyncHandlers(mock.handler));

    clickTrigger(trigger);

    // First paint: Apple, Banana (sorted) + placeholder.
    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual(['Apple', 'Banana']);

    mock.settle([
      { label: 'Durian',     url: 'https://example.com/durian' },
      { label: 'Cantaloupe', url: 'https://example.com/cantaloupe' },
    ]);
    await flushMicrotasks();

    // After settle: refiners re-run on all four items, placeholder gone.
    expect(getLoadingPlaceholders()).toHaveLength(0);
    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual([
      'Apple',
      'Banana',
      'Cantaloupe',
      'Durian',
    ]);
  });

  it('re-applies *limit:N* on re-render, which may drop items that were visible on first paint', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', '(.fruit | :mock:foo:) *sort:label* *limit:3*');
    const config: AlapConfig = {
      settings: { listType: 'ul' },
      protocols: { mock: {} },
      allLinks: {
        x: { label: 'Xigua',   url: 'https://example.com/x', tags: ['fruit'] },
        y: { label: 'Yangmei', url: 'https://example.com/y', tags: ['fruit'] },
      },
    };
    ui = new AlapUI(config, asyncHandlers(mock.handler));

    clickTrigger(trigger);
    // First paint: 2 static items (Xigua, Yangmei sorted) + placeholder.
    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual(['Xigua', 'Yangmei']);

    mock.settle([
      { label: 'Apple',  url: 'https://example.com/a' },
      { label: 'Banana', url: 'https://example.com/b' },
    ]);
    await flushMicrotasks();

    // After settle: refiners re-run on all four → sorted A, B, X, Y, then
    // `*limit:3*` drops Y. "Show what you can" in action (waitToRefine=false).
    expect(getLoadingPlaceholders()).toHaveLength(0);
    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual([
      'Apple',
      'Banana',
      'Xigua',
    ]);
  });
});
