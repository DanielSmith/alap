/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared overlay fade-in / fade-out helpers for lightbox and lens.
 * Handles the reflow trick and transitionend cleanup.
 */

/** Track how many overlays are open so we only unlock when the last one closes. */
let overlayCount = 0;
let savedOverflow = '';

function lockBodyScroll(): void {
  if (overlayCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  overlayCount++;
}

function unlockBodyScroll(): void {
  overlayCount--;
  if (overlayCount <= 0) {
    overlayCount = 0;
    document.body.style.overflow = savedOverflow;
  }
}

/**
 * Append an overlay to a container, force a reflow, and add the visible class
 * so the CSS transition starts from opacity 0 → 1.
 * Locks body scroll to prevent the page from moving behind the overlay.
 */
export function fadeIn(overlay: HTMLElement, container: Node, visibleClass: string): void {
  lockBodyScroll();
  container.appendChild(overlay);
  // Force reflow so the browser registers the initial state before transitioning
  void overlay.offsetHeight;
  overlay.classList.add(visibleClass);
}

/**
 * Remove the visible class and, after the transition completes, remove the
 * overlay from the DOM. Falls back to immediate removal when there is no
 * CSS transition. Restores body scroll when the last overlay closes.
 */
export function fadeOut(overlay: HTMLElement, visibleClass: string): void {
  overlay.classList.remove(visibleClass);
  const duration = parseFloat(getComputedStyle(overlay).transitionDuration);
  if (duration > 0) {
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
      unlockBodyScroll();
    }, { once: true });
  } else {
    overlay.remove();
    unlockBodyScroll();
  }
}
