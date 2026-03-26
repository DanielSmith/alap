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
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';
import { buildMenuList, handleMenuKeyboard, DismissTimer, resolveExistingUrlMode, injectExistingUrl } from '../shared';
import type { AlapEventHooks, TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from '../shared';

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
    document.body.addEventListener('click', this.handleBodyClick);
    document.body.addEventListener('keydown', this.handleBodyKeydown);
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

    const position = this.getPosition(trigger, event);
    this.renderMenu(links, trigger, position);
  }

  // --- Positioning ---

  private getPosition(trigger: HTMLElement, event: MouseEvent): { top: number; left: number } {
    const tag = trigger.tagName.toLowerCase();

    // For images: position at click coordinates (feels natural for large visuals)
    if (tag === 'img') {
      return { top: event.pageY, left: event.pageX };
    }

    // For inline elements (a, span) and block elements (div, etc.):
    // position below the trigger element
    const rect = trigger.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
  }

  // --- Rendering ---

  private renderMenu(
    links: Array<{ id: string } & AlapLink>,
    trigger: HTMLElement,
    position: { top: number; left: number },
  ): void {
    if (!this.container) return;

    const anchorId = trigger.id || '';

    // Position
    this.container.style.cssText = `
      position: absolute;
      display: block;
      z-index: 10;
      left: ${position.left}px;
      top: ${position.top}px;
    `;

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

    // Viewport adjustment: flip menu above trigger if it overflows the bottom
    const viewportAdjust = this.config.settings?.viewportAdjust !== false;
    if (viewportAdjust) {
      this.adjustForViewport(trigger, position);
    }

    // Focus first item
    const firstItem = this.container.querySelector<HTMLElement>('a[role="menuitem"]');
    if (firstItem) firstItem.focus();

    // Start dismiss timer
    this.timer.stop();
    this.timer.start();
  }

  // --- Viewport adjustment ---

  private adjustForViewport(
    trigger: HTMLElement,
    position: { top: number; left: number },
  ): void {
    if (!this.container) return;

    const menuRect = this.container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Flip vertically if menu overflows the bottom
    if (menuRect.bottom > viewportHeight) {
      const triggerRect = trigger.getBoundingClientRect();
      const tag = trigger.tagName.toLowerCase();

      if (tag === 'img') {
        // For image triggers: position above the click point
        this.container.style.top = `${position.top - menuRect.height}px`;
      } else {
        // For element triggers: position above the trigger
        const above = triggerRect.top + window.scrollY - menuRect.height;
        this.container.style.top = `${Math.max(0 + window.scrollY, above)}px`;
      }
    }

    // Shift left if menu overflows the right edge
    if (menuRect.right > viewportWidth) {
      const overflow = menuRect.right - viewportWidth;
      this.container.style.left = `${Math.max(0, position.left - overflow)}px`;
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
    document.body.removeEventListener('click', this.handleBodyClick);
    document.body.removeEventListener('keydown', this.handleBodyKeydown);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
