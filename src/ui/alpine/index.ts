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

/**
 * alap/alpine — Alpine.js plugin for Alap.
 *
 * Registers an `x-alap` directive that turns any element into an Alap menu trigger.
 *
 * Usage:
 *
 *   import Alpine from 'alpinejs';
 *   import { alapPlugin } from 'alap/alpine';
 *
 *   Alpine.plugin(alapPlugin);
 *   Alpine.start();
 *
 * HTML:
 *
 *   <div x-data="{ config: myAlapConfig }">
 *     <a x-alap="{ query: '.coffee', config: config }">Cafes</a>
 *     <span x-alap="{ query: '.nyc + .bridge', config: config }">NYC Bridges</span>
 *   </div>
 *
 * The directive value is an object: { query, config, listType?, menuTimeout?, maxVisibleItems? }
 */

import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig, AlapLink as AlapLinkType, ProtocolHandlerRegistry, ResolvedLink, SourceState } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MENU_Z_INDEX, DEFAULT_MAX_VISIBLE_ITEMS, DEFAULT_PLACEMENT_GAP } from '../../constants';
import { buildMenuList, handleMenuKeyboard, DismissTimer, calcPlacementAfterLayout, applyPlacementClass, clearPlacementClass, observeTriggerOffscreen, ProgressiveRenderer, flipFromRect, centerOverTrigger, appendPlaceholders } from '../shared';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ProgressiveRenderContext } from '../shared';

// Re-export core types for convenience
export type { AlapConfig, AlapLinkType as AlapLink };

export interface AlapDirectiveValue {
  query: string;
  config: AlapConfig;
  /**
   * Protocol handler registry. Required for any expression that uses a
   * protocol (`:web:`, `:time:`, `:hn:`, custom…). Attached to the directive's
   * engine at construction; the engine is rebuilt when `config` changes.
   */
  handlers?: ProtocolHandlerRegistry;
  listType?: 'ul' | 'ol';
  menuTimeout?: number;
  maxVisibleItems?: number;
  /** Placement string, e.g. "SE", "SE, clamp", "N, place". When set, uses the placement engine. */
  placement?: string;
  /** Pixel gap between trigger and menu edge. Default: 4. */
  gap?: number;
  /** Minimum pixel distance from viewport edges. Default: 8. */
  padding?: number;
}

// --- Menu coordinator (delegates to global InstanceCoordinator) ---

import { RENDERER_MENU } from '../shared/coordinatedRenderer';
import { getInstanceCoordinator } from '../shared/instanceCoordinator';

function subscribeMenu(id: string, close: () => void): () => void {
  return getInstanceCoordinator().subscribe(id, RENDERER_MENU, close);
}

function notifyMenuOpen(id: string): void {
  getInstanceCoordinator().notifyOpen(id);
}

// --- Shared menu container ---

const MENU_STYLES = `
  position: absolute;
  z-index: ${DEFAULT_MENU_Z_INDEX};
  display: none;
`;

const MENU_STYLES_OPEN = 'display: block;';

// --- Alpine type helpers ---
// Alpine.js doesn't ship its own types; we define the minimum needed.

interface AlpineInstance {
  directive(
    name: string,
    callback: (
      el: HTMLElement,
      directive: { expression: string; modifiers: string[] },
      utilities: {
        evaluate: (expression: string) => unknown;
        cleanup: (fn: () => void) => void;
      },
    ) => void,
  ): void;
}

// --- The plugin ---

export function alapPlugin(Alpine: AlpineInstance): void {
  Alpine.directive('alap', (el, { expression }, { evaluate, cleanup }) => {
    let menuEl: HTMLElement | null = null;
    let isOpen = false;
    let openedViaKeyboard = false;
    let timer: DismissTimer | null = null;
    let engine: AlapEngine | null = null;
    let currentConfig: AlapConfig | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let progressive: ProgressiveRenderer | null = null;
    let lastClickEvent: MouseEvent | null = null;
    let lastOpts: AlapDirectiveValue | null = null;

    // Coordinator: close this menu when another opens
    const uid = Math.random().toString(36).slice(2, 8);
    const unsubscribe = subscribeMenu(uid, () => {
      if (isOpen) closeMenu();
    });
    cleanup(unsubscribe);

    // --- Helpers ---

    function getDirectiveValue(): AlapDirectiveValue | null {
      try {
        const val = evaluate(expression);
        if (val && typeof val === 'object' && 'query' in val && 'config' in val) {
          return val as AlapDirectiveValue;
        }
      } catch { /* expression eval failed */ }
      return null;
    }

    function ensureEngine(config: AlapConfig, handlers?: ProtocolHandlerRegistry): AlapEngine {
      if (!engine || config !== currentConfig) {
        engine = new AlapEngine(config, { handlers });
        currentConfig = config;
      }
      return engine;
    }

    function ensureMenuEl(): HTMLElement {
      if (menuEl) return menuEl;
      menuEl = document.createElement('div');
      menuEl.setAttribute('role', 'menu');
      menuEl.setAttribute('aria-hidden', 'true');
      menuEl.className = 'alapelem';
      menuEl.style.cssText = MENU_STYLES;
      document.body.appendChild(menuEl);

      // Attach menu-specific events once
      menuEl.addEventListener('keydown', onMenuKeydown);
      menuEl.addEventListener('mouseleave', onMenuLeave);
      menuEl.addEventListener('mouseenter', onMenuEnter);

      return menuEl;
    }

    /**
     * Rebuild the menu's contents and (re-)place it. Called once on first paint
     * and again each time a pending async source settles. During the loading-
     * only phase we skip the compass placement engine in favor of
     * `centerOverTrigger`, then FLIP-animate into position on transition.
     */
    function renderProgressive(
      links: ResolvedLink[],
      sources: readonly SourceState[],
      opts: AlapDirectiveValue,
      isUpdate: boolean,
      transitioningFromLoading: boolean,
    ): void {
      const menu = ensureMenuEl();
      const isLoadingOnly = links.length === 0 && sources.length > 0;

      // Capture the previous box before mutating — used by the FLIP animation
      // when transitioning from the tiny loading placeholder to the final menu.
      const prevRect = isUpdate ? menu.getBoundingClientRect() : null;

      const listType = opts.listType ?? opts.config.settings?.listType as string ?? 'ul';
      const maxVisibleItems = opts.maxVisibleItems
        ?? (opts.config.settings?.maxVisibleItems as number)
        ?? DEFAULT_MAX_VISIBLE_ITEMS;

      const list = buildMenuList(links, { listType, maxVisibleItems, defaultTargetWindow: opts.config.settings?.targetWindow as string | undefined });
      appendPlaceholders(list, sources);
      menu.innerHTML = '';
      menu.appendChild(list);

      // Item event hooks — only real items have role="menuitem"; placeholders
      // deliberately omit it, so this loop naturally skips them.
      const menuItems = list.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
      menuItems.forEach((a, index) => {
        const link = links[index];
        a.addEventListener('mouseenter', () => {
          const detail: ItemHoverDetail = { id: link.id, link, query: opts.query };
          el.dispatchEvent(new CustomEvent('alap:item-hover', { detail, bubbles: true }));
        });
        a.addEventListener('contextmenu', (e: MouseEvent) => {
          const detail: ItemContextDetail = { id: link.id, link, query: opts.query, event: e };
          el.dispatchEvent(new CustomEvent('alap:item-context', { detail, bubbles: true }));
        });
      });

      if (el.id) {
        menu.setAttribute('aria-labelledby', el.id);
        menu.classList.add(`alap_${el.id}`);
      }

      if (isLoadingOnly) {
        menu.setAttribute('data-alap-loading-only', '');
      } else {
        menu.removeAttribute('data-alap-loading-only');
      }

      if (isLoadingOnly) {
        // Skip compass placement; centerOverTrigger positions via CSS-var-
        // driven inline styles (users override via --alap-loading-*).
        menu.style.cssText = MENU_STYLES + MENU_STYLES_OPEN;
        clearPlacementClass(menu);
        if (lastClickEvent) {
          centerOverTrigger(menu, el, lastClickEvent, DEFAULT_MENU_Z_INDEX);
        }
      } else if (opts.placement) {
        // Placement engine: measure off-screen, then position.
        menu.style.cssText = MENU_STYLES + MENU_STYLES_OPEN + 'visibility: hidden;';

        calcPlacementAfterLayout(el, menu, {
          placement: opts.placement,
          gap: opts.gap,
          padding: opts.padding,
        }, (state) => {
          if (!state) {
            const rect = el.getBoundingClientRect();
            menu.style.top = `${rect.bottom + window.scrollY + DEFAULT_PLACEMENT_GAP}px`;
            menu.style.left = `${rect.left + window.scrollX}px`;
          } else {
            const { result } = state;
            menu.style.top = `${result.y + window.scrollY}px`;
            menu.style.left = `${result.x + window.scrollX}px`;
            if (result.maxHeight != null) {
              menu.style.maxHeight = `${result.maxHeight}px`;
              menu.style.overflowY = 'auto';
            }
            if (result.maxWidth != null) {
              menu.style.maxWidth = `${result.maxWidth}px`;
              menu.style.minWidth = '0px';
            }
            applyPlacementClass(menu, result.placement);
          }
          menu.style.visibility = 'visible';
          if (transitioningFromLoading && prevRect) {
            flipFromRect(menu, prevRect);
          }
          if (openedViaKeyboard) {
            const first = menu.querySelector<HTMLElement>('a[role="menuitem"]');
            if (first) first.focus();
            openedViaKeyboard = false;
          }
        });
      } else {
        // No placement engine — position directly below trigger
        menu.style.cssText = MENU_STYLES + MENU_STYLES_OPEN;
        const rect = el.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + DEFAULT_PLACEMENT_GAP}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        if (transitioningFromLoading && prevRect) {
          flipFromRect(menu, prevRect);
        }
        if (openedViaKeyboard) {
          const first = menu.querySelector<HTMLElement>('a[role="menuitem"]');
          if (first) first.focus();
          openedViaKeyboard = false;
        }
      }

      if (!isUpdate) {
        notifyMenuOpen(uid);
        menu.setAttribute('aria-hidden', 'false');
        el.setAttribute('aria-expanded', 'true');
        isOpen = true;

        if (intersectionObserver) intersectionObserver.disconnect();
        intersectionObserver = observeTriggerOffscreen(el, closeMenu);

        const timeout = opts.menuTimeout
          ?? (opts.config.settings?.menuTimeout as number)
          ?? DEFAULT_MENU_TIMEOUT;
        timer = new DismissTimer(timeout, closeMenu);
        timer.start();
      }
    }

    function closeMenu(): void {
      progressive?.stop();
      if (!menuEl) return;
      const wasOpen = isOpen;
      menuEl.style.cssText = MENU_STYLES;
      menuEl.removeAttribute('data-alap-loading-only');
      clearPlacementClass(menuEl);
      menuEl.setAttribute('aria-hidden', 'true');
      el.setAttribute('aria-expanded', 'false');
      isOpen = false;
      timer?.stop();
      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }
      if (wasOpen) el.focus();
    }

    // --- Event handlers ---

    function onTriggerClick(event: MouseEvent): void {
      event.preventDefault();
      event.stopPropagation();

      if (isOpen) {
        closeMenu();
        return;
      }

      const opts = getDirectiveValue();
      if (!opts) return;

      lastOpts = opts;
      lastClickEvent = event;
      const eng = ensureEngine(opts.config, opts.handlers);

      // Build (or reuse) the progressive renderer for this directive. The
      // onRender callback fires on first paint and again each time a pending
      // source settles; we feed its payload straight into renderProgressive().
      if (!progressive) {
        progressive = new ProgressiveRenderer({
          engine: eng,
          onRender: (renderCtx: ProgressiveRenderContext) => {
            if (!lastOpts) return;
            renderProgressive(
              renderCtx.state.resolved as ResolvedLink[],
              renderCtx.state.sources,
              lastOpts,
              renderCtx.isUpdate,
              renderCtx.transitioningFromLoading,
            );
          },
          cancelFetchOnDismiss: () => lastOpts?.config.settings?.cancelFetchOnDismiss === true,
        });
      }

      progressive.start(el, opts.query, event, el.id || undefined);
    }

    function onTriggerKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openedViaKeyboard = true;
        el.click();
      }
    }

    function onDocumentClick(event: MouseEvent): void {
      if (!isOpen) return;
      if (el.contains(event.target as Node)) return;
      if (menuEl?.contains(event.target as Node)) return;
      closeMenu();
    }

    function onDocumentKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
    }

    function onMenuKeydown(event: KeyboardEvent): void {
      if (!menuEl) return;
      const items = Array.from(
        menuEl.querySelectorAll<HTMLElement>('a[role="menuitem"]'),
      );
      handleMenuKeyboard(event, items, document.activeElement, closeMenu);
    }

    function onMenuLeave(): void {
      timer?.start();
    }

    function onMenuEnter(): void {
      timer?.stop();
    }

    // --- Setup ARIA on trigger ---

    if (!el.getAttribute('role') && el.tagName !== 'A' && el.tagName !== 'BUTTON') {
      el.setAttribute('role', 'button');
    }
    el.setAttribute('aria-haspopup', 'true');
    el.setAttribute('aria-expanded', 'false');
    if (!el.getAttribute('tabindex') && el.tagName !== 'A' && el.tagName !== 'BUTTON') {
      el.setAttribute('tabindex', '0');
    }

    // --- Event hooks (trigger hover / context) ---

    function onTriggerHover(): void {
      const opts = getDirectiveValue();
      if (!opts) return;
      const detail: TriggerHoverDetail = { query: opts.query, anchorId: el.id || undefined };
      el.dispatchEvent(new CustomEvent('alap:trigger-hover', { detail, bubbles: true }));
    }

    function onTriggerContext(event: MouseEvent): void {
      const opts = getDirectiveValue();
      if (!opts) return;
      const detail: TriggerContextDetail = { query: opts.query, anchorId: el.id || undefined, event };
      el.dispatchEvent(new CustomEvent('alap:trigger-context', { detail, bubbles: true }));
    }

    // --- Bind events ---

    el.addEventListener('click', onTriggerClick);
    el.addEventListener('keydown', onTriggerKeydown);
    el.addEventListener('mouseenter', onTriggerHover);
    el.addEventListener('contextmenu', onTriggerContext);
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);

    // --- Cleanup ---

    cleanup(() => {
      el.removeEventListener('click', onTriggerClick);
      el.removeEventListener('keydown', onTriggerKeydown);
      el.removeEventListener('mouseenter', onTriggerHover);
      el.removeEventListener('contextmenu', onTriggerContext);
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      timer?.stop();
      progressive?.stop();
      progressive = null;
      menuEl?.remove();
    });
  });
}

