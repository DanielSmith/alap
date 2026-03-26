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

import { useEffect, useRef, useCallback } from 'react';

/**
 * Manages menu dismiss behavior:
 * - Auto-dismiss timer on mouse leave
 * - Click outside to close (dom/webcomponent modes)
 * - Escape to close (dom/webcomponent modes)
 *
 * Popover mode skips click-outside and Escape — the browser handles those.
 */
export function useMenuDismiss(
  isOpen: boolean,
  closeMenu: () => void,
  menuTimeout: number,
  mode: string,
  triggerRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
) {
  const timerRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setTimeout(closeMenu, menuTimeout);
  }, [stopTimer, closeMenu, menuTimeout]);

  // Click outside + Escape (not needed for popover — browser handles it)
  useEffect(() => {
    if (!isOpen || mode === 'popover') return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, mode, closeMenu, triggerRef, menuRef]);

  // Cleanup timer on unmount
  useEffect(() => stopTimer, [stopTimer]);

  return { startTimer, stopTimer };
}
