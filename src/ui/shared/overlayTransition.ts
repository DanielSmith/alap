/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared overlay fade-in / fade-out helpers for lightbox and lens.
 * Handles the reflow trick and transitionend cleanup.
 */

/**
 * Append an overlay to a container, force a reflow, and add the visible class
 * so the CSS transition starts from opacity 0 → 1.
 */
export function fadeIn(overlay: HTMLElement, container: Node, visibleClass: string): void {
  container.appendChild(overlay);
  // Force reflow so the browser registers the initial state before transitioning
  void overlay.offsetHeight;
  overlay.classList.add(visibleClass);
}

/**
 * Remove the visible class and, after the transition completes, remove the
 * overlay from the DOM. Falls back to immediate removal when there is no
 * CSS transition.
 */
export function fadeOut(overlay: HTMLElement, visibleClass: string): void {
  overlay.classList.remove(visibleClass);
  const duration = parseFloat(getComputedStyle(overlay).transitionDuration);
  if (duration > 0) {
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  } else {
    overlay.remove();
  }
}
