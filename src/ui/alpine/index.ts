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
import type { AlapConfig, AlapLink as AlapLinkType } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';
import { buildMenuList, handleMenuKeyboard, DismissTimer } from '../shared';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from '../shared';

// Re-export core types for convenience
export type { AlapConfig, AlapLinkType as AlapLink };

export interface AlapDirectiveValue {
  query: string;
  config: AlapConfig;
  listType?: 'ul' | 'ol';
  menuTimeout?: number;
  maxVisibleItems?: number;
}

// --- Shared menu container ---

const MENU_STYLES = `
  position: absolute;
  z-index: 9999;
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
    let timer: DismissTimer | null = null;
    let engine: AlapEngine | null = null;
    let currentConfig: AlapConfig | null = null;

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

    function ensureEngine(config: AlapConfig): AlapEngine {
      if (!engine || config !== currentConfig) {
        engine = new AlapEngine(config);
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

    function openMenu(links: Array<{ id: string } & AlapLinkType>, opts: AlapDirectiveValue): void {
      const menu = ensureMenuEl();

      const listType = opts.listType ?? opts.config.settings?.listType as string ?? 'ul';
      const maxVisibleItems = opts.maxVisibleItems
        ?? (opts.config.settings?.maxVisibleItems as number)
        ?? DEFAULT_MAX_VISIBLE_ITEMS;

      const list = buildMenuList(links, { listType, maxVisibleItems, defaultTargetWindow: opts.config.settings?.targetWindow as string | undefined });
      menu.innerHTML = '';
      menu.appendChild(list);

      // Item event hooks
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

      // Position below trigger
      const rect = el.getBoundingClientRect();
      menu.style.cssText = MENU_STYLES + MENU_STYLES_OPEN;
      menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
      menu.style.left = `${rect.left + window.scrollX}px`;
      menu.setAttribute('aria-hidden', 'false');
      el.setAttribute('aria-expanded', 'true');
      isOpen = true;

      // Focus first item
      const first = menu.querySelector<HTMLElement>('a[role="menuitem"]');
      if (first) first.focus();

      // Start dismiss timer
      const timeout = opts.menuTimeout
        ?? (opts.config.settings?.menuTimeout as number)
        ?? DEFAULT_MENU_TIMEOUT;
      timer = new DismissTimer(timeout, closeMenu);
      timer.start();
    }

    function closeMenu(): void {
      if (!menuEl) return;
      menuEl.style.cssText = MENU_STYLES;
      menuEl.setAttribute('aria-hidden', 'true');
      el.setAttribute('aria-expanded', 'false');
      isOpen = false;
      timer?.stop();
      el.focus();
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

      const eng = ensureEngine(opts.config);
      const links = eng.resolve(opts.query, el.id || undefined);
      if (links.length === 0) return;

      openMenu(links, opts);
    }

    function onTriggerKeydown(event: KeyboardEvent): void {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
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
      menuEl?.remove();
    });
  });
}

