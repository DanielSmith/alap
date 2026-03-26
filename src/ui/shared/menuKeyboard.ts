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

export interface MenuKeyboardOptions {
  /** Called on ArrowRight when the focused item has "item-context" in data-alap-hooks */
  onItemContext?: (el: HTMLElement, event: KeyboardEvent) => void;
  /** Called on ArrowLeft to dismiss a context action */
  onItemContextDismiss?: (el: HTMLElement, event: KeyboardEvent) => void;
}

/**
 * Handle keyboard navigation within a menu.
 * Returns true if the event was handled, false otherwise.
 */
export function handleMenuKeyboard(
  event: KeyboardEvent,
  items: HTMLElement[],
  activeElement: Element | null,
  closeMenu: () => void,
  options?: MenuKeyboardOptions,
): boolean {
  if (items.length === 0) return false;

  const currentIndex = items.indexOf(activeElement as HTMLElement);

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[next].focus();
      items[next].scrollIntoView({ block: 'nearest' });
      return true;
    }
    case 'ArrowUp': {
      event.preventDefault();
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prev].focus();
      items[prev].scrollIntoView({ block: 'nearest' });
      return true;
    }
    case 'ArrowRight': {
      const el = activeElement as HTMLElement;
      const hooks = el?.getAttribute('data-alap-hooks');
      if (hooks?.split(' ').includes('item-context') && options?.onItemContext) {
        event.preventDefault();
        options.onItemContext(el, event);
        return true;
      }
      return false;
    }
    case 'ArrowLeft': {
      const el = activeElement as HTMLElement;
      const hooks = el?.getAttribute('data-alap-hooks');
      if (hooks?.split(' ').includes('item-context') && options?.onItemContextDismiss) {
        event.preventDefault();
        options.onItemContextDismiss(el, event);
        return true;
      }
      return false;
    }
    case 'Home': {
      event.preventDefault();
      items[0].focus();
      items[0].scrollIntoView({ block: 'nearest' });
      return true;
    }
    case 'End': {
      event.preventDefault();
      items[items.length - 1].focus();
      items[items.length - 1].scrollIntoView({ block: 'nearest' });
      return true;
    }
    case 'Escape': {
      closeMenu();
      return true;
    }
    case 'Tab': {
      closeMenu();
      return true;
    }
    default:
      return false;
  }
}
