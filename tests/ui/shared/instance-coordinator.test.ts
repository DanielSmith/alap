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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InstanceCoordinator,
  getInstanceCoordinator,
  resetInstanceCoordinator,
} from '../../../src/ui/shared/instanceCoordinator';
import {
  RENDERER_MENU,
  RENDERER_LIGHTBOX,
  RENDERER_LENS,
} from '../../../src/ui/shared/coordinatedRenderer';

describe('InstanceCoordinator', () => {
  let coordinator: InstanceCoordinator;

  beforeEach(() => {
    coordinator = new InstanceCoordinator();
  });

  // =========================================================================
  // subscribe / unsubscribe
  // =========================================================================

  describe('subscribe', () => {
    it('registers an instance', () => {
      coordinator.subscribe('a', RENDERER_MENU, () => {});
      expect(coordinator.size).toBe(1);
      expect(coordinator.has('a')).toBe(true);
    });

    it('returns an unsubscribe function', () => {
      const unsub = coordinator.subscribe('a', RENDERER_MENU, () => {});
      expect(coordinator.has('a')).toBe(true);
      unsub();
      expect(coordinator.has('a')).toBe(false);
      expect(coordinator.size).toBe(0);
    });

    it('replaces an existing subscription with the same id', () => {
      const close1 = vi.fn();
      const close2 = vi.fn();
      coordinator.subscribe('a', RENDERER_MENU, close1);
      coordinator.subscribe('a', RENDERER_MENU, close2);
      expect(coordinator.size).toBe(1);

      // notifyOpen from another instance should call close2, not close1
      coordinator.subscribe('b', RENDERER_MENU, () => {});
      coordinator.notifyOpen('b');
      expect(close1).not.toHaveBeenCalled();
      expect(close2).toHaveBeenCalledOnce();
    });
  });

  // =========================================================================
  // notifyOpen — same-type dismiss
  // =========================================================================

  describe('notifyOpen', () => {
    it('closes other instances of the same type', () => {
      const closeA = vi.fn();
      const closeB = vi.fn();
      const closeC = vi.fn();
      coordinator.subscribe('a', RENDERER_MENU, closeA);
      coordinator.subscribe('b', RENDERER_MENU, closeB);
      coordinator.subscribe('c', RENDERER_MENU, closeC);

      coordinator.notifyOpen('b');

      expect(closeA).toHaveBeenCalledOnce();
      expect(closeB).not.toHaveBeenCalled();
      expect(closeC).toHaveBeenCalledOnce();
    });

    it('does not close instances of a different type', () => {
      const closeMenu = vi.fn();
      const closeLightbox = vi.fn();
      coordinator.subscribe('menu1', RENDERER_MENU, closeMenu);
      coordinator.subscribe('lb1', RENDERER_LIGHTBOX, closeLightbox);

      coordinator.notifyOpen('menu1');

      expect(closeMenu).not.toHaveBeenCalled();
      expect(closeLightbox).not.toHaveBeenCalled();
    });

    it('is a no-op for an unknown id', () => {
      const close = vi.fn();
      coordinator.subscribe('a', RENDERER_MENU, close);
      coordinator.notifyOpen('unknown');
      expect(close).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Cross-adapter scenario: DOM + WC + framework
  // =========================================================================

  describe('cross-adapter coordination', () => {
    it('DOM menu closes WC menu when opened', () => {
      const closeDom = vi.fn();
      const closeWc = vi.fn();
      coordinator.subscribe('alapui_1', RENDERER_MENU, closeDom);
      coordinator.subscribe('wc_coffee', RENDERER_MENU, closeWc);

      // DOM menu opens
      coordinator.notifyOpen('alapui_1');
      expect(closeWc).toHaveBeenCalledOnce();
      expect(closeDom).not.toHaveBeenCalled();
    });

    it('WC menu closes DOM menu when opened', () => {
      const closeDom = vi.fn();
      const closeWc = vi.fn();
      coordinator.subscribe('alapui_1', RENDERER_MENU, closeDom);
      coordinator.subscribe('wc_coffee', RENDERER_MENU, closeWc);

      // WC menu opens
      coordinator.notifyOpen('wc_coffee');
      expect(closeDom).toHaveBeenCalledOnce();
      expect(closeWc).not.toHaveBeenCalled();
    });

    it('framework menu closes both DOM and WC menus', () => {
      const closeDom = vi.fn();
      const closeWc = vi.fn();
      const closeReact = vi.fn();
      coordinator.subscribe('alapui_1', RENDERER_MENU, closeDom);
      coordinator.subscribe('wc_coffee', RENDERER_MENU, closeWc);
      coordinator.subscribe('react_link_1', RENDERER_MENU, closeReact);

      coordinator.notifyOpen('react_link_1');
      expect(closeDom).toHaveBeenCalledOnce();
      expect(closeWc).toHaveBeenCalledOnce();
      expect(closeReact).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // closeAll
  // =========================================================================

  describe('closeAll', () => {
    it('closes all instances when called without type', () => {
      const closeA = vi.fn();
      const closeB = vi.fn();
      const closeLb = vi.fn();
      coordinator.subscribe('a', RENDERER_MENU, closeA);
      coordinator.subscribe('b', RENDERER_MENU, closeB);
      coordinator.subscribe('lb', RENDERER_LIGHTBOX, closeLb);

      coordinator.closeAll();

      expect(closeA).toHaveBeenCalledOnce();
      expect(closeB).toHaveBeenCalledOnce();
      expect(closeLb).toHaveBeenCalledOnce();
    });

    it('closes only instances of specified type', () => {
      const closeMenu = vi.fn();
      const closeLb = vi.fn();
      coordinator.subscribe('m1', RENDERER_MENU, closeMenu);
      coordinator.subscribe('lb1', RENDERER_LIGHTBOX, closeLb);

      coordinator.closeAll(RENDERER_MENU);

      expect(closeMenu).toHaveBeenCalledOnce();
      expect(closeLb).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // destroy
  // =========================================================================

  describe('destroy', () => {
    it('removes all subscriptions', () => {
      coordinator.subscribe('a', RENDERER_MENU, () => {});
      coordinator.subscribe('b', RENDERER_LIGHTBOX, () => {});
      expect(coordinator.size).toBe(2);

      coordinator.destroy();
      expect(coordinator.size).toBe(0);
    });

    it('unsubscribe after destroy is safe', () => {
      const unsub = coordinator.subscribe('a', RENDERER_MENU, () => {});
      coordinator.destroy();
      unsub(); // should not throw
      expect(coordinator.size).toBe(0);
    });
  });
});

// =========================================================================
// Singleton
// =========================================================================

describe('getInstanceCoordinator / resetInstanceCoordinator', () => {
  beforeEach(() => {
    resetInstanceCoordinator();
  });

  it('returns the same instance on repeated calls', () => {
    const a = getInstanceCoordinator();
    const b = getInstanceCoordinator();
    expect(a).toBe(b);
  });

  it('returns a fresh instance after reset', () => {
    const a = getInstanceCoordinator();
    a.subscribe('x', RENDERER_MENU, () => {});
    expect(a.size).toBe(1);

    resetInstanceCoordinator();
    const b = getInstanceCoordinator();
    expect(b).not.toBe(a);
    expect(b.size).toBe(0);
  });

  it('reset clears subscriptions from old instance', () => {
    const coord = getInstanceCoordinator();
    const close = vi.fn();
    coord.subscribe('x', RENDERER_MENU, close);

    resetInstanceCoordinator();

    // Old instance was destroyed
    expect(coord.size).toBe(0);
  });
});
