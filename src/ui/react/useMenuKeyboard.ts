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

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Keyboard navigation handler for menu items.
 * ArrowDown/Up with wrapping, Home, End, Escape, Tab.
 *
 * Returns an onKeyDown handler to attach to the menu container.
 */
export function createMenuKeyHandler(
  getItems: () => HTMLAnchorElement[],
  closeMenu: () => void,
) {
  return (e: ReactKeyboardEvent) => {
    const items = getItems();
    if (items.length === 0) return;

    const activeIndex = items.indexOf(document.activeElement as HTMLAnchorElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        items[next].focus();
        items[next].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        items[prev].focus();
        items[prev].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'Home':
        e.preventDefault();
        items[0].focus();
        items[0].scrollIntoView({ block: 'nearest' });
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        items[items.length - 1].scrollIntoView({ block: 'nearest' });
        break;
      case 'Escape':
        closeMenu();
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  };
}
