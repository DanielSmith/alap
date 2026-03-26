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

import { useState, type CSSProperties } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { StorageMode } from '../store/useEditorStore';
import { hasFileSystemAccess, openFromFile, saveToFile } from '../../../shared/file-io';
import { ConfirmDialog } from './ConfirmDialog';
import GearIcon from '../../assets/svg/gear.svg?react';
import SaveIcon from '../../assets/svg/save.svg?react';
import ImportIcon from '../../assets/svg/import.svg?react';
import ExportIcon from '../../assets/svg/export.svg?react';
import PlusIcon from '../../assets/svg/plus.svg?react';
import TrashIcon from '../../assets/svg/trash.svg?react';
import FolderOpenIcon from '../../assets/svg/folder-open.svg?react';

type LoadMode = 'replace' | 'merge';

const INPUT_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const CONFIG_BADGE_STYLE: CSSProperties = {
  color: 'var(--alap-text-muted)',
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-border-subtle)',
};

const BTN_BORDER: CSSProperties = { border: '1px solid var(--alap-border-subtle)' };
const SUBMIT_STYLE: CSSProperties = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const DIVIDER_STYLE: CSSProperties = { borderColor: 'var(--alap-border-subtle)', margin: 0 };
const TOGGLE_ACTIVE: CSSProperties = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const TOGGLE_INACTIVE: CSSProperties = { background: 'transparent', color: 'var(--alap-text-dim)' };

interface ConfigDrawerProps {
  onClose: () => void;
  onShowLoad: () => void;
  onShowSettings: () => void;
}

export function ConfigDrawer({ onClose, onShowLoad, onShowSettings }: ConfigDrawerProps) {
  const configName = useEditorStore((s) => s.configName);
  const isDirty = useEditorStore((s) => s.isDirty);
  const storageMode = useEditorStore((s) => s.storageMode);
  const saveConfig = useEditorStore((s) => s.saveConfig);
  const deleteConfig = useEditorStore((s) => s.deleteConfig);
  const newConfig = useEditorStore((s) => s.newConfig);
  const setStorageMode = useEditorStore((s) => s.setStorageMode);
  const config = useEditorStore((s) => s.config);
  const fileHandle = useEditorStore((s) => s.fileHandle);
  const replaceConfig = useEditorStore((s) => s.replaceConfig);
  const setFileHandle = useEditorStore((s) => s.setFileHandle);
  const setStatus = useEditorStore((s) => s.setStatus);

  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [deletePrompt, setDeletePrompt] = useState(false);
  const [importMode, setImportMode] = useState<LoadMode>('replace');

  function handleNew() {
    const name = newName.trim();
    if (!name) return;
    newConfig(name);
    setShowNewInput(false);
    setNewName('');
  }

  function handleSaveAs() {
    const name = saveAsName.trim();
    if (!name) return;
    saveConfig(name);
    setShowSaveAs(false);
    setSaveAsName('');
  }

  function handleDelete() {
    deleteConfig(configName);
    setDeletePrompt(false);
    setStatus(`Deleted "${configName}" from storage — still editing in memory`);
  }

  async function handleImport() {
    const result = await openFromFile();
    if (!result) return;
    replaceConfig(result.config, result.name);
    if (importMode === 'merge') {
      setStatus(`Imported "${result.name}" (merge coming soon — replaced for now)`);
    }
    setFileHandle(result.handle);
    onClose();
  }

  async function handleExport() {
    const handle = await saveToFile(config, configName, fileHandle);
    if (handle) setFileHandle(handle);
  }

  return (
    <div className="flex flex-col gap-4 fade-in">
      {deletePrompt && (
        <ConfirmDialog
          message={`Delete "${configName}" from storage? You'll keep editing in memory. Save to a new name if you want to keep changes.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletePrompt(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-accent">
          Config: <span className="text-muted">{configName}</span>
          {isDirty && <span className="text-dim"> *</span>}
        </h2>
        <button onClick={onClose} className="toolbar-btn text-xs">Close</button>
      </div>

      <DrawerButton onClick={() => onShowSettings()} label="Settings" Icon={GearIcon} />

      <div className="flex flex-col gap-1.5">
        <DrawerButton onClick={() => { onShowLoad(); onClose(); }} label="Load" Icon={FolderOpenIcon} />
        <DrawerButton onClick={() => saveConfig()} label="Save" Icon={SaveIcon} />

        {showSaveAs ? (
          <InlineInput value={saveAsName} onChange={setSaveAsName} onSubmit={handleSaveAs}
            onCancel={() => setShowSaveAs(false)} placeholder="New name" submitLabel="Save" />
        ) : (
          <DrawerButton onClick={() => { setSaveAsName(configName); setShowSaveAs(true); }} label="Save As" Icon={SaveIcon} />
        )}

        {showNewInput ? (
          <InlineInput value={newName} onChange={setNewName} onSubmit={handleNew}
            onCancel={() => setShowNewInput(false)} placeholder="Config name" submitLabel="Create" />
        ) : (
          <DrawerButton onClick={() => setShowNewInput(true)} label="New Config" Icon={PlusIcon} />
        )}

        <DrawerButton onClick={() => setDeletePrompt(true)} label="Delete from Storage" danger Icon={TrashIcon} />
      </div>

      <hr style={DIVIDER_STYLE} />

      <div>
        <label className="block text-xs mb-1 text-muted">Storage mode</label>
        <select className="w-full text-sm rounded-md px-2 py-1.5" style={INPUT_STYLE}
          value={storageMode} onChange={(e) => setStorageMode(e.target.value as StorageMode)}>
          <option value="local">Local (IndexedDB)</option>
          <option value="remote">Remote (API)</option>
          <option value="hybrid">Local + Remote</option>
        </select>
      </div>

      <hr style={DIVIDER_STYLE} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted">JSON Files</span>
          <ModeToggle value={importMode} onChange={setImportMode} />
        </div>
        <div className="flex flex-col gap-1.5">
          <DrawerButton onClick={handleImport} label={hasFileSystemAccess() ? 'Open File' : 'Import JSON'} Icon={ImportIcon} />
          <DrawerButton onClick={handleExport} label={hasFileSystemAccess() ? 'Save to File' : 'Export JSON'} Icon={ExportIcon} />
        </div>
      </div>

    </div>
  );
}

function DrawerButton({ onClick, label, danger, Icon }: {
  onClick: () => void; label: string; danger?: boolean;
  Icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  const textColor = danger ? 'var(--alap-danger)' : 'var(--alap-text)';

  return (
    <button onClick={onClick}
      className="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
      style={{ ...BTN_BORDER, color: textColor }}>
      {Icon && <Icon width={14} height={14} style={{ opacity: 0.7 }} />}
      {label}
    </button>
  );
}

function InlineInput({ value, onChange, onSubmit, onCancel, placeholder, submitLabel }: {
  value: string; onChange: (v: string) => void;
  onSubmit: () => void; onCancel: () => void;
  placeholder: string; submitLabel: string;
}) {
  return (
    <div className="flex gap-2 fade-in">
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder} className="flex-1 text-sm rounded-md px-2 py-1.5" style={INPUT_STYLE} autoFocus />
      <button onClick={onSubmit} className="text-xs px-3 rounded-md" style={SUBMIT_STYLE}>{submitLabel}</button>
      <button onClick={onCancel} className="text-xs px-2 text-muted">Cancel</button>
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: LoadMode; onChange: (v: LoadMode) => void }) {
  return (
    <div className="flex rounded-md overflow-hidden text-[10px]" style={BTN_BORDER}>
      <button onClick={() => onChange('replace')} className="px-2 py-0.5"
        style={value === 'replace' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}>Replace</button>
      <button onClick={() => onChange('merge')} className="px-2 py-0.5"
        style={value === 'merge' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}>Merge</button>
    </div>
  );
}
