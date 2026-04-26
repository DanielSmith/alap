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

import type { AlapLink } from '../../core/types';
import {
  sanitizeUrlByTier,
  sanitizeCssClassByTier,
  sanitizeTargetWindowByTier,
} from '../../core/sanitizeByTier';
import { REM_PER_MENU_ITEM } from '../../constants';

export interface MenuListOptions {
  listType?: string;
  /** Extra attributes to set on the <ul>/<ol> (e.g., { part: 'list' }) */
  listAttributes?: Record<string, string>;
  /** Extra attributes to set on each <li> (e.g., { part: 'item' }) */
  liAttributes?: Record<string, string>;
  /** Extra attributes to set on each <a> (e.g., { part: 'link' }) */
  aAttributes?: Record<string, string>;
  /** Extra attributes to set on each <img> (e.g., { part: 'image' }) */
  imgAttributes?: Record<string, string>;
  /** Max visible items before the list scrolls. 0 = no limit. */
  maxVisibleItems?: number;
  /** Global default hooks from settings.hooks */
  globalHooks?: string[];
  /** Default target window for links. Per-link targetWindow overrides. Default: 'fromAlap' */
  defaultTargetWindow?: string;
}

/**
 * Build a <ul> or <ol> element containing menu items.
 * Pure DOM creation — no positioning, no event binding.
 */
export function buildMenuList(
  links: Array<{ id: string } & AlapLink>,
  options: MenuListOptions = {},
): HTMLElement {
  const listType = options.listType ?? 'ul';
  const list = document.createElement(listType);

  if (options.listAttributes) {
    for (const [key, value] of Object.entries(options.listAttributes)) {
      list.setAttribute(key, value);
    }
  }

  // Apply scroll constraint when items exceed maxVisibleItems
  const max = options.maxVisibleItems ?? 0;
  if (max > 0 && links.length > max) {
    list.style.maxHeight = `${max * REM_PER_MENU_ITEM}rem`;
    list.style.overflowY = 'auto';
  }

  for (const link of links) {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');

    // Tier-aware cssClass: author keeps the author-written class; non-author
    // tiers (protocol, storage, unstamped) drop it so an attacker can't pick
    // a class that triggers CSS-selector-driven exfil or layout attacks.
    const customClass = sanitizeCssClassByTier(link.cssClass, link);
    li.className = customClass ? `alapListElem ${customClass}` : 'alapListElem';

    if (options.liAttributes) {
      for (const [key, value] of Object.entries(options.liAttributes)) {
        li.setAttribute(key, value);
      }
    }

    const a = document.createElement('a');
    a.setAttribute('role', 'menuitem');
    a.setAttribute('tabindex', '-1');
    // `noopener` blocks the new window from reaching back via
    // `window.opener`; `noreferrer` drops the Referer header. Both apply
    // to every menu anchor regardless of tier — matches the invariant
    // lens and lightbox already enforce.
    a.rel = 'noopener noreferrer';
    // Tier-aware URL: author gets the loose sanitizer (permits mailto, tel,
    // any scheme not explicitly dangerous); non-author gets strict
    // (http/https/mailto only). Fail-closed on unstamped — a link with no
    // provenance was written outside the validateConfig gate.
    a.href = sanitizeUrlByTier(link.url, link);
    // Tier-aware target: author's named-window defaults flow through the
    // fallback chain; non-author is clamped to `_blank` unconditionally, so
    // a protocol response can't inherit `options.defaultTargetWindow` and
    // ride into a window the author reserved for their own links.
    a.target = sanitizeTargetWindowByTier(link.targetWindow, link)
      ?? options.defaultTargetWindow ?? 'fromAlap';

    if (options.aAttributes) {
      for (const [key, value] of Object.entries(options.aAttributes)) {
        a.setAttribute(key, value);
      }
    }

    // Data attributes for hooks and identity
    const hooks = link.hooks ?? options.globalHooks;
    if (hooks && hooks.length > 0) {
      a.setAttribute('data-alap-hooks', hooks.join(' '));
    }
    if (link.guid) {
      a.setAttribute('data-alap-guid', link.guid);
    }
    if (link.thumbnail) {
      a.setAttribute('data-alap-thumbnail', link.thumbnail);
    }

    if (link.image) {
      const img = document.createElement('img');
      img.src = sanitizeUrlByTier(link.image, link);
      img.alt = link.altText ?? `image for ${link.id}`;
      if (options.imgAttributes) {
        for (const [key, value] of Object.entries(options.imgAttributes)) {
          img.setAttribute(key, value);
        }
      }
      a.appendChild(img);
    } else {
      a.textContent = link.label ?? link.id;
    }

    li.appendChild(a);
    list.appendChild(li);
  }

  return list;
}
