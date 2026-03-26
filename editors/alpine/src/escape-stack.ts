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

/**
 * Global Escape key handler that respects a stacking order.
 *
 * Layers are checked top-to-bottom. The first open layer gets closed.
 * Pressing Escape again closes the next layer down.
 *
 * If an Alap menu is currently open (visible `.alapelem` in the DOM),
 * Escape is deferred to the Alap adapter's own handler.
 *
 * For Alpine.js, this is registered once on document and reads
 * layer state directly from the Alpine store.
 */

interface EscapeLayer {
  /** Returns whether this layer is currently open */
  isOpen: () => boolean;
  /** Called when Escape should close this layer */
  onClose: () => void;
}

/**
 * Installs a global keydown listener that walks the escape stack.
 * Returns a teardown function (useful for cleanup, though typically
 * this lives for the lifetime of the page).
 */
export function installEscapeStack(getLayers: () => EscapeLayer[]): () => void {
  function handleEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;

    // If an Alap menu is open, let the adapter handle Escape first
    const openMenu = document.querySelector('[role="menu"][aria-hidden="false"]')
      ?? document.querySelector('.alapelem[style*="display: block"]');
    if (openMenu) return;

    for (const layer of getLayers()) {
      if (layer.isOpen()) {
        layer.onClose();
        return;
      }
    }
  }

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}
