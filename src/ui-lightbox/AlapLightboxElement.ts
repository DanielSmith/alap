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

import type { ResolvedLink } from '../core/types';
import { warn } from '../core/logger';
import { getEngine, getConfig } from '../ui/shared/configRegistry';
import { handleOverlayKeydown } from '../ui/shared/overlayKeyboard';
import { fadeIn, fadeOut } from '../ui/shared/overlayTransition';
import { openImageZoom } from '../ui/shared/imageZoom';
import { OVERLAY_ALIGN, OVERLAY_JUSTIFY } from '../ui/shared/overlayPlacement';
import { createSetNavigator } from '../ui/shared/setNavigator';
import type { SetNavHandle } from '../ui/shared/setNavigator';
import { STYLES } from './lightbox-element.css';

// --- Constants ---

const DEFAULT_CONFIG_KEY = '_default';
const DEFAULT_VISIT_LABEL = 'Visit';
const DEFAULT_CLOSE_LABEL = 'Close';
const FADE_DURATION_PROP = '--alap-lightbox-transition';
const FADE_DURATION_FALLBACK = 250;

const ICON_CLOSE = '\u00d7';
const ICON_PREV = '\u2039';
const ICON_NEXT = '\u203a';

// Shadow DOM styles imported from ./lightbox-element.css.ts

// ---------- The custom element ----------

export class AlapLightboxElement extends HTMLElement {
  private overlay: HTMLElement | null = null;
  private links: ResolvedLink[] = [];
  private currentIndex = 0;
  private isOpen = false;
  private justClosed = false;
  private transitioning = false;
  private pendingDelta: number | null = null;
  private rapidMode = false;
  private rapidResetTimer: ReturnType<typeof setTimeout> | null = null;
  private setNavHandle: SetNavHandle | null = null;

  private handleKeydown: (e: KeyboardEvent) => void;
  private handleDocumentClick: (e: MouseEvent) => void;

  static get observedAttributes(): string[] {
    return ['query', 'config', 'placement'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const slot = document.createElement('slot');
    shadow.appendChild(slot);

    this.handleKeydown = this.onKeydown.bind(this);
    this.handleDocumentClick = this.onDocumentClick.bind(this);
  }

  connectedCallback(): void {
    if (!this.getAttribute('role')) {
      this.setAttribute('role', 'button');
    }
    this.setAttribute('aria-haspopup', 'dialog');
    if (!this.getAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.addEventListener('click', this.onTriggerClick);
    this.addEventListener('keydown', this.onTriggerKeydown);
  }

  disconnectedCallback(): void {
    this.close();
    this.removeEventListener('click', this.onTriggerClick);
    this.removeEventListener('keydown', this.onTriggerKeydown);
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue && this.isOpen) {
      this.close();
    }
  }

  // --- Attribute helpers ---

  private get placement(): string | null {
    return this.getAttribute('placement');
  }

  // --- Trigger ---

  private onTriggerClick = (event: MouseEvent): void => {
    // Ignore clicks from inside the overlay (close-x, nav, card, backdrop)
    if (this.overlay && event.composedPath().includes(this.overlay)) return;

    // Guard against close-then-reopen in the same click event
    if (this.justClosed) {
      this.justClosed = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const query = this.getAttribute('query');
    if (!query) return;

    const configName = this.getAttribute('config') ?? DEFAULT_CONFIG_KEY;
    const engine = getEngine(configName);
    if (!engine) {
      warn(`<alap-lightbox>: no config registered for "${configName}". Call registerConfig() first.`);
      return;
    }

    const anchorId = this.id || undefined;
    this.links = engine.resolve(query, anchorId);
    if (this.links.length === 0) return;

    this.currentIndex = 0;
    this.open();
  };

  private onTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.click();
    }
  };

  // --- Open / Close ---

  private open(): void {
    this.close();

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    this.overlay.setAttribute('part', 'overlay');
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Link preview');

    const p = this.placement;
    if (p && p in OVERLAY_ALIGN) {
      this.overlay.style.alignItems = OVERLAY_ALIGN[p as keyof typeof OVERLAY_ALIGN];
      this.overlay.style.justifyContent = OVERLAY_JUSTIFY[p as keyof typeof OVERLAY_JUSTIFY];
    }

    this.render();
    fadeIn(this.overlay, this.shadowRoot!, 'visible');

    this.isOpen = true;
    this.setAttribute('aria-expanded', 'true');

    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('click', this.handleDocumentClick);
  }

  close(): void {
    if (!this.overlay) return;

    const overlay = this.overlay;
    this.overlay = null;
    this.isOpen = false;
    this.justClosed = true;
    requestAnimationFrame(() => { this.justClosed = false; });

    fadeOut(overlay, 'visible');
    this.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleDocumentClick);
  }

  // --- Rendering ---

  private render(): void {
    if (!this.overlay) return;
    this.overlay.innerHTML = '';

    // Close X (overlay-level)
    const closeX = this.createButton('close-x', ICON_CLOSE, 'Close', () => this.close());
    closeX.setAttribute('part', 'close-x');
    this.overlay.appendChild(closeX);

    // Card
    const card = document.createElement('div');
    card.className = 'panel';
    card.setAttribute('part', 'panel');

    // Image wrap
    const imageWrap = document.createElement('div');
    imageWrap.className = 'image-wrap';
    imageWrap.setAttribute('part', 'image-wrap');
    const img = document.createElement('img');
    img.className = 'image';
    img.setAttribute('part', 'image');
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (img.src) this.openZoom(img.src);
    });
    imageWrap.appendChild(img);
    card.appendChild(imageWrap);

    // Body — groups text content, provides background for no-image cards
    const body = document.createElement('div');
    body.className = 'body';
    body.setAttribute('part', 'body');

    const titleRow = document.createElement('div');
    titleRow.className = 'label-row';
    titleRow.setAttribute('part', 'label-row');

    const title = document.createElement('h2');
    title.className = 'label';
    title.setAttribute('part', 'label');
    titleRow.appendChild(title);

    const credit = document.createElement('span');
    credit.className = 'credit';
    credit.setAttribute('part', 'credit');
    titleRow.appendChild(credit);

    body.appendChild(titleRow);

    const desc = document.createElement('p');
    desc.className = 'description';
    desc.setAttribute('part', 'description');
    body.appendChild(desc);

    const visitBtn = document.createElement('a');
    visitBtn.className = 'visit';
    visitBtn.setAttribute('part', 'visit');
    visitBtn.rel = 'noopener noreferrer';
    body.appendChild(visitBtn);

    const closeBtn = this.createButton('close-btn', DEFAULT_CLOSE_LABEL, 'Close', () => this.close());
    closeBtn.setAttribute('part', 'close-btn');
    body.appendChild(closeBtn);

    // Counter + set navigator
    const counterWrap = document.createElement('div');
    counterWrap.className = 'counter-wrap';
    counterWrap.setAttribute('part', 'counter-wrap');

    const counterText = document.createElement('span');
    counterText.className = 'counter';
    counterText.setAttribute('part', 'counter');
    counterWrap.appendChild(counterText);

    if (this.links.length > 1) {
      this.setNavHandle = createSetNavigator({
        counterWrap,
        counterText,
        links: this.links,
        currentIndex: this.currentIndex,
        onJump: (i) => this.jumpTo(i),
        css: {
          setnav: 'setnav',
          list: 'setnav-list',
          item: 'setnav-item',
          filterWrap: 'setnav-filter-wrap',
          filter: 'setnav-filter',
          clear: 'setnav-clear',
        },
        closeIcon: ICON_CLOSE,
        hoverHint: 'swap',
        parts: { setnav: 'setnav', filter: 'setnav-filter' },
        getActiveElement: () => this.shadowRoot?.activeElement ?? null,
      });
    }

    body.appendChild(counterWrap);

    card.appendChild(body);
    this.overlay.appendChild(card);

    // Navigation
    if (this.links.length > 1) {
      const prevZone = document.createElement('div');
      prevZone.className = 'nav nav-prev';
      prevZone.setAttribute('part', 'nav-prev');
      const prevBtn = this.createButton('', ICON_PREV, 'Previous', () => this.navigate(-1));
      prevZone.appendChild(prevBtn);
      this.overlay.appendChild(prevZone);

      const nextZone = document.createElement('div');
      nextZone.className = 'nav nav-next';
      nextZone.setAttribute('part', 'nav-next');
      const nextBtn = this.createButton('', ICON_NEXT, 'Next', () => this.navigate(1));
      nextZone.appendChild(nextBtn);
      this.overlay.appendChild(nextZone);
    }

    // Overlay click-to-close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.update();
  }

  /** Swap dynamic content — no DOM destruction */
  private update(): void {
    if (!this.overlay) return;

    const link = this.links[this.currentIndex];
    const total = this.links.length;
    const hasImage = !!(link.image || link.thumbnail);

    const card = this.overlay.querySelector('.panel') as HTMLElement;
    const imageWrap = card.querySelector('.image-wrap') as HTMLElement;
    const img = imageWrap.querySelector('.image') as HTMLImageElement;
    const title = card.querySelector('.label') as HTMLElement;
    const credit = card.querySelector('.credit') as HTMLElement;
    const desc = card.querySelector('.description') as HTMLElement;
    const visitBtn = card.querySelector('.visit') as HTMLAnchorElement;

    // Image
    if (hasImage) {
      img.src = link.image ?? link.thumbnail!;
      img.alt = link.altText ?? link.label ?? '';
      img.style.display = '';
      imageWrap.classList.remove('hidden');
      card.classList.remove('no-image');
    } else {
      img.style.display = 'none';
      imageWrap.classList.add('hidden');
      card.classList.add('no-image');
    }

    // Title
    title.textContent = link.label ?? '';
    title.title = link.label ?? '';

    // Photo credit
    const photoCredit = link.meta?.photoCredit as string | undefined;
    const photoCreditUrl = link.meta?.photoCreditUrl as string | undefined;
    credit.innerHTML = '';
    if (photoCredit && hasImage) {
      if (photoCreditUrl) {
        const creditLink = document.createElement('a');
        creditLink.href = photoCreditUrl;
        creditLink.target = '_blank';
        creditLink.rel = 'noopener noreferrer';
        creditLink.textContent = `Photo: ${photoCredit}`;
        credit.appendChild(creditLink);
      } else {
        credit.textContent = `Photo: ${photoCredit}`;
      }
      credit.classList.remove('hidden');
    } else {
      credit.classList.add('hidden');
    }

    // Description
    if (link.description) {
      desc.textContent = link.description;
      desc.classList.remove('hidden');
    } else {
      desc.classList.add('hidden');
    }

    // Visit
    visitBtn.href = link.url;
    visitBtn.target = link.targetWindow ?? '_blank';
    visitBtn.textContent = DEFAULT_VISIT_LABEL;

    // Counter + set navigator
    if (this.setNavHandle) {
      this.setNavHandle.updateCounter(this.currentIndex, total);
      this.setNavHandle.setActive(this.currentIndex);
    } else {
      const counter = card.querySelector('.counter') as HTMLElement;
      if (total > 1) {
        counter.textContent = `${this.currentIndex + 1} / ${total}`;
        counter.classList.remove('hidden');
      } else {
        counter.classList.add('hidden');
      }
    }
  }

  // --- Navigation ---

  private jumpTo(index: number): void {
    if (index === this.currentIndex || this.transitioning) return;
    const card = this.overlay?.querySelector('.panel') as HTMLElement | null;
    if (!card) return;

    this.transitioning = true;
    card.classList.add('fading');
    const raw = getComputedStyle(card).getPropertyValue(FADE_DURATION_PROP);
    const duration = parseFloat(raw) * 1000;
    const ms = Number.isFinite(duration) && duration > 0 ? duration : FADE_DURATION_FALLBACK;

    setTimeout(() => {
      this.currentIndex = index;
      this.update();
      card.classList.remove('fading');
      this.transitioning = false;
    }, ms);
  }

  private markRapid(): void {
    if (this.rapidResetTimer !== null) clearTimeout(this.rapidResetTimer);
    this.rapidResetTimer = setTimeout(() => {
      this.rapidMode = false;
      this.rapidResetTimer = null;
    }, 1000);
  }

  private navigate(delta: number): void {
    if (this.transitioning) {
      this.pendingDelta = delta;
      this.markRapid();
      return;
    }

    this.markRapid();

    const card = this.overlay?.querySelector('.panel') as HTMLElement | null;
    if (!card) return;

    this.transitioning = true;
    card.classList.add('fading');

    const raw = getComputedStyle(card).getPropertyValue(FADE_DURATION_PROP);
    const full = parseFloat(raw) * 1000;
    const ms = Number.isFinite(full) && full > 0 ? full : FADE_DURATION_FALLBACK;
    const duration = this.rapidMode ? ms / 2 : ms;

    setTimeout(() => {
      this.currentIndex = (this.currentIndex + delta + this.links.length) % this.links.length;
      this.update();
      card.classList.remove('fading');
      this.transitioning = false;
      this.rapidMode = true;
      if (this.pendingDelta !== null) {
        const next = this.pendingDelta;
        this.pendingDelta = null;
        this.navigate(next);
      }
    }, duration);
  }

  // --- Keyboard ---

  private onKeydown(e: KeyboardEvent): void {
    handleOverlayKeydown(e, {
      close: () => this.close(),
      prev: () => this.navigate(-1),
      next: () => this.navigate(1),
    });
  }

  // --- Image zoom ---

  private openZoom(src: string): void {
    openImageZoom({
      container: this.shadowRoot!,
      src,
      overlayClass: 'zoom-overlay',
      imageClass: 'zoom-image',
      visibleClass: 'visible',
      overlayPart: 'zoom-overlay',
    });
  }

  // --- Outside click ---
  // Dismiss is handled by the overlay's own click handler (line in render()).
  // Clicks on the backdrop hit the overlay directly; clicks on the card
  // don't because e.target !== overlay.

  private onDocumentClick(_event: MouseEvent): void {
    // Reserved for future cross-component coordination.
    // The overlay backdrop click handles dismiss for now.
  }

  // --- Utilities ---

  private createButton(className: string, text: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    if (className) btn.className = className;
    btn.setAttribute('aria-label', ariaLabel);
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }
}

/**
 * Define the custom element. Call this once at startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function defineAlapLightbox(tagName = 'alap-lightbox'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, AlapLightboxElement);
  }
}
