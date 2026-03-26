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

import { type CSSProperties } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

const OVERLAY_STYLE: CSSProperties = { background: 'var(--alap-overlay-bg)' };
const DIALOG_STYLE: CSSProperties = { background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' };

const INPUT_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const INPUT_MONO_STYLE: CSSProperties = {
  ...INPUT_STYLE,
  fontFamily: "'JetBrains Mono', monospace",
};

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const config = useEditorStore((s) => s.config);
  const updateSettings = useEditorStore((s) => s.updateSettings);
  const apiUrl = useEditorStore((s) => s.apiUrl);
  const setApiUrl = useEditorStore((s) => s.setApiUrl);

  const settings = config.settings ?? {};

  // Escape handled by Editor.tsx global stack

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={OVERLAY_STYLE} onClick={onClose}>
      <div className="rounded-xl p-6 w-[480px] shadow-2xl fade-in" style={DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-accent">Settings</h2>
          <button onClick={onClose} className="toolbar-btn text-xs">Close</button>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-xs mb-1 text-muted">List Type</label>
            <select value={settings.listType ?? 'ul'} onChange={(e) => updateSettings('listType', e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm" style={INPUT_STYLE}>
              <option value="ul">Unordered (ul)</option>
              <option value="ol">Ordered (ol)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Menu Timeout (ms)</label>
            <input type="number" value={settings.menuTimeout ?? 5000}
              onChange={(e) => updateSettings('menuTimeout', Number(e.target.value))}
              className="w-full rounded-md px-3 py-2 text-sm" style={INPUT_MONO_STYLE} />
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Max Visible Items</label>
            <input type="number" value={(settings.maxVisibleItems as number) ?? 10}
              onChange={(e) => updateSettings('maxVisibleItems', Number(e.target.value))}
              className="w-full rounded-md px-3 py-2 text-sm" style={INPUT_MONO_STYLE} />
            <p className="text-[10px] mt-1 text-dim">Menu scrolls after this many items. 0 = no limit.</p>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Viewport Adjust</label>
            <select value={settings.viewportAdjust !== false ? 'true' : 'false'}
              onChange={(e) => updateSettings('viewportAdjust', e.target.value === 'true')}
              className="w-full rounded-md px-3 py-2 text-sm" style={INPUT_STYLE}>
              <option value="true">Enabled -- menus flip to stay on-screen</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Existing URL Handling</label>
            <select value={(settings.existingUrl as string) ?? 'prepend'}
              onChange={(e) => updateSettings('existingUrl', e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm" style={INPUT_STYLE}>
              <option value="prepend">Prepend -- original URL is first menu item</option>
              <option value="append">Append -- original URL is last menu item</option>
              <option value="ignore">Ignore -- discard original URL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Remote API URL</label>
            <input type="text" value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm" style={INPUT_MONO_STYLE} />
            <p className="text-[10px] mt-1 text-dim">Used by Remote and Hybrid storage modes. Changes take effect on next store initialization.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
