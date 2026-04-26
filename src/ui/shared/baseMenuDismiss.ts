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

import { DismissTimer } from './dismissTimer';

export interface InstallMenuDismissOptions {
  /** Close the menu. Invoked on timer, click-outside, Escape. */
  close: () => void;
  /** Live accessor for the trigger element. Read each time a document event fires. */
  getTrigger: () => HTMLElement | null;
  /** Live accessor for the menu element. */
  getMenu: () => HTMLElement | null;
  /**
   * Rendering mode. `'popover'` skips click-outside and Escape —
   * the browser's popover API owns dismissal in that mode.
   */
  mode: string;
  /** Auto-dismiss timeout in ms. Used by `startTimer()`. */
  timeoutMs: number;
}

export interface MenuDismissHandle {
  /** (Re)start the auto-dismiss timer. */
  startTimer(): void;
  /** Cancel any pending auto-dismiss. */
  stopTimer(): void;
  /** Tear down: stops timer and removes document-level listeners. Idempotent. */
  dispose(): void;
}

/**
 * Framework-agnostic menu dismiss primitive. Wraps:
 * - `DismissTimer` for mouse-leave auto-close
 * - document-level click-outside
 * - document-level Escape
 *
 * Callers own the `isOpen` lifecycle: call `installMenuDismiss(...)` when
 * the menu opens; call `dispose()` when it closes or the host unmounts.
 * Trigger/menu accessors are read live, so refs/bindings can be attached
 * after install without timing races.
 */
export function installMenuDismiss(options: InstallMenuDismissOptions): MenuDismissHandle {
  const { close, getTrigger, getMenu, mode, timeoutMs } = options;
  const timer = new DismissTimer(timeoutMs, close);
  const isPopover = mode === 'popover';

  const onClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    const menu = getMenu();
    const trigger = getTrigger();
    if (menu && !menu.contains(target) && trigger && !trigger.contains(target)) {
      close();
    }
  };

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  if (!isPopover) {
    document.addEventListener('click', onClickOutside);
    document.addEventListener('keydown', onEscape);
  }

  let disposed = false;

  return {
    startTimer: () => timer.start(),
    stopTimer: () => timer.stop(),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      timer.stop();
      if (!isPopover) {
        document.removeEventListener('click', onClickOutside);
        document.removeEventListener('keydown', onEscape);
      }
    },
  };
}
