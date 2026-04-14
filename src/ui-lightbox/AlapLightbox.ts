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
import { handleOverlayKeydown } from '../ui/shared/overlayKeyboard';
import { fadeIn, fadeOut } from '../ui/shared/overlayTransition';
import { openImageZoom } from '../ui/shared/imageZoom';
import type { Placement } from '../ui/shared/placement';
import { OVERLAY_ALIGN, OVERLAY_JUSTIFY } from '../ui/shared/overlayPlacement';
import { createSetNavigator } from '../ui/shared/setNavigator';
import type { SetNavHandle } from '../ui/shared/setNavigator';
import { createEmbed } from '../ui-embed/AlapEmbed';
import type { EmbedPolicy } from '../ui-embed/embedConsent';

export interface AlapLightboxOptions {
  /** CSS selector for trigger elements. Default: '.alap' */
  selector?: string;
  /**
   * Viewport placement for the overlay panel. Uses compass directions.
   * - 'C': centered (default)
   * - 'N': anchored to top
   * - 'S': anchored to bottom
   * - 'NE', 'NW', 'SE', 'SW': corner anchoring
   * - 'E', 'W': vertically centered, horizontally anchored
   */
  placement?: Placement;
  /** Embed consent policy. 'prompt' (default) asks before loading, 'allow' auto-loads, 'block' never loads. */
  embedPolicy?: EmbedPolicy;
  /** Override default embed provider allowlist. Only these domains will render as iframes. */
  embedAllowlist?: string[];
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
  private placement: Placement | null;
  private overlay: HTMLElement | null = null;
  private links: ResolvedLink[] = [];
  private currentIndex = 0;
  private activeTrigger: HTMLElement | null = null;
  private setNavHandle: SetNavHandle | null = null;
  private transitioning = false;
  private pendingDelta: number | null = null;
  private rapidMode = false;
  private rapidResetTimer: ReturnType<typeof setTimeout> | null = null;
  private embedPolicy: EmbedPolicy;
  private embedAllowlist: string[] | undefined;

  private handleKeydown: (e: KeyboardEvent) => void;

  constructor(config: AlapConfig, options: AlapLightboxOptions = {}) {
    this.engine = new AlapEngine(config);
    this.selector = options.selector ?? '.alap';
    this.placement = options.placement ?? null;
    this.embedPolicy = options.embedPolicy ?? 'prompt';
    this.embedAllowlist = options.embedAllowlist;
    this.handleKeydown = this.onKeydown.bind(this);
    this.init();
  }

  private init(): void {
    const triggers = document.querySelectorAll<HTMLElement>(this.selector);
    for (const trigger of triggers) {
      trigger.addEventListener('click', (e) => this.onTriggerClick(e, trigger));
      trigger.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
      });
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

    if (this.placement) {
      this.overlay.style.alignItems = OVERLAY_ALIGN[this.placement];
      this.overlay.style.justifyContent = OVERLAY_JUSTIFY[this.placement];
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.render();
    fadeIn(this.overlay, document.body, 'alap-lightbox-visible');

    document.addEventListener('keydown', this.handleKeydown);
  }

  close(): HTMLElement | null {
    const trigger = this.activeTrigger;
    if (this.overlay) {
      const overlay = this.overlay;
      this.overlay = null;

      fadeOut(overlay, 'alap-lightbox-visible');
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

    // Content panel
    const card = document.createElement('div');
    card.className = 'alap-lightbox-panel';

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
    titleRow.className = 'alap-lightbox-label-row';
    const title = document.createElement('h2');
    title.className = 'alap-lightbox-label';
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
      this.setNavHandle = createSetNavigator({
        counterWrap,
        counterText,
        links: this.links,
        currentIndex: this.currentIndex,
        onJump: (i) => this.jumpTo(i),
        css: {
          setnav: 'alap-lightbox-setnav',
          list: 'alap-lightbox-setnav-list',
          item: 'alap-lightbox-setnav-item',
          filterWrap: 'alap-lightbox-setnav-filter-wrap',
          filter: 'alap-lightbox-setnav-filter',
          clear: 'alap-lightbox-setnav-clear',
        },
        closeIcon: '\u00d7',
        hoverHint: 'swap',
      });
    }

    // Navigation row: prev + counter + next inside body (like lens)
    if (this.links.length > 1) {
      const nav = document.createElement('div');
      nav.className = 'alap-lightbox-nav';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'alap-lightbox-nav-prev';
      prevBtn.setAttribute('aria-label', 'Previous');
      prevBtn.textContent = '\u2039';
      prevBtn.addEventListener('click', () => this.navigate(-1));
      nav.appendChild(prevBtn);

      nav.appendChild(counterWrap);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'alap-lightbox-nav-next';
      nextBtn.setAttribute('aria-label', 'Next');
      nextBtn.textContent = '\u203a';
      nextBtn.addEventListener('click', () => this.navigate(1));
      nav.appendChild(nextBtn);

      body.appendChild(nav);
    } else {
      body.appendChild(counterWrap);
    }

    card.appendChild(body);
    this.overlay.appendChild(card);

    this.update();
  }

  /** Swap only the dynamic content — no DOM destruction */
  private update(): void {
    if (!this.overlay) return;

    const link = this.links[this.currentIndex];
    const total = this.links.length;
    const hasImage = !!(link.image || link.thumbnail);

    const card = this.overlay.querySelector('.alap-lightbox-panel') as HTMLElement;
    const imageWrap = card.querySelector('.alap-lightbox-image-wrap') as HTMLElement;
    const img = imageWrap.querySelector('.alap-lightbox-image') as HTMLImageElement;
    const title = card.querySelector('.alap-lightbox-label') as HTMLElement;
    const creditEl = card.querySelector('.alap-lightbox-credit') as HTMLElement;
    const desc = card.querySelector('.alap-lightbox-description') as HTMLElement;
    const visitBtn = card.querySelector('.alap-lightbox-visit') as HTMLAnchorElement;
    const counter = card.querySelector('.alap-lightbox-counter') as HTMLElement;

    // Remove any previous embed from the image wrap
    const prevEmbed = imageWrap.querySelector('.alap-embed-wrap, .alap-embed-placeholder, .alap-embed-link');
    if (prevEmbed) prevEmbed.remove();

    // Image or embed
    const embedUrl = link.meta?.embed;
    if (hasImage) {
      img.src = link.image ?? link.thumbnail!;
      img.alt = link.altText ?? link.label ?? '';
      img.style.display = '';
      imageWrap.classList.remove('no-image');
      card.style.background = '';
    } else if (typeof embedUrl === 'string' && embedUrl) {
      img.style.display = 'none';
      imageWrap.classList.remove('no-image');
      card.style.background = '';
      const embedType = link.meta?.embedType as 'video' | 'audio' | 'interactive' | undefined;
      const embedEl = createEmbed(embedUrl, embedType, {
        embedPolicy: this.embedPolicy,
        embedAllowlist: this.embedAllowlist,
      });
      imageWrap.appendChild(embedEl);
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

    // Counter + set navigator
    if (this.setNavHandle) {
      this.setNavHandle.updateCounter(this.currentIndex, total);
      this.setNavHandle.setActive(this.currentIndex);
    } else {
      counter.textContent = total > 1 ? `${this.currentIndex + 1} / ${total}` : '';
    }
  }

  private jumpTo(index: number): void {
    if (index === this.currentIndex || this.transitioning) return;
    const card = this.overlay?.querySelector('.alap-lightbox-panel') as HTMLElement | null;
    if (!card) return;

    this.transitioning = true;
    card.classList.add('fading');
    const duration = parseFloat(getComputedStyle(card).getPropertyValue('--alap-lightbox-transition')) * 1000;
    setTimeout(() => {
      this.currentIndex = index;
      this.update();
      card.classList.remove('fading');
      this.transitioning = false;
    }, duration);
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

    const card = this.overlay?.querySelector('.alap-lightbox-panel') as HTMLElement | null;
    if (!card) return;

    this.transitioning = true;
    card.classList.add('fading');
    const full = parseFloat(getComputedStyle(card).getPropertyValue('--alap-lightbox-transition')) * 1000;
    const duration = this.rapidMode ? full / 2 : full;
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

  private onKeydown(e: KeyboardEvent): void {
    handleOverlayKeydown(e, {
      close: () => this.close(),
      prev: () => this.navigate(-1),
      next: () => this.navigate(1),
    });
  }

  private openZoom(src: string): void {
    openImageZoom({
      container: document.body,
      src,
      overlayClass: 'alap-lightbox-zoom-overlay',
      imageClass: 'alap-lightbox-zoom-image',
      visibleClass: 'alap-lightbox-zoom-visible',
    });
  }

  /** Change viewport placement at runtime. Pass null to revert to CSS default (centered). */
  setPlacement(placement: Placement | null): void {
    this.placement = placement;
  }

  /**
   * Access the underlying engine for advanced operations like preResolve().
   */
  getEngine(): AlapEngine {
    return this.engine;
  }

  destroy(): void {
    this.close();
    const triggers = document.querySelectorAll<HTMLElement>(this.selector);
    for (const trigger of triggers) {
      trigger.removeAttribute('role');
    }
  }
}
