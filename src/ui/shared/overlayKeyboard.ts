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
 */
export function handleOverlayKeydown(e: KeyboardEvent, actions: OverlayKeyboardActions): boolean {
  if (e.key === 'Escape') {
    actions.close();
    return true;
  } else if (e.key === 'ArrowLeft') {
    actions.prev();
    return true;
  } else if (e.key === 'ArrowRight') {
    actions.next();
    return true;
  }
  return false;
}
