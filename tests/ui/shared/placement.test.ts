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

import { describe, it, expect } from 'vitest';
import { computePlacement, FALLBACK_ORDER } from '../../../src/ui/shared/placement';
import type { Placement, PlacementInput, Rect, Size } from '../../../src/ui/shared/placement';

// --- Helpers ---

/** Create a trigger rect centered in a large viewport. */
function centeredTrigger(): Rect {
  return { top: 400, left: 450, bottom: 420, right: 550, width: 100, height: 20 };
}

/** A large viewport where everything fits. */
function largeViewport(): Size {
  return { width: 1200, height: 900 };
}

/** Standard menu size for most tests. */
function menuSize(): Size {
  return { width: 200, height: 150 };
}

function makeInput(overrides: Partial<PlacementInput> = {}): PlacementInput {
  return {
    triggerRect: centeredTrigger(),
    menuSize: menuSize(),
    viewport: largeViewport(),
    gap: 4,
    padding: 8,
    ...overrides,
  };
}

// --- Tests ---

describe('computePlacement', () => {

  // ========================
  // Basic placement positions
  // ========================

  describe('basic placements in ample viewport', () => {
    const trigger = centeredTrigger();
    const menu = menuSize();
    const cx = trigger.left + trigger.width / 2;  // 500
    const cy = trigger.top + trigger.height / 2;   // 410
    const gap = 4;

    it('SE: below, left-aligned', () => {
      const result = computePlacement(makeInput({ placement: 'SE' }));
      expect(result.placement).toBe('SE');
      expect(result.x).toBe(trigger.left);          // 450
      expect(result.y).toBe(trigger.bottom + gap);   // 424
      expect(result.scrollY).toBe(false);
    });

    it('S: below, centered', () => {
      const result = computePlacement(makeInput({ placement: 'S' }));
      expect(result.placement).toBe('S');
      expect(result.x).toBe(cx - menu.width / 2);    // 400
      expect(result.y).toBe(trigger.bottom + gap);    // 424
      expect(result.scrollY).toBe(false);
    });

    it('SW: below, right-aligned', () => {
      const result = computePlacement(makeInput({ placement: 'SW' }));
      expect(result.placement).toBe('SW');
      expect(result.x).toBe(trigger.right - menu.width);  // 350
      expect(result.y).toBe(trigger.bottom + gap);          // 424
      expect(result.scrollY).toBe(false);
    });

    it('N: above, centered', () => {
      const result = computePlacement(makeInput({ placement: 'N' }));
      expect(result.placement).toBe('N');
      expect(result.x).toBe(cx - menu.width / 2);         // 400
      expect(result.y).toBe(trigger.top - gap - menu.height); // 246
      expect(result.scrollY).toBe(false);
    });

    it('NE: above, left-aligned', () => {
      const result = computePlacement(makeInput({ placement: 'NE' }));
      expect(result.placement).toBe('NE');
      expect(result.x).toBe(trigger.left);                    // 450
      expect(result.y).toBe(trigger.top - gap - menu.height); // 246
      expect(result.scrollY).toBe(false);
    });

    it('NW: above, right-aligned', () => {
      const result = computePlacement(makeInput({ placement: 'NW' }));
      expect(result.placement).toBe('NW');
      expect(result.x).toBe(trigger.right - menu.width);      // 350
      expect(result.y).toBe(trigger.top - gap - menu.height); // 246
      expect(result.scrollY).toBe(false);
    });

    it('E: right, vertically centered', () => {
      const result = computePlacement(makeInput({ placement: 'E' }));
      expect(result.placement).toBe('E');
      expect(result.x).toBe(trigger.right + gap);            // 554
      expect(result.y).toBe(cy - menu.height / 2);           // 335
      expect(result.scrollY).toBe(false);
    });

    it('W: left, vertically centered', () => {
      const result = computePlacement(makeInput({ placement: 'W' }));
      expect(result.placement).toBe('W');
      expect(result.x).toBe(trigger.left - gap - menu.width); // 246
      expect(result.y).toBe(cy - menu.height / 2);            // 335
      expect(result.scrollY).toBe(false);
    });

    it('C: centered over trigger', () => {
      const result = computePlacement(makeInput({ placement: 'C' }));
      expect(result.placement).toBe('C');
      expect(result.x).toBe(cx - menu.width / 2);   // 400
      expect(result.y).toBe(cy - menu.height / 2);   // 335
      expect(result.scrollY).toBe(false);
    });
  });

  // ========================
  // Fallback behavior
  // ========================

  describe('fallback when preferred placement overflows', () => {
    it('trigger near bottom — SE falls back to NW', () => {
      const trigger: Rect = { top: 780, left: 450, bottom: 800, right: 550, width: 100, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'SE',
        triggerRect: trigger,
        viewport: { width: 1200, height: 820 },
      }));
      // SE would put menu at y=804, bottom=954, overflows 820
      // Should fall back — NW puts it above
      expect(result.placement).not.toBe('SE');
      expect(result.y + (result.maxHeight ?? menuSize().height)).toBeLessThanOrEqual(820);
    });

    it('trigger near top — N falls back to S', () => {
      const trigger: Rect = { top: 10, left: 450, bottom: 30, right: 550, width: 100, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'N',
        triggerRect: trigger,
        viewport: { width: 1200, height: 900 },
      }));
      // N would put menu at y = 10 - 4 - 150 = -144, overflows top
      expect(result.placement).toBe('S');
      expect(result.y).toBeGreaterThanOrEqual(8); // respects padding
    });

    it('trigger near right edge — E falls back to W', () => {
      const trigger: Rect = { top: 400, left: 1050, bottom: 420, right: 1150, width: 100, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'E',
        triggerRect: trigger,
        viewport: { width: 1200, height: 900 },
      }));
      // E would put menu at x = 1154, right = 1354, overflows 1200
      expect(result.placement).toBe('W');
    });

    it('trigger near left edge — W falls back to E', () => {
      const trigger: Rect = { top: 400, left: 10, bottom: 420, right: 110, width: 100, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'W',
        triggerRect: trigger,
        viewport: { width: 1200, height: 900 },
      }));
      // W would put menu at x = 10 - 4 - 200 = -194, overflows left
      expect(result.placement).toBe('E');
    });

    it('trigger in top-right corner — tries multiple fallbacks', () => {
      const trigger: Rect = { top: 10, left: 1050, bottom: 30, right: 1190, width: 140, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'NE',
        triggerRect: trigger,
        viewport: { width: 1200, height: 900 },
      }));
      // NE overflows top. SE, NW overflow in various ways. Should find something that works.
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================
  // Clamping behavior
  // ========================

  describe('clamping when menu exceeds available space', () => {
    it('menu taller than viewport — clamps height and enables scroll', () => {
      const result = computePlacement(makeInput({
        menuSize: { width: 200, height: 1000 },
        viewport: { width: 1200, height: 400 },
        triggerRect: { top: 180, left: 450, bottom: 200, right: 550, width: 100, height: 20 },
      }));
      expect(result.maxHeight).toBeDefined();
      expect(result.maxHeight!).toBeLessThanOrEqual(400 - 16); // viewport - 2*padding
      expect(result.scrollY).toBe(true);
    });

    it('menu wider than viewport — clamps width', () => {
      const result = computePlacement(makeInput({
        menuSize: { width: 1500, height: 150 },
        viewport: { width: 800, height: 900 },
        triggerRect: centeredTrigger(),
      }));
      expect(result.maxWidth).toBeDefined();
      expect(result.maxWidth!).toBeLessThanOrEqual(800 - 16);
    });

    it('very small viewport — both dimensions clamped', () => {
      const result = computePlacement(makeInput({
        menuSize: { width: 300, height: 300 },
        viewport: { width: 200, height: 200 },
        triggerRect: { top: 90, left: 90, bottom: 110, right: 110, width: 20, height: 20 },
      }));
      expect(result.maxHeight).toBeDefined();
      expect(result.maxWidth).toBeDefined();
      expect(result.scrollY).toBe(true);
    });

    it('menu fits after fallback — no clamping', () => {
      // Trigger near bottom, menu fits above
      const trigger: Rect = { top: 700, left: 450, bottom: 720, right: 550, width: 100, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'SE',
        triggerRect: trigger,
        viewport: { width: 1200, height: 750 },
        menuSize: { width: 200, height: 150 },
      }));
      // Falls back to a northern placement where it fits
      expect(result.maxHeight).toBeUndefined();
      expect(result.scrollY).toBe(false);
    });
  });

  // ========================
  // Edge cases
  // ========================

  describe('edge cases', () => {
    it('zero-size trigger (point trigger for images)', () => {
      const trigger: Rect = { top: 400, left: 500, bottom: 400, right: 500, width: 0, height: 0 };
      const result = computePlacement(makeInput({ triggerRect: trigger }));
      expect(result.x).toBeGreaterThanOrEqual(8);
      expect(result.y).toBeGreaterThanOrEqual(8);
      expect(result.scrollY).toBe(false);
    });

    it('menu exactly fits viewport', () => {
      const result = computePlacement(makeInput({
        menuSize: { width: 184, height: 184 }, // 200 - 2*8 padding
        viewport: { width: 200, height: 200 },
        triggerRect: { top: 90, left: 90, bottom: 110, right: 110, width: 20, height: 20 },
        gap: 0,
      }));
      // Should find a placement (likely clamped)
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
    });

    it('custom gap is respected', () => {
      const trigger = centeredTrigger();
      const result = computePlacement(makeInput({ placement: 'SE', gap: 20 }));
      expect(result.y).toBe(trigger.bottom + 20);
    });

    it('custom padding is respected', () => {
      // Trigger near left edge with large padding
      const trigger: Rect = { top: 400, left: 30, bottom: 420, right: 130, width: 100, height: 20 };
      const result = computePlacement(makeInput({
        placement: 'SW',
        triggerRect: trigger,
        padding: 50,
      }));
      // SW would put menu at x = 130 - 200 = -70, which violates padding=50
      // Should fall back to something that respects x >= 50
      expect(result.x).toBeGreaterThanOrEqual(50);
    });
  });

  // ========================
  // Defaults
  // ========================

  describe('defaults', () => {
    it('defaults to SE placement', () => {
      const result = computePlacement({
        triggerRect: centeredTrigger(),
        menuSize: menuSize(),
        viewport: largeViewport(),
      });
      expect(result.placement).toBe('SE');
    });

    it('uses default gap of 4', () => {
      const trigger = centeredTrigger();
      const result = computePlacement({
        triggerRect: trigger,
        menuSize: menuSize(),
        viewport: largeViewport(),
      });
      expect(result.y).toBe(trigger.bottom + 4);
    });
  });

  // ========================
  // FALLBACK_ORDER completeness
  // ========================

  describe('FALLBACK_ORDER', () => {
    const allPlacements: Placement[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'C'];

    it('every placement has a fallback list', () => {
      for (const p of allPlacements) {
        expect(FALLBACK_ORDER[p]).toBeDefined();
        expect(FALLBACK_ORDER[p].length).toBe(8); // 9 total - 1 (self)
      }
    });

    it('no fallback list contains the placement itself', () => {
      for (const p of allPlacements) {
        expect(FALLBACK_ORDER[p]).not.toContain(p);
      }
    });

    it('each fallback list contains all other placements', () => {
      for (const p of allPlacements) {
        const others = allPlacements.filter(x => x !== p);
        for (const other of others) {
          expect(FALLBACK_ORDER[p]).toContain(other);
        }
      }
    });
  });
});
