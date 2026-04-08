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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RendererCoordinator } from '../../../src/ui/shared/rendererCoordinator';
import {
  RENDERER_MENU,
  RENDERER_LIGHTBOX,
  RENDERER_LENS,
} from '../../../src/ui/shared/coordinatedRenderer';
import type {
  CoordinatedRenderer,
  OpenPayload,
  RendererType,
} from '../../../src/ui/shared/coordinatedRenderer';
import type { ResolvedLink } from '../../../src/core/types';

// --- Mock renderer ---

function createMockRenderer(type: RendererType): CoordinatedRenderer & {
  openPayloads: OpenPayload[];
  closeCalls: number;
} {
  let open = false;
  const mock = {
    rendererType: type,
    openPayloads: [] as OpenPayload[],
    closeCalls: 0,
    get isOpen() { return open; },
    openWith(payload: OpenPayload) {
      open = true;
      mock.openPayloads.push(payload);
    },
    close() {
      open = false;
      mock.closeCalls++;
      return null;
    },
  };
  return mock;
}

function makeLinks(count: number): ResolvedLink[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item${i}`,
    label: `Item ${i}`,
    url: `https://example.com/${i}`,
  }));
}

// --- Tests ---

describe('RendererCoordinator', () => {
  let coordinator: RendererCoordinator;

  beforeEach(() => {
    coordinator = new RendererCoordinator({ viewTransitions: false });
  });

  afterEach(() => {
    coordinator.destroy();
  });

  // =========================================================================
  // Registration
  // =========================================================================

  describe('registration', () => {
    it('registers and recognizes renderers', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);
      // No public way to list renderers, but transitionTo should work
      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(menu.openPayloads).toHaveLength(1);
    });

    it('unregister prevents transitions to that renderer', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);
      coordinator.unregister(RENDERER_MENU);
      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(menu.openPayloads).toHaveLength(0);
    });
  });

  // =========================================================================
  // transitionTo
  // =========================================================================

  describe('transitionTo', () => {
    it('opens the target renderer', () => {
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(lens);

      const links = makeLinks(2);
      coordinator.transitionTo(RENDERER_LENS, { links, initialIndex: 1 });

      expect(lens.isOpen).toBe(true);
      expect(lens.openPayloads).toHaveLength(1);
      expect(lens.openPayloads[0].links).toBe(links);
      expect(lens.openPayloads[0].initialIndex).toBe(1);
    });

    it('closes the current renderer before opening the target', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lens);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(menu.isOpen).toBe(true);

      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });
      expect(menu.isOpen).toBe(false);
      expect(menu.closeCalls).toBe(1);
      expect(lens.isOpen).toBe(true);
    });

    it('pushes current state onto stack', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lens);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(2) });

      expect(coordinator.depth).toBe(1);
    });

    it('ignores transition to unregistered renderer', () => {
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });
      expect(coordinator.depth).toBe(0);
    });
  });

  // =========================================================================
  // back
  // =========================================================================

  describe('back', () => {
    it('restores the previous renderer from stack', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lens);

      const menuLinks = makeLinks(3);
      coordinator.transitionTo(RENDERER_MENU, { links: menuLinks });
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });

      expect(lens.isOpen).toBe(true);
      expect(coordinator.depth).toBe(1);

      coordinator.back();

      expect(lens.isOpen).toBe(false);
      expect(menu.isOpen).toBe(true);
      expect(coordinator.depth).toBe(0);
      // Should restore the original menu links
      const restored = menu.openPayloads[menu.openPayloads.length - 1];
      expect(restored.links).toBe(menuLinks);
    });

    it('closes all when stack is empty', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(menu.isOpen).toBe(true);

      coordinator.back();
      expect(menu.isOpen).toBe(false);
    });

    it('supports multi-level back (menu → lightbox → lens → back → back)', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lightbox = createMockRenderer(RENDERER_LIGHTBOX);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lightbox);
      coordinator.register(lens);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      coordinator.transitionTo(RENDERER_LIGHTBOX, { links: makeLinks(2) });
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1), initialIndex: 0 });
      expect(coordinator.depth).toBe(2);

      coordinator.back();
      expect(lightbox.isOpen).toBe(true);
      expect(coordinator.depth).toBe(1);

      coordinator.back();
      expect(menu.isOpen).toBe(true);
      expect(coordinator.depth).toBe(0);
    });
  });

  // =========================================================================
  // closeAll
  // =========================================================================

  describe('closeAll', () => {
    it('closes all open renderers and clears stack', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lens);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });

      coordinator.closeAll();

      expect(menu.isOpen).toBe(false);
      expect(lens.isOpen).toBe(false);
      expect(coordinator.depth).toBe(0);
    });
  });

  // =========================================================================
  // State queries
  // =========================================================================

  describe('state queries', () => {
    it('depth reflects stack size', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lens);

      expect(coordinator.depth).toBe(0);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(coordinator.depth).toBe(0);

      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });
      expect(coordinator.depth).toBe(1);
    });

    it('hasOpenRenderer detects open state', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);

      expect(coordinator.hasOpenRenderer()).toBe(false);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(coordinator.hasOpenRenderer()).toBe(true);

      coordinator.closeAll();
      expect(coordinator.hasOpenRenderer()).toBe(false);
    });

    it('isTransitioning is false for instant swap', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      expect(coordinator.isTransitioning).toBe(false);
    });
  });

  // =========================================================================
  // Keyboard
  // =========================================================================

  describe('keyboard', () => {
    it('Escape calls back() when a renderer is open', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(menu);
      coordinator.register(lens);
      coordinator.bindKeyboard();

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Should have gone back to menu
      expect(lens.isOpen).toBe(false);
      expect(menu.isOpen).toBe(true);
    });

    it('Escape does nothing when no renderer is open', () => {
      coordinator.bindKeyboard();
      // Should not throw
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    it('non-Escape keys are ignored', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);
      coordinator.bindKeyboard();

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(menu.isOpen).toBe(true);
    });

    it('unbindKeyboard stops Escape handling', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);
      coordinator.bindKeyboard();
      coordinator.unbindKeyboard();

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Menu should still be open — coordinator not listening
      expect(menu.isOpen).toBe(true);
    });
  });

  // =========================================================================
  // destroy
  // =========================================================================

  describe('destroy', () => {
    it('closes all, unbinds keyboard, clears renderers', () => {
      const menu = createMockRenderer(RENDERER_MENU);
      coordinator.register(menu);
      coordinator.bindKeyboard();

      coordinator.transitionTo(RENDERER_MENU, { links: makeLinks(1) });

      coordinator.destroy();

      expect(menu.isOpen).toBe(false);
      expect(coordinator.depth).toBe(0);

      // Registering again should work (not in a broken state)
      const lens = createMockRenderer(RENDERER_LENS);
      coordinator.register(lens);
      coordinator.transitionTo(RENDERER_LENS, { links: makeLinks(1) });
      expect(lens.isOpen).toBe(true);
    });
  });
});
