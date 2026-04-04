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

import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig, AlapLink } from '../../core/types';
import { warn } from '../../core/logger';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS, DEFAULT_PLACEMENT, DEFAULT_PLACEMENT_GAP, DEFAULT_VIEWPORT_PADDING } from '../../constants';
import { buildMenuList, handleMenuKeyboard, DismissTimer, resolveExistingUrlMode, injectExistingUrl, computePlacement, parsePlacement, applyPlacementClass, clearPlacementClass, observeTriggerOffscreen } from '../shared';
import type { AlapEventHooks, TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ParsedPlacement, PlacementResult, Size } from '../shared';

export type { AlapEventHooks, TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail };

export interface AlapUIOptions {
  /** CSS selector for trigger elements. Default: '.alap' */
  selector?: string;

  /** Menu auto-dismiss timeout in ms. Overrides config.settings.menuTimeout */
  menuTimeout?: number;

  /** Event hook callbacks */
  onTriggerHover?: AlapEventHooks['onTriggerHover'];
  onTriggerContext?: AlapEventHooks['onTriggerContext'];
  onItemHover?: AlapEventHooks['onItemHover'];
  onItemContext?: AlapEventHooks['onItemContext'];
}

export class AlapUI {
  private engine: AlapEngine;
  private config: AlapConfig;
  private container: HTMLElement | null = null;
  private timer: DismissTimer;
  private selector: string;
  private activeTrigger: HTMLElement | null = null;
  private hooks: AlapEventHooks;

  // Bound handlers (so we can remove them)
  private handleBodyClick: (e: MouseEvent) => void;
  private handleBodyKeydown: (e: KeyboardEvent) => void;
  private handleMenuLeave: () => void;
  private handleMenuEnter: () => void;
  private handleMenuKeydown: (e: KeyboardEvent) => void;
  private handleScroll: (() => void) | null = null;
  private lastPlacement: PlacementResult | null = null;
  private menuNaturalSize: Size | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(config: AlapConfig, options: AlapUIOptions = {}) {
    this.config = config;
    this.engine = new AlapEngine(config);
    this.selector = options.selector ?? '.alap';
    this.hooks = {
      onTriggerHover: options.onTriggerHover,
      onTriggerContext: options.onTriggerContext,
      onItemHover: options.onItemHover,
      onItemContext: options.onItemContext,
    };

    const menuTimeout = options.menuTimeout
      ?? (config.settings?.menuTimeout as number)
      ?? DEFAULT_MENU_TIMEOUT;

    this.timer = new DismissTimer(menuTimeout, () => this.closeMenu());

    // Pre-bind handlers
    this.handleBodyClick = this.onBodyClick.bind(this);
    this.handleBodyKeydown = this.onBodyKeydown.bind(this);
    this.handleMenuLeave = () => this.timer.start();
    this.handleMenuEnter = () => this.timer.stop();
    this.handleMenuKeydown = this.onMenuKeydown.bind(this);

    this.init();
  }

  // --- Setup ---

  private init(): void {
    this.createContainer();
    this.bindTriggers();
    this.bindGlobalEvents();
  }

  private createContainer(): void {
    const existing = document.getElementById('alapelem');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'alapelem';
    this.container.setAttribute('role', 'menu');
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
  }

  private bindTriggers(): void {
    const triggers = document.querySelectorAll<HTMLElement>(this.selector);
    if (triggers.length === 0) {
      warn(`No elements found for selector "${this.selector}"`);
    }
    for (const trigger of triggers) {
      trigger.removeEventListener('click', this.onTriggerClick);
      trigger.addEventListener('click', this.onTriggerClick.bind(this));

      // Event hooks: hover and context menu on triggers
      if (this.hooks.onTriggerHover) {
        trigger.addEventListener('mouseenter', () => {
          const query = trigger.getAttribute('data-alap-linkitems') ?? '';
          const detail: TriggerHoverDetail = { query, anchorId: trigger.id || undefined };
          this.hooks.onTriggerHover!(detail);
          trigger.dispatchEvent(new CustomEvent('alap:trigger-hover', { detail, bubbles: true }));
        });
      }

      if (this.hooks.onTriggerContext) {
        trigger.addEventListener('contextmenu', (e: MouseEvent) => {
          const query = trigger.getAttribute('data-alap-linkitems') ?? '';
          const detail: TriggerContextDetail = { query, anchorId: trigger.id || undefined, event: e };
          this.hooks.onTriggerContext!(detail);
          trigger.dispatchEvent(new CustomEvent('alap:trigger-context', { detail, bubbles: true }));
        });
      }

      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');

      if (!trigger.getAttribute('tabindex')) {
        trigger.setAttribute('tabindex', '0');
      }
    }
  }

  private bindGlobalEvents(): void {
    document.addEventListener('click', this.handleBodyClick);
    document.addEventListener('keydown', this.handleBodyKeydown);
  }

  // --- Trigger handling ---

  private onTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Use currentTarget (the element the listener is on), not target
    // (which could be a child element inside a div/span trigger)
    const trigger = event.currentTarget as HTMLElement;
    const expression = trigger.getAttribute('data-alap-linkitems');
    if (!expression) return;

    const anchorId = trigger.id || undefined;
    let links = this.engine.resolve(expression, anchorId);
    if (links.length === 0) return;

    const existingMode = resolveExistingUrlMode(
      trigger,
      this.config.settings?.existingUrl as 'prepend' | 'append' | 'ignore' | undefined,
    );
    links = injectExistingUrl(links, trigger, existingMode);

    if (this.activeTrigger) {
      this.activeTrigger.setAttribute('aria-expanded', 'false');
    }

    this.activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');

    this.renderMenu(links, trigger, event);
  }

  // --- Positioning ---

  /** Build the trigger rect for the placement engine. Images use click coords as a point rect. */
  private getTriggerRect(trigger: HTMLElement, event: MouseEvent): DOMRect | { top: number; left: number; bottom: number; right: number; width: number; height: number } {
    if (trigger.tagName.toLowerCase() === 'img') {
      // Synthetic 0×0 rect at click point for images
      const x = event.clientX;
      const y = event.clientY;
      return { top: y, left: x, bottom: y, right: x, width: 0, height: 0 };
    }
    return trigger.getBoundingClientRect();
  }

  /** Read and parse placement from the trigger element or config. */
  private getPlacement(trigger: HTMLElement): ParsedPlacement {
    const attr = trigger.getAttribute('data-alap-placement');
    if (attr) return parsePlacement(attr);
    const configVal = this.config.settings?.placement;
    if (typeof configVal === 'string') return parsePlacement(configVal);
    return parsePlacement(DEFAULT_PLACEMENT);
  }

  // --- Rendering ---

  private renderMenu(
    links: Array<{ id: string } & AlapLink>,
    trigger: HTMLElement,
    event: MouseEvent,
  ): void {
    if (!this.container) return;

    const anchorId = trigger.id || '';

    // CSS classes
    this.container.className = 'alapelem';
    if (anchorId) {
      this.container.classList.add(`alap_${anchorId}`);
    }

    // ARIA
    if (anchorId) {
      this.container.setAttribute('aria-labelledby', anchorId);
    }

    // Build menu using shared builder
    const listType = (this.config.settings?.listType as string) ?? 'ul';
    const maxVisibleItems = (this.config.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS;
    const list = buildMenuList(links, { listType, maxVisibleItems, defaultTargetWindow: this.config.settings?.targetWindow as string | undefined });

    this.container.innerHTML = '';
    this.container.appendChild(list);

    // Item event hooks
    if (this.hooks.onItemHover || this.hooks.onItemContext) {
      const expression = trigger.getAttribute('data-alap-linkitems') ?? '';
      const menuItems = list.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
      menuItems.forEach((a, index) => {
        const link = links[index];
        if (this.hooks.onItemHover) {
          a.addEventListener('mouseenter', () => {
            const detail: ItemHoverDetail = { id: link.id, link, query: expression };
            this.hooks.onItemHover!(detail);
            a.dispatchEvent(new CustomEvent('alap:item-hover', { detail, bubbles: true }));
          });
        }
        if (this.hooks.onItemContext) {
          a.addEventListener('contextmenu', (e: MouseEvent) => {
            const detail: ItemContextDetail = { id: link.id, link, query: expression, event: e };
            this.hooks.onItemContext!(detail);
            a.dispatchEvent(new CustomEvent('alap:item-context', { detail, bubbles: true }));
          });
        }
      });
    }

    // Menu events
    this.container.addEventListener('mouseleave', this.handleMenuLeave);
    this.container.addEventListener('mouseenter', this.handleMenuEnter);
    this.container.addEventListener('keydown', this.handleMenuKeydown);

    // --- Position the menu ---
    const viewportAdjust = this.config.settings?.viewportAdjust !== false;

    if (viewportAdjust) {
      // Measure off-screen to get natural size without causing scroll
      this.container.style.cssText = `
        position: fixed;
        visibility: hidden;
        top: -9999px;
        left: -9999px;
        z-index: 10;
        display: block;
        max-height: none;
        overflow: visible;
      `;

      const menuRect = this.container.getBoundingClientRect();
      this.menuNaturalSize = { width: menuRect.width, height: menuRect.height };

      const triggerRect = this.getTriggerRect(trigger, event);
      const parsed = this.getPlacement(trigger);
      const gap = (this.config.settings?.placementGap as number) ?? DEFAULT_PLACEMENT_GAP;
      const padding = (this.config.settings?.viewportPadding as number) ?? DEFAULT_VIEWPORT_PADDING;

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
      applyPlacementClass(this.container, result.placement);

      // Convert viewport coords to page coords and apply
      this.container.style.cssText = `
        position: absolute;
        display: block;
        z-index: 10;
        top: ${result.y + window.scrollY}px;
        left: ${result.x + window.scrollX}px;
        overflow-x: clip;
      `;

      if (result.maxHeight != null) {
        this.container.style.maxHeight = `${result.maxHeight}px`;
        this.container.style.overflowY = 'auto';

        // Remove inner list scroll — container handles it now
        const innerList = this.container.querySelector('ul, ol') as HTMLElement | null;
        if (innerList) {
          innerList.style.maxHeight = 'none';
          innerList.style.overflowY = '';
        }
      }

      if (result.maxWidth != null) {
        this.container.style.maxWidth = `${result.maxWidth}px`;
      }

      // Track scroll to dynamically recompute placement
      if (result.scrollY) {
        this.startScrollTracking(trigger, event);
      }
    } else {
      // viewportAdjust: false — static positioning (legacy behavior)
      const triggerRect = this.getTriggerRect(trigger, event);
      this.container.style.cssText = `
        position: absolute;
        display: block;
        z-index: 10;
        top: ${triggerRect.bottom + window.scrollY}px;
        left: ${triggerRect.left + window.scrollX}px;
      `;
    }

    // Observe trigger for scroll-away detection
    this.stopIntersectionObserver();
    if (this.activeTrigger) {
      this.intersectionObserver = observeTriggerOffscreen(
        this.activeTrigger,
        () => this.closeMenu(),
      );
    }

    // Focus first item
    const firstItem = this.container.querySelector<HTMLElement>('a[role="menuitem"]');
    if (firstItem) firstItem.focus();

    // Start dismiss timer
    this.timer.stop();
    this.timer.start();
  }

  // --- Scroll tracking ---

  private startScrollTracking(trigger: HTMLElement, event: MouseEvent): void {
    this.stopScrollTracking();
    const gap = (this.config.settings?.placementGap as number) ?? DEFAULT_PLACEMENT_GAP;
    const padding = (this.config.settings?.viewportPadding as number) ?? DEFAULT_VIEWPORT_PADDING;
    const parsed = this.getPlacement(trigger);

    this.handleScroll = () => {
      if (!this.container || this.container.style.display === 'none') return;
      if (!this.menuNaturalSize) return;

      const triggerRect = this.getTriggerRect(trigger, event);
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
      applyPlacementClass(this.container, result.placement);
      this.container.style.top = `${result.y + window.scrollY}px`;
      this.container.style.left = `${result.x + window.scrollX}px`;

      if (result.maxHeight != null) {
        this.container.style.maxHeight = `${result.maxHeight}px`;
        this.container.style.overflowY = 'auto';
      } else {
        this.container.style.maxHeight = '';
        this.container.style.overflowY = '';
      }
    };
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  private stopScrollTracking(): void {
    if (this.handleScroll) {
      window.removeEventListener('scroll', this.handleScroll);
      this.handleScroll = null;
    }
  }

  private stopIntersectionObserver(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  // --- Menu keyboard navigation ---

  private onMenuKeydown(event: KeyboardEvent): void {
    if (!this.container) return;

    const items = Array.from(
      this.container.querySelectorAll<HTMLElement>('a[role="menuitem"]')
    );

    handleMenuKeyboard(event, items, document.activeElement, () => this.closeMenu());
  }

  // --- Dismissal ---

  private onBodyClick(event: MouseEvent): void {
    if (!this.container) return;
    const target = event.target as HTMLElement;
    if (!target.closest('#alapelem')) {
      this.closeMenu();
    }
  }

  private onBodyKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMenu();
    }
  }

  private closeMenu(): void {
    if (!this.container) return;
    this.container.style.display = 'none';
    this.container.style.maxHeight = '';
    this.container.style.maxWidth = '';
    this.container.style.overflowY = '';
    this.container.style.overflowX = '';
    clearPlacementClass(this.container);
    this.lastPlacement = null;
    this.menuNaturalSize = null;
    this.stopScrollTracking();
    this.stopIntersectionObserver();
    this.timer.stop();

    if (this.activeTrigger) {
      this.activeTrigger.setAttribute('aria-expanded', 'false');
      this.activeTrigger.focus();
      this.activeTrigger = null;
    }
  }

  // --- Public API ---

  /** Re-scan the DOM for new trigger elements */
  refresh(): void {
    this.bindTriggers();
  }

  /** Update the configuration and re-scan */
  /**
   * Access the underlying engine for advanced operations like preResolve().
   */
  getEngine(): AlapEngine {
    return this.engine;
  }

  updateConfig(config: AlapConfig): void {
    this.config = config;
    this.engine.updateConfig(config);
    this.timer.setTimeout(
      (config.settings?.menuTimeout as number) ?? DEFAULT_MENU_TIMEOUT
    );
    this.refresh();
  }

  /** Clean up all event listeners and remove the menu container */
  destroy(): void {
    this.closeMenu();
    document.removeEventListener('click', this.handleBodyClick);
    document.removeEventListener('keydown', this.handleBodyKeydown);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
