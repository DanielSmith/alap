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

import { useMemo, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ConfirmDialog } from './ConfirmDialog';
import XIcon from '../../assets/svg/x.svg?react';
import CloneIcon from '../../assets/svg/clone.svg?react';

const MONO_STYLE = { fontFamily: "'JetBrains Mono', monospace" } as const;

export function MacroList() {
  const config = useEditorStore((s) => s.config);
  const filter = useEditorStore((s) => s.filter);
  const editingMacroNames = useEditorStore((s) => s.editingMacroNames);
  const toggleEditMacro = useEditorStore((s) => s.toggleEditMacro);
  const setFilter = useEditorStore((s) => s.setFilter);
  const removeMacro = useEditorStore((s) => s.removeMacro);
  const addMacro = useEditorStore((s) => s.addMacro);
  const setStatus = useEditorStore((s) => s.setStatus);

  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null);

  const macros = useMemo(() => {
    const entries = Object.entries(config.macros ?? {});
    if (!filter) return entries;
    const f = filter.toLowerCase();
    return entries.filter(([name, macro]) =>
      name.toLowerCase().includes(f) || macro.linkItems.toLowerCase().includes(f)
    );
  }, [config.macros, filter]);

  function handleDelete(e: React.MouseEvent, name: string) {
    e.stopPropagation();
    setPendingDeleteName(name);
  }

  function confirmDelete() {
    if (pendingDeleteName) {
      removeMacro(pendingDeleteName);
      if (editingMacroNames.includes(pendingDeleteName)) toggleEditMacro(pendingDeleteName);
      setPendingDeleteName(null);
    }
  }

  function handleClone(e: React.MouseEvent, name: string) {
    e.stopPropagation();
    const macro = config.macros?.[name];
    if (!macro) return;
    const newName = `${name}_copy`;
    addMacro(newName, macro.linkItems);
    toggleEditMacro(newName);
    setStatus(`Cloned @${name} → @${newName}`);
  }

  function handleAdd() {
    const name = `macro_${Date.now().toString(36)}`;
    addMacro(name, '');
    toggleEditMacro(name);
    setStatus(`Created @${name}`);
  }

  return (
    <>
      {pendingDeleteName && (
        <ConfirmDialog
          message={`Remove macro "@${pendingDeleteName}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteName(null)}
        />
      )}

      <div className="p-3" style={{ borderBottom: '1px solid var(--alap-border-subtle)' }}>
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter macros..." className="w-full text-sm rounded-lg px-3 py-2 bg-input" />
      </div>

      <div className="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
        <span>
          {macros.length} macro{macros.length !== 1 ? 's' : ''}
          {filter && <span className="text-muted"> matching "{filter}"</span>}
        </span>
        <button onClick={handleAdd} className="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent">+ Add</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
        {macros.map(([name, macro]) => {
          const isEditing = editingMacroNames.includes(name);
          return (
            <div key={name} onClick={() => toggleEditMacro(name)}
              className={`item-card rounded-lg px-4 py-2.5 cursor-pointer group relative ${isEditing ? 'editing' : 'hover-bg-hover'}`}>
              <div className="flex items-center justify-between relative">
                <span className="text-sm font-medium truncate item-name">@{name}</span>
                <div className="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
                  <button onClick={(e) => handleDelete(e, name)} className="reveal-icon p-1 text-danger" title="Delete">
                    <XIcon width={14} height={14} />
                  </button>
                  <button onClick={(e) => handleClone(e, name)} className="reveal-icon p-1 text-success" title="Clone">
                    <CloneIcon width={14} height={14} />
                  </button>
                </div>
              </div>
              <div className="text-xs truncate mt-0.5 text-muted" style={MONO_STYLE}>{macro.linkItems}</div>
            </div>
          );
        })}
        {macros.length === 0 && (
          <div className="p-6 text-sm text-center rounded-lg text-dim" style={{ background: 'var(--alap-macro-item-bg)' }}>
            No macros yet
          </div>
        )}
      </div>
    </>
  );
}
