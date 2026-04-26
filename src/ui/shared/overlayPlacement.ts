/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 *
 * Viewport-level placement maps for overlay panels (lightbox, lens).
 * Maps compass directions to flexbox alignment values.
 *
 * Distinct from the anchor-relative placement in placement.ts,
 * which positions menus relative to a trigger element.
 */

import { DEFAULT_VIEWPORT_PADDING } from '../../constants';
import type { ParsedPlacement, Placement, Size } from './placement';

/** Map compass direction to CSS align-items value (vertical). */
export const OVERLAY_ALIGN: Record<Placement, string> = {
  N: 'flex-start', NE: 'flex-start', NW: 'flex-start',
  S: 'flex-end',   SE: 'flex-end',   SW: 'flex-end',
  E: 'center',     W: 'center',      C: 'center',
};

/** Map compass direction to CSS justify-content value (horizontal). */
export const OVERLAY_JUSTIFY: Record<Placement, string> = {
  N: 'center',     S: 'center',      C: 'center',
  NE: 'flex-end',  E: 'flex-end',    SE: 'flex-end',
  NW: 'flex-start', W: 'flex-start', SW: 'flex-start',
};

/** Style values an overlay should apply to pin its panel to `placement`. */
export interface OverlayLayout {
  alignItems: string;
  justifyContent: string;
  /** Set when `strategy === 'clamp'`: constrain the panel to the viewport. */
  maxHeight?: string;
  /** Set when `strategy === 'clamp'`: constrain the panel to the viewport. */
  maxWidth?: string;
}

/**
 * Compute flex alignment + optional viewport clamping for an overlay.
 *
 * - Compass token → `alignItems` / `justifyContent`.
 * - `strategy === 'clamp'` → `maxHeight` / `maxWidth` sized to the viewport.
 * - `strategy === 'place' | 'flip'` → no max dimensions; panel can overflow.
 *
 * The overlay's CSS is expected to declare `display: flex` (or grid); these
 * values position the inner panel within that flex parent.
 */
export function computeOverlayLayout(
  placement: ParsedPlacement,
  viewport: Size,
  options?: { padding?: number },
): OverlayLayout {
  const pad = options?.padding ?? DEFAULT_VIEWPORT_PADDING;
  const layout: OverlayLayout = {
    alignItems: OVERLAY_ALIGN[placement.compass],
    justifyContent: OVERLAY_JUSTIFY[placement.compass],
  };

  if (placement.strategy === 'clamp') {
    layout.maxHeight = `${Math.max(0, viewport.height - 2 * pad)}px`;
    layout.maxWidth = `${Math.max(0, viewport.width - 2 * pad)}px`;
  }

  return layout;
}

/**
 * Apply a computed overlay layout to `el.style`. Writing maxHeight/maxWidth
 * with an empty string clears them, so the same call can move an element
 * back to "no clamp" by recomputing with `strategy !== 'clamp'`.
 */
export function applyOverlayLayout(el: HTMLElement, layout: OverlayLayout): void {
  el.style.alignItems = layout.alignItems;
  el.style.justifyContent = layout.justifyContent;
  el.style.maxHeight = layout.maxHeight ?? '';
  el.style.maxWidth = layout.maxWidth ?? '';
}

/** Reset overlay placement styles — revert to whatever the CSS default is. */
export function clearOverlayLayout(el: HTMLElement): void {
  el.style.alignItems = '';
  el.style.justifyContent = '';
  el.style.maxHeight = '';
  el.style.maxWidth = '';
}

/** Read the current viewport size. Centralized so tests can stub one spot. */
export function viewportSize(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}
