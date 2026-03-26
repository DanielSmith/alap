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
import { useEditorStore } from '../store/useEditorStore';

const INPUT_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const INPUT_MONO_STYLE: CSSProperties = {
  ...INPUT_STYLE,
  fontFamily: "'JetBrains Mono', monospace",
};

export function SettingsPanel() {
  const config = useEditorStore((s) => s.config);
  const updateSettings = useEditorStore((s) => s.updateSettings);

  const settings = config.settings ?? {};

  return (
    <div>
      <h2 className="text-xs font-semibold mb-2 text-muted">Settings</h2>

      <div className="grid gap-3">
        <div>
          <label className="block text-xs mb-0.5 text-dim">List Type</label>
          <select value={settings.listType ?? 'ul'} onChange={(e) => updateSettings('listType', e.target.value)}
            className="w-full rounded-md px-2 py-1.5 text-sm" style={INPUT_STYLE}>
            <option value="ul">Unordered (ul)</option>
            <option value="ol">Ordered (ol)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-0.5 text-dim">Menu Timeout (ms)</label>
          <input type="number" value={settings.menuTimeout ?? 5000}
            onChange={(e) => updateSettings('menuTimeout', Number(e.target.value))}
            className="w-full rounded-md px-2 py-1.5 text-sm" style={INPUT_MONO_STYLE} />
        </div>
      </div>
    </div>
  );
}
