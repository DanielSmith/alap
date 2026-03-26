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
import { sanitizeUrl } from '../../core/sanitizeUrl';
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

    const cssClass = link.cssClass ? `alapListElem ${link.cssClass}` : 'alapListElem';
    li.className = cssClass;

    if (options.liAttributes) {
      for (const [key, value] of Object.entries(options.liAttributes)) {
        li.setAttribute(key, value);
      }
    }

    const a = document.createElement('a');
    a.setAttribute('role', 'menuitem');
    a.setAttribute('tabindex', '-1');
    a.href = sanitizeUrl(link.url);
    a.target = link.targetWindow ?? options.defaultTargetWindow ?? 'fromAlap';

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
      img.src = sanitizeUrl(link.image);
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
