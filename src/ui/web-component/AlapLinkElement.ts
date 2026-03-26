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
import type { AlapConfig } from '../../core/types';
import { warn } from '../../core/logger';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';
import { buildMenuList, handleMenuKeyboard, DismissTimer, resolveExistingUrlMode, injectExistingUrl } from '../shared';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from '../shared';

/**
 * Global registry of AlapEngine instances keyed by config name.
 * Web components look up their engine by the `config` attribute.
 * The default config (unnamed) uses the key '_default'.
 */
const engineRegistry = new Map<string, AlapEngine>();
const configRegistry = new Map<string, AlapConfig>();

/**
 * Register a config so that <alap-link> elements can use it.
 *
 *   registerConfig(myConfig);                // registers as '_default'
 *   registerConfig(myConfig, 'secondary');   // registers as 'secondary'
 */
export function registerConfig(config: AlapConfig, name = '_default'): void {
  configRegistry.set(name, config);
  engineRegistry.set(name, new AlapEngine(config));
}

/**
 * Update a previously registered config.
 */
export function updateRegisteredConfig(config: AlapConfig, name = '_default'): void {
  const engine = engineRegistry.get(name);
  if (engine) {
    engine.updateConfig(config);
    configRegistry.set(name, config);
  } else {
    registerConfig(config, name);
  }
}

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

  static get observedAttributes(): string[] {
    return ['query', 'config', 'href'];
  }

  constructor() {
    super();
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

  private getEngine(): AlapEngine | undefined {
    const configName = this.getAttribute('config') ?? '_default';
    return engineRegistry.get(configName);
  }

  private getConfig(): AlapConfig | undefined {
    const configName = this.getAttribute('config') ?? '_default';
    return configRegistry.get(configName);
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

    const anchorId = this.id || undefined;
    let links = engine.resolve(query, anchorId);
    if (links.length === 0) return;

    const config = this.getConfig();
    const existingMode = resolveExistingUrlMode(
      this,
      config?.settings?.existingUrl as 'prepend' | 'append' | 'ignore' | undefined,
    );
    // Check for href on the element itself, or on a slotted <a>
    const hrefSource = this.getAttribute('href')
      ? this
      : this.querySelector('a[href]') as HTMLElement | null;
    if (hrefSource) {
      links = injectExistingUrl(links, hrefSource, existingMode);
    }

    this.renderMenu(links);
    this.bindItemHooks(links);
    this.openMenu();
  };

  private onTriggerKeydown = (event: KeyboardEvent): void => {
    // Don't intercept Enter/Space on menu items — let them navigate
    if (this.menu && event.composedPath().includes(this.menu)) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
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

  // --- Open / Close ---

  private openMenu(): void {
    if (!this.menu) return;

    // Close any other open alap-link menus
    for (const el of document.querySelectorAll('alap-link[aria-expanded="true"]')) {
      if (el !== this && 'closeMenu' in el) {
        (el as any).closeMenu();
      }
    }

    this.isOpen = true;
    this.menu.setAttribute('aria-hidden', 'false');
    this.setAttribute('aria-expanded', 'true');

    // Viewport adjustment: flip menu above trigger if it overflows the bottom
    const config = this.getConfig();
    if (config?.settings?.viewportAdjust !== false) {
      this.adjustMenuForViewport();
    }

    const first = this.menu.querySelector<HTMLElement>('a[role="menuitem"]');
    if (first) first.focus();

    this.timer?.start();
  }

  private adjustMenuForViewport(): void {
    if (!this.menu) return;

    // Reset to default position first
    this.menu.style.top = '';
    this.menu.style.bottom = '';
    this.menu.style.left = '';
    this.menu.style.right = '';

    const menuRect = this.menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Flip vertically if menu overflows the bottom
    if (menuRect.bottom > viewportHeight) {
      this.menu.style.top = 'auto';
      this.menu.style.bottom = '100%';
      this.menu.style.marginTop = '0';
      this.menu.style.marginBottom = '0.5rem';
    }

    // Shift left if menu overflows the right edge
    if (menuRect.right > viewportWidth) {
      this.menu.style.left = 'auto';
      this.menu.style.right = '0';
    }
  }

  closeMenu(): void {
    if (!this.menu) return;
    this.isOpen = false;
    this.menu.setAttribute('aria-hidden', 'true');
    this.setAttribute('aria-expanded', 'false');
    this.timer?.stop();
    this.focus();
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
