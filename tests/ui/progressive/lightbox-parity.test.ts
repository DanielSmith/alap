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
import { AlapLightbox } from '../../../src/ui-lightbox/AlapLightbox';
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
 * Renderer parity — AlapLightbox.
 *
 * Covers contract 17 for the lightbox: Loading / Couldn't load / Nothing found
 * placeholders appear inside the lightbox panel with the same `[data-alap-placeholder]`
 * attribute contract used by the menu and lens.
 */

function getLightboxPanel(): HTMLElement | null {
  return document.querySelector('.alap-lightbox-panel');
}

function getLightboxPlaceholder(kind: 'loading' | 'error' | 'empty'): HTMLElement | null {
  const panel = getLightboxPanel();
  if (!panel) return null;
  const selector = kind === 'loading' ? LOADING_PLACEHOLDER
                 : kind === 'error'   ? ERROR_PLACEHOLDER
                 : EMPTY_PLACEHOLDER;
  return panel.querySelector<HTMLElement>(selector);
}

describe('Progressive async — AlapLightbox parity', () => {
  let lightbox: AlapLightbox;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    lightbox?.destroy();
  });

  it('opens the lightbox panel with a Loading placeholder when the async expression has no cached result', () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lightbox = new AlapLightbox(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    expect(getLightboxPanel()).not.toBeNull();
    expect(getLightboxPlaceholder('loading')).not.toBeNull();
    expect(getLightboxPlaceholder('loading')!.textContent?.trim()).toBe('Loading…');
  });

  it('replaces the Loading placeholder with resolved content when the fetch settles', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lightbox = new AlapLightbox(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    expect(getLightboxPlaceholder('loading')).not.toBeNull();

    mock.settle([
      { label: 'Painting', url: 'https://example.com/art.jpg', image: 'https://example.com/art.jpg' },
    ]);
    await flushMicrotasks();

    expect(getLightboxPlaceholder('loading')).toBeNull();
    expect(getLightboxPanel()).not.toBeNull();
  });

  it('renders a Couldn\u2019t load placeholder when the generate handler throws', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lightbox = new AlapLightbox(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    mock.fail(new Error('boom'));
    await flushMicrotasks();

    expect(getLightboxPlaceholder('loading')).toBeNull();
    expect(getLightboxPlaceholder('error')).not.toBeNull();
    expect(getLightboxPlaceholder('error')!.textContent?.trim()).toBe("Couldn\u2019t load");
  });

  it('renders a Nothing found placeholder when the generate handler returns []', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lightbox = new AlapLightbox(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    mock.settle([]);
    await flushMicrotasks();

    expect(getLightboxPlaceholder('loading')).toBeNull();
    expect(getLightboxPlaceholder('empty')).not.toBeNull();
    expect(getLightboxPlaceholder('empty')!.textContent?.trim()).toBe('Nothing found');
  });

  it('does not reopen or mutate the lightbox after a late-settle when the panel has been dismissed', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:foo:');
    lightbox = new AlapLightbox(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);
    expect(getLightboxPlaceholder('loading')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    mock.settle([{ label: 'Late', url: 'https://example.com/late.jpg', image: 'https://example.com/late.jpg' }]);
    await flushMicrotasks();

    const panel = getLightboxPanel();
    if (panel) {
      expect(panel.textContent).not.toContain('Late');
    }
  });
});
