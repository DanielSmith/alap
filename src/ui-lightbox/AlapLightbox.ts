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

import { AlapEngine } from '../core/AlapEngine';
import type { AlapConfig, ResolvedLink } from '../core/types';
import { RENDERER_LIGHTBOX } from '../ui/shared/coordinatedRenderer';
import type { CoordinatedRenderer, OpenPayload } from '../ui/shared/coordinatedRenderer';

export interface AlapLightboxOptions {
  /** CSS selector for trigger elements. Default: '.alap' */
  selector?: string;
}

/**
 * Alternate renderer that presents resolved links as a fullscreen
 * lightbox/carousel instead of a dropdown menu.
 *
 * Same contract as AlapUI: takes an AlapConfig, binds to trigger
 * elements, resolves expressions via AlapEngine. The only difference
 * is how results are presented.
 */
export class AlapLightbox implements CoordinatedRenderer {
  readonly rendererType = RENDERER_LIGHTBOX;

  private engine: AlapEngine;
  private selector: string;
  private overlay: HTMLElement | null = null;
  private links: ResolvedLink[] = [];
  private currentIndex = 0;
  private activeTrigger: HTMLElement | null = null;

  private handleKeydown: (e: KeyboardEvent) => void;

  constructor(config: AlapConfig, options: AlapLightboxOptions = {}) {
    this.engine = new AlapEngine(config);
    this.selector = options.selector ?? '.alap';
    this.handleKeydown = this.onKeydown.bind(this);
    this.init();
  }

  private init(): void {
    const triggers = document.querySelectorAll<HTMLElement>(this.selector);
    for (const trigger of triggers) {
      trigger.addEventListener('click', (e) => this.onTriggerClick(e, trigger));
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', trigger.getAttribute('tabindex') ?? '0');
    }
  }

  private onTriggerClick(event: MouseEvent, trigger: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();

    const expression = trigger.getAttribute('data-alap-linkitems');
    if (!expression) return;

    const anchorId = trigger.id || undefined;
    this.links = this.engine.resolve(expression, anchorId);
    if (this.links.length === 0) return;

    this.currentIndex = 0;
    this.open();
    this.activeTrigger = trigger;
  }

  // --- CoordinatedRenderer ---

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  openWith(payload: OpenPayload): void {
    if (payload.links.length === 0) return;
    this.links = payload.links;
    this.currentIndex = payload.initialIndex ?? 0;
    this.open();
    this.activeTrigger = payload.triggerElement ?? null;
  }

  private open(): void {
    this.close();

    this.overlay = document.createElement('div');
    this.overlay.className = 'alap-lightbox-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'Link preview');

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.render();
    document.body.appendChild(this.overlay);

    // Fade in
    void this.overlay.offsetHeight;
    this.overlay.classList.add('alap-lightbox-visible');

    document.addEventListener('keydown', this.handleKeydown);
  }

  close(): HTMLElement | null {
    const trigger = this.activeTrigger;
    if (this.overlay) {
      const overlay = this.overlay;
      this.overlay = null;

      // Fade out, then remove
      overlay.classList.remove('alap-lightbox-visible');
      const duration = parseFloat(getComputedStyle(overlay).transitionDuration);
      if (duration > 0) {
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      } else {
        overlay.remove();
      }
    }
    document.removeEventListener('keydown', this.handleKeydown);
    this.activeTrigger = null;
    return trigger;
  }

  /** Build the skeleton once — called on open */
  private render(): void {
    if (!this.overlay) return;

    this.overlay.innerHTML = '';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'alap-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => this.close());
    this.overlay.appendChild(closeBtn);

    // Content card
    const card = document.createElement('div');
    card.className = 'alap-lightbox-card';

    // Image area
    const imageWrap = document.createElement('div');
    imageWrap.className = 'alap-lightbox-image-wrap';
    const img = document.createElement('img');
    img.className = 'alap-lightbox-image';
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (img.src) this.openZoom(img.src);
    });
    imageWrap.appendChild(img);
    card.appendChild(imageWrap);

    const body = document.createElement('div');
    body.className = 'alap-lightbox-body';

    // Title row
    const titleRow = document.createElement('div');
    titleRow.className = 'alap-lightbox-title-row';
    const title = document.createElement('h2');
    title.className = 'alap-lightbox-title';
    titleRow.appendChild(title);
    const creditEl = document.createElement('span');
    creditEl.className = 'alap-lightbox-credit';
    titleRow.appendChild(creditEl);
    body.appendChild(titleRow);

    const desc = document.createElement('p');
    desc.className = 'alap-lightbox-description';
    body.appendChild(desc);

    const visitBtn = document.createElement('a');
    visitBtn.rel = 'noopener noreferrer';
    visitBtn.className = 'alap-lightbox-visit';
    visitBtn.textContent = 'Visit';
    body.appendChild(visitBtn);

    // Counter + set navigator
    const counterWrap = document.createElement('div');
    counterWrap.className = 'alap-lightbox-counter-wrap';

    const counterText = document.createElement('span');
    counterText.className = 'alap-lightbox-counter';
    counterWrap.appendChild(counterText);

    if (this.links.length > 1) {
      const setNav = document.createElement('div');
      setNav.className = 'alap-lightbox-setnav';

      const setList = document.createElement('ul');
      setList.className = 'alap-lightbox-setnav-list';
      setList.setAttribute('role', 'listbox');

      for (let i = 0; i < this.links.length; i++) {
        const item = this.links[i];
        const li = document.createElement('li');
        li.className = 'alap-lightbox-setnav-item';
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

      // Filter input — below the menu so it stays in a fixed position
      const filterWrap = document.createElement('div');
      filterWrap.className = 'alap-lightbox-setnav-filter-wrap';

      const filterInput = document.createElement('input');
      filterInput.className = 'alap-lightbox-setnav-filter';
      filterInput.type = 'text';
      filterInput.placeholder = 'Filter\u2026';
      filterInput.setAttribute('aria-label', 'Filter items');
      filterWrap.appendChild(filterInput);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'alap-lightbox-setnav-clear';
      clearBtn.setAttribute('aria-label', 'Clear filter');
      clearBtn.textContent = '\u00d7';
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

      // Make setnav focusable so it can capture keystrokes directly
      setNav.setAttribute('tabindex', '-1');

      const counterLabel = () => `${this.currentIndex + 1} / ${this.links.length}`;

      const hideNav = () => {
        setNav.classList.remove('open');
        counterText.textContent = counterLabel();
        filterInput.value = '';
        filterInput.dispatchEvent(new Event('input'));
      };

      setNav.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          hideNav();
          return;
        }
        if (document.activeElement === filterInput) return;
        if (handleNavKeys(e)) return;
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          filterInput.focus();
        }
      });

      // Hover hints "menu...", click opens the popup
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
      counterText.addEventListener('click', (e) => {
        e.stopPropagation();
        if (setNav.classList.contains('open')) {
          hideNav();
        } else {
          setNav.classList.add('open');
          setNav.focus();
        }
      });

      // Dismiss delay when leaving the open popup so mouse can cross gaps
      let dismissTimer: ReturnType<typeof setTimeout> | null = null;
      const DISMISS_DELAY = 300;

      setNav.addEventListener('mouseleave', () => {
        if (dismissTimer) clearTimeout(dismissTimer);
        dismissTimer = setTimeout(hideNav, DISMISS_DELAY);
      });
      setNav.addEventListener('mouseenter', () => {
        if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
      });

      // Greedy regex filter — matches against label, id, tags, description
      filterInput.addEventListener('input', () => {
        const raw = filterInput.value.trim();
        clearBtn.style.display = raw ? '' : 'none';

        const items = setList.querySelectorAll<HTMLElement>('.alap-lightbox-setnav-item');
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

      // Keyboard navigation — shared by setnav and filter keydown
      let highlightIdx = -1;

      const getVisibleItems = (): HTMLElement[] =>
        Array.from(setList.querySelectorAll<HTMLElement>('.alap-lightbox-setnav-item'))
          .filter((el) => el.style.display !== 'none');

      const updateHighlight = (visible: HTMLElement[]) => {
        for (const item of setList.querySelectorAll<HTMLElement>('.alap-lightbox-setnav-item')) {
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

    // Navigation zones
    if (this.links.length > 1) {
      const prevZone = document.createElement('div');
      prevZone.className = 'alap-lightbox-nav alap-lightbox-nav-prev';
      const prevBtn = document.createElement('button');
      prevBtn.setAttribute('aria-label', 'Previous');
      prevBtn.textContent = '\u2039';
      prevBtn.addEventListener('click', () => this.navigate(-1));
      prevZone.appendChild(prevBtn);
      this.overlay.appendChild(prevZone);

      const nextZone = document.createElement('div');
      nextZone.className = 'alap-lightbox-nav alap-lightbox-nav-next';
      const nextBtn = document.createElement('button');
      nextBtn.setAttribute('aria-label', 'Next');
      nextBtn.textContent = '\u203a';
      nextBtn.addEventListener('click', () => this.navigate(1));
      nextZone.appendChild(nextBtn);
      this.overlay.appendChild(nextZone);
    }

    this.update();
  }

  /** Swap only the dynamic content — no DOM destruction */
  private update(): void {
    if (!this.overlay) return;

    const link = this.links[this.currentIndex];
    const total = this.links.length;
    const hasImage = !!(link.image || link.thumbnail);

    const card = this.overlay.querySelector('.alap-lightbox-card') as HTMLElement;
    const imageWrap = card.querySelector('.alap-lightbox-image-wrap') as HTMLElement;
    const img = imageWrap.querySelector('.alap-lightbox-image') as HTMLImageElement;
    const title = card.querySelector('.alap-lightbox-title') as HTMLElement;
    const creditEl = card.querySelector('.alap-lightbox-credit') as HTMLElement;
    const desc = card.querySelector('.alap-lightbox-description') as HTMLElement;
    const visitBtn = card.querySelector('.alap-lightbox-visit') as HTMLAnchorElement;
    const counter = card.querySelector('.alap-lightbox-counter') as HTMLElement;

    // Image
    if (hasImage) {
      img.src = link.image ?? link.thumbnail!;
      img.alt = link.altText ?? link.label ?? '';
      img.style.display = '';
      imageWrap.classList.remove('no-image');
      card.style.background = '';
    } else {
      img.style.display = 'none';
      imageWrap.classList.add('no-image');
      card.style.background = 'transparent';
    }

    // Title
    title.textContent = link.label ?? '';
    title.title = link.label ?? '';

    // Photo credit
    const credit = link.meta?.photoCredit as string | undefined;
    const creditUrl = link.meta?.photoCreditUrl as string | undefined;
    creditEl.innerHTML = '';
    if (credit && hasImage) {
      if (creditUrl) {
        const creditLink = document.createElement('a');
        creditLink.href = creditUrl;
        creditLink.target = '_blank';
        creditLink.rel = 'noopener noreferrer';
        creditLink.textContent = `Photo: ${credit}`;
        creditEl.appendChild(creditLink);
      } else {
        creditEl.textContent = `Photo: ${credit}`;
      }
    }

    // Description
    desc.textContent = link.description ?? '';
    desc.style.display = link.description ? '' : 'none';

    // Visit
    visitBtn.href = link.url;
    visitBtn.target = link.targetWindow ?? '_blank';

    // Counter
    counter.textContent = total > 1 ? `${this.currentIndex + 1} / ${total}` : '';

    // Highlight active item in set navigator
    const setNavItems = card.querySelectorAll<HTMLElement>('.alap-lightbox-setnav-item');
    for (const item of setNavItems) {
      const idx = Number(item.getAttribute('data-index'));
      item.classList.toggle('active', idx === this.currentIndex);
    }
  }

  private jumpTo(index: number): void {
    if (index === this.currentIndex) return;
    const card = this.overlay?.querySelector('.alap-lightbox-card') as HTMLElement | null;
    if (!card) return;

    card.classList.add('fading');
    const duration = parseFloat(getComputedStyle(card).getPropertyValue('--alap-lightbox-transition')) * 1000;
    setTimeout(() => {
      this.currentIndex = index;
      this.update();
      card.classList.remove('fading');
    }, duration);
  }

  private navigate(delta: number): void {
    const card = this.overlay?.querySelector('.alap-lightbox-card') as HTMLElement | null;
    if (!card) return;

    card.classList.add('fading');
    const duration = parseFloat(getComputedStyle(card).getPropertyValue('--alap-lightbox-transition')) * 1000;
    setTimeout(() => {
      this.currentIndex = (this.currentIndex + delta + this.links.length) % this.links.length;
      this.update();
      card.classList.remove('fading');
    }, duration);
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowLeft') {
      this.navigate(-1);
    } else if (e.key === 'ArrowRight') {
      this.navigate(1);
    }
  }

  private openZoom(src: string): void {
    const zoomOverlay = document.createElement('div');
    zoomOverlay.className = 'alap-lightbox-zoom-overlay';

    const zoomImg = document.createElement('img');
    zoomImg.className = 'alap-lightbox-zoom-image';
    zoomImg.src = src;

    const dismissZoom = () => {
      document.removeEventListener('keydown', zoomKeyHandler, true);
      zoomOverlay.classList.remove('alap-lightbox-zoom-visible');
      const duration = parseFloat(getComputedStyle(zoomOverlay).transitionDuration);
      if (duration > 0) {
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

    document.body.appendChild(zoomOverlay);
    zoomOverlay.appendChild(zoomImg);

    void zoomOverlay.offsetHeight;
    zoomOverlay.classList.add('alap-lightbox-zoom-visible');
  }

  destroy(): void {
    this.close();
    const triggers = document.querySelectorAll<HTMLElement>(this.selector);
    for (const trigger of triggers) {
      trigger.removeAttribute('role');
    }
  }
}
