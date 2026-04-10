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

import type { Placement } from './placement';

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
