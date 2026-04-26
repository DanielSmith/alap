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

import type { AlapConfig, ResolvedLink, SourceState } from '../../core/types';
import { warn } from '../../core/logger';
import { RENDERER_MENU } from '../shared/coordinatedRenderer';
import { getInstanceCoordinator } from '../shared/instanceCoordinator';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS, DEFAULT_PLACEMENT, DEFAULT_PLACEMENT_GAP, DEFAULT_VIEWPORT_PADDING } from '../../constants';
import { buildMenuList, handleMenuKeyboard, DismissTimer, resolveExistingUrlMode, injectExistingUrl, computePlacement, parsePlacement, applyPlacementClass, clearPlacementClass, observeTriggerOffscreen, registerConfig, updateRegisteredConfig, getEngine, getConfig, appendPlaceholders, ProgressiveRenderer, flipFromRect } from '../shared';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ParsedPlacement, PlacementResult, Size, ProgressiveRenderContext } from '../shared';

export { registerConfig, updateRegisteredConfig };

// ---------- Shadow DOM styles ----------

const STYLES = `
  :host {
    display: inline;
    position: relative;
  }

  ::slotted(*) {
    cursor: pointer;
  }

  /* --- Menu container --- */

  .menu {
    display: none;
    position: absolute;
    z-index: var(--alap-z-index, 10);
    top: 100%;
    left: 0;
    margin-top: var(--alap-gap, 0.5rem);
    min-width: var(--alap-min-width, 200px);
    max-width: var(--alap-max-width, none);
    background: var(--alap-bg, #ffffff);
    border: var(--alap-border-width, 1px) solid var(--alap-border, #e5e7eb);
    border-radius: var(--alap-radius, 6px);
    font-family: var(--alap-font, inherit);

    /* Corner shape — shorthand (1–4 values, like border-radius) */
    corner-shape: var(--alap-corner-shape, round);

    /* Shadows & filters */
    box-shadow: var(--alap-shadow, 0 4px 12px rgba(0, 0, 0, 0.1));
    filter: var(--alap-drop-shadow);

    /* Appearance */
    opacity: var(--alap-opacity, 1);
    backdrop-filter: var(--alap-backdrop);
    transition: var(--alap-menu-transition);
  }

  .menu[aria-hidden="false"] {
    display: block;
  }

  .menu:hover {
    box-shadow: var(--alap-menu-hover-shadow, var(--alap-shadow, 0 4px 12px rgba(0, 0, 0, 0.1)));
    filter: var(--alap-menu-hover-drop-shadow, var(--alap-drop-shadow));
  }

  /* --- Progressive loading state --- */
  /* Async fetch is still in flight: center the small "Loading…" menu over
     the host rather than running the compass placement engine, since a tiny
     placeholder would flip direction differently than the full menu.
     Override the positioning variables from outside the shadow root:
       alap-link {
         --alap-loading-top: 0;
         --alap-loading-transform: none;
       } */
  .menu[data-alap-loading-only] {
    top: var(--alap-loading-top, 50%);
    left: var(--alap-loading-left, 50%);
    right: auto;
    bottom: auto;
    margin: 0;
    max-height: none;
    max-width: none;
    overflow: var(--alap-loading-overflow, visible);
    transform: var(--alap-loading-transform, translate(-50%, -50%));
  }

  /* Appear animation for placeholder rows — users override via CSS vars:
       alap-link {
         --alap-transition-duration: 400ms;
         --alap-transition-easing: cubic-bezier(0.2, 0, 0, 1);
       } */
  .menu [data-alap-placeholder] {
    animation: alap-placeholder-fade-in
               var(--alap-transition-duration, 250ms)
               var(--alap-transition-easing, ease-out);
  }

  @keyframes alap-placeholder-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* --- List --- */

  ul, ol {
    list-style: none;
    margin: 0;
    padding: var(--alap-menu-padding, 0.25rem 0);
    /* Inherit the menu's shape so hover backgrounds clip to corners.
       overflow:hidden here clips child content (hover bg) without
       affecting .menu's own box-shadow. */
    border-radius: inherit;
    corner-shape: inherit;
    overflow: hidden;
    scrollbar-width: var(--alap-scrollbar-width, thin);
    scrollbar-color: var(--alap-scrollbar-color, #cbd5e1 transparent);
  }

  ul::-webkit-scrollbar, ol::-webkit-scrollbar {
    width: 6px;
  }

  ul::-webkit-scrollbar-thumb, ol::-webkit-scrollbar-thumb {
    background: var(--alap-scrollbar-thumb, #cbd5e1);
    border-radius: 3px;
  }

  ul::-webkit-scrollbar-track, ol::-webkit-scrollbar-track {
    background: var(--alap-scrollbar-track, transparent);
  }

  /* --- Items --- */

  li {
    margin: 0;
    padding: 0;
    border: var(--alap-item-border);
    border-radius: var(--alap-item-border-radius);
  }

  li + li {
    margin-top: var(--alap-item-gap, 0);
  }

  /* --- Links — base --- */

  a {
    display: block;
    padding: var(--alap-padding, 0.5rem 1rem);
    color: var(--alap-text, #1a1a1a);
    font-size: var(--alap-font-size, 0.9rem);
    font-family: var(--alap-font, inherit);
    font-weight: var(--alap-font-weight);
    letter-spacing: var(--alap-letter-spacing);
    line-height: var(--alap-line-height);
    text-decoration: var(--alap-text-decoration, none);
    text-transform: var(--alap-text-transform);
    text-align: var(--alap-text-align);
    text-shadow: var(--alap-text-shadow);
    text-overflow: var(--alap-text-overflow);
    overflow: var(--alap-overflow);
    white-space: var(--alap-white-space);
    cursor: var(--alap-cursor, pointer);
    transition: var(--alap-transition);
  }

  /* --- Links — hover --- */

  a:hover {
    background: var(--alap-hover-bg, #eff6ff);
    color: var(--alap-hover-text, #2563eb);
    box-shadow: var(--alap-hover-shadow);
    text-shadow: var(--alap-hover-text-shadow, var(--alap-text-shadow));
    text-decoration: var(--alap-hover-text-decoration, var(--alap-text-decoration, none));
    font-weight: var(--alap-hover-font-weight, var(--alap-font-weight));
    opacity: var(--alap-hover-opacity);
    transform: var(--alap-hover-transform);
    border: var(--alap-hover-border);
  }

  /* Dim non-hovered items when --alap-dim-unhovered is set */
  ul:hover a:not(:hover):not(:focus-visible),
  ol:hover a:not(:hover):not(:focus-visible) {
    opacity: var(--alap-dim-unhovered);
  }

  /* TODO: --alap-dim-adjacent — dim only the items immediately before
     and after the hovered item. Needs investigation — :has() with
     adjacent combinators targeting nested elements in shadow DOM
     is not working as expected. */


  /* --- Links — focus --- */

  a:focus-visible {
    background: var(--alap-focus-bg, var(--alap-hover-bg, #eff6ff));
    color: var(--alap-focus-text, var(--alap-hover-text, #2563eb));
    outline: 2px solid var(--alap-focus-ring, #2563eb);
    outline-offset: -2px;
    box-shadow: var(--alap-focus-shadow);
    text-shadow: var(--alap-focus-text-shadow, var(--alap-text-shadow));
    border: var(--alap-focus-border);
  }

  a:focus:not(:focus-visible) {
    outline: none;
  }

  /* --- Images --- */

  img {
    max-height: var(--alap-img-max-height, 4rem);
    border-radius: var(--alap-img-radius, 3px);
  }
`;

// ---------- The custom element ----------

export class AlapLinkElement extends HTMLElement {
  private menu: HTMLElement | null = null;
  private timer: DismissTimer | null = null;
  private isOpen = false;
  private openedViaKeyboard = false;
  private scrollHandler: (() => void) | null = null;
  private lastPlacement: PlacementResult | null = null;
  private menuNaturalSize: Size | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private instanceId: string;
  private unsubscribeCoordinator: (() => void) | null = null;
  private progressive: ProgressiveRenderer | null = null;
  private loadingRect: DOMRect | null = null;

  static get observedAttributes(): string[] {
    return ['query', 'config', 'href', 'placement'];
  }

  constructor() {
    super();
    this.instanceId = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const slot = document.createElement('slot');
    shadow.appendChild(slot);

    this.menu = document.createElement('div');
    this.menu.classList.add('menu');
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-hidden', 'true');
    this.menu.setAttribute('part', 'menu');
    shadow.appendChild(this.menu);
  }

  connectedCallback(): void {
    this.timer = new DismissTimer(this.getMenuTimeout(), () => this.closeMenu());

    this.progressive = new ProgressiveRenderer({
      engine: () => this.getEngine() ?? undefined,
      onRender: (ctx) => this.onProgressiveRender(ctx),
      cancelFetchOnDismiss: () =>
        this.getConfig()?.settings?.cancelFetchOnDismiss === true,
    });

    const coordinator = getInstanceCoordinator();
    this.unsubscribeCoordinator = coordinator.subscribe(
      this.instanceId,
      RENDERER_MENU,
      () => this.closeMenu(),
    );

    if (!this.getAttribute('role')) {
      this.setAttribute('role', 'button');
    }
    this.setAttribute('aria-haspopup', 'true');
    this.setAttribute('aria-expanded', 'false');
    if (!this.getAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.addEventListener('click', this.onTriggerClick);
    this.addEventListener('keydown', this.onTriggerKeydown);
    this.addEventListener('mouseenter', this.onTriggerHover);
    this.addEventListener('contextmenu', this.onTriggerContext);
    document.addEventListener('click', this.onDocumentClick);
    document.addEventListener('keydown', this.onDocumentKeydown);

    if (this.menu) {
      this.menu.addEventListener('mouseleave', this.onMenuLeave);
      this.menu.addEventListener('mouseenter', this.onMenuEnter);
      this.menu.addEventListener('keydown', this.onMenuKeydown);
    }
  }

  disconnectedCallback(): void {
    this.timer?.stop();
    if (this.unsubscribeCoordinator) {
      this.unsubscribeCoordinator();
      this.unsubscribeCoordinator = null;
    }
    this.removeEventListener('click', this.onTriggerClick);
    this.removeEventListener('keydown', this.onTriggerKeydown);
    this.removeEventListener('mouseenter', this.onTriggerHover);
    this.removeEventListener('contextmenu', this.onTriggerContext);
    document.removeEventListener('click', this.onDocumentClick);
    document.removeEventListener('keydown', this.onDocumentKeydown);
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue && this.isOpen) {
      this.closeMenu();
    }
  }

  // --- Engine lookup ---

  private getEngine() {
    const configName = this.getAttribute('config') ?? '_default';
    return getEngine(configName);
  }

  private getConfig(): AlapConfig | undefined {
    const configName = this.getAttribute('config') ?? '_default';
    return getConfig(configName);
  }

  private getMenuTimeout(): number {
    const config = this.getConfig();
    return (config?.settings?.menuTimeout as number) ?? DEFAULT_MENU_TIMEOUT;
  }

  // --- Trigger handling ---

  private onTriggerClick = (event: MouseEvent): void => {
    // Don't intercept clicks on menu items — let them navigate
    const path = event.composedPath();
    if (this.menu && path.includes(this.menu)) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.isOpen) {
      this.closeMenu();
      return;
    }

    const query = this.getAttribute('query');
    if (!query) return;

    const engine = this.getEngine();
    if (!engine) {
      warn(`<alap-link>: no config registered for "${this.getAttribute('config') ?? '_default'}". Call registerConfig() first.`);
      return;
    }

    // Progressive path — the renderer calls onProgressiveRender() on each
    // pass (first paint, and again when each async source settles).
    this.progressive?.start(this, query, event);
  };

  /**
   * Per-pass render callback fired by ProgressiveRenderer.
   *
   * Three UX phases:
   *   - loading-only (no resolved items yet) → center the menu over the host
   *     via the `data-alap-loading-only` data attribute, whose styles come
   *     from the shadow-DOM CSS block (all variables user-overridable).
   *   - loaded (resolved items present) → normal compass placement.
   *   - transitioning from loading → loaded → FLIP-animate the container
   *     from where the loading placeholder was to its placed position,
   *     using `--alap-transition-duration` / `--alap-transition-easing`.
   */
  private onProgressiveRender(ctx: ProgressiveRenderContext): void {
    if (!this.menu) return;

    const config = this.getConfig();
    const existingMode = resolveExistingUrlMode(
      this,
      config?.settings?.existingUrl as 'prepend' | 'append' | 'ignore' | undefined,
    );
    const hrefSource = this.getAttribute('href')
      ? this
      : (this.querySelector('a[href]') as HTMLElement | null);
    const links: ResolvedLink[] = hrefSource
      ? injectExistingUrl(ctx.state.resolved, hrefSource, existingMode)
      : ctx.state.resolved;

    // Capture prev rect BEFORE mutating — used by the FLIP animation below.
    const prevRect = ctx.transitioningFromLoading
      ? this.menu.getBoundingClientRect()
      : null;

    this.renderMenuWithPlaceholders(links, ctx.state.sources);
    this.bindItemHooks(links);

    if (ctx.isLoadingOnly) {
      this.menu.setAttribute('data-alap-loading-only', '');
    } else {
      this.menu.removeAttribute('data-alap-loading-only');
    }

    if (!ctx.isUpdate) {
      // First paint: open the menu. openMenu() skips compass placement when
      // loading-only (the shadow-DOM CSS positions the menu instead).
      this.openMenu(ctx.isLoadingOnly);
    } else if (ctx.transitioningFromLoading) {
      // Transitioning from loading → real content: recompute placement now
      // that the menu has its final size.
      this.applyComputedPlacement();
    }

    if (ctx.transitioningFromLoading && prevRect) {
      flipFromRect(this.menu, prevRect);
    }
  }

  /**
   * Like `renderMenu` but also appends progressive-loading placeholder rows
   * (one per pending/errored/empty async source). Used by the progressive
   * path; the plain `renderMenu` is kept for `openWith()` / legacy paths.
   */
  private renderMenuWithPlaceholders(
    links: Array<{ id: string } & import('../../core/types').AlapLink>,
    sources: readonly SourceState[],
  ): void {
    if (!this.menu) return;

    const config = this.getConfig();
    const listType = (config?.settings?.listType as string) ?? 'ul';
    const maxVisibleItems = (config?.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS;
    const list = buildMenuList(links, {
      listType,
      maxVisibleItems,
      defaultTargetWindow: config?.settings?.targetWindow as string | undefined,
      listAttributes: { part: 'list' },
      liAttributes: { part: 'item' },
      aAttributes: { part: 'link' },
      imgAttributes: { part: 'image' },
    });

    appendPlaceholders(list, sources);

    this.menu.innerHTML = '';
    this.menu.appendChild(list);
  }

  private onTriggerKeydown = (event: KeyboardEvent): void => {
    // Don't intercept Enter/Space on menu items — let them navigate
    if (this.menu && event.composedPath().includes(this.menu)) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openedViaKeyboard = true;
      this.click();
    }
  };

  // --- Rendering ---

  private renderMenu(links: Array<{ id: string } & import('../../core/types').AlapLink>): void {
    if (!this.menu) return;

    const config = this.getConfig();
    const listType = (config?.settings?.listType as string) ?? 'ul';
    const maxVisibleItems = (config?.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS;
    const list = buildMenuList(links, {
      listType,
      maxVisibleItems,
      defaultTargetWindow: config?.settings?.targetWindow as string | undefined,
      listAttributes: { part: 'list' },
      liAttributes: { part: 'item' },
      aAttributes: { part: 'link' },
      imgAttributes: { part: 'image' },
    });

    this.menu.innerHTML = '';
    this.menu.appendChild(list);
  }

  // --- Placement ---

  /** Read and parse placement from element attribute or config. */
  private getPlacement(): ParsedPlacement {
    const attr = this.getAttribute('placement');
    if (attr) return parsePlacement(attr);
    const config = this.getConfig();
    const configVal = config?.settings?.placement;
    if (typeof configVal === 'string') return parsePlacement(configVal);
    return parsePlacement(DEFAULT_PLACEMENT);
  }

  /** Read the gap value from --alap-gap CSS variable or config. */
  private getGap(): number {
    if (this.menu) {
      const raw = getComputedStyle(this.menu).getPropertyValue('--alap-gap').trim();
      if (raw) {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          // Convert rem to px if needed
          if (raw.endsWith('rem')) {
            return parsed * parseFloat(getComputedStyle(document.documentElement).fontSize);
          }
          return parsed;
        }
      }
    }
    const config = this.getConfig();
    return (config?.settings?.placementGap as number) ?? DEFAULT_PLACEMENT_GAP;
  }

  /** Apply a PlacementResult to the menu element using host-relative offsets. */
  private applyPlacement(result: PlacementResult): void {
    if (!this.menu) return;

    const hostRect = this.getBoundingClientRect();
    const offsetX = result.x - hostRect.left;
    const offsetY = result.y - hostRect.top;

    this.menu.style.top = `${offsetY}px`;
    this.menu.style.left = `${offsetX}px`;
    this.menu.style.bottom = '';
    this.menu.style.right = '';
    this.menu.style.marginTop = '0';
    this.menu.style.marginBottom = '0';
    this.menu.style.overflowX = 'clip';

    if (result.maxHeight != null) {
      this.menu.style.maxHeight = `${result.maxHeight}px`;
      this.menu.style.overflowY = 'auto';

      // Remove inner list scroll — menu container handles it now
      const innerList = this.menu.querySelector('ul, ol') as HTMLElement | null;
      if (innerList) {
        innerList.style.maxHeight = 'none';
        innerList.style.overflowY = '';
      }
    } else {
      this.menu.style.maxHeight = '';
      this.menu.style.overflowY = '';
    }

    if (result.maxWidth != null) {
      this.menu.style.maxWidth = `${result.maxWidth}px`;
    } else {
      this.menu.style.maxWidth = '';
    }
  }

  // --- Open / Close ---

  private openMenu(loadingOnly: boolean = false): void {
    if (!this.menu) return;

    // Close other menu instances (DOM, WC, framework) via coordinator
    getInstanceCoordinator().notifyOpen(this.instanceId);

    const config = this.getConfig();
    const adjustViewport = config?.settings?.viewportAdjust !== false;

    this.isOpen = true;
    this.setAttribute('aria-expanded', 'true');

    // Loading-only state: the shadow-DOM CSS rule for `data-alap-loading-only`
    // centers the menu on the host. Skip the compass placement engine —
    // measuring a tiny placeholder would yield a different direction than
    // the real menu will need.
    if (loadingOnly) {
      this.menu.setAttribute('aria-hidden', 'false');
      this.stopIntersectionObserver();
      this.intersectionObserver = observeTriggerOffscreen(this, () => this.closeMenu());
      this.timer?.start();
      return;
    }

    if (adjustViewport) {
      // Measure off-screen to get natural size without causing scroll or flicker
      this.menu.style.position = 'fixed';
      this.menu.style.visibility = 'hidden';
      this.menu.style.top = '-9999px';
      this.menu.style.left = '-9999px';
      this.menu.style.maxHeight = 'none';
      this.menu.style.overflow = 'visible';
      this.menu.setAttribute('aria-hidden', 'false');

      const menuRect = this.menu.getBoundingClientRect();
      this.menuNaturalSize = { width: menuRect.width, height: menuRect.height };

      const triggerRect = this.getBoundingClientRect();
      const parsed = this.getPlacement();
      const gap = this.getGap();
      const padding = (config?.settings?.viewportPadding as number) ?? DEFAULT_VIEWPORT_PADDING;

      const result = computePlacement({
        triggerRect,
        menuSize: this.menuNaturalSize,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        placement: parsed.compass,
        strategy: parsed.strategy,
        gap,
        padding,
      });

      this.lastPlacement = result;

      // Reset off-screen styles, then apply final position in one step
      this.menu.style.position = '';
      this.menu.style.visibility = '';
      this.menu.style.overflow = '';
      this.applyPlacement(result);
      applyPlacementClass(this.menu, result.placement);

      // Track scroll to dynamically recompute
      if (result.scrollY) {
        this.startScrollTracking();
      }
    } else {
      this.menu.setAttribute('aria-hidden', 'false');
    }

    // Observe trigger for scroll-away detection
    this.stopIntersectionObserver();
    this.intersectionObserver = observeTriggerOffscreen(
      this,
      () => this.closeMenu(),
    );

    if (this.openedViaKeyboard) {
      const first = this.menu.querySelector<HTMLElement>('a[role="menuitem"]');
      if (first) first.focus({ preventScroll: true });
    }
    this.openedViaKeyboard = false;

    this.timer?.start();
  }

  /**
   * Recompute compass placement for the current menu contents and apply it.
   * Used on re-render (e.g. transitioning from loading-only → resolved) where
   * the menu is already open but its size has changed.
   */
  private applyComputedPlacement(): void {
    if (!this.menu) return;
    const config = this.getConfig();
    const adjustViewport = config?.settings?.viewportAdjust !== false;
    if (!adjustViewport) return;

    // Measure off-screen so the natural size reflects the new content,
    // not the loading-only box. The inline styles below are cleared again
    // after the placement result is applied.
    this.menu.style.position = 'fixed';
    this.menu.style.visibility = 'hidden';
    this.menu.style.top = '-9999px';
    this.menu.style.left = '-9999px';
    this.menu.style.transform = '';
    this.menu.style.maxHeight = 'none';
    this.menu.style.overflow = 'visible';

    const menuRect = this.menu.getBoundingClientRect();
    this.menuNaturalSize = { width: menuRect.width, height: menuRect.height };

    const triggerRect = this.getBoundingClientRect();
    const parsed = this.getPlacement();
    const gap = this.getGap();
    const padding = (config?.settings?.viewportPadding as number) ?? DEFAULT_VIEWPORT_PADDING;

    const result = computePlacement({
      triggerRect,
      menuSize: this.menuNaturalSize,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      placement: parsed.compass,
      strategy: parsed.strategy,
      gap,
      padding,
    });

    this.lastPlacement = result;
    this.menu.style.position = '';
    this.menu.style.visibility = '';
    this.menu.style.overflow = '';
    this.menu.style.transform = ''; // loading's translate no longer applies
    this.applyPlacement(result);
    applyPlacementClass(this.menu, result.placement);

    if (result.scrollY) {
      this.startScrollTracking();
    }
  }

  private startScrollTracking(): void {
    this.stopScrollTracking();
    const config = this.getConfig();
    const gap = this.getGap();
    const padding = (config?.settings?.viewportPadding as number) ?? DEFAULT_VIEWPORT_PADDING;
    const parsed = this.getPlacement();

    this.scrollHandler = () => {
      if (!this.menu || !this.isOpen || !this.menuNaturalSize) return;

      const triggerRect = this.getBoundingClientRect();
      const result = computePlacement({
        triggerRect,
        menuSize: this.menuNaturalSize,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        placement: parsed.compass,
        strategy: parsed.strategy,
        gap,
        padding,
      });

      this.lastPlacement = result;
      this.applyPlacement(result);
      applyPlacementClass(this.menu, result.placement);
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  private stopScrollTracking(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }

  private stopIntersectionObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  closeMenu(): void {
    if (!this.menu) return;
    const wasOpen = this.isOpen;
    this.isOpen = false;
    // Stop any in-flight progressive render so late-arriving settles can't
    // re-render a dismissed menu.
    this.progressive?.stop();
    this.menu.removeAttribute('data-alap-loading-only');
    this.menu.setAttribute('aria-hidden', 'true');
    this.menu.style.top = '';
    this.menu.style.left = '';
    this.menu.style.bottom = '';
    this.menu.style.right = '';
    this.menu.style.marginTop = '';
    this.menu.style.marginBottom = '';
    this.menu.style.maxHeight = '';
    this.menu.style.maxWidth = '';
    this.menu.style.overflowY = '';
    this.menu.style.overflowX = '';
    this.menu.style.transform = '';
    clearPlacementClass(this.menu);
    this.lastPlacement = null;
    this.menuNaturalSize = null;
    this.setAttribute('aria-expanded', 'false');
    this.stopScrollTracking();
    this.stopIntersectionObserver();
    this.timer?.stop();
    if (wasOpen) this.focus();
  }

  // --- Menu keyboard navigation ---

  private onMenuKeydown = (event: KeyboardEvent): void => {
    if (!this.menu) return;

    const items = Array.from(
      this.menu.querySelectorAll<HTMLElement>('a[role="menuitem"]')
    );

    handleMenuKeyboard(
      event,
      items,
      this.shadowRoot?.activeElement ?? null,
      () => this.closeMenu(),
    );
  };

  // --- Event hooks ---

  private onTriggerHover = (): void => {
    const query = this.getAttribute('query') ?? '';
    const detail: TriggerHoverDetail = { query, anchorId: this.id || undefined };
    this.dispatchEvent(new CustomEvent('alap:trigger-hover', { detail, bubbles: true, composed: true }));
  };

  private onTriggerContext = (event: MouseEvent): void => {
    const query = this.getAttribute('query') ?? '';
    const detail: TriggerContextDetail = { query, anchorId: this.id || undefined, event };
    this.dispatchEvent(new CustomEvent('alap:trigger-context', { detail, bubbles: true, composed: true }));
  };

  private bindItemHooks(links: Array<{ id: string } & import('../../core/types').AlapLink>): void {
    if (!this.menu) return;
    const query = this.getAttribute('query') ?? '';
    const menuItems = this.menu.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
    menuItems.forEach((a, index) => {
      const link = links[index];
      a.addEventListener('mouseenter', () => {
        const detail: ItemHoverDetail = { id: link.id, link, query };
        this.dispatchEvent(new CustomEvent('alap:item-hover', { detail, bubbles: true, composed: true }));
      });
      a.addEventListener('contextmenu', (e: MouseEvent) => {
        const detail: ItemContextDetail = { id: link.id, link, query, event: e };
        this.dispatchEvent(new CustomEvent('alap:item-context', { detail, bubbles: true, composed: true }));
      });
    });
  }

  // --- Dismissal ---

  private onDocumentClick = (event: MouseEvent): void => {
    if (!this.isOpen) return;
    if (!event.composedPath().includes(this)) {
      this.closeMenu();
    }
  };

  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isOpen) {
      this.closeMenu();
    }
  };

  private onMenuLeave = (): void => {
    this.timer?.start();
  };

  private onMenuEnter = (): void => {
    this.timer?.stop();
  };
}

/**
 * Define the custom element. Call this once at startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function defineAlapLink(tagName = 'alap-link'): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, AlapLinkElement);
  }
}
