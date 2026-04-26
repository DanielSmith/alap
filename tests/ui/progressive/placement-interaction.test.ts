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
import { AlapLens } from '../../../src/ui-lens/AlapLens';
import { AlapLightbox } from '../../../src/ui-lightbox/AlapLightbox';
import {
  asyncHandlers,
  buildAsyncConfig,
  clickTrigger,
  createTrigger,
  flushMicrotasks,
  getMenu,
  makeDeferredHandler,
} from './helpers';

/**
 * Tranche 2 — placement × progressive interaction.
 *
 * The refactor swapped each of DOM / Lens / Lightbox onto the shared
 * ProgressiveRenderer. The observable contract from that swap is:
 *   1. The menu / overlay container persists across loading → resolved
 *      (no close-reopen flicker).
 *   2. The DOM menu re-applies its placement class on late-settle, so the
 *      final menu size picks the right compass direction.
 *   3. Lens / Lightbox panels trigger a FLIP on transitioningFromLoading.
 *      We observe this indirectly: `flipFromRect` writes `style.transform`
 *      on the panel, and we stub the panel's bounding rect so the function
 *      doesn't early-out on zero-size elements (jsdom's default).
 */

function stubRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  const full: DOMRect = {
    x: rect.x ?? rect.left ?? 0,
    y: rect.y ?? rect.top ?? 0,
    width: rect.width ?? 100,
    height: rect.height ?? 100,
    top: rect.top ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 100),
    bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 100),
    toJSON: () => ({}),
  } as DOMRect;
  el.getBoundingClientRect = () => full;
}

describe('Progressive × placement — Tranche 2 interaction', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('re-applies a placement class on the DOM menu after a late-settle', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:x:');
    const ui = new AlapUI(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    const menu = getMenu()!;
    const hasPlacementClass = (el: HTMLElement) =>
      Array.from(el.classList).some((c) => c.startsWith('alap-placed-'));

    // Loading-only centers over trigger; no compass placement class yet.
    expect(hasPlacementClass(menu)).toBe(false);

    mock.settle([{ label: 'Resolved', url: 'https://example.com/r' }]);
    await flushMicrotasks();

    // After settle the compass placement engine runs and tags the menu.
    expect(hasPlacementClass(menu)).toBe(true);

    ui.destroy();
  });

  it('writes a FLIP transform on the lens panel during loading → resolved', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:x:');
    const lens = new AlapLens(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    // Stub the loading-only panel's rect so flipFromRect has a non-zero prevRect.
    const oldPanel = document.querySelector('.alap-lens-panel') as HTMLElement;
    expect(oldPanel).not.toBeNull();
    stubRect(oldPanel, { left: 100, top: 100, width: 200, height: 50 });

    // Patch HTMLElement.prototype temporarily so the NEW panel (created after
    // settle) also reports a non-zero rect when flipFromRect measures it.
    const origRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        x: 0, y: 0, width: 400, height: 300,
        top: 50, left: 50, right: 450, bottom: 350,
        toJSON: () => ({}),
      } as DOMRect;
    };

    try {
      mock.settle([{ label: 'Resolved', url: 'https://example.com/r' }]);
      await flushMicrotasks();

      const newPanel = document.querySelector('.alap-lens-panel') as HTMLElement;
      expect(newPanel).not.toBeNull();
      // flipFromRect writes a transition to transform; the starting transform is
      // translate(...)scale(...); by the time we check, it may have been cleared
      // back to 'none' inside the same tick. Either value proves the FLIP path
      // ran — the only failing shape is an empty transition/transform pair.
      const touched = newPanel.style.transform !== '' || newPanel.style.transition !== '';
      expect(touched).toBe(true);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origRect;
    }

    lens.destroy();
  });

  it('writes a FLIP transform on the lightbox panel during loading → resolved', async () => {
    const mock = makeDeferredHandler();
    const trigger = createTrigger('t', ':mock:x:');
    const box = new AlapLightbox(buildAsyncConfig(), asyncHandlers(mock.handler));

    clickTrigger(trigger);

    const oldPanel = document.querySelector('.alap-lightbox-panel') as HTMLElement;
    expect(oldPanel).not.toBeNull();
    stubRect(oldPanel, { left: 100, top: 100, width: 300, height: 80 });

    const origRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return {
        x: 0, y: 0, width: 500, height: 400,
        top: 20, left: 20, right: 520, bottom: 420,
        toJSON: () => ({}),
      } as DOMRect;
    };

    try {
      mock.settle([{ label: 'Resolved', url: 'https://example.com/r', image: 'https://example.com/i.png' }]);
      await flushMicrotasks();

      const newPanel = document.querySelector('.alap-lightbox-panel') as HTMLElement;
      expect(newPanel).not.toBeNull();
      const touched = newPanel.style.transform !== '' || newPanel.style.transition !== '';
      expect(touched).toBe(true);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = origRect;
    }

    box.close();
  });
});
