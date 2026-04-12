/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared full-viewport image zoom overlay for lightbox and lens.
 * Creates a zoom overlay with fade-in/out, dismissible via click or Escape.
 */

import { fadeIn, fadeOut } from './overlayTransition';

export interface ImageZoomOptions {
  /** The container to append the zoom overlay to. */
  container: Node;
  /** Image source URL. */
  src: string;
  /** CSS class for the zoom overlay element. */
  overlayClass: string;
  /** CSS class for the zoom image element. */
  imageClass: string;
  /** CSS class added to make the overlay visible (triggers CSS transition). */
  visibleClass: string;
  /** Optional: set a part attribute on the overlay (for WC ::part support). */
  overlayPart?: string;
}

/**
 * Open a full-viewport zoom overlay for an image.
 * Escape closes the zoom without bubbling (capture-phase handler).
 * Click anywhere on the overlay dismisses it.
 */
export function openImageZoom(options: ImageZoomOptions): void {
  const { container, src, overlayClass, imageClass, visibleClass, overlayPart } = options;

  const zoomOverlay = document.createElement('div');
  zoomOverlay.className = overlayClass;
  if (overlayPart) {
    zoomOverlay.setAttribute('part', overlayPart);
  }

  const zoomImg = document.createElement('img');
  zoomImg.className = imageClass;
  zoomImg.src = src;

  const dismiss = () => {
    document.removeEventListener('keydown', keyHandler, true);
    fadeOut(zoomOverlay, visibleClass);
  };

  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      dismiss();
    }
  };

  zoomOverlay.addEventListener('click', dismiss);
  document.addEventListener('keydown', keyHandler, true);

  zoomOverlay.appendChild(zoomImg);
  fadeIn(zoomOverlay, container, visibleClass);
}
