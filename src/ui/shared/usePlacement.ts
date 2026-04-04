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

import { computePlacement, parsePlacement, FALLBACK_ORDER } from './placement';
import type { Placement, PlacementResult, PlacementStrategy, Size } from './placement';
import { DEFAULT_PLACEMENT_GAP, DEFAULT_VIEWPORT_PADDING } from '../../constants';

/** Valid placement values for class name validation. */
const VALID_PLACEMENTS = new Set<string>(Object.keys(FALLBACK_ORDER));

export interface CalcPlacementOptions {
  /** Comma-separated placement string, e.g. "SE", "SE, clamp", "N, place". */
  placement: string;
  gap?: number;
  padding?: number;
}

export interface PlacementState {
  /** The computed PlacementResult from the placement engine. */
  result: PlacementResult;
}

/**
 * Compute placement for a menu relative to its trigger.
 *
 * Framework-agnostic — each adapter calls this in its own reactive context.
 * Returns the raw PlacementResult plus a CSS class for animation hooks.
 *
 * The caller is responsible for:
 * - Converting the viewport-coordinate result to their coordinate system
 * - Applying the style and class to the menu element
 */
export function calcPlacementState(
  triggerEl: HTMLElement,
  menuEl: HTMLElement,
  options: CalcPlacementOptions,
): PlacementState | null {
  const { compass, strategy } = parsePlacement(options.placement);
  const triggerRect = triggerEl.getBoundingClientRect();
  const menuRect = menuEl.getBoundingClientRect();

  let menuSize: Size;

  if (strategy === 'clamp') {
    // Clamp strategy: check CSS min-width/min-height so fits() uses the
    // true rendered size, not just current content width.
    const computed = getComputedStyle(menuEl);
    const cssMinWidth = parseFloat(computed.minWidth) || 0;
    const cssMinHeight = parseFloat(computed.minHeight) || 0;
    menuSize = {
      width: Math.max(menuRect.width, cssMinWidth),
      height: Math.max(menuRect.height, cssMinHeight),
    };
  } else {
    menuSize = { width: menuRect.width, height: menuRect.height };
  }

  if (menuSize.width === 0 || menuSize.height === 0) return null;

  const result = computePlacement({
    triggerRect,
    menuSize,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    placement: compass,
    strategy,
    gap: options.gap ?? DEFAULT_PLACEMENT_GAP,
    padding: options.padding ?? DEFAULT_VIEWPORT_PADDING,
  });

  return { result };
}

/**
 * Apply a PlacementResult to a menu element using wrapper-relative offsets.
 *
 * The menu must be inside a wrapper with `position: relative`. This function
 * converts viewport coordinates from computePlacement to offsets relative to
 * the wrapper element.
 */
export function applyPlacementToMenu(
  menuEl: HTMLElement,
  wrapperEl: HTMLElement,
  state: PlacementState | null,
): void {
  if (!state) return;
  const { result } = state;
  const wrapperRect = wrapperEl.getBoundingClientRect();

  menuEl.style.position = 'absolute';
  menuEl.style.top = `${result.y - wrapperRect.top}px`;
  menuEl.style.left = `${result.x - wrapperRect.left}px`;
  menuEl.style.zIndex = '10';

  if (result.maxHeight != null) {
    menuEl.style.maxHeight = `${result.maxHeight}px`;
    menuEl.style.overflowY = 'auto';
  } else {
    menuEl.style.maxHeight = '';
    menuEl.style.overflowY = '';
  }

  if (result.maxWidth != null) {
    menuEl.style.maxWidth = `${result.maxWidth}px`;
    menuEl.style.minWidth = `0px`;
  } else {
    menuEl.style.maxWidth = '';
    menuEl.style.minWidth = '';
  }

  // Apply placement class for animation hooks
  applyPlacementClass(menuEl, result.placement);
}

/**
 * Strip any previous alap-placed-* class and apply the new one.
 * Accepts a Placement value (e.g. 'SE') and applies 'alap-placed-se'.
 * Validates against the known set to prevent injection via malicious attributes.
 */
export function applyPlacementClass(el: HTMLElement, placement: string): void {
  const upper = placement.toUpperCase();
  if (!VALID_PLACEMENTS.has(upper)) return;

  for (const cls of Array.from(el.classList)) {
    if (cls.startsWith('alap-placed-')) {
      el.classList.remove(cls);
    }
  }
  el.classList.add(`alap-placed-${upper.toLowerCase()}`);
}

/**
 * Strip all alap-placed-* classes from an element.
 */
export function clearPlacementClass(el: HTMLElement): void {
  for (const cls of Array.from(el.classList)) {
    if (cls.startsWith('alap-placed-')) {
      el.classList.remove(cls);
    }
  }
}

/**
 * Schedule placement after the browser has completed layout.
 *
 * Wraps requestAnimationFrame → calcPlacementState → applyPlacementToMenu
 * so every adapter gets correct geometry without having to remember the
 * rAF step themselves.
 *
 * For adapters that use a wrapper element (Vue, React, Svelte, Solid, Qwik):
 *   applyPlacementAfterLayout(triggerEl, menuEl, wrapperEl, options)
 *
 * Returns a function that performs the same calc+apply synchronously,
 * useful for scroll handlers where rAF would add unwanted latency.
 */
export function applyPlacementAfterLayout(
  triggerEl: HTMLElement,
  menuEl: HTMLElement,
  wrapperEl: HTMLElement,
  options: CalcPlacementOptions,
): () => void {
  const applyNow = () => {
    const state = calcPlacementState(triggerEl, menuEl, options);
    applyPlacementToMenu(menuEl, wrapperEl, state);
  };

  requestAnimationFrame(applyNow);

  return applyNow;
}

/**
 * Schedule placement after layout for adapters that position via
 * viewport coordinates (e.g. Alpine, which appends the menu to
 * document.body instead of a relative wrapper).
 *
 * Calls the provided callback with the PlacementState after rAF.
 * Returns a synchronous apply function for scroll handlers.
 */
export function calcPlacementAfterLayout(
  triggerEl: HTMLElement,
  menuEl: HTMLElement,
  options: CalcPlacementOptions,
  onPlacement: (state: PlacementState | null) => void,
): () => void {
  const applyNow = () => {
    const state = calcPlacementState(triggerEl, menuEl, options);
    onPlacement(state);
  };

  requestAnimationFrame(applyNow);

  return applyNow;
}

/**
 * Create an IntersectionObserver that fires when the trigger element
 * scrolls fully off-screen. Returns the observer so the caller can
 * disconnect it on menu close.
 */
export function observeTriggerOffscreen(
  triggerEl: HTMLElement,
  onOffscreen: () => void,
): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio === 0) {
          onOffscreen();
        }
      }
    },
    { threshold: [0] },
  );
  observer.observe(triggerEl);
  return observer;
}
