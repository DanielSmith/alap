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

import { describe, it, expect, beforeEach } from 'vitest';
import { AlapLensElement, defineAlapLens } from '../../../src/ui-lens/AlapLensElement';
import { registerConfig } from '../../../src/ui/shared/configRegistry';
import { lensTestConfig } from '../../fixtures/lens-links';

// Define once for all tests
defineAlapLens();

// --- Helpers ---

function createElement(query: string, attrs?: Record<string, string>): AlapLensElement {
  const el = document.createElement('alap-lens') as AlapLensElement;
  el.setAttribute('query', query);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
  el.textContent = 'trigger text';
  document.body.appendChild(el);
  return el;
}

function getOverlay(el: AlapLensElement): HTMLElement | null {
  return el.shadowRoot?.querySelector('.overlay') ?? null;
}

function getPanel(el: AlapLensElement): HTMLElement | null {
  return el.shadowRoot?.querySelector('.panel') ?? null;
}

function clickElement(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function pressKey(key: string, target: EventTarget = document): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

// --- Tests ---

describe('Web Component — <alap-lens>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    registerConfig(lensTestConfig);
  });

  // ===========================================================================
  // Registration
  // ===========================================================================

  it('defines the custom element', () => {
    expect(customElements.get('alap-lens')).toBe(AlapLensElement);
  });

  // ===========================================================================
  // Shadow DOM structure
  // ===========================================================================

  describe('shadow DOM structure', () => {
    it('has a shadow root with slot', () => {
      const el = createElement('.drama');
      expect(el.shadowRoot).not.toBeNull();
      expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
    });

    it('has no overlay by default', () => {
      const el = createElement('.drama');
      expect(getOverlay(el)).toBeNull();
    });
  });

  // ===========================================================================
  // ARIA on host
  // ===========================================================================

  describe('ARIA on host', () => {
    it('sets ARIA attributes on host element', () => {
      const el = createElement('.drama');
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('aria-haspopup')).toBe('dialog');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('preserves existing role', () => {
      const el = document.createElement('alap-lens') as AlapLensElement;
      el.setAttribute('role', 'link');
      el.setAttribute('query', '.drama');
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('link');
    });

    it('preserves existing tabindex', () => {
      const el = document.createElement('alap-lens') as AlapLensElement;
      el.setAttribute('tabindex', '-1');
      el.setAttribute('query', '.drama');
      document.body.appendChild(el);
      expect(el.getAttribute('tabindex')).toBe('-1');
    });
  });

  // ===========================================================================
  // Overlay lifecycle
  // ===========================================================================

  describe('overlay lifecycle', () => {
    it('opens overlay on click', () => {
      const el = createElement('.drama');
      clickElement(el);

      const overlay = getOverlay(el);
      expect(overlay).not.toBeNull();
      expect(el.getAttribute('aria-expanded')).toBe('true');
    });

    it('sets dialog ARIA on overlay', () => {
      const el = createElement('.drama');
      clickElement(el);

      const overlay = getOverlay(el)!;
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
      expect(overlay.getAttribute('aria-label')).toBe('Item details');
    });

    it('does not open for empty results', () => {
      const el = createElement('.nonexistent');
      clickElement(el);
      expect(getOverlay(el)).toBeNull();
    });

    it('does not open without query attribute', () => {
      const el = document.createElement('alap-lens') as AlapLensElement;
      el.textContent = 'no query';
      document.body.appendChild(el);
      clickElement(el);
      expect(getOverlay(el)).toBeNull();
    });

    it('adds visible class for fade-in', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getOverlay(el)!.classList.contains('visible')).toBe(true);
    });

    it('opens on Enter key', () => {
      const el = createElement('.drama');
      pressKey('Enter', el);
      expect(getOverlay(el)).not.toBeNull();
    });

    it('opens on Space key', () => {
      const el = createElement('.drama');
      pressKey(' ', el);
      expect(getOverlay(el)).not.toBeNull();
    });
  });

  // ===========================================================================
  // Dismissal
  // ===========================================================================

  describe('dismissal', () => {
    it('closes on Escape key', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getOverlay(el)).not.toBeNull();

      pressKey('Escape');
      expect(getOverlay(el)).toBeNull();
      expect(el.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on overlay background click', () => {
      const el = createElement('.drama');
      clickElement(el);

      const overlay = getOverlay(el)!;
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay(el)).toBeNull();
    });

    it('does not close on panel click', () => {
      const el = createElement('.drama');
      clickElement(el);

      const panel = getPanel(el)!;
      panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay(el)).not.toBeNull();
    });

    it('closes via close-x button', () => {
      const el = createElement('.drama');
      clickElement(el);

      const closeX = el.shadowRoot!.querySelector('.close-x') as HTMLElement;
      expect(closeX).not.toBeNull();
      closeX.click();
      expect(getOverlay(el)).toBeNull();
    });
  });

  // ===========================================================================
  // Content rendering
  // ===========================================================================

  describe('content rendering', () => {
    it('renders label', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const label = getPanel(el)!.querySelector('.label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe('Mr. Robot');
    });

    it('renders description', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const desc = getPanel(el)!.querySelector('.description');
      expect(desc).not.toBeNull();
      expect(desc!.textContent).toContain('hackers');
    });

    it('renders tags', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const tags = getPanel(el)!.querySelectorAll('.tag');
      expect(tags.length).toBe(3);
      expect(tags[0].textContent).toBe('drama');
      expect(tags[1].textContent).toBe('thriller');
      expect(tags[2].textContent).toBe('scifi');
    });

    it('renders image', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const img = getPanel(el)!.querySelector('.image') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toContain('mrrobot.jpg');
    });

    it('renders visit button with URL', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const visit = getPanel(el)!.querySelector('.visit') as HTMLAnchorElement;
      expect(visit).not.toBeNull();
      expect(visit.href).toContain('mrrobot');
      expect(visit.textContent).toContain('Visit');
    });

    it('omits visit button for URL-less items', () => {
      const el = createElement('fruitdata');
      clickElement(el);

      const visit = getPanel(el)!.querySelector('.visit');
      expect(visit).toBeNull();
    });

    it('renders image from image field (not thumbnail)', () => {
      const el = createElement('banana');
      clickElement(el);

      const img = getPanel(el)!.querySelector('.image') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toContain('banana.jpg');
    });
  });

  // ===========================================================================
  // Meta field rendering
  // ===========================================================================

  describe('meta field rendering', () => {
    it('renders number meta as key-value', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const rows = getPanel(el)!.querySelectorAll('.meta-row');
      const texts = Array.from(rows).map((r) => r.textContent);
      expect(texts.some((t) => t?.includes('8.5'))).toBe(true);
    });

    it('renders boolean meta as checkmark/cross', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const rows = getPanel(el)!.querySelectorAll('.meta-row');
      const texts = Array.from(rows).map((r) => r.textContent);
      // ongoing: false → ✗
      expect(texts.some((t) => t?.includes('\u2717'))).toBe(true);
    });

    it('renders string array as chips', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const chips = getPanel(el)!.querySelectorAll('.meta-chip');
      expect(chips.length).toBeGreaterThan(0);
      const chipTexts = Array.from(chips).map((c) => c.textContent);
      expect(chipTexts).toContain('Drama');
    });

    it('renders URL array as links', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const links = getPanel(el)!.querySelectorAll('.meta-link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('filters internal meta keys', () => {
      const el = createElement('internalmeta');
      clickElement(el);

      const meta = getPanel(el)!.querySelector('.meta');
      expect(meta).toBeNull();
    });

    it('skips empty/null meta values', () => {
      const el = createElement('nullmeta');
      clickElement(el);

      const rows = getPanel(el)!.querySelectorAll('.meta-row');
      const texts = Array.from(rows).map((r) => r.textContent);
      expect(texts.some((t) => t?.includes('visible'))).toBe(true);
      expect(texts.some((t) => t?.includes('empty'))).toBe(false);
    });

    it('respects display hint overrides', () => {
      const el = createElement('hinted');
      clickElement(el);

      // bio forced to text block
      const textBlock = getPanel(el)!.querySelector('.meta-text');
      expect(textBlock).not.toBeNull();
      expect(textBlock!.textContent).toBe('Short bio forced to text block.');
    });
  });

  // ===========================================================================
  // Navigation
  // ===========================================================================

  describe('navigation', () => {
    it('renders prev/next buttons for multi-item sets', () => {
      const el = createElement('.drama');
      clickElement(el);

      const prev = getPanel(el)!.querySelector('.nav-prev');
      const next = getPanel(el)!.querySelector('.nav-next');
      expect(prev).not.toBeNull();
      expect(next).not.toBeNull();
    });

    it('renders counter for multi-item sets', () => {
      const el = createElement('.drama');
      clickElement(el);

      const counter = getPanel(el)!.querySelector('.counter');
      expect(counter).not.toBeNull();
      expect(counter!.textContent).toMatch(/1 \/ \d+/);
    });

    it('does not render nav for single-item sets', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const nav = getPanel(el)!.querySelector('.nav');
      expect(nav).toBeNull();
    });

    it('renders set navigator popup for multi-item sets', () => {
      const el = createElement('.drama');
      clickElement(el);

      const setnav = getPanel(el)!.querySelector('.setnav');
      expect(setnav).not.toBeNull();

      const items = setnav!.querySelectorAll('.setnav-item');
      expect(items.length).toBeGreaterThan(1);
    });

    it('renders filter input in set navigator', () => {
      const el = createElement('.drama');
      clickElement(el);

      const filter = getPanel(el)!.querySelector('.setnav-filter');
      expect(filter).not.toBeNull();
    });
  });

  // ===========================================================================
  // ::part() exposure
  // ===========================================================================

  describe('part attributes', () => {
    it('exposes overlay part', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getOverlay(el)!.getAttribute('part')).toBe('overlay');
    });

    it('exposes panel part', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getPanel(el)!.getAttribute('part')).toBe('panel');
    });

    it('exposes close-x part', () => {
      const el = createElement('.drama');
      clickElement(el);
      const closeX = el.shadowRoot!.querySelector('.close-x');
      expect(closeX!.getAttribute('part')).toBe('close-x');
    });

    it('exposes label part', () => {
      const el = createElement('mrrobot');
      clickElement(el);
      const label = getPanel(el)!.querySelector('.label');
      expect(label!.getAttribute('part')).toBe('label');
    });

    it('exposes description part', () => {
      const el = createElement('mrrobot');
      clickElement(el);
      const desc = getPanel(el)!.querySelector('.description');
      expect(desc!.getAttribute('part')).toBe('description');
    });

    it('exposes nav parts', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getPanel(el)!.querySelector('.nav-prev')!.getAttribute('part')).toBe('nav-prev');
      expect(getPanel(el)!.querySelector('.nav-next')!.getAttribute('part')).toBe('nav-next');
    });

    it('exposes counter-wrap part', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getPanel(el)!.querySelector('.counter-wrap')!.getAttribute('part')).toBe('counter-wrap');
    });

    it('exposes setnav part', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getPanel(el)!.querySelector('.setnav')!.getAttribute('part')).toBe('setnav');
    });
  });

  // ===========================================================================
  // Options via attributes
  // ===========================================================================

  describe('attribute options', () => {
    it('renders close button when panel-close-button is set', () => {
      const el = createElement('.drama', { 'panel-close-button': '' });
      clickElement(el);

      const closeBtn = getPanel(el)!.querySelector('.close-btn');
      expect(closeBtn).not.toBeNull();
    });

    it('omits close button by default', () => {
      const el = createElement('.drama');
      clickElement(el);

      const closeBtn = getPanel(el)!.querySelector('.close-btn');
      expect(closeBtn).toBeNull();
    });

    it('respects custom visit-label', () => {
      const el = createElement('mrrobot', { 'visit-label': 'Go!' });
      clickElement(el);

      const visit = getPanel(el)!.querySelector('.visit');
      expect(visit!.textContent).toBe('Go!');
    });

    it('respects custom close-label', () => {
      const el = createElement('.drama', { 'panel-close-button': '', 'close-label': 'Dismiss' });
      clickElement(el);

      const closeBtn = getPanel(el)!.querySelector('.close-btn');
      expect(closeBtn!.textContent).toBe('Dismiss');
    });

    it('hides copy button when copyable="false"', () => {
      const el = createElement('mrrobot', { copyable: 'false' });
      clickElement(el);

      const copyBtn = getPanel(el)!.querySelector('.copy-btn');
      expect(copyBtn).toBeNull();
    });

    it('renders copy button by default', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const copyBtn = getPanel(el)!.querySelector('.copy-btn');
      expect(copyBtn).not.toBeNull();
    });
  });

  // ===========================================================================
  // Cleanup on disconnect
  // ===========================================================================

  describe('cleanup', () => {
    it('closes overlay on disconnectedCallback', () => {
      const el = createElement('.drama');
      clickElement(el);
      expect(getOverlay(el)).not.toBeNull();

      el.remove();
      expect(getOverlay(el)).toBeNull();
    });
  });

  // ===========================================================================
  // Security
  // ===========================================================================

  describe('security', () => {
    it('uses textContent for labels, not innerHTML', () => {
      const el = createElement('mrrobot');
      clickElement(el);

      const label = getPanel(el)!.querySelector('.label');
      expect(label!.textContent).toBe('Mr. Robot');
      // Should not have any child elements (no HTML injection)
      expect(label!.children.length).toBe(0);
    });
  });

  // ===========================================================================
  // Placement
  // ===========================================================================

  describe('placement', () => {
    it('reads placement attribute on the host', () => {
      const el = createElement('mrrobot', { placement: 'NW' });
      clickElement(el);
      const overlay = getOverlay(el)!;
      expect(overlay.style.alignItems).toBe('flex-start');
      expect(overlay.style.justifyContent).toBe('flex-start');
    });

    it('parses strategy suffix and applies compass only', () => {
      const el = createElement('mrrobot', { placement: 'SE, clamp' });
      clickElement(el);
      const overlay = getOverlay(el)!;
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('flex-end');
    });

    it('falls back to config.settings.placement', () => {
      registerConfig({ ...lensTestConfig, settings: { ...lensTestConfig.settings, placement: 'S' } });
      const el = createElement('mrrobot');
      clickElement(el);
      const overlay = getOverlay(el)!;
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('center');
    });

    it('re-styles in place when placement attribute changes while open', () => {
      const el = createElement('mrrobot', { placement: 'NW' });
      clickElement(el);
      const overlay = getOverlay(el)!;
      expect(overlay.style.alignItems).toBe('flex-start');

      el.setAttribute('placement', 'SE');

      // Same overlay instance — should not have closed.
      expect(getOverlay(el)).toBe(overlay);
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('flex-end');
    });

    it('clears inline styles when placement is removed while open', () => {
      const el = createElement('mrrobot', { placement: 'NW' });
      clickElement(el);
      const overlay = getOverlay(el)!;
      expect(overlay.style.alignItems).toBe('flex-start');

      el.removeAttribute('placement');

      expect(getOverlay(el)).toBe(overlay);
      expect(overlay.style.alignItems).toBe('');
      expect(overlay.style.justifyContent).toBe('');
    });
  });
});
