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
import { AlapLens } from '../../../src/ui-lens/AlapLens';
import {
  asyncHandlers,
  buildAsyncConfig,
  clickTrigger,
  createTrigger,
  flushMicrotasks,
  makeDeferredHandler,
  LOADING_PLACEHOLDER,
  ERROR_PLACEHOLDER,
  EMPTY_PLACEHOLDER,
} from './helpers';

/**
 * Renderer parity — AlapLens.
 *
 * Covers contract 17 for the lens: the same Loading / Couldn't-load / Nothing-found
 * placeholder contract applies inside the lens panel. Visual treatment may differ
 * from the menu (empty lens card, no meta rows, etc.) but the `[data-alap-placeholder]`
 * attribute contract is uniform across renderers.
 *
 * Explicitly NOT testing here:
 *   - Lens-specific content rendering (meta rows, images, drawer) — those have their
 *     own test files.
 *   - Mixed-source rendering — lens shows one link at a time, so the mixed-source
 *     contract is a menu-only concern.
 */

function getLensPanel(): HTMLElement | null {
  return document.querySelector('.alap-lens-panel');
}

function getLensPlaceholder(kind: 'loading' | 'error' | 'empty'): HTMLElement | null {
  const panel = getLensPanel();
  if (!panel) return null;
  const selector = kind === 'loading' ? LOADING_PLACEHOLDER
                 : kind === 'error'   ? ERROR_PLACEHOLDER
                 : EMPTY_PLACEHOLDER;
  return panel.querySelector<HTMLElement>(selector);
}

describe('Progressive async — AlapLens parity', () => {
  let lens: AlapLens;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    lens?.destroy();
  });

  it('opens the lens panel with a Loading placeholder when the async expression has no cached result', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lens = new AlapLens(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    expect(getLensPanel()).not.toBeNull();
    expect(getLensPlaceholder('loading')).not.toBeNull();
    expect(getLensPlaceholder('loading')!.textContent?.trim()).toBe('Loading…');
  });

  it('replaces the Loading placeholder with resolved content when the fetch settles', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lens = new AlapLens(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    expect(getLensPlaceholder('loading')).not.toBeNull();

    mock.settle([
      { label: 'Resolved', url: 'https://example.com/r', meta: { author: 'Someone' } },
    ]);
    await flushMicrotasks();

    expect(getLensPlaceholder('loading')).toBeNull();
    // Panel still open — same element, no close-reopen.
    expect(getLensPanel()).not.toBeNull();
    // Resolved label visible somewhere in the panel.
    expect(getLensPanel()!.textContent).toContain('Resolved');
  });

  it('renders a Couldn\u2019t load placeholder when the generate handler throws', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lens = new AlapLens(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    mock.fail(new Error('boom'));
    await flushMicrotasks();

    expect(getLensPlaceholder('loading')).toBeNull();
    expect(getLensPlaceholder('error')).not.toBeNull();
    expect(getLensPlaceholder('error')!.textContent?.trim()).toBe("Couldn\u2019t load");
  });

  it('renders a Nothing found placeholder when the generate handler returns []', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lens = new AlapLens(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    mock.settle([]);
    await flushMicrotasks();

    expect(getLensPlaceholder('loading')).toBeNull();
    expect(getLensPlaceholder('empty')).not.toBeNull();
    expect(getLensPlaceholder('empty')!.textContent?.trim()).toBe('Nothing found');
  });

  it('does not reopen or mutate the lens after a late-settle when the panel has been dismissed', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lens = new AlapLens(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    expect(getLensPlaceholder('loading')).not.toBeNull();

    // Dismiss (Escape is a canonical dismiss path for lens).
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    mock.settle([{ label: 'Late', url: 'https://example.com/late' }]);
    await flushMicrotasks();

    // No panel visible, no placeholder leaking.
    expect(getLensPlaceholder('loading')).toBeNull();
    // The panel may still exist in DOM but should be hidden — verify no resolved content leaked.
    const panel = getLensPanel();
    if (panel) {
      expect(panel.textContent).not.toContain('Late');
    }
  });
});
