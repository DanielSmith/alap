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
  getPlaceholders,
  makeDeferredHandler,
  ERROR_PLACEHOLDER,
  EMPTY_PLACEHOLDER,
} from './helpers';

/**
 * Progressive async rendering — core loading flow on AlapUI.
 *
 * Covers contracts 1, 2, 3 (click → Loading → loaded), 7 (error), 8 (empty)
 * from the progressive-rendering design. These tests are written against the
 * NEW trigger-path contract and will fail until the engine + renderer work
 * lands.
 */

describe('Progressive async — AlapUI loading flow', () => {
  let ui: AlapUI;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui?.destroy();
  });

  // --- Contract 1: menu opens synchronously on click ---

  it('opens the menu synchronously when the async expression has no cached result', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    // Menu must be visible immediately — no awaits, no microtask flush.
    expect(getMenu()!.style.display).toBe('block');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  // --- Contract 2: "Loading…" placeholder present while fetch is pending ---

  it('renders a Loading placeholder for the pending async source', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    const loading = getLoadingPlaceholders();
    expect(loading).toHaveLength(1);
    expect(loading[0].textContent?.trim()).toBe('Loading…');
  });

  it('fires the generate handler exactly once per click on a cold-cache expression', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    expect(mock.callCount()).toBe(1);
    expect(mock.callArgs()[0]).toEqual(['foo']);
  });

  // --- Contract 3: settle replaces placeholder with real items (same menu element) ---

  it('replaces the Loading placeholder with resolved items when the fetch settles', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    const menuBefore = getMenu();
    expect(getLoadingPlaceholders()).toHaveLength(1);

    mock.settle([
      { label: 'A', url: 'https://example.com/a' },
      { label: 'B', url: 'https://example.com/b' },
    ]);
    await flushMicrotasks();

    // Placeholder gone, real items present.
    expect(getLoadingPlaceholders()).toHaveLength(0);
    const items = getMenuItems();
    expect(items).toHaveLength(2);
    expect(items.map((el) => el.textContent?.trim())).toEqual(['A', 'B']);

    // Menu element identity preserved — no close+reopen.
    expect(getMenu()).toBe(menuBefore);
    expect(getMenu()!.style.display).toBe('block');
  });

  // --- Contract 7: generate throws → "Couldn't load" placeholder ---

  it('renders a Couldn\u2019t load placeholder when the generate handler throws', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    mock.fail(new Error('boom'));
    await flushMicrotasks();

    expect(getLoadingPlaceholders()).toHaveLength(0);
    const errorPh = getMenu()!.querySelectorAll<HTMLElement>(ERROR_PLACEHOLDER);
    expect(errorPh).toHaveLength(1);
    expect(errorPh[0].textContent?.trim()).toBe("Couldn\u2019t load");
  });

  // --- Contract 8: generate returns [] → "Nothing found" placeholder ---

  it('renders a Nothing found placeholder when the generate handler returns an empty array', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    mock.settle([]);
    await flushMicrotasks();

    expect(getLoadingPlaceholders()).toHaveLength(0);
    const emptyPh = getMenu()!.querySelectorAll<HTMLElement>(EMPTY_PLACEHOLDER);
    expect(emptyPh).toHaveLength(1);
    expect(emptyPh[0].textContent?.trim()).toBe('Nothing found');
  });

  // --- Cache-hit path: second click with warm cache is synchronous (no Loading flash) ---

  it('renders resolved items synchronously on a warm-cache click (no Loading flash)', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    // Warm the cache: first click + settle.
    clickTrigger(trigger);
    mock.settle([{ label: 'A', url: 'https://example.com/a' }]);
    await flushMicrotasks();

    // Dismiss so the next click reopens cleanly.
    ui.close?.();
    // Second click on the same trigger: cache should hit, no placeholder, no new generate call.
    clickTrigger(trigger);

    expect(getLoadingPlaceholders()).toHaveLength(0);
    expect(getPlaceholders()).toHaveLength(0);
    const items = getMenuItems();
    expect(items.map((el) => el.textContent?.trim())).toEqual(['A']);
    expect(mock.callCount()).toBe(1);
  });
});
