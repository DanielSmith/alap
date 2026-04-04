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

import { DEFAULT_PLACEMENT, DEFAULT_PLACEMENT_GAP, DEFAULT_VIEWPORT_PADDING } from '../../constants';

/** The 9 placement positions: compass directions plus center. */
export type Placement = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'C';

/**
 * How hard the placement engine tries to resolve layout.
 *
 * - 'place': Position at compass point. No fallback, no clamping.
 * - 'flip':  Place + try fallbacks if it doesn't fit. No clamping. (default)
 * - 'clamp': Flip + constrain to viewport + scroll long menus.
 */
export type PlacementStrategy = 'place' | 'flip' | 'clamp';

/** Known compass tokens (lowercase). */
const COMPASS_TOKENS = new Set(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'c']);

/** Known strategy tokens (lowercase). */
const STRATEGY_TOKENS = new Set<PlacementStrategy>(['place', 'flip', 'clamp']);

/** Strategy effort ranking — higher index = more effort. */
const STRATEGY_RANK: Record<PlacementStrategy, number> = { place: 0, flip: 1, clamp: 2 };

/** Parsed result from a placement string. */
export interface ParsedPlacement {
  compass: Placement;
  strategy: PlacementStrategy;
}

/**
 * Parse a comma-separated placement string into compass direction + strategy.
 *
 * Accepts tokens like "SE", "se, clamp", "clamp", "N, flip", etc.
 * Unknown tokens are silently discarded.
 *
 * Defaults: compass = 'SE', strategy = 'flip'.
 *
 * If multiple compass directions appear, uses the first.
 * If multiple strategies appear, uses the highest effort.
 */
export function parsePlacement(input: string): ParsedPlacement {
  let compass: Placement | null = null;
  let strategy: PlacementStrategy | null = null;

  for (const raw of input.split(',')) {
    // Trim whitespace, lowercase, strip anything that isn't a-z
    const token = raw.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!token) continue;

    if (COMPASS_TOKENS.has(token) && !compass) {
      compass = token.toUpperCase() as Placement;
    } else if (STRATEGY_TOKENS.has(token as PlacementStrategy)) {
      const s = token as PlacementStrategy;
      if (!strategy || STRATEGY_RANK[s] > STRATEGY_RANK[strategy]) {
        strategy = s;
      }
    }
  }

  return {
    compass: compass ?? (DEFAULT_PLACEMENT as Placement),
    strategy: strategy ?? 'flip',
  };
}

/** A rectangle in viewport coordinates (same shape as DOMRect). */
export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

/** Width and height of an element. */
export interface Size {
  width: number;
  height: number;
}

/** Input to the placement engine. */
export interface PlacementInput {
  /** Trigger element rect from getBoundingClientRect(). */
  triggerRect: Rect;
  /** Natural (unconstrained) menu dimensions. */
  menuSize: Size;
  /** Viewport dimensions: { width: innerWidth, height: innerHeight }. */
  viewport: Size;
  /** Preferred placement. Default: 'SE'. */
  placement?: Placement;
  /** How hard to try. Default: 'flip'. */
  strategy?: PlacementStrategy;
  /** Pixel gap between trigger and menu edge. Default: 4. */
  gap?: number;
  /** Minimum distance from viewport edges. Default: 8. */
  padding?: number;
}

/** Output from the placement engine. */
export interface PlacementResult {
  /** The placement that was actually used (may differ from requested). */
  placement: Placement;
  /** Menu top-left x in viewport coordinates. */
  x: number;
  /** Menu top-left y in viewport coordinates. */
  y: number;
  /** Clamped max width (only set if the menu needed to shrink). */
  maxWidth?: number;
  /** Clamped max height (only set if the menu needed to shrink). */
  maxHeight?: number;
  /** Whether the menu content should scroll vertically. */
  scrollY: boolean;
}

/**
 * Fallback order for each placement.
 * Try opposite first, then adjacent, then remaining positions.
 */
export const FALLBACK_ORDER: Record<Placement, Placement[]> = {
  N:  ['S',  'NE', 'NW', 'SE', 'SW', 'E',  'W',  'C'],
  NE: ['SW', 'SE', 'NW', 'S',  'N',  'E',  'W',  'C'],
  E:  ['W',  'SE', 'NE', 'SW', 'NW', 'S',  'N',  'C'],
  SE: ['NW', 'NE', 'SW', 'S',  'N',  'E',  'W',  'C'],
  S:  ['N',  'SE', 'SW', 'NE', 'NW', 'E',  'W',  'C'],
  SW: ['NE', 'NW', 'SE', 'S',  'N',  'W',  'E',  'C'],
  W:  ['E',  'NW', 'SW', 'NE', 'SE', 'N',  'S',  'C'],
  NW: ['SE', 'SW', 'NE', 'N',  'S',  'W',  'E',  'C'],
  C:  ['SE', 'NE', 'SW', 'NW', 'S',  'N',  'E',  'W'],
};

/** Calculate the ideal menu position for a given placement. */
function calcPosition(
  placement: Placement,
  t: Rect,
  m: Size,
  gap: number,
): { x: number; y: number } {
  const cx = t.left + t.width / 2;
  const cy = t.top + t.height / 2;

  switch (placement) {
    case 'N':  return { x: cx - m.width / 2,       y: t.top - gap - m.height };
    case 'NE': return { x: t.left,                  y: t.top - gap - m.height };
    case 'E':  return { x: t.right + gap,           y: cy - m.height / 2 };
    case 'SE': return { x: t.left,                  y: t.bottom + gap };
    case 'S':  return { x: cx - m.width / 2,        y: t.bottom + gap };
    case 'SW': return { x: t.right - m.width,       y: t.bottom + gap };
    case 'W':  return { x: t.left - gap - m.width,  y: cy - m.height / 2 };
    case 'NW': return { x: t.right - m.width,       y: t.top - gap - m.height };
    case 'C':  return { x: cx - m.width / 2,        y: cy - m.height / 2 };
  }
}

/** Check whether a menu at (x, y) with the given size fits within viewport minus padding. */
function fits(
  x: number,
  y: number,
  m: Size,
  vp: Size,
  pad: number,
): boolean {
  return (
    x >= pad &&
    y >= pad &&
    x + m.width <= vp.width - pad &&
    y + m.height <= vp.height - pad
  );
}

/**
 * Clamp a menu position to fit within the viewport, shrinking if needed.
 * Returns the adjusted position and effective dimensions.
 */
function clampToViewport(
  x: number,
  y: number,
  m: Size,
  vp: Size,
  pad: number,
): { x: number; y: number; effectiveWidth: number; effectiveHeight: number } {
  const maxW = vp.width - 2 * pad;
  const maxH = vp.height - 2 * pad;
  const effectiveWidth = Math.min(m.width, maxW);
  const effectiveHeight = Math.min(m.height, maxH);

  const clampedX = Math.max(pad, Math.min(x, vp.width - pad - effectiveWidth));
  const clampedY = Math.max(pad, Math.min(y, vp.height - pad - effectiveHeight));

  return { x: clampedX, y: clampedY, effectiveWidth, effectiveHeight };
}

/**
 * Compute menu placement relative to a trigger element.
 *
 * Pure geometry — no DOM access. Takes viewport-coordinate rects and
 * returns viewport-coordinate results. Consumers translate to their
 * own coordinate system (page-absolute, host-relative, etc.).
 *
 * Behavior is gated by strategy:
 * - 'place': Stage 1 only (position at compass point).
 * - 'flip':  Stages 1+2 (position + try fallbacks). Default.
 * - 'clamp': Stages 1+2+3 (flip + constrain to viewport).
 */
export function computePlacement(input: PlacementInput): PlacementResult {
  const preferred = input.placement ?? (DEFAULT_PLACEMENT as Placement);
  const strategy = input.strategy ?? 'flip';
  const gap = input.gap ?? DEFAULT_PLACEMENT_GAP;
  const pad = input.padding ?? DEFAULT_VIEWPORT_PADDING;
  const { triggerRect: t, menuSize: m, viewport: vp } = input;

  // Stage 1: Try preferred placement
  const pos = calcPosition(preferred, t, m, gap);

  if (strategy === 'place') {
    // Pinned — return as-is, no fallback, no clamping.
    return { placement: preferred, x: pos.x, y: pos.y, scrollY: false };
  }

  if (fits(pos.x, pos.y, m, vp, pad)) {
    return { placement: preferred, x: pos.x, y: pos.y, scrollY: false };
  }

  // Stage 2: Try fallbacks (strategy >= 'flip')
  for (const candidate of FALLBACK_ORDER[preferred]) {
    const p = calcPosition(candidate, t, m, gap);
    if (fits(p.x, p.y, m, vp, pad)) {
      return { placement: candidate, x: p.x, y: p.y, scrollY: false };
    }
  }

  // If strategy is 'flip', return the preferred position best-effort (no clamping).
  if (strategy === 'flip') {
    return { placement: preferred, x: pos.x, y: pos.y, scrollY: false };
  }

  // Stage 3: Clamp to viewport (strategy === 'clamp')
  // No placement fits unclamped — find best-fit with clamping.
  const allPlacements: Placement[] = [preferred, ...FALLBACK_ORDER[preferred]];
  let bestScore = -1;
  let bestResult: PlacementResult = {
    placement: preferred,
    x: pad,
    y: pad,
    maxWidth: vp.width - 2 * pad,
    maxHeight: vp.height - 2 * pad,
    scrollY: true,
  };

  for (const candidate of allPlacements) {
    const p = calcPosition(candidate, t, m, gap);
    const clamped = clampToViewport(p.x, p.y, m, vp, pad);
    const score = clamped.effectiveWidth * clamped.effectiveHeight;

    if (score > bestScore) {
      bestScore = score;
      const needsClampW = clamped.effectiveWidth < m.width;
      const needsClampH = clamped.effectiveHeight < m.height;
      bestResult = {
        placement: candidate,
        x: clamped.x,
        y: clamped.y,
        maxWidth: needsClampW ? clamped.effectiveWidth : undefined,
        maxHeight: needsClampH ? clamped.effectiveHeight : undefined,
        scrollY: needsClampH,
      };
    }
  }

  return bestResult;
}
