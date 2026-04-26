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

import { useCallback, useEffect, useRef } from 'react';
import { installMenuDismiss, type MenuDismissHandle } from '../shared/baseMenuDismiss';

/**
 * React adapter around `installMenuDismiss`. The document-level listeners
 * are attached while `isOpen` is true and torn down on close / unmount.
 * Timer controls return for the caller to drive from mouse-enter / leave.
 */
export function useMenuDismiss(
  isOpen: boolean,
  closeMenu: () => void,
  menuTimeout: number,
  mode: string,
  triggerRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
) {
  const handleRef = useRef<MenuDismissHandle | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handle = installMenuDismiss({
      close: closeMenu,
      getTrigger: () => triggerRef.current,
      getMenu: () => menuRef.current,
      mode,
      timeoutMs: menuTimeout,
    });
    handleRef.current = handle;
    return () => {
      handle.dispose();
      handleRef.current = null;
    };
  }, [isOpen, closeMenu, menuTimeout, mode, triggerRef, menuRef]);

  const startTimer = useCallback(() => handleRef.current?.startTimer(), []);
  const stopTimer = useCallback(() => handleRef.current?.stopTimer(), []);

  return { startTimer, stopTimer };
}
