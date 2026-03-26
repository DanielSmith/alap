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

import { createEffect, onCleanup, Show, type JSX } from 'solid-js';
import { editor } from '../store/editor';

const BAR_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-mid)',
  'border-top': '1px solid var(--alap-border-subtle)',
  color: 'var(--alap-text-dim)',
};

export function StatusBar() {
  createEffect(() => {
    const msg = editor.statusMessage;
    if (!msg) return;
    const timer = setTimeout(() => editor.setStatus(null), 4000);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div class="px-5 py-1.5 flex items-center text-xs flex-shrink-0" style={BAR_STYLE}>
      <span class="font-medium text-muted">{editor.configName}</span>
      <Show when={editor.isDirty}>
        <span class="ml-1.5 text-accent">unsaved</span>
      </Show>
      <span class="mx-2 border-subtle">|</span>
      <span>{editor.storageMode}</span>
      <div class="flex-1" />
      <Show when={editor.statusMessage}>
        {(msg) => <span class="fade-in text-muted">{msg()}</span>}
      </Show>
    </div>
  );
}
