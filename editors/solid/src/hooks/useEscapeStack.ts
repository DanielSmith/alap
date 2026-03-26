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

import { onMount, onCleanup, type Accessor } from 'solid-js';

interface EscapeLayer {
  /** Accessor returning whether this layer is currently open */
  isOpen: Accessor<boolean>;
  /** Called when Escape should close this layer */
  onClose: () => void;
}

/**
 * Global Escape key handler that respects a stacking order.
 *
 * Layers are checked top-to-bottom. The first open layer gets closed.
 * Pressing Escape again closes the next layer down.
 *
 * If an Alap menu is currently open (visible `.alapelem` in the DOM),
 * Escape is deferred to the Alap adapter's own handler -- no editor
 * panels are closed until the menu dismisses itself.
 *
 * Usage (Solid):
 *   useEscapeStack([
 *     { isOpen: showSettings, onClose: () => setShowSettings(false) },
 *     { isOpen: showLoad, onClose: () => setShowLoad(false) },
 *     { isOpen: showDrawer, onClose: () => setShowDrawer(false) },
 *   ]);
 */
export function useEscapeStack(layers: EscapeLayer[]) {
  function handleEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;

    // If an Alap menu is open, let the adapter handle Escape first
    const openMenu = document.querySelector('[role="menu"][aria-hidden="false"]')
      ?? document.querySelector('.alapelem[style*="display: block"]');
    if (openMenu) return;

    for (const layer of layers) {
      if (layer.isOpen()) {
        layer.onClose();
        return;
      }
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleEscape);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleEscape);
  });
}
