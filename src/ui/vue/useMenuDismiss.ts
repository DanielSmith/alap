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

import { onUnmounted, watch, type Ref } from 'vue';
import { installMenuDismiss, type MenuDismissHandle } from '../shared/baseMenuDismiss';

/**
 * Vue adapter around `installMenuDismiss`. Document-level listeners are
 * attached while `isOpen` is true and torn down on close / unmount.
 */
export function useMenuDismiss(
  isOpen: Ref<boolean>,
  closeMenu: () => void,
  menuTimeout: number,
  mode: string,
  triggerEl: Ref<HTMLElement | null>,
  menuEl: Ref<HTMLElement | null>,
) {
  let handle: MenuDismissHandle | null = null;

  function tearDown() {
    if (handle) {
      handle.dispose();
      handle = null;
    }
  }

  watch(isOpen, (open) => {
    tearDown();
    if (!open) return;
    handle = installMenuDismiss({
      close: closeMenu,
      getTrigger: () => triggerEl.value,
      getMenu: () => menuEl.value,
      mode,
      timeoutMs: menuTimeout,
    });
  });

  onUnmounted(tearDown);

  return {
    startTimer: () => handle?.startTimer(),
    stopTimer: () => handle?.stopTimer(),
  };
}
