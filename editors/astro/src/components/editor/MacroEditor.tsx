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

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { useAlap } from 'alap/react';

const CARD_STYLE: CSSProperties = {
  background: 'var(--alap-macro-mid)',
};

const CANCEL_BTN_STYLE: CSSProperties = {
  background: 'var(--alap-cancel-bg)',
  color: 'var(--alap-cancel-text)',
};

const INPUT_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
  fontFamily: "'JetBrains Mono', monospace",
};

const RESOLVE_BG: CSSProperties = { background: 'var(--alap-macro-deep)' };

export function MacroEditor() {
  const editingMacroNames = useEditorStore((s) => s.editingMacroNames);

  if (editingMacroNames.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <p className="text-lg mb-2 text-muted">Select a macro to edit</p>
          <p className="text-sm text-dim">Click a macro in the list, or use "+ Add" to create one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      {editingMacroNames.map((name) => (
        <MacroEditForm key={name} macroName={name} />
      ))}
    </div>
  );
}

function MacroEditForm({ macroName }: { macroName: string }) {
  const config = useEditorStore((s) => s.config);
  const addMacro = useEditorStore((s) => s.addMacro);
  const removeMacro = useEditorStore((s) => s.removeMacro);
  const closeEditMacro = useEditorStore((s) => s.closeEditMacro);
  const setStatus = useEditorStore((s) => s.setStatus);

  const macro = config.macros?.[macroName];

  const [expanded, setExpanded] = useState(true);
  const [editName, setEditName] = useState('');
  const [editExpr, setEditExpr] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Save Macro');

  const { resolve } = useAlap();
  const resolvedLinks = editExpr ? resolve(editExpr) : [];

  useEffect(() => {
    if (macro) {
      setEditName(macroName);
      setEditExpr(macro.linkItems);
      const freshlyCreated = !macro.linkItems;
      setIsNew(freshlyCreated);
      setIsDirty(freshlyCreated);
      setSaveLabel(freshlyCreated ? 'Save Macro' : 'Update Macro');
    }
  }, [macroName, macro]);

  const saveBtnStyle = useMemo<CSSProperties>(() => ({
    background: isDirty ? 'var(--alap-macro-accent)' : 'var(--alap-border-subtle)',
    color: isDirty ? 'var(--alap-macro-deep)' : 'var(--alap-text-dim)',
    cursor: isDirty ? 'pointer' : 'default',
  }), [isDirty]);

  if (!macro) return null;

  function handleChange(setter: (v: string) => void, value: string) {
    setter(value);
    setIsDirty(true);
  }

  function handleSave() {
    if (!isDirty) return;
    const name = editName.trim();
    const expr = editExpr.trim();
    if (!name || !expr) return;

    setSaveLabel('Saving...');

    if (name !== macroName) removeMacro(macroName);
    addMacro(name, expr);

    setSaveLabel('Saved');
    setIsNew(false);
    setIsDirty(false);
    setStatus(`${isNew ? 'Saved' : 'Updated'} macro @${name}`);
    setTimeout(() => setSaveLabel('Update Macro'), 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  }

  const summaryLabel = expanded ? `@${macroName}` : `@${macroName}${editExpr ? ` — ${editExpr}` : ''}`;

  return (
    <div className="rounded-xl fade-in edit-card" style={CARD_STYLE}>
      {/* Header — click to toggle */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-sm font-semibold text-macro-accent flex-shrink-0">Edit Macro</h2>
        <span className="text-xs font-mono text-dim truncate ml-3">{summaryLabel}</span>
      </div>

      {expanded && (
        <div className="px-6 pb-6">
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs mb-1 font-semibold text-accent">Name</label>
              <input type="text" value={editName} onChange={(e) => handleChange(setEditName, e.target.value)}
                onKeyDown={handleKeyDown} className="w-full rounded-md px-3 py-1.5 text-sm" style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-xs mb-1 font-semibold text-accent">Expression</label>
              <input type="text" value={editExpr} onChange={(e) => handleChange(setEditExpr, e.target.value)}
                onKeyDown={handleKeyDown} className="w-full rounded-md px-3 py-1.5 text-sm" style={INPUT_STYLE} />
            </div>
          </div>

          <div className="mb-4 p-3 rounded-lg" style={RESOLVE_BG}>
            <p className="text-xs mb-2 text-dim">
              Resolves to {resolvedLinks.length} item{resolvedLinks.length !== 1 ? 's' : ''}
            </p>
            {resolvedLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resolvedLinks.map((link) => (
                  <span key={link.id} className="tag-pill">
                    {link.id}
                    {link.label && <span className="ml-1 text-dim">{link.label}</span>}
                  </span>
                ))}
              </div>
            )}
            {resolvedLinks.length === 0 && editExpr && (
              <p className="text-xs text-dim">No matches</p>
            )}
          </div>

          <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid var(--alap-border-subtle)' }}>
            <button onClick={() => closeEditMacro(macroName)} className="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity" style={CANCEL_BTN_STYLE}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!isDirty} className="text-sm px-6 py-2 rounded-2xl font-medium shadow-lg min-w-[140px]" style={saveBtnStyle}>
              {saveLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
