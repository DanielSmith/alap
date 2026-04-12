/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared keyboard handler for overlay components (lightbox, lens).
 * Dispatches Escape / ArrowLeft / ArrowRight to caller-provided actions.
 */

export interface OverlayKeyboardActions {
  close: () => void;
  prev: () => void;
  next: () => void;
}

/**
 * Handle a keydown event on an overlay.
 * Returns true if the event was handled (caller can skip further processing).
 * Prevents default on all arrow keys to stop page scrolling behind the overlay.
 */
export function handleOverlayKeydown(e: KeyboardEvent, actions: OverlayKeyboardActions): boolean {
  switch (e.key) {
    case 'Escape':
      actions.close();
      return true;
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      actions.prev();
      return true;
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault();
      actions.next();
      return true;
    default:
      return false;
  }
}
