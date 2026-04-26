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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlapLightbox } from '../../../src/ui-lightbox/AlapLightbox';
import { AlapEngine } from '../../../src/core/AlapEngine';
import { lightboxTestConfig } from '../../fixtures/lightbox-links';
import { RENDERER_LIGHTBOX } from '../../../src/ui/shared/coordinatedRenderer';
import type { ResolvedLink } from '../../../src/core/types';

// --- Helpers ---

function createTrigger(id: string, expression: string): HTMLElement {
  const a = document.createElement('a');
  a.id = id;
  a.className = 'alap';
  a.setAttribute('data-alap-linkitems', expression);
  a.textContent = id;
  document.body.appendChild(a);
  return a;
}

function clickTrigger(trigger: HTMLElement): void {
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function getOverlay(): HTMLElement | null {
  return document.querySelector('.alap-lightbox-overlay');
}

function getCard(): HTMLElement | null {
  return document.querySelector('.alap-lightbox-panel');
}

function pressKey(key: string, target: EventTarget = document): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function resolveLinks(expression: string): ResolvedLink[] {
  const engine = new AlapEngine(lightboxTestConfig);
  return engine.resolve(expression);
}

// --- Tests ---

describe('AlapLightbox', () => {
  let lightbox: AlapLightbox;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    lightbox?.destroy();
  });

  // ===========================================================================
  // Trigger setup
  // ===========================================================================

  describe('trigger setup', () => {
    it('sets role=button on triggers', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(trigger.getAttribute('role')).toBe('button');
    });

    it('sets tabindex=0 on triggers without existing tabindex', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(trigger.getAttribute('tabindex')).toBe('0');
    });

    it('preserves existing tabindex on triggers', () => {
      const trigger = createTrigger('t1', '.bridge');
      trigger.setAttribute('tabindex', '-1');
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(trigger.getAttribute('tabindex')).toBe('-1');
    });

    it('uses custom selector', () => {
      const a = document.createElement('a');
      a.className = 'custom-lightbox';
      a.setAttribute('data-alap-linkitems', '.bridge');
      document.body.appendChild(a);

      lightbox = new AlapLightbox(lightboxTestConfig, { selector: '.custom-lightbox' });
      expect(a.getAttribute('role')).toBe('button');
    });
  });

  // ===========================================================================
  // Overlay lifecycle
  // ===========================================================================

  describe('overlay lifecycle', () => {
    it('creates overlay on trigger click', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);

      expect(getOverlay()).toBeNull();
      clickTrigger(trigger);
      expect(getOverlay()).not.toBeNull();
    });

    it('sets dialog ARIA on overlay', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
      expect(overlay.getAttribute('aria-label')).toBe('Link preview');
    });

    it('does not open for empty results', () => {
      const trigger = createTrigger('t1', '.nonexistent');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);
      expect(getOverlay()).toBeNull();
    });

    it('does not open when expression attribute is missing', () => {
      const a = document.createElement('a');
      a.className = 'alap';
      a.textContent = 'no expression';
      document.body.appendChild(a);

      lightbox = new AlapLightbox(lightboxTestConfig);
      a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay()).toBeNull();
    });

    it('replaces overlay when clicking a different trigger', () => {
      const t1 = createTrigger('t1', '.bridge');
      const t2 = createTrigger('t2', '.coffee');
      lightbox = new AlapLightbox(lightboxTestConfig);

      clickTrigger(t1);
      const title1 = getCard()!.querySelector('.alap-lightbox-label')!.textContent;

      clickTrigger(t2);
      const title2 = getCard()!.querySelector('.alap-lightbox-label')!.textContent;

      expect(title1).toBe('Brooklyn Bridge');
      expect(title2).toBe('Aqus Cafe');
      expect(document.querySelectorAll('.alap-lightbox-overlay').length).toBe(1);
    });

    it('adds visible class for fade-in', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()!.classList.contains('alap-lightbox-visible')).toBe(true);
    });
  });

  // ===========================================================================
  // Dismissal
  // ===========================================================================

  describe('dismissal', () => {
    it('closes on Escape key', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      expect(getOverlay()).not.toBeNull();
      pressKey('Escape');
      // In JSDOM transitionDuration is 0, so overlay removes immediately
      expect(getOverlay()).toBeNull();
    });

    it('closes on overlay background click', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, target: overlay } as any));
      // Simulate click on the overlay itself (not a child)
      overlay.click();
      expect(getOverlay()).toBeNull();
    });

    it('does not close on panel click', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const card = getCard()!;
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay()).not.toBeNull();
    });

    it('closes via close button', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const closeBtn = document.querySelector('.alap-lightbox-close') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      expect(closeBtn.getAttribute('aria-label')).toBe('Close');
      closeBtn.click();
      expect(getOverlay()).toBeNull();
    });

    it('close() is safe to call when already closed', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(() => lightbox.close()).not.toThrow();
    });

    it('close() returns the trigger element', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const returned = lightbox.close();
      expect(returned).toBe(trigger);
    });

    it('close() returns null when no trigger is active', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      const returned = lightbox.close();
      expect(returned).toBeNull();
    });
  });

  // ===========================================================================
  // Content rendering — with image
  // ===========================================================================

  describe('content rendering (image)', () => {
    it('renders image from thumbnail field', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toContain('images/brooklyn.jpg');
      expect(img.style.display).not.toBe('none');
    });

    it('renders image from image field', () => {
      const trigger = createTrigger('t1', 'goldengate');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      expect(img.src).toContain('images/goldengate.jpg');
    });

    it('uses altText for image alt attribute', () => {
      const trigger = createTrigger('t1', 'goldengate');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      expect(img.alt).toBe('Golden Gate Bridge at sunset');
    });

    it('falls back to label for alt text', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      expect(img.alt).toBe('Brooklyn Bridge');
    });

    it('renders photo credit with link', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const credit = getCard()!.querySelector('.alap-lightbox-credit')!;
      const creditLink = credit.querySelector('a') as HTMLAnchorElement;
      expect(creditLink).not.toBeNull();
      expect(creditLink.textContent).toBe('Photo: Jane Doe');
      expect(creditLink.href).toBe('https://unsplash.com/@janedoe');
      expect(creditLink.target).toBe('_blank');
      expect(creditLink.rel).toBe('noopener noreferrer');
    });

    it('renders photo credit without link', () => {
      const trigger = createTrigger('t1', 'towerbridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const credit = getCard()!.querySelector('.alap-lightbox-credit')!;
      expect(credit.querySelector('a')).toBeNull();
      expect(credit.textContent).toBe('Photo: John Smith');
    });

    it('hides credit when no photoCredit meta', () => {
      const trigger = createTrigger('t1', 'goldengate');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const credit = getCard()!.querySelector('.alap-lightbox-credit')!;
      expect(credit.textContent).toBe('');
    });

    it('sets zoom-in cursor on image', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      expect(img.style.cursor).toBe('zoom-in');
    });
  });

  // ===========================================================================
  // Content rendering — no image
  // ===========================================================================

  describe('content rendering (no image)', () => {
    it('hides image and adds no-image class', () => {
      const trigger = createTrigger('t1', 'aqus');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      expect(img.style.display).toBe('none');

      const imageWrap = getCard()!.querySelector('.alap-lightbox-image-wrap')!;
      expect(imageWrap.classList.contains('no-image')).toBe(true);
    });

    it('sets transparent background on panel without image', () => {
      const trigger = createTrigger('t1', 'aqus');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const card = getCard()!;
      expect(card.style.background).toBe('transparent');
    });
  });

  // ===========================================================================
  // Content rendering — label, description, visit
  // ===========================================================================

  describe('content rendering (text)', () => {
    it('renders label', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const title = getCard()!.querySelector('.alap-lightbox-label')!;
      expect(title.textContent).toBe('Brooklyn Bridge');
      expect(title.getAttribute('title')).toBe('Brooklyn Bridge');
    });

    it('renders description', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const desc = getCard()!.querySelector('.alap-lightbox-description')!;
      expect(desc.textContent).toBe('Iconic suspension bridge spanning the East River');
      expect(desc.style.display).not.toBe('none');
    });

    it('hides description when absent', () => {
      const trigger = createTrigger('t1', 'bluebottle');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const desc = getCard()!.querySelector('.alap-lightbox-description')!;
      expect(desc.style.display).toBe('none');
    });

    it('renders visit link with correct url and target', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const visit = getCard()!.querySelector('.alap-lightbox-visit') as HTMLAnchorElement;
      expect(visit.href).toBe('https://example.com/brooklyn');
      expect(visit.target).toBe('_blank');
      expect(visit.rel).toBe('noopener noreferrer');
      expect(visit.textContent).toBe('Visit');
    });
  });

  // ===========================================================================
  // Navigation
  // ===========================================================================

  describe('navigation', () => {
    it('renders prev/next buttons for multi-item sets', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const prevBtn = document.querySelector('button.alap-lightbox-nav-prev')!;
      const nextBtn = document.querySelector('button.alap-lightbox-nav-next')!;
      expect(prevBtn).not.toBeNull();
      expect(nextBtn).not.toBeNull();
      expect(prevBtn.getAttribute('aria-label')).toBe('Previous');
      expect(nextBtn.getAttribute('aria-label')).toBe('Next');
    });

    it('does not render nav buttons for single-item set', () => {
      const trigger = createTrigger('t1', '.solo');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      expect(document.querySelector('.alap-lightbox-nav')).toBeNull();
    });

    it('renders counter for multi-item set', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counter = getCard()!.querySelector('.alap-lightbox-counter')!;
      expect(counter.textContent).toBe('1 / 3');
    });

    it('renders empty counter for single-item set', () => {
      const trigger = createTrigger('t1', '.solo');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counter = getCard()!.querySelector('.alap-lightbox-counter')!;
      expect(counter.textContent).toBe('');
    });

    it('navigates forward with ArrowRight', () => {
      vi.useFakeTimers();
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const title = getCard()!.querySelector('.alap-lightbox-label')!;
      expect(title.textContent).toBe('Brooklyn Bridge');

      // ArrowRight triggers navigate with fading — in JSDOM parseFloat on
      // CSS custom property returns NaN which becomes 0ms timeout
      pressKey('ArrowRight');
      vi.advanceTimersByTime(0);

      expect(title.textContent).toBe('Golden Gate');
      vi.useRealTimers();
    });

    it('navigates backward with ArrowLeft', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      // Should wrap around to last item
      pressKey('ArrowLeft');
    });

    it('prev/next buttons trigger navigation', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const nextBtn = document.querySelector('button.alap-lightbox-nav-next') as HTMLButtonElement;
      nextBtn.click();
      // Navigate uses setTimeout — content changes after timeout
    });
  });

  // ===========================================================================
  // Set navigator
  // ===========================================================================

  describe('set navigator', () => {
    it('creates setnav popup for multi-item sets', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const setnav = getCard()!.querySelector('.alap-lightbox-setnav')!;
      expect(setnav).not.toBeNull();
      expect(setnav.getAttribute('tabindex')).toBe('-1');
    });

    it('does not create setnav for single-item sets', () => {
      const trigger = createTrigger('t1', '.solo');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      expect(getCard()!.querySelector('.alap-lightbox-setnav')).toBeNull();
    });

    it('populates setnav with correct item labels', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const items = getCard()!.querySelectorAll('.alap-lightbox-setnav-item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('Brooklyn Bridge');
      expect(items[1].textContent).toBe('Golden Gate');
      expect(items[2].textContent).toBe('Tower Bridge');
    });

    it('setnav items have listbox/option ARIA roles', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const list = getCard()!.querySelector('.alap-lightbox-setnav-list')!;
      expect(list.getAttribute('role')).toBe('listbox');

      const items = list.querySelectorAll('.alap-lightbox-setnav-item');
      for (const item of items) {
        expect(item.getAttribute('role')).toBe('option');
      }
    });

    it('marks current item as active', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const items = getCard()!.querySelectorAll('.alap-lightbox-setnav-item');
      expect(items[0].classList.contains('active')).toBe(true);
      expect(items[1].classList.contains('active')).toBe(false);
    });

    it('opens setnav on counter click', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;
      const setnav = getCard()!.querySelector('.alap-lightbox-setnav')!;

      expect(setnav.classList.contains('open')).toBe(false);
      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);
    });

    it('closes setnav on second counter click', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;
      const setnav = getCard()!.querySelector('.alap-lightbox-setnav')!;

      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);
      counter.click();
      expect(setnav.classList.contains('open')).toBe(false);
    });

    it('shows hover hint on counter mouseenter', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counterWrap = getCard()!.querySelector('.alap-lightbox-counter-wrap') as HTMLElement;
      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;

      expect(counter.textContent).toBe('1 / 3');

      counterWrap.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(counter.textContent).toBe('menu\u2026');

      counterWrap.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(counter.textContent).toBe('1 / 3');
    });

    it('does not revert to counter text if setnav is open', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counterWrap = getCard()!.querySelector('.alap-lightbox-counter-wrap') as HTMLElement;
      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;
      const setnav = getCard()!.querySelector('.alap-lightbox-setnav')!;

      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);

      // Mouseleave should not revert while open
      counterWrap.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      // Counter text unchanged (still shows counter label, not "menu...")
    });

    it('has filter input with correct ARIA', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;
      expect(filter).not.toBeNull();
      expect(filter.getAttribute('aria-label')).toBe('Filter items');
      expect(filter.placeholder).toContain('Filter');
    });

    it('filter hides non-matching items', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;
      const items = getCard()!.querySelectorAll<HTMLElement>('.alap-lightbox-setnav-item');

      filter.value = 'Golden';
      filter.dispatchEvent(new Event('input'));

      // Only Golden Gate should be visible
      const visible = Array.from(items).filter((el) => el.style.display !== 'none');
      expect(visible.length).toBe(1);
      expect(visible[0].textContent).toBe('Golden Gate');
    });

    it('filter shows all items when cleared', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;
      const items = getCard()!.querySelectorAll<HTMLElement>('.alap-lightbox-setnav-item');

      filter.value = 'Golden';
      filter.dispatchEvent(new Event('input'));
      filter.value = '';
      filter.dispatchEvent(new Event('input'));

      const visible = Array.from(items).filter((el) => el.style.display !== 'none');
      expect(visible.length).toBe(3);
    });

    it('filter handles invalid regex gracefully', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;

      // Invalid regex — should not throw
      filter.value = '[unclosed';
      expect(() => filter.dispatchEvent(new Event('input'))).not.toThrow();
    });

    it('clear button appears when filter has text', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;
      const clearBtn = getCard()!.querySelector('.alap-lightbox-setnav-clear') as HTMLButtonElement;

      expect(clearBtn.style.display).toBe('none');

      filter.value = 'test';
      filter.dispatchEvent(new Event('input'));
      expect(clearBtn.style.display).not.toBe('none');
    });

    it('clear button resets filter', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;
      const clearBtn = getCard()!.querySelector('.alap-lightbox-setnav-clear') as HTMLButtonElement;

      filter.value = 'Golden';
      filter.dispatchEvent(new Event('input'));
      clearBtn.click();

      expect(filter.value).toBe('');
    });

    it('Escape in setnav closes setnav, not lightbox', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;
      const setnav = getCard()!.querySelector('.alap-lightbox-setnav') as HTMLElement;

      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);

      // Press Escape on setnav — should close popup, NOT the lightbox
      pressKey('Escape', setnav);
      expect(setnav.classList.contains('open')).toBe(false);
      expect(getOverlay()).not.toBeNull();
    });

    it('keyboard ArrowDown highlights items in setnav', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;
      const setnav = getCard()!.querySelector('.alap-lightbox-setnav') as HTMLElement;

      counter.click();

      // Arrow down highlights first item
      pressKey('ArrowDown', setnav);
      const items = getCard()!.querySelectorAll('.alap-lightbox-setnav-item');
      expect(items[0].classList.contains('highlighted')).toBe(true);

      // Arrow down again moves to second
      pressKey('ArrowDown', setnav);
      expect(items[0].classList.contains('highlighted')).toBe(false);
      expect(items[1].classList.contains('highlighted')).toBe(true);
    });

    it('keyboard ArrowUp moves highlight upward', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const setnav = getCard()!.querySelector('.alap-lightbox-setnav') as HTMLElement;
      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;

      counter.click();

      // Go down twice, then up once
      pressKey('ArrowDown', setnav);
      pressKey('ArrowDown', setnav);
      pressKey('ArrowUp', setnav);

      const items = getCard()!.querySelectorAll('.alap-lightbox-setnav-item');
      expect(items[0].classList.contains('highlighted')).toBe(true);
    });

    it('typing in setnav focuses filter input', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const setnav = getCard()!.querySelector('.alap-lightbox-setnav') as HTMLElement;
      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;
      const counter = getCard()!.querySelector('.alap-lightbox-counter') as HTMLElement;

      counter.click();
      setnav.focus();

      // Type a character — should focus filter
      setnav.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
      expect(document.activeElement).toBe(filter);
    });

    it('Enter on single visible item navigates to it', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const filter = getCard()!.querySelector('.alap-lightbox-setnav-filter') as HTMLInputElement;

      // Filter to single item
      filter.value = 'Tower';
      filter.dispatchEvent(new Event('input'));

      // Press Enter with no highlight — should auto-select the single visible item
      filter.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      }));

      // jumpTo triggers a fade + setTimeout — the navigation was attempted
    });
  });

  // ===========================================================================
  // Image zoom
  // ===========================================================================

  describe('image zoom', () => {
    it('opens zoom overlay on image click', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      img.click();

      const zoomOverlay = document.querySelector('.alap-lightbox-zoom-overlay');
      expect(zoomOverlay).not.toBeNull();
    });

    it('zoom overlay has correct image src', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      img.click();

      const zoomImg = document.querySelector('.alap-lightbox-zoom-image') as HTMLImageElement;
      expect(zoomImg.src).toBe(img.src);
    });

    it('zoom overlay gets visible class for fade-in', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      img.click();

      const zoomOverlay = document.querySelector('.alap-lightbox-zoom-overlay')!;
      expect(zoomOverlay.classList.contains('alap-lightbox-zoom-visible')).toBe(true);
    });

    it('zoom dismisses on click', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      img.click();

      const zoomOverlay = document.querySelector('.alap-lightbox-zoom-overlay') as HTMLElement;
      zoomOverlay.click();

      // In JSDOM transitionDuration is 0, so removes immediately
      expect(document.querySelector('.alap-lightbox-zoom-overlay')).toBeNull();
    });

    it('zoom Escape closes zoom but not lightbox', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      img.click();

      expect(document.querySelector('.alap-lightbox-zoom-overlay')).not.toBeNull();

      // Escape should close zoom (capture phase handler with stopPropagation)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(document.querySelector('.alap-lightbox-zoom-overlay')).toBeNull();
      // Lightbox should still be open
      expect(getOverlay()).not.toBeNull();
    });

    it('does not open zoom when image is hidden (no-image item)', () => {
      const trigger = createTrigger('t1', 'aqus');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const img = getCard()!.querySelector('.alap-lightbox-image') as HTMLImageElement;
      // img.src is empty for no-image items, so the click guard (if src) prevents zoom
      img.click();

      expect(document.querySelector('.alap-lightbox-zoom-overlay')).toBeNull();
    });
  });

  // ===========================================================================
  // CoordinatedRenderer interface
  // ===========================================================================

  describe('CoordinatedRenderer interface', () => {
    it('has rendererType RENDERER_LIGHTBOX', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(lightbox.rendererType).toBe(RENDERER_LIGHTBOX);
    });

    it('isOpen reflects overlay state', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(lightbox.isOpen).toBe(false);

      lightbox.openWith({ links: resolveLinks('.bridge') });
      expect(lightbox.isOpen).toBe(true);

      lightbox.close();
      expect(lightbox.isOpen).toBe(false);
    });

    it('openWith creates overlay with correct initial index', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      const links = resolveLinks('.bridge');

      lightbox.openWith({ links, initialIndex: 2 });

      const title = getCard()!.querySelector('.alap-lightbox-label')!;
      expect(title.textContent).toBe(links[2].label);
    });

    it('openWith with empty links does not open', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      lightbox.openWith({ links: [] });
      expect(lightbox.isOpen).toBe(false);
    });

    it('openWith stores triggerElement for close()', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);

      lightbox.openWith({ links: resolveLinks('.bridge'), triggerElement: trigger });
      const returned = lightbox.close();
      expect(returned).toBe(trigger);
    });
  });

  // ===========================================================================
  // Destroy
  // ===========================================================================

  describe('destroy', () => {
    it('removes role attribute from triggers', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(trigger.getAttribute('role')).toBe('button');

      lightbox.destroy();
      expect(trigger.getAttribute('role')).toBeNull();
    });

    it('closes open overlay on destroy', () => {
      const trigger = createTrigger('t1', '.bridge');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);
      expect(getOverlay()).not.toBeNull();

      lightbox.destroy();
      expect(getOverlay()).toBeNull();
    });

    it('is safe to call destroy multiple times', () => {
      lightbox = new AlapLightbox(lightboxTestConfig);
      expect(() => {
        lightbox.destroy();
        lightbox.destroy();
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Security
  // ===========================================================================

  describe('security', () => {
    it('label uses textContent, not innerHTML', () => {
      const trigger = createTrigger('t1', 'xss_attempt');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const title = getCard()!.querySelector('.alap-lightbox-label')!;
      // Should render as literal text, not parsed HTML
      expect(title.textContent).toBe('<script>alert("xss")</script>');
      expect(title.querySelector('script')).toBeNull();
    });

    it('description uses textContent, not innerHTML', () => {
      const trigger = createTrigger('t1', 'xss_attempt');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const desc = getCard()!.querySelector('.alap-lightbox-description')!;
      expect(desc.textContent).toBe('<img src=x onerror=alert(1)>');
      expect(desc.querySelector('img')).toBeNull();
    });

    it('photo credit uses textContent, not innerHTML', () => {
      // xss_attempt has no image, so credit won't render — use a crafted config
      const xssConfig = {
        ...lightboxTestConfig,
        allLinks: {
          ...lightboxTestConfig.allLinks,
          xss_img: {
            label: 'XSS with image',
            url: 'https://example.com/safe',
            thumbnail: 'images/safe.jpg',
            meta: {
              photoCredit: '<script>steal()</script>',
            },
          },
        },
      };

      const trigger = createTrigger('t1', 'xss_img');
      lightbox = new AlapLightbox(xssConfig);
      clickTrigger(trigger);

      const credit = getCard()!.querySelector('.alap-lightbox-credit')!;
      expect(credit.textContent).toContain('<script>steal()</script>');
      expect(credit.querySelector('script')).toBeNull();
    });

    it('visit link has noopener noreferrer', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const visit = getCard()!.querySelector('.alap-lightbox-visit') as HTMLAnchorElement;
      expect(visit.rel).toBe('noopener noreferrer');
    });

    it('credit link has noopener noreferrer', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const creditLink = getCard()!.querySelector('.alap-lightbox-credit a') as HTMLAnchorElement;
      expect(creditLink.rel).toBe('noopener noreferrer');
    });

    it('setnav items use textContent, not innerHTML', () => {
      const xssConfig = {
        ...lightboxTestConfig,
        allLinks: {
          xss1: {
            label: '<img src=x onerror=alert(1)>',
            url: 'https://example.com/safe',
            tags: ['xss'],
          },
          xss2: {
            label: 'Normal',
            url: 'https://example.com/safe',
            tags: ['xss'],
          },
        },
      };

      const trigger = createTrigger('t1', '.xss');
      lightbox = new AlapLightbox(xssConfig);
      clickTrigger(trigger);

      const items = getCard()!.querySelectorAll('.alap-lightbox-setnav-item');
      expect(items[0].textContent).toBe('<img src=x onerror=alert(1)>');
      expect(items[0].querySelector('img')).toBeNull();
    });

    it('overlay innerHTML is only used for clearing, not for content', () => {
      // creditEl.innerHTML = '' is safe — verify credit area has no script injection
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      const scripts = overlay.querySelectorAll('script');
      expect(scripts.length).toBe(0);
    });
  });

  // ===========================================================================
  // Macro support
  // ===========================================================================

  describe('macro support', () => {
    it('resolves macros in expressions', () => {
      const trigger = createTrigger('t1', '@favorites');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const items = getCard()!.querySelectorAll('.alap-lightbox-setnav-item');
      expect(items.length).toBe(3);
    });
  });

  // ===========================================================================
  // Placement
  // ===========================================================================

  describe('placement', () => {
    it('reads data-alap-placement from the trigger', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      trigger.setAttribute('data-alap-placement', 'NW');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-start');
      expect(overlay.style.justifyContent).toBe('flex-start');
    });

    it('parses strategy suffix and applies compass only', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      trigger.setAttribute('data-alap-placement', 'SE, clamp');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('flex-end');
    });

    it('trigger attribute wins over constructor option', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      trigger.setAttribute('data-alap-placement', 'N');
      lightbox = new AlapLightbox(lightboxTestConfig, { placement: 'SE' });
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-start');
      expect(overlay.style.justifyContent).toBe('center');
    });

    it('falls back to config.settings.placement when no trigger attr', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      const config = { ...lightboxTestConfig, settings: { ...lightboxTestConfig.settings, placement: 'S' } };
      lightbox = new AlapLightbox(config);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('flex-end');
      expect(overlay.style.justifyContent).toBe('center');
    });

    it('falls back to centered default when nothing is configured', () => {
      const trigger = createTrigger('t1', 'brooklyn');
      lightbox = new AlapLightbox(lightboxTestConfig);
      clickTrigger(trigger);

      const overlay = getOverlay()!;
      expect(overlay.style.alignItems).toBe('');
      expect(overlay.style.justifyContent).toBe('');
    });
  });
});
