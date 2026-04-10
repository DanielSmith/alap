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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AlapLightboxElement, defineAlapLightbox } from '../../../src/ui-lightbox/AlapLightboxElement';
import { registerConfig } from '../../../src/ui/shared/configRegistry';
import { lightboxTestConfig } from '../../fixtures/lightbox-links';

// Define once for all tests
defineAlapLightbox();

// --- Helpers ---

function createElement(query: string, id?: string): AlapLightboxElement {
  const el = document.createElement('alap-lightbox') as AlapLightboxElement;
  el.setAttribute('query', query);
  if (id) el.id = id;
  el.textContent = 'trigger text';
  document.body.appendChild(el);
  return el;
}

function getOverlay(el: AlapLightboxElement): HTMLElement | null {
  return el.shadowRoot?.querySelector('.overlay') ?? null;
}

function getCard(el: AlapLightboxElement): HTMLElement | null {
  return el.shadowRoot?.querySelector('.panel') ?? null;
}

function clickElement(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function pressKey(key: string, target: EventTarget = document): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

// --- Tests ---

describe('Web Component — <alap-lightbox>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    registerConfig(lightboxTestConfig);
  });

  // ===========================================================================
  // Registration
  // ===========================================================================

  it('defines the custom element', () => {
    expect(customElements.get('alap-lightbox')).toBe(AlapLightboxElement);
  });

  // ===========================================================================
  // Shadow DOM structure
  // ===========================================================================

  describe('shadow DOM structure', () => {
    it('has a shadow root with slot', () => {
      const el = createElement('.bridge');
      expect(el.shadowRoot).not.toBeNull();
      expect(el.shadowRoot!.querySelector('slot')).not.toBeNull();
    });

    it('has no overlay by default', () => {
      const el = createElement('.bridge');
      expect(getOverlay(el)).toBeNull();
    });
  });

  // ===========================================================================
  // ARIA on host
  // ===========================================================================

  describe('ARIA on host', () => {
    it('sets ARIA attributes on host element', () => {
      const el = createElement('.bridge');
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('aria-haspopup')).toBe('dialog');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('preserves existing role', () => {
      const el = document.createElement('alap-lightbox') as AlapLightboxElement;
      el.setAttribute('role', 'link');
      el.setAttribute('query', '.bridge');
      document.body.appendChild(el);
      expect(el.getAttribute('role')).toBe('link');
    });

    it('preserves existing tabindex', () => {
      const el = document.createElement('alap-lightbox') as AlapLightboxElement;
      el.setAttribute('tabindex', '-1');
      el.setAttribute('query', '.bridge');
      document.body.appendChild(el);
      expect(el.getAttribute('tabindex')).toBe('-1');
    });
  });

  // ===========================================================================
  // Overlay lifecycle
  // ===========================================================================

  describe('overlay lifecycle', () => {
    it('opens overlay on click', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const overlay = getOverlay(el);
      expect(overlay).not.toBeNull();
      expect(el.getAttribute('aria-expanded')).toBe('true');
    });

    it('sets dialog ARIA on overlay', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const overlay = getOverlay(el)!;
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');
      expect(overlay.getAttribute('aria-label')).toBe('Link preview');
    });

    it('does not open for empty results', () => {
      const el = createElement('.nonexistent');
      clickElement(el);
      expect(getOverlay(el)).toBeNull();
    });

    it('does not open without query attribute', () => {
      const el = document.createElement('alap-lightbox') as AlapLightboxElement;
      el.textContent = 'no query';
      document.body.appendChild(el);
      clickElement(el);
      expect(getOverlay(el)).toBeNull();
    });

    it('adds visible class for fade-in', () => {
      const el = createElement('.bridge');
      clickElement(el);
      expect(getOverlay(el)!.classList.contains('visible')).toBe(true);
    });

    it('opens on Enter key', () => {
      const el = createElement('.bridge');
      pressKey('Enter', el);
      expect(getOverlay(el)).not.toBeNull();
    });

    it('opens on Space key', () => {
      const el = createElement('.bridge');
      pressKey(' ', el);
      expect(getOverlay(el)).not.toBeNull();
    });
  });

  // ===========================================================================
  // Dismissal
  // ===========================================================================

  describe('dismissal', () => {
    it('closes on Escape key', () => {
      const el = createElement('.bridge');
      clickElement(el);
      expect(getOverlay(el)).not.toBeNull();

      pressKey('Escape');
      expect(getOverlay(el)).toBeNull();
      expect(el.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on overlay background click', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const overlay = getOverlay(el)!;
      // Simulate click on overlay itself (not a child)
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay(el)).toBeNull();
    });

    it('does not close on panel click', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const card = getCard(el)!;
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getOverlay(el)).not.toBeNull();
    });

    it('closes via close-x button', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const closeX = el.shadowRoot!.querySelector('.close-x') as HTMLButtonElement;
      expect(closeX).not.toBeNull();
      expect(closeX.getAttribute('aria-label')).toBe('Close');
      closeX.click();
      expect(getOverlay(el)).toBeNull();
    });

    it('closes when query attribute changes while open', () => {
      const el = createElement('.bridge');
      clickElement(el);
      expect(getOverlay(el)).not.toBeNull();

      el.setAttribute('query', '.coffee');
      expect(getOverlay(el)).toBeNull();
    });
  });

  // ===========================================================================
  // Content rendering — with image
  // ===========================================================================

  describe('content rendering (image)', () => {
    it('renders image from thumbnail field', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toContain('images/brooklyn.jpg');
      expect(img.style.display).not.toBe('none');
    });

    it('renders image from image field', () => {
      const el = createElement('goldengate');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      expect(img.src).toContain('images/goldengate.jpg');
    });

    it('uses altText for image alt attribute', () => {
      const el = createElement('goldengate');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      expect(img.alt).toBe('Golden Gate Bridge at sunset');
    });

    it('falls back to label for alt text', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      expect(img.alt).toBe('Brooklyn Bridge');
    });

    it('renders photo credit with link', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const credit = getCard(el)!.querySelector('.credit')!;
      const creditLink = credit.querySelector('a') as HTMLAnchorElement;
      expect(creditLink).not.toBeNull();
      expect(creditLink.textContent).toBe('Photo: Jane Doe');
      expect(creditLink.href).toBe('https://unsplash.com/@janedoe');
      expect(creditLink.target).toBe('_blank');
      expect(creditLink.rel).toBe('noopener noreferrer');
    });

    it('renders photo credit without link', () => {
      const el = createElement('towerbridge');
      clickElement(el);

      const credit = getCard(el)!.querySelector('.credit')!;
      expect(credit.querySelector('a')).toBeNull();
      expect(credit.textContent).toBe('Photo: John Smith');
    });

    it('hides credit when no photoCredit meta', () => {
      const el = createElement('goldengate');
      clickElement(el);

      const credit = getCard(el)!.querySelector('.credit')!;
      expect(credit.classList.contains('hidden')).toBe(true);
    });

    it('sets zoom-in cursor on image', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      expect(img.style.cursor).toBe('zoom-in');
    });
  });

  // ===========================================================================
  // Content rendering — no image
  // ===========================================================================

  describe('content rendering (no image)', () => {
    it('hides image and adds no-image class to panel', () => {
      const el = createElement('aqus');
      clickElement(el);

      const card = getCard(el)!;
      const img = card.querySelector('.image') as HTMLImageElement;
      expect(img.style.display).toBe('none');
      expect(card.classList.contains('no-image')).toBe(true);
    });

    it('adds hidden class to image-wrap', () => {
      const el = createElement('aqus');
      clickElement(el);

      const imageWrap = getCard(el)!.querySelector('.image-wrap')!;
      expect(imageWrap.classList.contains('hidden')).toBe(true);
    });
  });

  // ===========================================================================
  // Content rendering — text
  // ===========================================================================

  describe('content rendering (text)', () => {
    it('renders label', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const title = getCard(el)!.querySelector('.label')!;
      expect(title.textContent).toBe('Brooklyn Bridge');
      expect(title.getAttribute('title')).toBe('Brooklyn Bridge');
    });

    it('renders description', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const desc = getCard(el)!.querySelector('.description')!;
      expect(desc.textContent).toBe('Iconic suspension bridge spanning the East River');
      expect(desc.classList.contains('hidden')).toBe(false);
    });

    it('hides description when absent', () => {
      const el = createElement('bluebottle');
      clickElement(el);

      const desc = getCard(el)!.querySelector('.description')!;
      expect(desc.classList.contains('hidden')).toBe(true);
    });

    it('renders visit link with correct url and target', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const visit = getCard(el)!.querySelector('.visit') as HTMLAnchorElement;
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
      const el = createElement('.bridge');
      clickElement(el);

      const overlay = getOverlay(el)!;
      const prevBtn = overlay.querySelector('.nav-prev button')!;
      const nextBtn = overlay.querySelector('.nav-next button')!;
      expect(prevBtn).not.toBeNull();
      expect(nextBtn).not.toBeNull();
      expect(prevBtn.getAttribute('aria-label')).toBe('Previous');
      expect(nextBtn.getAttribute('aria-label')).toBe('Next');
    });

    it('does not render nav buttons for single-item set', () => {
      const el = createElement('.solo');
      clickElement(el);

      expect(getOverlay(el)!.querySelector('.nav')).toBeNull();
    });

    it('renders counter for multi-item set', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const counter = getCard(el)!.querySelector('.counter')!;
      expect(counter.textContent).toBe('1 / 3');
    });

    it('hides counter for single-item set', () => {
      const el = createElement('.solo');
      clickElement(el);

      const counter = getCard(el)!.querySelector('.counter')!;
      expect(counter.classList.contains('hidden')).toBe(true);
    });
  });

  // ===========================================================================
  // ::part() exposure
  // ===========================================================================

  describe('::part() exposure', () => {
    it('exposes overlay part', () => {
      const el = createElement('.bridge');
      clickElement(el);
      expect(getOverlay(el)!.getAttribute('part')).toBe('overlay');
    });

    it('exposes panel part', () => {
      const el = createElement('.bridge');
      clickElement(el);
      expect(getCard(el)!.getAttribute('part')).toBe('panel');
    });

    it('exposes image-wrap, image, label, body parts', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const card = getCard(el)!;
      expect(card.querySelector('.image-wrap')!.getAttribute('part')).toBe('image-wrap');
      expect(card.querySelector('.image')!.getAttribute('part')).toBe('image');
      expect(card.querySelector('.label')!.getAttribute('part')).toBe('label');
      expect(card.querySelector('.body')!.getAttribute('part')).toBe('body');
    });

    it('exposes counter-wrap and counter parts', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const card = getCard(el)!;
      expect(card.querySelector('.counter-wrap')!.getAttribute('part')).toBe('counter-wrap');
      expect(card.querySelector('.counter')!.getAttribute('part')).toBe('counter');
    });

    it('exposes setnav and setnav-filter parts', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const card = getCard(el)!;
      expect(card.querySelector('.setnav')!.getAttribute('part')).toBe('setnav');
      expect(card.querySelector('.setnav-filter')!.getAttribute('part')).toBe('setnav-filter');
    });

    it('exposes nav-prev and nav-next parts', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const overlay = getOverlay(el)!;
      expect(overlay.querySelector('.nav-prev')!.getAttribute('part')).toBe('nav-prev');
      expect(overlay.querySelector('.nav-next')!.getAttribute('part')).toBe('nav-next');
    });
  });

  // ===========================================================================
  // Set navigator
  // ===========================================================================

  describe('set navigator', () => {
    it('creates setnav popup for multi-item sets', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const setnav = getCard(el)!.querySelector('.setnav')!;
      expect(setnav).not.toBeNull();
      expect(setnav.getAttribute('tabindex')).toBe('-1');
    });

    it('does not create setnav for single-item sets', () => {
      const el = createElement('.solo');
      clickElement(el);
      expect(getCard(el)!.querySelector('.setnav')).toBeNull();
    });

    it('populates setnav with correct item labels', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const items = getCard(el)!.querySelectorAll('.setnav-item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('Brooklyn Bridge');
      expect(items[1].textContent).toBe('Golden Gate');
      expect(items[2].textContent).toBe('Tower Bridge');
    });

    it('setnav items have listbox/option ARIA roles', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const list = getCard(el)!.querySelector('.setnav-list')!;
      expect(list.getAttribute('role')).toBe('listbox');

      const items = list.querySelectorAll('.setnav-item');
      for (const item of items) {
        expect(item.getAttribute('role')).toBe('option');
      }
    });

    it('marks current item as active', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const items = getCard(el)!.querySelectorAll('.setnav-item');
      expect(items[0].classList.contains('active')).toBe(true);
      expect(items[1].classList.contains('active')).toBe(false);
    });

    it('opens setnav on counter click', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;
      const setnav = getCard(el)!.querySelector('.setnav')!;

      expect(setnav.classList.contains('open')).toBe(false);
      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);
    });

    it('closes setnav on second counter click', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;
      const setnav = getCard(el)!.querySelector('.setnav')!;

      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);
      counter.click();
      expect(setnav.classList.contains('open')).toBe(false);
    });

    it('shows hover hint on counter mouseenter', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const counterWrap = getCard(el)!.querySelector('.counter-wrap') as HTMLElement;
      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;

      expect(counter.textContent).toBe('1 / 3');

      counterWrap.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(counter.textContent).toBe('menu\u2026');

      counterWrap.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(counter.textContent).toBe('1 / 3');
    });

    it('has filter input with correct ARIA', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      expect(filter).not.toBeNull();
      expect(filter.getAttribute('aria-label')).toBe('Filter items');
      expect(filter.placeholder).toContain('Filter');
    });

    it('filter hides non-matching items', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      const items = getCard(el)!.querySelectorAll<HTMLElement>('.setnav-item');

      filter.value = 'Golden';
      filter.dispatchEvent(new Event('input'));

      const visible = Array.from(items).filter((item) => item.style.display !== 'none');
      expect(visible.length).toBe(1);
      expect(visible[0].textContent).toBe('Golden Gate');
    });

    it('filter shows all items when cleared', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      const items = getCard(el)!.querySelectorAll<HTMLElement>('.setnav-item');

      filter.value = 'Golden';
      filter.dispatchEvent(new Event('input'));
      filter.value = '';
      filter.dispatchEvent(new Event('input'));

      const visible = Array.from(items).filter((item) => item.style.display !== 'none');
      expect(visible.length).toBe(3);
    });

    it('filter handles invalid regex gracefully', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      filter.value = '[unclosed';
      expect(() => filter.dispatchEvent(new Event('input'))).not.toThrow();
    });

    it('clear button appears when filter has text', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      const clearBtn = getCard(el)!.querySelector('.setnav-clear') as HTMLButtonElement;

      expect(clearBtn.style.display).toBe('none');

      filter.value = 'test';
      filter.dispatchEvent(new Event('input'));
      expect(clearBtn.style.display).not.toBe('none');
    });

    it('clear button resets filter', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      const clearBtn = getCard(el)!.querySelector('.setnav-clear') as HTMLButtonElement;

      filter.value = 'Golden';
      filter.dispatchEvent(new Event('input'));
      clearBtn.click();

      expect(filter.value).toBe('');
    });

    it('Escape in setnav closes setnav, not lightbox', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;
      const setnav = getCard(el)!.querySelector('.setnav') as HTMLElement;

      counter.click();
      expect(setnav.classList.contains('open')).toBe(true);

      pressKey('Escape', setnav);
      expect(setnav.classList.contains('open')).toBe(false);
      expect(getOverlay(el)).not.toBeNull();
    });

    it('keyboard ArrowDown highlights items in setnav', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;
      const setnav = getCard(el)!.querySelector('.setnav') as HTMLElement;

      counter.click();

      pressKey('ArrowDown', setnav);
      const items = getCard(el)!.querySelectorAll('.setnav-item');
      expect(items[0].classList.contains('highlighted')).toBe(true);

      pressKey('ArrowDown', setnav);
      expect(items[0].classList.contains('highlighted')).toBe(false);
      expect(items[1].classList.contains('highlighted')).toBe(true);
    });

    it('keyboard ArrowUp moves highlight upward', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const setnav = getCard(el)!.querySelector('.setnav') as HTMLElement;
      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;

      counter.click();

      pressKey('ArrowDown', setnav);
      pressKey('ArrowDown', setnav);
      pressKey('ArrowUp', setnav);

      const items = getCard(el)!.querySelectorAll('.setnav-item');
      expect(items[0].classList.contains('highlighted')).toBe(true);
    });

    it('typing in setnav focuses filter input', () => {
      const el = createElement('.bridge');
      clickElement(el);

      const setnav = getCard(el)!.querySelector('.setnav') as HTMLElement;
      const filter = getCard(el)!.querySelector('.setnav-filter') as HTMLInputElement;
      const counter = getCard(el)!.querySelector('.counter') as HTMLElement;

      counter.click();
      setnav.focus();

      setnav.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
      expect(el.shadowRoot!.activeElement).toBe(filter);
    });
  });

  // ===========================================================================
  // Image zoom
  // ===========================================================================

  describe('image zoom', () => {
    it('opens zoom overlay on image click', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      const zoomOverlay = el.shadowRoot!.querySelector('.zoom-overlay');
      expect(zoomOverlay).not.toBeNull();
    });

    it('zoom overlay has correct image src', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      const zoomImg = el.shadowRoot!.querySelector('.zoom-image') as HTMLImageElement;
      expect(zoomImg.src).toBe(img.src);
    });

    it('zoom overlay gets visible class for fade-in', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      const zoomOverlay = el.shadowRoot!.querySelector('.zoom-overlay')!;
      expect(zoomOverlay.classList.contains('visible')).toBe(true);
    });

    it('zoom overlay exposes part attribute', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      const zoomOverlay = el.shadowRoot!.querySelector('.zoom-overlay')!;
      expect(zoomOverlay.getAttribute('part')).toBe('zoom-overlay');
    });

    it('zoom dismisses on click', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      const zoomOverlay = el.shadowRoot!.querySelector('.zoom-overlay') as HTMLElement;
      zoomOverlay.click();

      expect(el.shadowRoot!.querySelector('.zoom-overlay')).toBeNull();
    });

    it('zoom Escape closes zoom but not lightbox', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      expect(el.shadowRoot!.querySelector('.zoom-overlay')).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(el.shadowRoot!.querySelector('.zoom-overlay')).toBeNull();
      expect(getOverlay(el)).not.toBeNull();
    });

    it('does not open zoom when image is hidden (no-image item)', () => {
      const el = createElement('aqus');
      clickElement(el);

      const img = getCard(el)!.querySelector('.image') as HTMLImageElement;
      img.click();

      expect(el.shadowRoot!.querySelector('.zoom-overlay')).toBeNull();
    });
  });

  // ===========================================================================
  // Security
  // ===========================================================================

  describe('security', () => {
    it('label uses textContent, not innerHTML', () => {
      const el = createElement('xss_attempt');
      clickElement(el);

      const title = getCard(el)!.querySelector('.label')!;
      expect(title.textContent).toBe('<script>alert("xss")</script>');
      expect(title.querySelector('script')).toBeNull();
    });

    it('description uses textContent, not innerHTML', () => {
      const el = createElement('xss_attempt');
      clickElement(el);

      const desc = getCard(el)!.querySelector('.description')!;
      expect(desc.textContent).toBe('<img src=x onerror=alert(1)>');
      expect(desc.querySelector('img')).toBeNull();
    });

    it('visit link has noopener noreferrer', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const visit = getCard(el)!.querySelector('.visit') as HTMLAnchorElement;
      expect(visit.rel).toBe('noopener noreferrer');
    });

    it('credit link has noopener noreferrer', () => {
      const el = createElement('brooklyn');
      clickElement(el);

      const creditLink = getCard(el)!.querySelector('.credit a') as HTMLAnchorElement;
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

      registerConfig(xssConfig);
      const el = createElement('.xss');
      clickElement(el);

      const items = getCard(el)!.querySelectorAll('.setnav-item');
      expect(items[0].textContent).toBe('<img src=x onerror=alert(1)>');
      expect(items[0].querySelector('img')).toBeNull();
    });
  });

  // ===========================================================================
  // Macro support
  // ===========================================================================

  describe('macro support', () => {
    it('resolves macros in expressions', () => {
      const el = createElement('@favorites');
      clickElement(el);

      const items = getCard(el)!.querySelectorAll('.setnav-item');
      expect(items.length).toBe(3);
    });
  });

  // ===========================================================================
  // Disconnect cleanup
  // ===========================================================================

  describe('disconnect cleanup', () => {
    it('closes overlay on disconnect', () => {
      const el = createElement('.bridge');
      clickElement(el);
      expect(getOverlay(el)).not.toBeNull();

      el.remove();
      // disconnectedCallback calls close()
      expect(getOverlay(el)).toBeNull();
    });
  });
});
