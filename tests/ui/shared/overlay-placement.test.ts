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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  OVERLAY_ALIGN,
  OVERLAY_JUSTIFY,
  applyOverlayLayout,
  clearOverlayLayout,
  computeOverlayLayout,
} from '../../../src/ui/shared/overlayPlacement';
import type { ParsedPlacement, Size } from '../../../src/ui/shared/placement';

const VIEWPORT_1000x800: Size = { width: 1000, height: 800 };

function parsed(compass: ParsedPlacement['compass'], strategy: ParsedPlacement['strategy']): ParsedPlacement {
  return { compass, strategy };
}

describe('OVERLAY_ALIGN / OVERLAY_JUSTIFY', () => {
  it('maps north to flex-start × center', () => {
    expect(OVERLAY_ALIGN.N).toBe('flex-start');
    expect(OVERLAY_JUSTIFY.N).toBe('center');
  });

  it('maps south-east to flex-end × flex-end', () => {
    expect(OVERLAY_ALIGN.SE).toBe('flex-end');
    expect(OVERLAY_JUSTIFY.SE).toBe('flex-end');
  });

  it('maps center to center × center', () => {
    expect(OVERLAY_ALIGN.C).toBe('center');
    expect(OVERLAY_JUSTIFY.C).toBe('center');
  });

  it('covers all 9 placements', () => {
    for (const p of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'C'] as const) {
      expect(OVERLAY_ALIGN[p]).toBeDefined();
      expect(OVERLAY_JUSTIFY[p]).toBeDefined();
    }
  });
});

describe('computeOverlayLayout', () => {
  it('returns compass alignment for strategy "place"', () => {
    const layout = computeOverlayLayout(parsed('SE', 'place'), VIEWPORT_1000x800);
    expect(layout.alignItems).toBe('flex-end');
    expect(layout.justifyContent).toBe('flex-end');
    expect(layout.maxHeight).toBeUndefined();
    expect(layout.maxWidth).toBeUndefined();
  });

  it('returns compass alignment for strategy "flip" (no clamp)', () => {
    const layout = computeOverlayLayout(parsed('N', 'flip'), VIEWPORT_1000x800);
    expect(layout.alignItems).toBe('flex-start');
    expect(layout.maxHeight).toBeUndefined();
    expect(layout.maxWidth).toBeUndefined();
  });

  it('applies max-height/max-width for strategy "clamp"', () => {
    const layout = computeOverlayLayout(parsed('C', 'clamp'), VIEWPORT_1000x800);
    expect(layout.alignItems).toBe('center');
    expect(layout.justifyContent).toBe('center');
    expect(layout.maxHeight).toBe('784px'); // 800 - 2*8
    expect(layout.maxWidth).toBe('984px');  // 1000 - 2*8
  });

  it('honors a custom padding', () => {
    const layout = computeOverlayLayout(parsed('S', 'clamp'), VIEWPORT_1000x800, { padding: 24 });
    expect(layout.maxHeight).toBe('752px'); // 800 - 2*24
    expect(layout.maxWidth).toBe('952px');  // 1000 - 2*24
  });

  it('clamps max dimensions to a non-negative value on tiny viewports', () => {
    const layout = computeOverlayLayout(parsed('C', 'clamp'), { width: 10, height: 10 }, { padding: 20 });
    expect(layout.maxHeight).toBe('0px');
    expect(layout.maxWidth).toBe('0px');
  });
});

describe('applyOverlayLayout / clearOverlayLayout', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('writes alignItems and justifyContent', () => {
    applyOverlayLayout(el, { alignItems: 'flex-end', justifyContent: 'center' });
    expect(el.style.alignItems).toBe('flex-end');
    expect(el.style.justifyContent).toBe('center');
  });

  it('writes maxHeight and maxWidth when present', () => {
    applyOverlayLayout(el, {
      alignItems: 'center',
      justifyContent: 'center',
      maxHeight: '784px',
      maxWidth: '984px',
    });
    expect(el.style.maxHeight).toBe('784px');
    expect(el.style.maxWidth).toBe('984px');
  });

  it('clears maxHeight and maxWidth when layout omits them', () => {
    el.style.maxHeight = '500px';
    el.style.maxWidth = '600px';
    applyOverlayLayout(el, { alignItems: 'center', justifyContent: 'center' });
    expect(el.style.maxHeight).toBe('');
    expect(el.style.maxWidth).toBe('');
  });

  it('clearOverlayLayout resets all four style props', () => {
    el.style.alignItems = 'flex-end';
    el.style.justifyContent = 'flex-end';
    el.style.maxHeight = '500px';
    el.style.maxWidth = '500px';
    clearOverlayLayout(el);
    expect(el.style.alignItems).toBe('');
    expect(el.style.justifyContent).toBe('');
    expect(el.style.maxHeight).toBe('');
    expect(el.style.maxWidth).toBe('');
  });

  it('round-trips a clamp layout from computeOverlayLayout', () => {
    const layout = computeOverlayLayout(parsed('NW', 'clamp'), VIEWPORT_1000x800);
    applyOverlayLayout(el, layout);
    expect(el.style.alignItems).toBe('flex-start');
    expect(el.style.justifyContent).toBe('flex-start');
    expect(el.style.maxHeight).toBe('784px');
    expect(el.style.maxWidth).toBe('984px');
  });
});
