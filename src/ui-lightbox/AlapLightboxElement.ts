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

// --- Constants ---

const DEFAULT_CONFIG_KEY = '_default';
const DEFAULT_VISIT_LABEL = 'Visit';
const DEFAULT_CLOSE_LABEL = 'Close';
const FADE_DURATION_PROP = '--alap-lightbox-transition';
const FADE_DURATION_FALLBACK = 250;

const ICON_CLOSE = '\u00d7';
const ICON_PREV = '\u2039';
const ICON_NEXT = '\u203a';

// --- Shadow DOM styles (tokenized) ---

const STYLES = `
  :host {
    display: inline;
  }

  /* --- Overlay --- */

  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--alap-lightbox-z-index, 10000);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--alap-lightbox-overlay-bg, rgba(0, 0, 0, 0.85));
    backdrop-filter: blur(var(--alap-lightbox-overlay-blur, 4px));
    opacity: 0;
    transition: opacity var(--alap-lightbox-fade, 0.5s) ease;
  }

  .overlay.visible {
    opacity: 1;
  }

  /* --- Close X --- */

  .close-x {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    background: none;
    border: none;
    color: var(--alap-lightbox-close-x-color, #fff);
    font-size: var(--alap-lightbox-close-x-size, 2rem);
    cursor: pointer;
    line-height: 1;
    opacity: var(--alap-lightbox-close-x-opacity, 0.7);
    transition: opacity var(--alap-lightbox-transition, 0.25s);
  }

  .close-x:hover {
    opacity: 1;
  }

  /* --- Card --- */

  .card {
    background: var(--alap-lightbox-bg, #1a1a2e);
    border-radius: var(--alap-lightbox-radius, 12px);
    max-width: var(--alap-lightbox-max-width, 600px);
    width: 90vw;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--alap-lightbox-shadow, 0 24px 80px rgba(0, 0, 0, 0.5));
  }

  .card.no-image {
    background: transparent;
    box-shadow: none;
  }

  /* --- Body --- */

  .body {
    display: flex;
    flex-direction: column;
    padding: var(--alap-lightbox-body-padding, 0.75rem 1.5rem 1.5rem);
  }

  .card.no-image .body {
    background: var(--alap-lightbox-bg, #1a1a2e);
    border-radius: 0 0 var(--alap-lightbox-radius, 12px) var(--alap-lightbox-radius, 12px);
  }

  /* --- Image --- */

  .image-wrap {
    width: 100%;
    height: var(--alap-lightbox-image-height, 350px);
    overflow: hidden;
    position: relative;
    background: var(--alap-lightbox-image-bg, #111);
  }

  .image-wrap.hidden {
    background: transparent;
  }

  .image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  /* --- Content parts — direct children of card --- */

  .title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .title {
    margin: 0;
    font-size: var(--alap-lightbox-title-size, 1.4rem);
    font-weight: var(--alap-lightbox-title-weight, 600);
    color: var(--alap-lightbox-title-color, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .title:hover {
    white-space: normal;
    overflow: visible;
  }

  .credit {
    font-size: var(--alap-lightbox-credit-size, 0.75rem);
    color: var(--alap-lightbox-credit-color, rgba(255, 255, 255, 0.4));
    white-space: nowrap;
    flex-shrink: 0;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .credit.hidden {
    display: none;
  }

  .credit a {
    color: var(--alap-lightbox-credit-link-color, rgba(255, 255, 255, 0.5));
    text-decoration: none;
  }

  .credit a:hover {
    color: var(--alap-lightbox-credit-link-hover, #fff);
    text-decoration: underline;
  }

  .description {
    margin: var(--alap-lightbox-desc-margin, 0.5rem 0 0);
    color: var(--alap-lightbox-desc-color, #aaa);
    font-size: var(--alap-lightbox-desc-size, 0.95rem);
    line-height: var(--alap-lightbox-desc-line-height, 1.5);
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .description.hidden {
    display: none;
  }

  .visit {
    display: block;
    width: fit-content;
    margin: var(--alap-lightbox-visit-margin, 1rem auto 0);
    padding: var(--alap-lightbox-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lightbox-visit-bg, #3a86ff);
    color: var(--alap-lightbox-visit-color, #fff);
    text-decoration: none;
    border-radius: var(--alap-lightbox-visit-radius, 6px);
    font-size: var(--alap-lightbox-visit-size, 0.9rem);
    font-weight: var(--alap-lightbox-visit-weight, 500);
    transition: background var(--alap-lightbox-transition, 0.25s);
  }

  .visit:hover {
    background: var(--alap-lightbox-visit-bg-hover, #2d6fdb);
  }

  .close-btn {
    display: none;
    width: fit-content;
    margin: var(--alap-lightbox-close-margin, 0.5rem auto 0);
    padding: var(--alap-lightbox-visit-padding, 0.5rem 1.25rem);
    background: var(--alap-lightbox-close-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lightbox-close-color, #b8c4e8);
    border: none;
    border-radius: var(--alap-lightbox-visit-radius, 6px);
    font-size: var(--alap-lightbox-visit-size, 0.9rem);
    cursor: pointer;
    transition: background var(--alap-lightbox-transition, 0.25s), color var(--alap-lightbox-transition, 0.25s);
  }

  .close-btn:hover {
    background: var(--alap-lightbox-close-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--alap-lightbox-close-color-hover, #fff);
  }

  .counter-wrap {
    position: relative;
    margin-top: var(--alap-lightbox-counter-margin, 1rem);
    text-align: center;
    z-index: 2;
  }

  .counter {
    display: block;
    color: var(--alap-lightbox-counter-color, #666);
    font-size: var(--alap-lightbox-counter-size, 0.85rem);
    cursor: default;
    transition: opacity var(--alap-lightbox-transition, 0.25s) ease;
  }

  .counter-wrap:hover .counter {
    color: var(--alap-lightbox-counter-hover-color, #aac4f0);
  }

  .counter.hidden {
    display: none;
  }

  /* --- Set navigator popup --- */

  .setnav {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 0.25rem;
    min-width: var(--alap-lightbox-setnav-min-width, 220px);
    max-width: var(--alap-lightbox-setnav-max-width, 320px);
    background: var(--alap-lightbox-setnav-bg, #1e1e3a);
    border: 1px solid var(--alap-lightbox-setnav-border, rgba(255, 255, 255, 0.1));
    border-radius: var(--alap-lightbox-setnav-radius, 8px);
    box-shadow: var(--alap-lightbox-setnav-shadow, 0 8px 32px rgba(0, 0, 0, 0.4));
    overflow: hidden;
    flex-direction: column;
    z-index: 10;
  }

  .setnav.open {
    display: flex;
  }

  .setnav:focus {
    outline: none;
  }

  .setnav-list {
    list-style: none;
    margin: 0;
    padding: var(--alap-lightbox-setnav-list-padding, 0.25rem 0);
    max-height: var(--alap-lightbox-setnav-max-height, 240px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
  }

  .setnav-item {
    padding: var(--alap-lightbox-setnav-item-padding, 0.4rem 0.75rem);
    color: var(--alap-lightbox-setnav-item-color, #d0d7e5);
    font-size: var(--alap-lightbox-setnav-item-size, 0.85rem);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s, color 0.1s;
  }

  .setnav-item:hover {
    background: var(--alap-lightbox-setnav-item-hover-bg, rgba(255, 255, 255, 0.1));
    color: var(--alap-lightbox-setnav-item-hover-color, #fff);
  }

  .setnav-item.active {
    background: var(--alap-lightbox-setnav-item-active-bg, rgba(58, 134, 255, 0.2));
    color: var(--alap-lightbox-setnav-item-active-color, #88bbff);
    font-weight: var(--alap-lightbox-setnav-item-active-weight, 600);
  }

  .setnav-item.highlighted {
    background: var(--alap-lightbox-setnav-item-highlight-bg, rgba(255, 255, 255, 0.15));
    color: var(--alap-lightbox-setnav-item-highlight-color, #fff);
  }

  .setnav-filter-wrap {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--alap-lightbox-setnav-border, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
  }

  .setnav-filter {
    flex: 1;
    padding: var(--alap-lightbox-setnav-filter-padding, 0.5rem 0.75rem);
    background: var(--alap-lightbox-setnav-filter-bg, rgba(255, 255, 255, 0.05));
    border: none;
    color: var(--alap-lightbox-setnav-filter-color, #fff);
    font-size: var(--alap-lightbox-setnav-filter-size, 0.8rem);
    outline: none;
  }

  .setnav-filter::placeholder {
    color: var(--alap-lightbox-setnav-placeholder-color, rgba(255, 255, 255, 0.3));
  }

  .setnav-clear {
    background: none;
    border: none;
    color: var(--alap-lightbox-setnav-clear-color, rgba(255, 255, 255, 0.4));
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    transition: color 0.1s;
  }

  .setnav-clear:hover {
    color: var(--alap-lightbox-setnav-clear-hover-color, #fff);
  }

  /* --- Image zoom popup --- */

  .zoom-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    opacity: 0;
    transition: opacity 0.2s ease;
    cursor: zoom-out;
  }

  .zoom-overlay.visible {
    opacity: 1;
  }

  .zoom-image {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
  }

  /* --- Navigation --- */

  .nav {
    position: absolute;
    top: calc(50% + 9.5rem);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .overlay:hover .nav {
    opacity: 1;
  }

  .nav button {
    background: var(--alap-lightbox-nav-bg, rgba(255, 255, 255, 0.1));
    border: none;
    color: var(--alap-lightbox-nav-color, #fff);
    font-size: var(--alap-lightbox-nav-icon-size, 2rem);
    cursor: pointer;
    line-height: 1;
    width: var(--alap-lightbox-nav-btn-size, 48px);
    height: var(--alap-lightbox-nav-btn-size, 48px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--alap-lightbox-transition, 0.25s);
  }

  .nav button:hover {
    background: var(--alap-lightbox-nav-bg-hover, rgba(255, 255, 255, 0.2));
  }

  .nav-prev {
    left: var(--alap-lightbox-nav-offset, calc(50% - 340px));
  }

  .nav-next {
    right: var(--alap-lightbox-nav-offset, calc(50% - 340px));
  }

  /* --- Fade transition --- */

  .fading .image,
  .fading .title,
  .fading .credit,
  .fading .description,
  .fading .counter {
    opacity: 0;
  }
`;

// ---------- The custom element ----------

export class AlapLightboxElement extends HTMLElement {
  private overlay: HTMLElement | null = null;
  private links: ResolvedLink[] = [];
  private currentIndex = 0;
  private isOpen = false;
  private justClosed = false;

  private handleKeydown: (e: KeyboardEvent) => void;
  private handleDocumentClick: (e: MouseEvent) => void;

  static get observedAttributes(): string[] {
    return ['query', 'config'];
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

    this.render();
    this.shadowRoot!.appendChild(this.overlay);

    // Fade in — force reflow so the browser registers opacity:0 before transitioning
    void this.overlay.offsetHeight;
    this.overlay.classList.add('visible');

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

    // Fade out, then remove
    overlay.classList.remove('visible');
    const duration = parseFloat(getComputedStyle(overlay).transitionDuration);
    if (duration > 0) {
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    } else {
      overlay.remove();
    }
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
    card.className = 'card';
    card.setAttribute('part', 'card');

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
    titleRow.className = 'title-row';
    titleRow.setAttribute('part', 'title-row');

    const title = document.createElement('h2');
    title.className = 'title';
    title.setAttribute('part', 'title');
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
      const setNav = document.createElement('div');
      setNav.className = 'setnav';
      setNav.setAttribute('part', 'setnav');
      setNav.setAttribute('tabindex', '-1');

      const setList = document.createElement('ul');
      setList.className = 'setnav-list';
      setList.setAttribute('role', 'listbox');

      for (let i = 0; i < this.links.length; i++) {
        const item = this.links[i];
        const li = document.createElement('li');
        li.className = 'setnav-item';
        li.setAttribute('role', 'option');
        li.setAttribute('data-index', String(i));
        li.textContent = item.label ?? item.id;
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          this.jumpTo(i);
        });
        setList.appendChild(li);
      }

      setNav.appendChild(setList);

      // Filter input
      const filterWrap = document.createElement('div');
      filterWrap.className = 'setnav-filter-wrap';

      const filterInput = document.createElement('input');
      filterInput.className = 'setnav-filter';
      filterInput.setAttribute('part', 'setnav-filter');
      filterInput.type = 'text';
      filterInput.placeholder = 'Filter\u2026';
      filterInput.setAttribute('aria-label', 'Filter items');
      filterWrap.appendChild(filterInput);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'setnav-clear';
      clearBtn.setAttribute('aria-label', 'Clear filter');
      clearBtn.textContent = ICON_CLOSE;
      clearBtn.style.display = 'none';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterInput.value = '';
        filterInput.dispatchEvent(new Event('input'));
        filterInput.focus();
      });
      filterWrap.appendChild(clearBtn);

      setNav.appendChild(filterWrap);
      counterWrap.appendChild(setNav);

      const counterLabel = () => `${this.currentIndex + 1} / ${this.links.length}`;

      const hideNav = () => {
        setNav.classList.remove('open');
        counterText.textContent = counterLabel();
        filterInput.value = '';
        filterInput.dispatchEvent(new Event('input'));
      };

      // Setnav keydown — Escape closes popup, typing focuses filter
      setNav.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          hideNav();
          return;
        }
        if (document.activeElement === filterInput || this.shadowRoot?.activeElement === filterInput) return;
        if (handleNavKeys(e)) return;
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          filterInput.focus();
        }
      });

      // Hover hints
      counterText.style.cursor = 'pointer';
      counterWrap.addEventListener('mouseenter', () => {
        if (!setNav.classList.contains('open')) {
          counterText.textContent = 'menu\u2026';
        }
      });
      counterWrap.addEventListener('mouseleave', () => {
        if (!setNav.classList.contains('open')) {
          counterText.textContent = counterLabel();
        }
      });

      // Click-to-open counter
      counterText.addEventListener('click', (e) => {
        e.stopPropagation();
        if (setNav.classList.contains('open')) {
          hideNav();
        } else {
          setNav.classList.add('open');
          setNav.focus();
        }
      });

      // Dismiss delay on mouseleave
      let dismissTimer: ReturnType<typeof setTimeout> | null = null;
      const DISMISS_DELAY = 300;

      setNav.addEventListener('mouseleave', () => {
        if (dismissTimer) clearTimeout(dismissTimer);
        dismissTimer = setTimeout(hideNav, DISMISS_DELAY);
      });
      setNav.addEventListener('mouseenter', () => {
        if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
      });

      // Filter — greedy regex match against label/id
      filterInput.addEventListener('input', () => {
        const raw = filterInput.value.trim();
        clearBtn.style.display = raw ? '' : 'none';

        const items = setList.querySelectorAll<HTMLElement>('.setnav-item');
        if (!raw) {
          for (const item of items) item.style.display = '';
          return;
        }

        let re: RegExp;
        try {
          re = new RegExp(raw, 'i');
        } catch {
          re = new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }

        for (const item of items) {
          const idx = Number(item.getAttribute('data-index'));
          const link = this.links[idx];
          const searchable = link.label ?? link.id;
          item.style.display = re.test(searchable) ? '' : 'none';
        }
      });

      // Keyboard navigation
      let highlightIdx = -1;

      const getVisibleItems = (): HTMLElement[] =>
        Array.from(setList.querySelectorAll<HTMLElement>('.setnav-item'))
          .filter((el) => el.style.display !== 'none');

      const updateHighlight = (visible: HTMLElement[]) => {
        for (const item of setList.querySelectorAll<HTMLElement>('.setnav-item')) {
          item.classList.remove('highlighted');
        }
        if (highlightIdx >= 0 && highlightIdx < visible.length) {
          visible[highlightIdx].classList.add('highlighted');
          visible[highlightIdx].scrollIntoView({ block: 'nearest' });
        }
      };

      const handleNavKeys = (e: KeyboardEvent): boolean => {
        const visible = getVisibleItems();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          highlightIdx = Math.min(highlightIdx + 1, visible.length - 1);
          updateHighlight(visible);
          return true;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          highlightIdx = Math.max(highlightIdx - 1, 0);
          updateHighlight(visible);
          return true;
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = highlightIdx >= 0 ? highlightIdx : (visible.length === 1 ? 0 : -1);
          if (target >= 0 && target < visible.length) {
            const idx = Number(visible[target].getAttribute('data-index'));
            this.jumpTo(idx);
          }
          return true;
        }
        return false;
      };

      // Reset highlight when filter changes
      filterInput.addEventListener('input', () => {
        highlightIdx = -1;
      });

      filterInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (handleNavKeys(e)) return;
        if (e.key === 'Escape') hideNav();
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

    const card = this.overlay.querySelector('.card') as HTMLElement;
    const imageWrap = card.querySelector('.image-wrap') as HTMLElement;
    const img = imageWrap.querySelector('.image') as HTMLImageElement;
    const title = card.querySelector('.title') as HTMLElement;
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

    // Counter
    const counter = card.querySelector('.counter') as HTMLElement;
    if (total > 1) {
      counter.textContent = `${this.currentIndex + 1} / ${total}`;
      counter.classList.remove('hidden');
    } else {
      counter.classList.add('hidden');
    }

    // Highlight active item in set navigator
    const setNavItems = card.querySelectorAll<HTMLElement>('.setnav-item');
    for (const item of setNavItems) {
      const idx = Number(item.getAttribute('data-index'));
      item.classList.toggle('active', idx === this.currentIndex);
    }
  }

  // --- Navigation ---

  private jumpTo(index: number): void {
    if (index === this.currentIndex) return;
    const card = this.overlay?.querySelector('.card') as HTMLElement | null;
    if (!card) return;

    card.classList.add('fading');
    const raw = getComputedStyle(card).getPropertyValue(FADE_DURATION_PROP);
    const duration = parseFloat(raw) * 1000;
    const ms = Number.isFinite(duration) && duration > 0 ? duration : FADE_DURATION_FALLBACK;

    setTimeout(() => {
      this.currentIndex = index;
      this.update();
      card.classList.remove('fading');
    }, ms);
  }

  private navigate(delta: number): void {
    const card = this.overlay?.querySelector('.card') as HTMLElement | null;
    if (!card) return;

    card.classList.add('fading');

    const raw = getComputedStyle(card).getPropertyValue(FADE_DURATION_PROP);
    const duration = parseFloat(raw) * 1000;
    const ms = Number.isFinite(duration) && duration > 0 ? duration : FADE_DURATION_FALLBACK;

    setTimeout(() => {
      this.currentIndex = (this.currentIndex + delta + this.links.length) % this.links.length;
      this.update();
      card.classList.remove('fading');
    }, ms);
  }

  // --- Keyboard ---

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowLeft') {
      this.navigate(-1);
    } else if (e.key === 'ArrowRight') {
      this.navigate(1);
    }
  }

  // --- Image zoom ---

  private openZoom(src: string): void {
    const zoomOverlay = document.createElement('div');
    zoomOverlay.className = 'zoom-overlay';
    zoomOverlay.setAttribute('part', 'zoom-overlay');

    const zoomImg = document.createElement('img');
    zoomImg.className = 'zoom-image';
    zoomImg.src = src;

    const dismissZoom = () => {
      document.removeEventListener('keydown', zoomKeyHandler, true);
      zoomOverlay.classList.remove('visible');
      const dur = parseFloat(getComputedStyle(zoomOverlay).transitionDuration);
      if (dur > 0) {
        zoomOverlay.addEventListener('transitionend', () => zoomOverlay.remove(), { once: true });
      } else {
        zoomOverlay.remove();
      }
    };

    const zoomKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        dismissZoom();
      }
    };

    zoomOverlay.addEventListener('click', dismissZoom);
    document.addEventListener('keydown', zoomKeyHandler, true);

    this.shadowRoot!.appendChild(zoomOverlay);
    zoomOverlay.appendChild(zoomImg);

    void zoomOverlay.offsetHeight;
    zoomOverlay.classList.add('visible');
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
