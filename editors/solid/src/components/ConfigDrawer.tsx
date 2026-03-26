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

import { createSignal, Show, type JSX, type Component } from 'solid-js';
import { editor, type StorageMode } from '../store/editor';
import { hasFileSystemAccess, openFromFile, saveToFile } from '../../../shared/file-io';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon, type IconName } from './Icon';

type LoadMode = 'replace' | 'merge';

const INPUT_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const BTN_BORDER: JSX.CSSProperties = { border: '1px solid var(--alap-border-subtle)' };
const SUBMIT_STYLE: JSX.CSSProperties = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const DIVIDER_STYLE: JSX.CSSProperties = { 'border-color': 'var(--alap-border-subtle)', margin: '0' };
const TOGGLE_ACTIVE: JSX.CSSProperties = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const TOGGLE_INACTIVE: JSX.CSSProperties = { background: 'transparent', color: 'var(--alap-text-dim)' };

interface ConfigDrawerProps {
  onClose: () => void;
  onShowLoad: () => void;
  onShowSettings: () => void;
}

export function ConfigDrawer(props: ConfigDrawerProps) {
  const [showNewInput, setShowNewInput] = createSignal(false);
  const [newName, setNewName] = createSignal('');
  const [showSaveAs, setShowSaveAs] = createSignal(false);
  const [saveAsName, setSaveAsName] = createSignal('');
  const [deletePrompt, setDeletePrompt] = createSignal(false);
  const [importMode, setImportMode] = createSignal<LoadMode>('replace');

  function handleNew() {
    const name = newName().trim();
    if (!name) return;
    editor.newConfig(name);
    setShowNewInput(false);
    setNewName('');
  }

  function handleSaveAs() {
    const name = saveAsName().trim();
    if (!name) return;
    editor.saveConfig(name);
    setShowSaveAs(false);
    setSaveAsName('');
  }

  function handleDelete() {
    editor.deleteConfig(editor.configName);
    setDeletePrompt(false);
    editor.setStatus(`Deleted "${editor.configName}" from storage — still editing in memory`);
  }

  async function handleImport() {
    const result = await openFromFile();
    if (!result) return;
    editor.replaceConfig(result.config, result.name);
    if (importMode() === 'merge') {
      editor.setStatus(`Imported "${result.name}" (merge coming soon — replaced for now)`);
    }
    editor.setFileHandle(result.handle);
    props.onClose();
  }

  async function handleExport() {
    const handle = await saveToFile(editor.config, editor.configName, editor.fileHandle);
    if (handle) editor.setFileHandle(handle);
  }

  return (
    <div class="flex flex-col gap-4 fade-in">
      <Show when={deletePrompt()}>
        <ConfirmDialog
          message={`Delete "${editor.configName}" from storage? You'll keep editing in memory. Save to a new name if you want to keep changes.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletePrompt(false)}
        />
      </Show>

      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-accent">
          Config: <span class="text-muted">{editor.configName}</span>
          <Show when={editor.isDirty}>
            <span class="text-dim"> *</span>
          </Show>
        </h2>
        <button onClick={props.onClose} class="toolbar-btn text-xs">Close</button>
      </div>

      <DrawerButton onClick={props.onShowSettings} label="Settings" icon="gear" />

      <div class="flex flex-col gap-1.5">
        <DrawerButton onClick={() => { props.onShowLoad(); props.onClose(); }} label="Load" icon="folderOpen" />
        <DrawerButton onClick={() => editor.saveConfig()} label="Save" icon="save" />

        <Show
          when={showSaveAs()}
          fallback={
            <DrawerButton onClick={() => { setSaveAsName(editor.configName); setShowSaveAs(true); }} label="Save As" icon="save" />
          }
        >
          <InlineInput
            value={saveAsName()}
            onInput={setSaveAsName}
            onSubmit={handleSaveAs}
            onCancel={() => setShowSaveAs(false)}
            placeholder="New name"
            submitLabel="Save"
          />
        </Show>

        <Show
          when={showNewInput()}
          fallback={
            <DrawerButton onClick={() => setShowNewInput(true)} label="New Config" icon="plus" />
          }
        >
          <InlineInput
            value={newName()}
            onInput={setNewName}
            onSubmit={handleNew}
            onCancel={() => setShowNewInput(false)}
            placeholder="Config name"
            submitLabel="Create"
          />
        </Show>

        <DrawerButton onClick={() => setDeletePrompt(true)} label="Delete from Storage" danger icon="trash" />
      </div>

      <hr style={DIVIDER_STYLE} />

      <div>
        <label class="block text-xs mb-1 text-muted">Storage mode</label>
        <select
          class="w-full text-sm rounded-md px-2 py-1.5"
          style={INPUT_STYLE}
          value={editor.storageMode}
          onChange={(e) => editor.setStorageMode(e.currentTarget.value as StorageMode)}
        >
          <option value="local">Local (IndexedDB)</option>
          <option value="remote">Remote (API)</option>
          <option value="hybrid">Local + Remote</option>
        </select>
      </div>

      <hr style={DIVIDER_STYLE} />

      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-muted">JSON Files</span>
          <ModeToggle value={importMode()} onChange={setImportMode} />
        </div>
        <div class="flex flex-col gap-1.5">
          <DrawerButton onClick={handleImport} label={hasFileSystemAccess() ? 'Open File' : 'Import JSON'} icon="import" />
          <DrawerButton onClick={handleExport} label={hasFileSystemAccess() ? 'Save to File' : 'Export JSON'} icon="export" />
        </div>
      </div>
    </div>
  );
}

function DrawerButton(props: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  icon?: IconName;
}) {
  const textColor = () => props.danger ? 'var(--alap-danger)' : 'var(--alap-text)';

  return (
    <button
      onClick={props.onClick}
      class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
      style={{ ...BTN_BORDER, color: textColor() }}
    >
      <Show when={props.icon}>
        {(iconName) => <Icon name={iconName()} width={14} height={14} style={{ opacity: 0.7 }} />}
      </Show>
      {props.label}
    </button>
  );
}

function InlineInput(props: {
  value: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder: string;
  submitLabel: string;
}) {
  return (
    <div class="flex gap-2 fade-in">
      <input
        type="text"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.onSubmit();
          if (e.key === 'Escape') props.onCancel();
        }}
        placeholder={props.placeholder}
        class="flex-1 text-sm rounded-md px-2 py-1.5"
        style={INPUT_STYLE}
        autofocus
      />
      <button onClick={props.onSubmit} class="text-xs px-3 rounded-md" style={SUBMIT_STYLE}>{props.submitLabel}</button>
      <button onClick={props.onCancel} class="text-xs px-2 text-muted">Cancel</button>
    </div>
  );
}

function ModeToggle(props: { value: LoadMode; onChange: (v: LoadMode) => void }) {
  return (
    <div class="flex rounded-md overflow-hidden text-[10px]" style={BTN_BORDER}>
      <button
        onClick={() => props.onChange('replace')}
        class="px-2 py-0.5"
        style={props.value === 'replace' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
      >
        Replace
      </button>
      <button
        onClick={() => props.onChange('merge')}
        class="px-2 py-0.5"
        style={props.value === 'merge' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
      >
        Merge
      </button>
    </div>
  );
}
