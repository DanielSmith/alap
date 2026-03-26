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

/**
 * A simple auto-dismiss timer.
 * Manages a single timeout that calls a callback after a delay.
 */
export class DismissTimer {
  private timerId: number = 0;
  private timeout: number;
  private callback: () => void;

  constructor(timeout: number, callback: () => void) {
    this.timeout = timeout;
    this.callback = callback;
  }

  start(): void {
    this.stop();
    this.timerId = window.setTimeout(this.callback, this.timeout);
  }

  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = 0;
    }
  }

  /** Update the timeout duration (takes effect on next start) */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}
