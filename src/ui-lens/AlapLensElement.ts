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
import { applyOverlayLayout, clearOverlayLayout, computeOverlayLayout, viewportSize } from '../ui/shared/overlayPlacement';
import { parsePlacement, type ParsedPlacement } from '../ui/shared/placement';
import { handleOverlayKeydown } from '../ui/shared/overlayKeyboard';
import { fadeIn, fadeOut } from '../ui/shared/overlayTransition';
import { openImageZoom } from '../ui/shared/imageZoom';
import { createSetNavigator } from '../ui/shared/setNavigator';
import type { SetNavHandle } from '../ui/shared/setNavigator';
import { sanitizeUrlByTier, sanitizeTargetWindowByTier } from '../core/sanitizeByTier';
import { STYLES } from './lens-element.css';

// --- Constants ---

const DEFAULT_CONFIG_KEY = '_default';
const DEFAULT_VISIT_LABEL = 'Visit \u2192';
const DEFAULT_CLOSE_LABEL = 'Close';

const LONG_TEXT_THRESHOLD = 100;
const MAX_VISIBLE_LINKS = 5;

const FADE_DURATION_PROP = '--alap-lens-transition';
const FADE_DURATION_FALLBACK = 250;
const RESIZE_DURATION_PROP = '--alap-lens-resize-transition';
const RESIZE_DURATION_FALLBACK = 350;
const TRANSITION_SAFETY_BUFFER = 100;

const URL_PATTERN = /^https?:\/\//;

const TAG_SEPARATOR = ' \u00b7 ';
const COPY_DONE_LABEL = 'Copied';
const COPY_DONE_DURATION = 1500;
const DEFAULT_TAG_SWITCH_TOOLTIP = 3000;

const ICON_CLOSE = '\u00d7';
const ICON_PREV = '\u2039';
const ICON_NEXT = '\u203a';
const ICON_COPY = '\u2398';
const ICON_DRAWER_UP = '\u25b2';
const ICON_DRAWER_DOWN = '\u25bc';

// Display type hints
const DISPLAY_VALUE = 'value';
const DISPLAY_LIST = 'list';
const DISPLAY_LINKS = 'links';
const DISPLAY_TEXT = 'text';
const DISPLAY_HINT_SUFFIX = '_display';

// Meta keys that are internal to Alap, not user-facing data
const INTERNAL_META_KEYS = new Set([
  'source', 'sourceLabel', 'updated',
  'atUri', 'handle', 'did',
  'photoCredit', 'photoCreditUrl',
]);

// ---------- The custom element ----------
// Shadow DOM styles imported from ./lens-element.css.ts

export class AlapLensElement extends HTMLElement {
  private overlay: HTMLElement | null = null;
  private links: ResolvedLink[] = [];
  private originalLinks: ResolvedLink[] = [];
  private currentIndex = 0;
  private isOpen = false;
  private justClosed = false;
  private transitioning = false;
  private pendingDelta: number | null = null;
  private rapidMode = false;
  private rapidResetTimer: ReturnType<typeof setTimeout> | null = null;
  private activeTag: string | null = null;
  private setNavHandle: SetNavHandle | null = null;
  private drawerExpanded = false;

  private handleKeydown: (e: KeyboardEvent) => void;

  static get observedAttributes(): string[] {
    return ['query', 'config', 'placement', 'transition', 'copyable', 'panel-close-button', 'tag-switch-tooltip'];
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

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
    // Placement changes re-style the open overlay in place; closing would be
    // surprising for a purely cosmetic attribute.
    if (name === 'placement' && this.isOpen) {
      this.applyPlacementStyles();
      return;
    }
    if (this.isOpen) this.close();
  }

  // --- Attribute helpers ---

  private get visitLabel(): string {
    return this.getAttribute('visit-label') ?? DEFAULT_VISIT_LABEL;
  }

  private get closeLabel(): string {
    return this.getAttribute('close-label') ?? DEFAULT_CLOSE_LABEL;
  }

  private get copyable(): boolean {
    const attr = this.getAttribute('copyable');
    return attr !== 'false';
  }

  private get panelCloseButton(): boolean {
    return this.hasAttribute('panel-close-button');
  }

  private get transitionMode(): 'fade' | 'resize' | 'none' {
    const attr = this.getAttribute('transition') as 'fade' | 'resize' | 'none' | null;
    if (attr === 'fade' || attr === 'resize' || attr === 'none') return attr;
    return 'fade';
  }

  private get tagSwitchTooltip(): number {
    const attr = this.getAttribute('tag-switch-tooltip');
    if (attr !== null) {
      const parsed = parseInt(attr, 10);
      return Number.isFinite(parsed) ? parsed : DEFAULT_TAG_SWITCH_TOOLTIP;
    }
    return DEFAULT_TAG_SWITCH_TOOLTIP;
  }

  /**
   * Resolve the effective compass direction for the overlay, in priority order:
   *   1. `placement` attribute on the host (parsed; strategy discarded).
   *   2. `config.settings.placement` (parsed; strategy discarded).
   *   3. null — overlay uses CSS default (centered).
   */
  private resolvePlacement(): ParsedPlacement | null {
    const attr = this.getAttribute('placement');
    if (attr) return parsePlacement(attr);
    const configName = this.getAttribute('config') ?? DEFAULT_CONFIG_KEY;
    const config = getConfig(configName);
    const configVal = config?.settings?.placement;
    if (typeof configVal === 'string') return parsePlacement(configVal);
    return null;
  }

  private applyPlacementStyles(): void {
    if (!this.overlay) return;
    const effective = this.resolvePlacement();
    if (effective) {
      applyOverlayLayout(this.overlay, computeOverlayLayout(effective, viewportSize()));
    } else {
      clearOverlayLayout(this.overlay);
    }
  }

  // --- Trigger ---

  private onTriggerClick = (event: MouseEvent): void => {
    if (this.overlay && event.composedPath().includes(this.overlay)) return;

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
      warn(`<alap-lens>: no config registered for "${configName}". Call registerConfig() first.`);
      return;
    }

    const anchorId = this.id || undefined;
    this.links = engine.resolve(query, anchorId);
    if (this.links.length === 0) return;

    this.originalLinks = [...this.links];
    this.currentIndex = 0;
    this.activeTag = null;
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
    this.overlay.setAttribute('aria-label', 'Item details');

    // Apply placement
    this.applyPlacementStyles();

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.render();
    fadeIn(this.overlay, this.shadowRoot!, 'visible');

    this.isOpen = true;
    this.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', this.handleKeydown);
  }

  close(): void {
    if (!this.overlay) return;

    const overlay = this.overlay;
    this.overlay = null;
    this.isOpen = false;
    this.justClosed = true;
    this.drawerExpanded = false;
    requestAnimationFrame(() => { this.justClosed = false; });

    fadeOut(overlay, 'visible');
    this.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', this.handleKeydown);
  }

  // --- Rendering ---

  private render(): void {
    if (!this.overlay) return;
    this.overlay.innerHTML = '';

    const closeX = this.createButton('close-x', ICON_CLOSE, 'Close', () => this.close());
    closeX.setAttribute('part', 'close-x');
    this.overlay.appendChild(closeX);

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('part', 'panel');

    const link = this.links[this.currentIndex];
    const total = this.links.length;

    // Image stays directly on panel (outside the drawer)
    this.renderImage(panel, link);

    // Everything else goes in the scrollable drawer
    const drawer = document.createElement('div');
    drawer.className = this.drawerExpanded ? 'drawer drawer-expanded' : 'drawer';
    drawer.setAttribute('part', 'drawer');

    this.renderDrawerHandle(panel);

    this.renderDetails(drawer, link);
    this.renderMetaZone(drawer, link);

    panel.appendChild(drawer);

    // Actions and nav stay outside the drawer (fixed footer)
    this.renderActions(panel, link);

    if (total > 1) {
      this.renderNav(panel, total);
    }

    this.overlay.appendChild(panel);
  }

  private renderImage(panel: HTMLElement, link: ResolvedLink): void {
    const thumbSrc = link.thumbnail || link.image;
    const thumbWrap = document.createElement('div');
    let className = thumbSrc ? 'image-wrap' : 'image-wrap image-wrap-empty';
    if (this.drawerExpanded) className += ' image-collapsed';
    thumbWrap.className = className;
    thumbWrap.setAttribute('part', 'image-wrap');

    if (thumbSrc) {
      const thumb = document.createElement('img');
      thumb.className = 'image';
      thumb.setAttribute('part', 'image');
      thumb.src = thumbSrc;
      thumb.alt = link.altText ?? link.label ?? '';
      thumb.style.cursor = 'zoom-in';
      thumb.addEventListener('load', () => {
        if (thumb.naturalHeight > thumb.naturalWidth) {
          thumb.style.objectFit = 'contain';
          thumbWrap.style.maxHeight = this.drawerExpanded
            ? '0'
            : 'var(--alap-lens-image-portrait-max-height, 420px)';
        }
      });
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (thumb.src) this.openZoom(thumb.src);
      });
      thumbWrap.appendChild(thumb);
    }
    panel.appendChild(thumbWrap);
  }

  private renderDrawerHandle(panel: HTMLElement): void {
    const handle = document.createElement('div');
    handle.className = 'drawer-handle';
    handle.setAttribute('part', 'drawer-handle');

    const toggle = document.createElement('span');
    toggle.className = 'drawer-toggle';
    toggle.setAttribute('part', 'drawer-toggle');
    toggle.textContent = this.drawerExpanded ? ICON_DRAWER_DOWN : ICON_DRAWER_UP;

    handle.setAttribute('role', 'button');
    handle.setAttribute('aria-label', this.drawerExpanded ? 'Show image' : 'Expand details');
    handle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDrawer();
    });

    handle.appendChild(toggle);
    panel.appendChild(handle);
  }

  private renderDetails(container: HTMLElement, link: ResolvedLink): void {
    const thumbSrc = link.thumbnail || link.image;

    // Title row — label + photo credit on the same line
    const creditName = link.meta?.photoCredit as string | undefined;
    if (link.label || (creditName && thumbSrc)) {
      const titleRow = document.createElement('div');
      titleRow.className = 'title-row';
      titleRow.setAttribute('part', 'title-row');

      if (link.label) {
        const label = document.createElement('h2');
        label.className = 'label';
        label.setAttribute('part', 'label');
        label.textContent = link.label;
        titleRow.appendChild(label);
      }

      if (creditName && thumbSrc) {
        const creditEl = document.createElement('span');
        creditEl.className = 'credit';
        creditEl.setAttribute('part', 'credit');
        const creditUrl = link.meta?.photoCreditUrl as string | undefined;
        if (creditUrl) {
          const creditLink = document.createElement('a');
          creditLink.href = sanitizeUrlByTier(creditUrl, link);
          creditLink.target = '_blank';
          creditLink.rel = 'noopener noreferrer';
          creditLink.textContent = `Photo: ${creditName}`;
          creditEl.appendChild(creditLink);
        } else {
          creditEl.textContent = `Photo: ${creditName}`;
        }
        titleRow.appendChild(creditEl);
      }

      container.appendChild(titleRow);
    }

    // Tags + copy button
    if ((link.tags && link.tags.length > 0) || this.copyable) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'tags';
      tagsWrap.setAttribute('part', 'tags');

      if (link.tags) {
        for (const tag of link.tags) {
          const chip = document.createElement('span');
          chip.className = 'tag';
          if (this.activeTag === tag) chip.classList.add('active');
          chip.textContent = tag;
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.activeTag === tag) {
              // Toggle off — restore original set
              this.links = [...this.originalLinks];
              this.currentIndex = 0;
              this.activeTag = null;
              this.render();
              return;
            }
            const configName = this.getAttribute('config') ?? DEFAULT_CONFIG_KEY;
            const engine = getEngine(configName);
            if (!engine) return;
            const resolved = engine.resolve(`.${tag}`);
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
      container.appendChild(tagsWrap);
    }

    if (link.description) {
      const desc = document.createElement('p');
      desc.className = 'description';
      desc.setAttribute('part', 'description');
      desc.textContent = link.description;
      container.appendChild(desc);
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
    separator.className = 'separator';
    panel.appendChild(separator);

    const metaSection = document.createElement('dl');
    metaSection.className = 'meta';
    metaSection.setAttribute('part', 'meta');

    for (const [key, value] of entries) {
      if (value == null || value === '') continue;

      const displayHint = meta[`${key}${DISPLAY_HINT_SUFFIX}`] as string | undefined;
      // Thread the parent link into the field renderer so renderLinks can
      // sanitize each meta-URL by the parent's provenance tier (Surface 1-2).
      const rendered = this.renderMetaField(key, value, displayHint, link);
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
    actions.className = 'actions';
    actions.setAttribute('part', 'actions');

    if (link.url) {
      const visitBtn = document.createElement('a');
      visitBtn.className = 'visit';
      visitBtn.setAttribute('part', 'visit');
      visitBtn.href = sanitizeUrlByTier(link.url, link);
      visitBtn.target = sanitizeTargetWindowByTier(link.targetWindow, link) ?? '_blank';
      visitBtn.rel = 'noopener noreferrer';
      visitBtn.textContent = this.visitLabel;
      actions.appendChild(visitBtn);
    }

    if (this.panelCloseButton) {
      const closeBtn = this.createButton('close-btn', this.closeLabel, 'Close', () => this.close());
      closeBtn.setAttribute('part', 'close-btn');
      actions.appendChild(closeBtn);
    }

    panel.appendChild(actions);
  }

  private renderNav(panel: HTMLElement, total: number): void {
    const nav = document.createElement('div');
    nav.className = 'nav';
    nav.setAttribute('part', 'nav');

    const prevBtn = this.createButton('nav-prev', ICON_PREV, 'Previous', () => this.navigate(-1));
    prevBtn.setAttribute('part', 'nav-prev');
    nav.appendChild(prevBtn);

    const counterWrap = document.createElement('div');
    counterWrap.className = 'counter-wrap';
    counterWrap.setAttribute('part', 'counter-wrap');

    const counterText = document.createElement('span');
    counterText.className = 'counter';
    counterText.setAttribute('part', 'counter');
    counterWrap.appendChild(counterText);

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
      hoverHint: 'crossfade',
      parts: { setnav: 'setnav', filter: 'setnav-filter' },
      getActiveElement: () => this.shadowRoot?.activeElement ?? null,
    });

    nav.appendChild(counterWrap);

    const nextBtn = this.createButton('nav-next', ICON_NEXT, 'Next', () => this.navigate(1));
    nextBtn.setAttribute('part', 'nav-next');
    nav.appendChild(nextBtn);

    panel.appendChild(nav);
  }

  // --- Navigation transitions ---

  private getCssDuration(el: HTMLElement, prop: string, fallback: number): number {
    const raw = getComputedStyle(el).getPropertyValue(prop);
    const parsed = parseFloat(raw) * 1000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private navigate(delta: number): void {
    if (this.links.length <= 1) return;

    const nextIndex = (this.currentIndex + delta + this.links.length) % this.links.length;

    if (this.transitionMode === 'none') {
      this.currentIndex = nextIndex;
      this.render();
      return;
    }

    if (this.transitionMode === 'resize') {
      if (this.transitioning) return;
      this.navigateResize(nextIndex);
      return;
    }

    if (this.transitioning) {
      this.pendingDelta = delta;
      this.markRapid();
      return;
    }

    this.markRapid();
    this.navigateFade(nextIndex);
  }

  private markRapid(): void {
    if (this.rapidResetTimer !== null) clearTimeout(this.rapidResetTimer);
    this.rapidResetTimer = setTimeout(() => {
      this.rapidMode = false;
      this.rapidResetTimer = null;
    }, 1000);
  }

  private navigateFade(nextIndex: number): void {
    const panel = this.overlay?.querySelector('.panel') as HTMLElement | null;
    if (!panel) return;

    this.transitioning = true;
    panel.classList.add('panel-fading');

    const full = this.getCssDuration(panel, FADE_DURATION_PROP, FADE_DURATION_FALLBACK);
    const duration = this.rapidMode ? full / 2 : full;

    setTimeout(() => {
      this.currentIndex = nextIndex;
      this.render();
      const newPanel = this.overlay?.querySelector('.panel') as HTMLElement | null;
      if (newPanel) {
        newPanel.classList.add('panel-fading');
        void newPanel.offsetHeight;
        newPanel.classList.remove('panel-fading');
      }
      setTimeout(() => {
        this.transitioning = false;
        this.drainPending();
      }, duration);
    }, duration);
    this.rapidMode = true;
  }

  private drainPending(): void {
    if (this.pendingDelta !== null) {
      const delta = this.pendingDelta;
      this.pendingDelta = null;
      const nextIndex = (this.currentIndex + delta + this.links.length) % this.links.length;
      this.navigateFade(nextIndex);
    }
  }

  private navigateResize(nextIndex: number): void {
    const panel = this.overlay?.querySelector('.panel') as HTMLElement | null;
    if (!panel) return;

    this.transitioning = true;
    const duration = this.getCssDuration(panel, RESIZE_DURATION_PROP, RESIZE_DURATION_FALLBACK);

    const currentHeight = panel.scrollHeight;
    panel.style.height = `${currentHeight}px`;
    panel.style.overflow = 'hidden';

    this.currentIndex = nextIndex;
    this.render();

    const newPanel = this.overlay?.querySelector('.panel') as HTMLElement | null;
    if (!newPanel) { this.transitioning = false; return; }

    newPanel.style.height = `${currentHeight}px`;
    newPanel.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      newPanel.style.height = 'auto';
      const targetHeight = newPanel.scrollHeight;

      newPanel.style.height = `${currentHeight}px`;
      void newPanel.offsetHeight;
      newPanel.style.height = `${targetHeight}px`;

      const onEnd = () => {
        newPanel.removeEventListener('transitionend', onEnd);
        newPanel.style.height = '';
        newPanel.style.overflow = '';
        this.transitioning = false;
      };
      newPanel.addEventListener('transitionend', onEnd, { once: true });

      setTimeout(() => {
        if (this.transitioning) onEnd();
      }, duration + TRANSITION_SAFETY_BUFFER);
    });
  }

  private jumpTo(index: number): void {
    if (index === this.currentIndex) return;

    if (this.transitionMode === 'none') {
      this.currentIndex = index;
      this.render();
      return;
    }

    if (this.transitionMode === 'resize') {
      if (this.transitioning) return;
      this.navigateResize(index);
      return;
    }

    if (this.transitioning) return;

    this.navigateFade(index);
  }

  // --- Meta field rendering ---

  private renderMetaField(
    key: string,
    value: unknown,
    displayHint: string | undefined,
    parentLink: ResolvedLink,
  ): HTMLElement | null {
    const displayName = this.formatMetaKey(key);
    const hint = displayHint ?? this.detectDisplayType(value);

    switch (hint) {
      case DISPLAY_LIST:
        return this.renderChips(displayName, value as string[]);
      case DISPLAY_LINKS:
        return this.renderLinks(displayName, value as string[], parentLink);
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
    const metaLabels = this.getAttribute('meta-labels');
    if (metaLabels) {
      try {
        const labels = JSON.parse(metaLabels);
        if (labels[key]) return labels[key];
      } catch { /* ignore */ }
    }
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
    row.className = 'meta-row';

    const dt = document.createElement('dt');
    dt.className = 'meta-key';
    dt.textContent = label;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = 'meta-value';
    dd.textContent = value;
    row.appendChild(dd);

    return row;
  }

  private renderChips(label: string, values: string[]): HTMLElement {
    const row = document.createElement('div');
    row.className = 'meta-row';

    const dt = document.createElement('dt');
    dt.className = 'meta-key';
    dt.textContent = label;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = 'meta-chips';
    for (const v of values) {
      const chip = document.createElement('span');
      chip.className = 'meta-chip';
      chip.textContent = v;
      dd.appendChild(chip);
    }
    row.appendChild(dd);

    return row;
  }

  private renderLinks(label: string, urls: string[], parentLink: ResolvedLink): HTMLElement {
    const row = document.createElement('div');
    row.className = 'meta-row meta-row-links';

    const dt = document.createElement('dt');
    dt.className = 'meta-key';
    dt.textContent = `${label} (${urls.length})`;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = 'meta-links';

    const visible = urls.slice(0, MAX_VISIBLE_LINKS);
    for (const url of visible) {
      const a = document.createElement('a');
      a.className = 'meta-link';
      // Surface 1-2 mirror on the web-component path: each meta URL
      // inherits the parent link's provenance tier. protocol:* parents
      // pull their meta anchors through the strict sanitizer; javascript:
      // lands as about:blank.
      a.href = sanitizeUrlByTier(url, parentLink);
      a.target = '_blank';
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
      more.className = 'meta-more';
      more.textContent = `+${urls.length - MAX_VISIBLE_LINKS} more`;
      dd.appendChild(more);
    }

    row.appendChild(dd);
    return row;
  }

  private renderTextBlock(label: string, text: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'meta-row meta-row-text';

    const dt = document.createElement('dt');
    dt.className = 'meta-key';
    dt.textContent = label;
    row.appendChild(dt);

    const dd = document.createElement('dd');
    dd.className = 'meta-text';
    dd.textContent = text;
    row.appendChild(dd);

    return row;
  }

  // --- Copy to clipboard ---

  private renderCopyButton(container: HTMLElement, link: ResolvedLink): void {
    const btn = this.createButton('copy-btn', ICON_COPY, 'Copy to clipboard', () => {
      const text = this.buildClipboardText(link);
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = COPY_DONE_LABEL;
        btn.classList.add('done');
        setTimeout(() => {
          btn.textContent = ICON_COPY;
          btn.classList.remove('done');
        }, COPY_DONE_DURATION);
      });
    });
    container.appendChild(btn);
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
    const counter = this.overlay?.querySelector('.counter') as HTMLElement | null;
    if (!counter) return;

    const HALF = 500;
    const original = counter.textContent;

    counter.style.opacity = '0';

    setTimeout(() => {
      if (!counter.isConnected) return;
      counter.textContent = `switching to .${tag}`;
      counter.classList.add('tag-tooltip');
      counter.style.opacity = '1';

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

  // --- Drawer toggle ---

  private toggleDrawer(expand?: boolean): void {
    if (expand !== undefined && expand === this.drawerExpanded) return;
    this.drawerExpanded = expand ?? !this.drawerExpanded;

    const panel = this.overlay?.querySelector('.panel') as HTMLElement | null;
    if (!panel) return;

    const imageWrap = panel.querySelector('.image-wrap') as HTMLElement | null;
    if (imageWrap) {
      imageWrap.classList.toggle('image-collapsed', this.drawerExpanded);
    }
    const drawer = panel.querySelector('.drawer') as HTMLElement | null;
    if (drawer) {
      drawer.classList.toggle('drawer-expanded', this.drawerExpanded);
    }

    const handle = panel.querySelector('.drawer-handle') as HTMLElement | null;
    if (handle) {
      const toggle = handle.querySelector('.drawer-toggle');
      if (toggle) toggle.textContent = this.drawerExpanded ? ICON_DRAWER_DOWN : ICON_DRAWER_UP;
      handle.setAttribute('aria-label', this.drawerExpanded ? 'Show image' : 'Expand details');
    }
  }

  // --- Keyboard ---

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.toggleDrawer(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.toggleDrawer(false);
      return;
    }
    handleOverlayKeydown(e, {
      close: () => this.close(),
      prev: () => this.navigate(-1),
      next: () => this.navigate(1),
    });
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
export function defineAlapLens(tagName = 'alap-lens'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, AlapLensElement);
  }
}
