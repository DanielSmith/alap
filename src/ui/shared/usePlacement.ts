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

import { computePlacement, FALLBACK_ORDER } from './placement';
import type { Placement, PlacementResult, Size } from './placement';
import { DEFAULT_PLACEMENT_GAP, DEFAULT_VIEWPORT_PADDING } from '../../constants';

/** Valid placement values for class name validation. */
const VALID_PLACEMENTS = new Set<string>(Object.keys(FALLBACK_ORDER));

export interface CalcPlacementOptions {
  placement: Placement;
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
): PlacementState {
  const triggerRect = triggerEl.getBoundingClientRect();
  const menuRect = menuEl.getBoundingClientRect();
  const menuSize: Size = { width: menuRect.width, height: menuRect.height };

  const result = computePlacement({
    triggerRect,
    menuSize,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    placement: options.placement,
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
  state: PlacementState,
): void {
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
  } else {
    menuEl.style.maxWidth = '';
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
