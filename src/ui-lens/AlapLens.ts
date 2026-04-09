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
import { RENDERER_LENS } from '../ui/shared/coordinatedRenderer';
import type { CoordinatedRenderer, OpenPayload } from '../ui/shared/coordinatedRenderer';
import type { Placement } from '../ui/shared/placement';

// --- Options ---

export interface AlapLensOptions {
  /** CSS selector for trigger elements. Default: DEFAULT_SELECTOR */
  selector?: string;
  /** Label for the visit/navigate button. Default: DEFAULT_VISIT_LABEL */
  visitLabel?: string;
  /** Label for the close button. Default: DEFAULT_CLOSE_LABEL */
  closeLabel?: string;
  /** Custom display names for meta keys. E.g. { calories: 'Calories (kcal)' } */
  metaLabels?: Record<string, string>;
  /** Show copy-to-clipboard button on panel hover. Default: true */
  copyable?: boolean;
  /** Show a Close button in the actions row (next to Visit). Default: false */
  panelCloseButton?: boolean;
  /**
   * Navigation transition between items.
   * - 'fade': opacity crossfade (lightbox style) — no reflow
   * - 'resize': animated height (TTT style) — smooth panel resize
   * - 'none': instant swap, no animation
   * Default: 'fade'
   */
  transition?: 'fade' | 'resize' | 'none';
  /** Duration (ms) of the "switching to [tag]" tooltip on the counter. 0 to disable. Default: 3000 */
  tagSwitchTooltip?: number;
  /**
   * Viewport placement for the overlay panel. Uses compass directions.
   * - 'C': centered (default) — panel recenters when height changes
   * - 'N': anchored to top — stable vertical position, content grows downward
   * - 'S': anchored to bottom — content grows upward
   * - 'NE', 'NW', 'SE', 'SW': corner anchoring
   * - 'E', 'W': vertically centered, horizontally anchored
   * When omitted, the overlay uses CSS defaults (centered).
   */
  placement?: Placement;
}

// --- Constants ---

const DEFAULT_SELECTOR = '.alap';
const DEFAULT_VISIT_LABEL = 'Visit \u2192';
const DEFAULT_CLOSE_LABEL = 'Close';
const DEFAULT_TARGET = '_blank';

const LONG_TEXT_THRESHOLD = 100;
const MAX_VISIBLE_LINKS = 5;

const FADE_DURATION_PROP = '--alap-lens-transition';
const FADE_DURATION_FALLBACK = 150;
const RESIZE_DURATION_PROP = '--alap-lens-resize-transition';
const RESIZE_DURATION_FALLBACK = 350;
const TRANSITION_SAFETY_BUFFER = 100;

const URL_PATTERN = /^https?:\/\//;

// Placement → flexbox alignment mapping
const PLACEMENT_ALIGN: Record<Placement, string> = {
  N: 'flex-start', NE: 'flex-start', NW: 'flex-start',
  S: 'flex-end',   SE: 'flex-end',   SW: 'flex-end',
  E: 'center',     W: 'center',      C: 'center',
};
const PLACEMENT_JUSTIFY: Record<Placement, string> = {
  N: 'center',     S: 'center',      C: 'center',
  NE: 'flex-end',  E: 'flex-end',    SE: 'flex-end',
  NW: 'flex-start', W: 'flex-start', SW: 'flex-start',
};

const TAG_SEPARATOR = ' \u00b7 ';
const COPY_LABEL = 'Copy';
const COPY_DONE_LABEL = 'Copied';
const COPY_DONE_DURATION = 1500;
const DEFAULT_TAG_SWITCH_TOOLTIP = 3000;

// Icons / symbols
const ICON_CLOSE = '\u00d7';
const ICON_PREV = '\u2039';
const ICON_NEXT = '\u203a';
const ICON_COPY = '\u2398';

type TransitionMode = 'fade' | 'resize' | 'none';
const DEFAULT_TRANSITION: TransitionMode = 'fade';

// CSS class names
const CSS = {
  overlay: 'alap-lens-overlay',
  overlayVisible: 'alap-lens-overlay-visible',
  panel: 'alap-lens-panel',
  panelFading: 'alap-lens-panel-fading',
  closeX: 'alap-lens-close-x',
  thumbWrap: 'alap-lens-thumb-wrap',
  thumbWrapEmpty: 'alap-lens-thumb-wrap-empty',
  thumbnail: 'alap-lens-thumbnail',
  titleRow: 'alap-lens-title-row',
  credit: 'alap-lens-credit',
  label: 'alap-lens-label',
  tags: 'alap-lens-tags',
  tag: 'alap-lens-tag',
  description: 'alap-lens-description',
  separator: 'alap-lens-separator',
  meta: 'alap-lens-meta',
  metaRow: 'alap-lens-meta-row',
  metaRowLinks: 'alap-lens-meta-row-links',
  metaRowText: 'alap-lens-meta-row-text',
  metaKey: 'alap-lens-meta-key',
  metaValue: 'alap-lens-meta-value',
  metaChips: 'alap-lens-meta-chips',
  metaChip: 'alap-lens-meta-chip',
  metaLinks: 'alap-lens-meta-links',
  metaLink: 'alap-lens-meta-link',
  metaMore: 'alap-lens-meta-more',
  metaText: 'alap-lens-meta-text',
  actions: 'alap-lens-actions',
  visit: 'alap-lens-visit',
  closeBtn: 'alap-lens-close-btn',
  nav: 'alap-lens-nav',
  navPrev: 'alap-lens-nav-prev',
  navNext: 'alap-lens-nav-next',
  counterWrap: 'alap-lens-counter-wrap',
  counter: 'alap-lens-counter',
  setnav: 'alap-lens-setnav',
  setnavList: 'alap-lens-setnav-list',
  setnavItem: 'alap-lens-setnav-item',
  setnavFilterWrap: 'alap-lens-setnav-filter-wrap',
  setnavFilter: 'alap-lens-setnav-filter',
  setnavClear: 'alap-lens-setnav-clear',
  zoomOverlay: 'alap-lens-zoom-overlay',
  zoomVisible: 'alap-lens-zoom-visible',
  zoomImage: 'alap-lens-zoom-image',
  copyBtn: 'alap-lens-copy',
  copyDone: 'alap-lens-copy-done',
} as const;

// ARIA attributes
const ARIA = {
  role: 'dialog',
  modal: 'true',
  dialogLabel: 'Item details',
  copyLabel: 'Copy to clipboard',
  closeLabel: 'Close',
  prevLabel: 'Previous',
  nextLabel: 'Next',
} as const;

// Meta keys that are internal to Alap, not user-facing data
const INTERNAL_META_KEYS = new Set([
  'source', 'sourceLabel', 'updated',
  'atUri', 'handle', 'did',
  'photoCredit', 'photoCreditUrl',
]);

// Display type hints
const DISPLAY_VALUE = 'value';
const DISPLAY_LIST = 'list';
const DISPLAY_LINKS = 'links';
const DISPLAY_TEXT = 'text';
const DISPLAY_HINT_SUFFIX = '_display';

/**
 * Detail-inspection renderer. Shows a single item's full data in an
 * overlay panel — label, description, thumbnail, tags, and all meta fields.
 *
 * Items without a URL show metadata only (no visit button).
 * Items with rich meta fields are rendered with type-aware auto-detection.
 *
 * Same contract as AlapUI / AlapLightbox: takes an AlapConfig, binds to
 * trigger elements, resolves expressions via AlapEngine.
 */
export class AlapLens implements CoordinatedRenderer {
  readonly rendererType = RENDERER_LENS;

  private engine: AlapEngine;
  private selector: string;
  private visitLabel: string;
  private closeLabel: string;
  private metaLabels: Record<string, string>;
  private copyable: boolean;
  private panelCloseButton: boolean;
  private tagSwitchTooltip: number;
  private placement: Placement | null;
  private transition: TransitionMode;
  private overlay: HTMLElement | null = null;
  private links: ResolvedLink[] = [];
  private currentIndex = 0;
  private transitioning = false;
  private activeTrigger: HTMLElement | null = null;
  private activeTag: string | null = null;

  private handleKeydown: (e: KeyboardEvent) => void;

  constructor(config: AlapConfig, options: AlapLensOptions = {}) {
    this.engine = new AlapEngine(config);
    this.selector = options.selector ?? DEFAULT_SELECTOR;
    this.visitLabel = options.visitLabel ?? DEFAULT_VISIT_LABEL;
    this.closeLabel = options.closeLabel ?? DEFAULT_CLOSE_LABEL;
    this.metaLabels = options.metaLabels ?? {};
    this.copyable = options.copyable ?? true;
    this.panelCloseButton = options.panelCloseButton ?? false;
    this.tagSwitchTooltip = options.tagSwitchTooltip ?? DEFAULT_TAG_SWITCH_TOOLTIP;
    this.placement = options.placement ?? null;
    this.transition = options.transition ?? DEFAULT_TRANSITION;
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
    this.activeTag = null;
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

  // --- Overlay lifecycle ---

  private open(): void {
    this.close();

    this.overlay = document.createElement('div');
    this.overlay.className = CSS.overlay;
    this.overlay.setAttribute('role', ARIA.role);
    this.overlay.setAttribute('aria-modal', ARIA.modal);
    this.overlay.setAttribute('aria-label', ARIA.dialogLabel);

    if (this.placement) {
      this.overlay.style.alignItems = PLACEMENT_ALIGN[this.placement];
      this.overlay.style.justifyContent = PLACEMENT_JUSTIFY[this.placement];
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.render();
    document.body.appendChild(this.overlay);

    // Fade in
    void this.overlay.offsetHeight;
    this.overlay.classList.add(CSS.overlayVisible);

    document.addEventListener('keydown', this.handleKeydown);
  }

  close(): HTMLElement | null {
    const trigger = this.activeTrigger;
    if (this.overlay) {
      const overlay = this.overlay;
      this.overlay = null;

      // Fade out, then remove
      overlay.classList.remove(CSS.overlayVisible);
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

  // --- Rendering ---

  private render(): void {
    if (!this.overlay) return;

    const link = this.links[this.currentIndex];
    const total = this.links.length;

    this.overlay.innerHTML = '';

    const closeX = this.createButton(CSS.closeX, ICON_CLOSE, ARIA.closeLabel, () => this.close());
    this.overlay.appendChild(closeX);

    const panel = document.createElement('div');
    panel.className = CSS.panel;

    this.renderTopZone(panel, link);
    this.renderMetaZone(panel, link);
    this.renderActions(panel, link);

    if (total > 1) {
      this.renderNav(panel, total);
    }

    this.overlay.appendChild(panel);
  }

  private renderTopZone(panel: HTMLElement, link: ResolvedLink): void {
    const thumbSrc = link.thumbnail || link.image;
    const thumbWrap = document.createElement('div');
    thumbWrap.className = thumbSrc ? CSS.thumbWrap : `${CSS.thumbWrap} ${CSS.thumbWrapEmpty}`;
    if (thumbSrc) {
      const thumb = document.createElement('img');
      thumb.className = CSS.thumbnail;
      thumb.src = thumbSrc;
      thumb.alt = link.altText ?? link.label ?? '';
      thumb.style.cursor = 'zoom-in';
      thumb.addEventListener('load', () => {
        if (thumb.naturalHeight > thumb.naturalWidth) {
          thumb.style.objectFit = 'contain';
          thumbWrap.style.maxHeight = 'var(--alap-lens-thumb-portrait-max-height)';
        }
      });
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (thumb.src) this.openZoom(thumb.src);
      });
      thumbWrap.appendChild(thumb);
    }
    panel.appendChild(thumbWrap);

    // Title row — label + photo credit on the same line
    const creditName = link.meta?.photoCredit as string | undefined;
    if (link.label || (creditName && thumbSrc)) {
      const titleRow = document.createElement('div');
      titleRow.className = CSS.titleRow;

      if (link.label) {
        const label = document.createElement('h2');
        label.className = CSS.label;
        label.textContent = link.label;
        titleRow.appendChild(label);
      }

      if (creditName && thumbSrc) {
        const creditEl = document.createElement('span');
        creditEl.className = CSS.credit;
        const creditUrl = link.meta?.photoCreditUrl as string | undefined;
        if (creditUrl) {
          const creditLink = document.createElement('a');
          creditLink.href = creditUrl;
          creditLink.target = '_blank';
          creditLink.rel = 'noopener noreferrer';
          creditLink.textContent = `Photo: ${creditName}`;
          creditEl.appendChild(creditLink);
        } else {
          creditEl.textContent = `Photo: ${creditName}`;
        }
        titleRow.appendChild(creditEl);
      }

      panel.appendChild(titleRow);
    }

    if ((link.tags && link.tags.length > 0) || this.copyable) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = CSS.tags;
      if (link.tags) {
        for (const tag of link.tags) {
          const chip = document.createElement('span');
          chip.className = CSS.tag;
          if (this.activeTag === tag) chip.classList.add('active');
          chip.textContent = tag;
          chip.style.cursor = 'pointer';
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            const resolved = this.engine.resolve(`.${tag}`);
            if (resolved.length === 0) return;
            this.links = resolved;
            this.currentIndex = 0;
            this.activeTag = tag;
            this.render();
            if (this.tagSwitchTooltip > 0) {
              this.showTagTooltip(tag);
            }
          });
          tagsWrap.appendChild(chip);
        }
      }
      if (this.copyable) {
        this.renderCopyButton(tagsWrap, link);
      }
      panel.appendChild(tagsWrap);
    }

    if (link.description) {
      const desc = document.createElement('p');
      desc.className = CSS.description;
      desc.textContent = link.description;
      panel.appendChild(desc);
    }
  }

  private renderMetaZone(panel: HTMLElement, link: ResolvedLink): void {
    const meta = link.meta;
    if (!meta) return;

    const entries = Object.entries(meta).filter(
      ([key]) => !INTERNAL_META_KEYS.has(key)
        && !key.startsWith('_')
        && !key.endsWith(DISPLAY_HINT_SUFFIX)
    );
    if (entries.length === 0) return;

    const separator = document.createElement('hr');
    separator.className = CSS.separator;
    panel.appendChild(separator);

    const metaSection = document.createElement('dl');
    metaSection.className = CSS.meta;

    for (const [key, value] of entries) {
      if (value == null || value === '') continue;

      const displayHint = meta[`${key}${DISPLAY_HINT_SUFFIX}`] as string | undefined;
      const rendered = this.renderMetaField(key, value, displayHint);
      if (rendered) {
        metaSection.appendChild(rendered);
      }
    }

    if (metaSection.children.length > 0) {
      panel.appendChild(metaSection);
    }
  }

  private renderActions(panel: HTMLElement, link: ResolvedLink): void {
    const actions = document.createElement('div');
    actions.className = CSS.actions;

    if (link.url) {
      const visitBtn = document.createElement('a');
      visitBtn.className = CSS.visit;
      visitBtn.href = link.url;
      visitBtn.target = link.targetWindow ?? DEFAULT_TARGET;
      visitBtn.rel = 'noopener noreferrer';
      visitBtn.textContent = this.visitLabel;
      actions.appendChild(visitBtn);
    }

    if (this.panelCloseButton) {
      const closeBtn = this.createButton(CSS.closeBtn, this.closeLabel, ARIA.closeLabel, () => this.close());
      actions.appendChild(closeBtn);
    }

    panel.appendChild(actions);
  }

  private renderNav(panel: HTMLElement, total: number): void {
    const nav = document.createElement('div');
    nav.className = CSS.nav;

    const prevBtn = this.createButton(CSS.navPrev, ICON_PREV, ARIA.prevLabel, () => {
      this.navigate(-1);
    });
    nav.appendChild(prevBtn);

    // Counter wrap — holds counter text + set navigator popup
    const counterWrap = document.createElement('div');
    counterWrap.className = CSS.counterWrap;

    const counterText = document.createElement('span');
    counterText.className = CSS.counter;
    counterWrap.appendChild(counterText);

    // Set navigator popup
    const setNav = document.createElement('div');
    setNav.className = CSS.setnav;
    setNav.setAttribute('tabindex', '-1');

    const setList = document.createElement('ul');
    setList.className = CSS.setnavList;
    setList.setAttribute('role', 'listbox');

    for (let i = 0; i < this.links.length; i++) {
      const item = this.links[i];
      const li = document.createElement('li');
      li.className = CSS.setnavItem;
      li.setAttribute('role', 'option');
      li.setAttribute('data-index', String(i));
      li.textContent = item.label ?? item.id;
      if (i === this.currentIndex) li.classList.add('active');
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jumpTo(i);
      });
      setList.appendChild(li);
    }

    setNav.appendChild(setList);

    // Filter input
    const filterWrap = document.createElement('div');
    filterWrap.className = CSS.setnavFilterWrap;

    const filterInput = document.createElement('input');
    filterInput.className = CSS.setnavFilter;
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter\u2026';
    filterInput.setAttribute('aria-label', 'Filter items');
    filterWrap.appendChild(filterInput);

    const clearBtn = document.createElement('button');
    clearBtn.className = CSS.setnavClear;
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

    const counterLabel = () => `${this.currentIndex + 1} / ${total}`;
    counterText.textContent = counterLabel();

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
      if (document.activeElement === filterInput) return;
      if (handleNavKeys(e)) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        filterInput.focus();
      }
    });

    // Hover hints — crossfade between counter label and "Menu"
    counterText.style.cursor = 'pointer';
    const HOVER_FADE = 250;

    const crossfadeCounter = (text: string) => {
      counterText.style.opacity = '0';
      setTimeout(() => {
        counterText.textContent = text;
        counterText.style.opacity = '1';
      }, HOVER_FADE);
    };

    counterWrap.addEventListener('mouseenter', () => {
      if (!setNav.classList.contains('open')) {
        crossfadeCounter('Menu');
      }
    });
    counterWrap.addEventListener('mouseleave', () => {
      if (!setNav.classList.contains('open')) {
        crossfadeCounter(counterLabel());
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

      const items = setList.querySelectorAll<HTMLElement>(`.${CSS.setnavItem}`);
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
      Array.from(setList.querySelectorAll<HTMLElement>(`.${CSS.setnavItem}`))
        .filter((el) => el.style.display !== 'none');

    const updateHighlight = (visible: HTMLElement[]) => {
      for (const item of setList.querySelectorAll<HTMLElement>(`.${CSS.setnavItem}`)) {
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

    nav.appendChild(counterWrap);

    const nextBtn = this.createButton(CSS.navNext, ICON_NEXT, ARIA.nextLabel, () => {
      this.navigate(1);
    });
    nav.appendChild(nextBtn);

    panel.appendChild(nav);
  }

  // --- Navigation transitions ---

  /** Read a CSS custom property as seconds → ms, with fallback. */
  private getCssDuration(el: HTMLElement, prop: string, fallback: number): number {
    const raw = getComputedStyle(el).getPropertyValue(prop);
    const parsed = parseFloat(raw) * 1000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private navigate(delta: number): void {
    if (this.transitioning || this.links.length <= 1) return;

    const nextIndex = (this.currentIndex + delta + this.links.length) % this.links.length;

    if (this.transition === 'none') {
      this.currentIndex = nextIndex;
      this.render();
      return;
    }

    if (this.transition === 'resize') {
      this.navigateResize(nextIndex);
      return;
    }

    // Default: fade
    this.navigateFade(nextIndex);
  }

  /**
   * Fade transition (lightbox style): fade content out via opacity,
   * swap, fade back in. No reflow — only compositing.
   */
  private navigateFade(nextIndex: number): void {
    const panel = this.overlay?.querySelector(`.${CSS.panel}`) as HTMLElement | null;
    if (!panel) return;

    this.transitioning = true;
    panel.classList.add(CSS.panelFading);

    const duration = this.getCssDuration(panel, FADE_DURATION_PROP, FADE_DURATION_FALLBACK);

    setTimeout(() => {
      this.currentIndex = nextIndex;
      this.render();
      // render() rebuilds the panel, so grab it again
      const newPanel = this.overlay?.querySelector(`.${CSS.panel}`) as HTMLElement | null;
      if (newPanel) {
        newPanel.classList.add(CSS.panelFading);
        // Force reflow so the browser registers the fading state before removing it
        void newPanel.offsetHeight;
        newPanel.classList.remove(CSS.panelFading);
      }
      setTimeout(() => { this.transitioning = false; }, duration);
    }, duration);
  }

  /**
   * Resize transition (TTT style): lock current height, swap content,
   * measure new scrollHeight, animate height to new value.
   */
  private navigateResize(nextIndex: number): void {
    const panel = this.overlay?.querySelector(`.${CSS.panel}`) as HTMLElement | null;
    if (!panel) return;

    this.transitioning = true;
    const duration = this.getCssDuration(panel, RESIZE_DURATION_PROP, RESIZE_DURATION_FALLBACK);

    // Lock current height
    const currentHeight = panel.scrollHeight;
    panel.style.height = `${currentHeight}px`;
    panel.style.overflow = 'hidden';

    // Swap content
    this.currentIndex = nextIndex;
    this.render();

    // Measure new content and animate
    const newPanel = this.overlay?.querySelector(`.${CSS.panel}`) as HTMLElement | null;
    if (!newPanel) { this.transitioning = false; return; }

    // Keep locked height so we can transition from it
    newPanel.style.height = `${currentHeight}px`;
    newPanel.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      // Temporarily remove height constraint to measure natural height
      newPanel.style.height = 'auto';
      const targetHeight = newPanel.scrollHeight;

      // Snap back to old height, then animate to new
      newPanel.style.height = `${currentHeight}px`;
      // Force reflow
      void newPanel.offsetHeight;
      newPanel.style.height = `${targetHeight}px`;

      const onEnd = () => {
        newPanel.removeEventListener('transitionend', onEnd);
        newPanel.style.height = '';
        newPanel.style.overflow = '';
        this.transitioning = false;
      };
      newPanel.addEventListener('transitionend', onEnd, { once: true });

      // Safety fallback in case transitionend doesn't fire
      setTimeout(() => {
        if (this.transitioning) onEnd();
      }, duration + TRANSITION_SAFETY_BUFFER);
    });
  }

  // --- Meta field rendering ---

  private renderMetaField(key: string, value: unknown, displayHint?: string): HTMLElement | null {
    const displayName = this.formatMetaKey(key);
    const hint = displayHint ?? this.detectDisplayType(value);

    switch (hint) {
      case DISPLAY_LIST:
        return this.renderChips(displayName, value as string[]);
      case DISPLAY_LINKS:
        return this.renderLinks(displayName, value as string[]);
      case DISPLAY_TEXT:
        return this.renderTextBlock(displayName, value as string);
      case DISPLAY_VALUE:
      default:
        return this.renderKeyValue(displayName, this.formatMetaValue(value));
    }
  }

  private detectDisplayType(value: unknown): string {
    if (typeof value === 'boolean') return DISPLAY_VALUE;
    if (Array.isArray(value)) {
      if (value.length === 0) return DISPLAY_VALUE;
      if (value.every((v) => typeof v === 'string' && URL_PATTERN.test(v))) return DISPLAY_LINKS;
      if (value.every((v) => typeof v === 'string')) return DISPLAY_LIST;
      return DISPLAY_VALUE;
    }
    if (typeof value === 'string' && value.length >= LONG_TEXT_THRESHOLD) return DISPLAY_TEXT;
    return DISPLAY_VALUE;
  }

  private formatMetaKey(key: string): string {
    if (this.metaLabels[key]) return this.metaLabels[key];
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (c) => c.toUpperCase());
  }

  private formatMetaValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? '\u2713' : '\u2717';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  private renderKeyValue(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.className = CSS.metaRow;

    const dt = document.createElement('dt');
    dt.className = CSS.metaKey;
    dt.textContent = label;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = CSS.metaValue;
    dd.textContent = value;
    row.appendChild(dd);

    return row;
  }

  private renderChips(label: string, values: string[]): HTMLElement {
    const row = document.createElement('div');
    row.className = CSS.metaRow;

    const dt = document.createElement('dt');
    dt.className = CSS.metaKey;
    dt.textContent = label;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = CSS.metaChips;
    for (const v of values) {
      const chip = document.createElement('span');
      chip.className = CSS.metaChip;
      chip.textContent = v;
      dd.appendChild(chip);
    }
    row.appendChild(dd);

    return row;
  }

  private renderLinks(label: string, urls: string[]): HTMLElement {
    const row = document.createElement('div');
    row.className = `${CSS.metaRow} ${CSS.metaRowLinks}`;

    const dt = document.createElement('dt');
    dt.className = CSS.metaKey;
    dt.textContent = `${label} (${urls.length})`;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = CSS.metaLinks;

    const visible = urls.slice(0, MAX_VISIBLE_LINKS);
    for (const url of visible) {
      const a = document.createElement('a');
      a.className = CSS.metaLink;
      a.href = url;
      a.target = DEFAULT_TARGET;
      a.rel = 'noopener noreferrer';
      try {
        const parsed = new URL(url);
        a.textContent = parsed.pathname.length > 1 ? parsed.pathname : parsed.hostname;
      } catch {
        a.textContent = url;
      }
      dd.appendChild(a);
    }

    if (urls.length > MAX_VISIBLE_LINKS) {
      const more = document.createElement('span');
      more.className = CSS.metaMore;
      more.textContent = `+${urls.length - MAX_VISIBLE_LINKS} more`;
      dd.appendChild(more);
    }

    row.appendChild(dd);
    return row;
  }

  private renderTextBlock(label: string, text: string): HTMLElement {
    const row = document.createElement('div');
    row.className = `${CSS.metaRow} ${CSS.metaRowText}`;

    const dt = document.createElement('dt');
    dt.className = CSS.metaKey;
    dt.textContent = label;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = CSS.metaText;
    dd.textContent = text;
    row.appendChild(dd);

    return row;
  }

  // --- Utilities ---

  private createButton(className: string, text: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = className;
    btn.setAttribute('aria-label', ariaLabel);
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  // --- Copy to clipboard ---

  private renderCopyButton(panel: HTMLElement, link: ResolvedLink): void {
    const btn = this.createButton(CSS.copyBtn, ICON_COPY, ARIA.copyLabel, () => {
      const text = this.buildClipboardText(link);
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = COPY_DONE_LABEL;
        btn.classList.add(CSS.copyDone);
        setTimeout(() => {
          btn.textContent = ICON_COPY;
          btn.classList.remove(CSS.copyDone);
        }, COPY_DONE_DURATION);
      });
    });
    panel.appendChild(btn);
  }

  private buildClipboardText(link: ResolvedLink): string {
    const lines: string[] = [];

    if (link.label) lines.push(link.label);

    if (link.tags && link.tags.length > 0) {
      lines.push(link.tags.join(TAG_SEPARATOR));
    }

    if (link.url) lines.push(link.url);

    if (link.description) {
      lines.push('');
      lines.push(link.description);
    }

    const meta = link.meta;
    if (meta) {
      const entries = Object.entries(meta).filter(
        ([key]) => !INTERNAL_META_KEYS.has(key)
          && !key.startsWith('_')
          && !key.endsWith(DISPLAY_HINT_SUFFIX)
      );

      if (entries.length > 0) {
        lines.push('');
        for (const [key, value] of entries) {
          if (value == null || value === '') continue;
          const displayName = this.formatMetaKey(key);
          lines.push(`${displayName}: ${this.formatMetaValue(value)}`);
        }
      }
    }

    return lines.join('\n');
  }

  // --- Tag switch tooltip ---

  private showTagTooltip(tag: string): void {
    const counter = this.overlay?.querySelector(`.${CSS.counter}`) as HTMLElement | null;
    if (!counter) return;

    const HALF = 500;
    const original = counter.textContent;

    // Fade out
    counter.style.opacity = '0';

    // Midway: swap text, fade in
    setTimeout(() => {
      if (!counter.isConnected) return;
      counter.textContent = `switching to .${tag}`;
      counter.classList.add('tag-tooltip');
      counter.style.opacity = '1';

      // Hold, then fade out and restore
      setTimeout(() => {
        if (!counter.isConnected) return;
        counter.style.opacity = '0';

        setTimeout(() => {
          if (!counter.isConnected) return;
          counter.textContent = original;
          counter.classList.remove('tag-tooltip');
          counter.style.opacity = '1';
        }, HALF);
      }, this.tagSwitchTooltip);
    }, HALF);
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

  /**
   * Jump directly to an item by index (used by set navigator).
   * Applies the current transition mode.
   */
  private jumpTo(index: number): void {
    if (index === this.currentIndex || this.transitioning) return;

    if (this.transition === 'none') {
      this.currentIndex = index;
      this.render();
      return;
    }

    if (this.transition === 'resize') {
      this.navigateResize(index);
      return;
    }

    this.navigateFade(index);
  }

  /**
   * Open a fullscreen zoom overlay for an image.
   * Escape closes zoom without closing the lens (capture-phase handler).
   */
  private openZoom(src: string): void {
    const zoomOverlay = document.createElement('div');
    zoomOverlay.className = CSS.zoomOverlay;

    const zoomImg = document.createElement('img');
    zoomImg.className = CSS.zoomImage;
    zoomImg.src = src;

    const dismissZoom = () => {
      document.removeEventListener('keydown', zoomKeyHandler, true);
      zoomOverlay.classList.remove(CSS.zoomVisible);
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
    zoomOverlay.classList.add(CSS.zoomVisible);
  }

  /** Change viewport placement at runtime. Pass null to revert to CSS default (centered). */
  setPlacement(placement: Placement | null): void {
    this.placement = placement;
  }

  destroy(): void {
    this.close();
    const triggers = document.querySelectorAll<HTMLElement>(this.selector);
    for (const trigger of triggers) {
      trigger.removeAttribute('role');
    }
  }
}
