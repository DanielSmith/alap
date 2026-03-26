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

import { watch, onUnmounted, type Ref } from 'vue';

/**
 * Manages menu dismiss behavior:
 * - Auto-dismiss timer on mouse leave
 * - Click outside to close (dom/webcomponent modes)
 * - Escape to close (dom/webcomponent modes)
 *
 * Popover mode skips click-outside and Escape — the browser handles those.
 */
export function useMenuDismiss(
  isOpen: Ref<boolean>,
  closeMenu: () => void,
  menuTimeout: number,
  mode: string,
  triggerEl: Ref<HTMLElement | null>,
  menuEl: Ref<HTMLElement | null>,
) {
  let timer = 0;

  function stopTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  function startTimer() {
    stopTimer();
    timer = window.setTimeout(closeMenu, menuTimeout);
  }

  // Click outside + Escape (not needed for popover — browser handles it)
  watch(isOpen, (open) => {
    if (!open || mode === 'popover') return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuEl.value && !menuEl.value.contains(target) &&
        triggerEl.value && !triggerEl.value.contains(target)
      ) {
        closeMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    // Cleanup when menu closes or component unmounts
    const stop = watch(isOpen, (nowOpen) => {
      if (!nowOpen) {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
        stop();
      }
    });
  });

  onUnmounted(stopTimer);

  return { startTimer, stopTimer };
}
