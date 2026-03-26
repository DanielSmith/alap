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

import { createMemo, type JSX } from 'solid-js';
import { editor } from '../store/editor';

const OVERLAY_STYLE: JSX.CSSProperties = { background: 'var(--alap-overlay-bg)' };
const DIALOG_STYLE: JSX.CSSProperties = { background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' };

const INPUT_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const INPUT_MONO_STYLE: JSX.CSSProperties = {
  ...INPUT_STYLE,
  'font-family': "'JetBrains Mono', monospace",
};

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog(props: SettingsDialogProps) {
  const settings = createMemo(() => editor.config.settings ?? {});

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center" style={OVERLAY_STYLE} onClick={props.onClose}>
      <div class="rounded-xl p-6 w-[480px] shadow-2xl fade-in" style={DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>

        <div class="flex items-center justify-between mb-5">
          <h2 class="text-sm font-semibold text-accent">Settings</h2>
          <button onClick={props.onClose} class="toolbar-btn text-xs">Close</button>
        </div>

        <div class="grid gap-4">
          <div>
            <label class="block text-xs mb-1 text-muted">List Type</label>
            <select
              value={settings().listType ?? 'ul'}
              onChange={(e) => editor.updateSettings('listType', e.currentTarget.value)}
              class="w-full rounded-md px-3 py-2 text-sm"
              style={INPUT_STYLE}
            >
              <option value="ul">Unordered (ul)</option>
              <option value="ol">Ordered (ol)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs mb-1 text-muted">Menu Timeout (ms)</label>
            <input
              type="number"
              value={settings().menuTimeout ?? 5000}
              onInput={(e) => editor.updateSettings('menuTimeout', Number(e.currentTarget.value))}
              class="w-full rounded-md px-3 py-2 text-sm"
              style={INPUT_MONO_STYLE}
            />
          </div>

          <div>
            <label class="block text-xs mb-1 text-muted">Max Visible Items</label>
            <input
              type="number"
              value={(settings().maxVisibleItems as number) ?? 10}
              onInput={(e) => editor.updateSettings('maxVisibleItems', Number(e.currentTarget.value))}
              class="w-full rounded-md px-3 py-2 text-sm"
              style={INPUT_MONO_STYLE}
            />
            <p class="text-[10px] mt-1 text-dim">Menu scrolls after this many items. 0 = no limit.</p>
          </div>

          <div>
            <label class="block text-xs mb-1 text-muted">Viewport Adjust</label>
            <select
              value={settings().viewportAdjust !== false ? 'true' : 'false'}
              onChange={(e) => editor.updateSettings('viewportAdjust', e.currentTarget.value === 'true')}
              class="w-full rounded-md px-3 py-2 text-sm"
              style={INPUT_STYLE}
            >
              <option value="true">Enabled -- menus flip to stay on-screen</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div>
            <label class="block text-xs mb-1 text-muted">Existing URL Handling</label>
            <select
              value={(settings().existingUrl as string) ?? 'prepend'}
              onChange={(e) => editor.updateSettings('existingUrl', e.currentTarget.value)}
              class="w-full rounded-md px-3 py-2 text-sm"
              style={INPUT_STYLE}
            >
              <option value="prepend">Prepend -- original URL is first menu item</option>
              <option value="append">Append -- original URL is last menu item</option>
              <option value="ignore">Ignore -- discard original URL</option>
            </select>
          </div>

          <div>
            <label class="block text-xs mb-1 text-muted">Remote API URL</label>
            <input
              type="text"
              value={editor.apiUrl}
              onInput={(e) => editor.setApiUrl(e.currentTarget.value)}
              class="w-full rounded-md px-3 py-2 text-sm"
              style={INPUT_MONO_STYLE}
            />
            <p class="text-[10px] mt-1 text-dim">Used by Remote and Hybrid storage modes. Changes take effect on next store initialization.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
