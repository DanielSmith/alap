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
import type { GenerateHandler } from '../../../src/core/types';

/**
 * Interruption semantics — what happens when the user changes their mind
 * (clicks elsewhere, clicks the same anchor again, dismisses) while async
 * resolution is still in flight.
 *
 * Covers contracts:
 *   12 — Same anchor re-clicked while loading → no duplicate fetch, no flash
 *   13 — Different anchor clicked while first is loading → first's late
 *        settle does not affect the second anchor's menu
 *   14 — Menu dismissed while loading → late settle doesn't reopen the
 *        menu or mutate the DOM
 */

describe('Progressive async — interruption (AlapUI)', () => {
  let ui: AlapUI;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    ui?.destroy();
  });

  // --- Contract 12: double-click same anchor while loading ---

  it('is a no-op when the same anchor is clicked again while its fetch is in flight', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    const menuBefore = getMenu();
    const placeholdersBefore = getLoadingPlaceholders().length;

    clickTrigger(trigger);

    expect(mock.callCount()).toBe(1);
    expect(getMenu()).toBe(menuBefore);
    expect(getLoadingPlaceholders()).toHaveLength(placeholdersBefore);
  });

  // --- Contract 13: switching anchors mid-fetch ---

  it('does not let a stale fetch mutate a menu that has since moved to a different anchor', async () => {
    // Two distinct async sources so we can settle them independently.
    const slowHandler = makeDeferredHandler();
    const quickHandler = makeDeferredHandler();
    const handler: GenerateHandler = async (segments, cfg) => {
      if (segments[0] === 'slow')  return slowHandler.handler(segments, cfg);
      if (segments[0] === 'quick') return quickHandler.handler(segments, cfg);
      return [];
    };

    const a1 = createTrigger('a1', ':mock:slow:');
    const a2 = createTrigger('a2', ':mock:quick:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(handler));

    clickTrigger(a1);
    clickTrigger(a2);

    // a2 is open now, waiting on :mock:quick:.
    // Late arrival of :mock:slow: should NOT overwrite a2's menu state.
    slowHandler.settle([{ label: 'Stale Slow Item', url: 'https://example.com/s' }]);
    await flushMicrotasks();

    expect(getMenuItems().map((el) => el.textContent?.trim())).not.toContain('Stale Slow Item');
    // a2's Loading placeholder should still be present.
    expect(getLoadingPlaceholders()).toHaveLength(1);

    // Now settle a2's own fetch — its menu should update with its own items.
    quickHandler.settle([{ label: 'Quick Item', url: 'https://example.com/q' }]);
    await flushMicrotasks();

    expect(getMenuItems().map((el) => el.textContent?.trim())).toEqual(['Quick Item']);
  });

  // --- Contract 14: dismiss during load, then late settle ---

  it('does not reopen or mutate the menu when a fetch settles after the menu has been dismissed', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    expect(getLoadingPlaceholders()).toHaveLength(1);

    ui.close();
    expect(getMenu()!.style.display).toBe('none');

    mock.settle([{ label: 'Late Item', url: 'https://example.com/late' }]);
    await flushMicrotasks();

    // Menu stayed hidden. (The previous render's DOM lingers inside the hidden
    // container — that's fine; invisible. What matters is no NEW re-render
    // surfaced the late-arriving item.)
    expect(getMenu()!.style.display).toBe('none');
    expect(getMenuItems().map((el) => el.textContent?.trim())).not.toContain('Late Item');
  });
});
