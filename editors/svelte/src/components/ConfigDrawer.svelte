<!--
  Copyright 2026 Daniel Smith

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<script lang="ts">
  import { editor, type StorageMode } from '../store/editor.svelte';
  import { hasFileSystemAccess, openFromFile, saveToFile } from '../../../shared/file-io';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import Icon from './Icon.svelte';
  import gearSvg from '../../assets/svg/gear.svg?raw';
  import saveSvg from '../../assets/svg/save.svg?raw';
  import importSvg from '../../assets/svg/import.svg?raw';
  import exportSvg from '../../assets/svg/export.svg?raw';
  import plusSvg from '../../assets/svg/plus.svg?raw';
  import trashSvg from '../../assets/svg/trash.svg?raw';
  import folderOpenSvg from '../../assets/svg/folder-open.svg?raw';

  type LoadMode = 'replace' | 'merge';

  let {
    onClose,
    onShowLoad,
    onShowSettings,
  }: {
    onClose: () => void;
    onShowLoad: () => void;
    onShowSettings: () => void;
  } = $props();

  let showNewInput = $state(false);
  let newName = $state('');
  let showSaveAs = $state(false);
  let saveAsName = $state('');
  let deletePrompt = $state(false);
  let importMode = $state<LoadMode>('replace');

  function handleNew() {
    const name = newName.trim();
    if (!name) return;
    editor.newConfig(name);
    showNewInput = false;
    newName = '';
  }

  function handleSaveAs() {
    const name = saveAsName.trim();
    if (!name) return;
    editor.saveConfig(name);
    showSaveAs = false;
    saveAsName = '';
  }

  function handleDelete() {
    editor.deleteConfig(editor.configName);
    deletePrompt = false;
    editor.setStatus(`Deleted "${editor.configName}" from storage — still editing in memory`);
  }

  async function handleImport() {
    const result = await openFromFile();
    if (!result) return;
    editor.replaceConfig(result.config, result.name);
    if (importMode === 'merge') {
      editor.setStatus(`Imported "${result.name}" (merge coming soon — replaced for now)`);
    }
    editor.setFileHandle(result.handle);
    onClose();
  }

  async function handleExport() {
    const handle = await saveToFile(editor.config, editor.configName, editor.fileHandle);
    if (handle) editor.setFileHandle(handle);
  }

  function handleInlineKeyDown(e: KeyboardEvent, onSubmit: () => void, onCancel: () => void) {
    if (e.key === 'Enter') onSubmit();
    if (e.key === 'Escape') onCancel();
  }
</script>

<div class="flex flex-col gap-4 fade-in">
  {#if deletePrompt}
    <ConfirmDialog
      message={`Delete "${editor.configName}" from storage? You'll keep editing in memory. Save to a new name if you want to keep changes.`}
      onConfirm={handleDelete}
      onCancel={() => deletePrompt = false}
    />
  {/if}

  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold text-accent">
      Config: <span class="text-muted">{editor.configName}</span>
      {#if editor.isDirty}<span class="text-dim"> *</span>{/if}
    </h2>
    <button onclick={onClose} class="toolbar-btn text-xs">Close</button>
  </div>

  <!-- Settings -->
  <button
    onclick={onShowSettings}
    class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
    style:border="1px solid var(--alap-border-subtle)"
    style:color="var(--alap-text)"
  >
    <Icon svg={gearSvg} width={14} height={14} style="opacity: 0.7" />
    Settings
  </button>

  <!-- Config actions -->
  <div class="flex flex-col gap-1.5">
    <!-- Load -->
    <button
      onclick={() => { onShowLoad(); onClose(); }}
      class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
      style:border="1px solid var(--alap-border-subtle)"
      style:color="var(--alap-text)"
    >
      <Icon svg={folderOpenSvg} width={14} height={14} style="opacity: 0.7" />
      Load
    </button>

    <!-- Save -->
    <button
      onclick={() => editor.saveConfig()}
      class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
      style:border="1px solid var(--alap-border-subtle)"
      style:color="var(--alap-text)"
    >
      <Icon svg={saveSvg} width={14} height={14} style="opacity: 0.7" />
      Save
    </button>

    <!-- Save As -->
    {#if showSaveAs}
      <div class="flex gap-2 fade-in">
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" bind:value={saveAsName}
          onkeydown={(e) => handleInlineKeyDown(e, handleSaveAs, () => showSaveAs = false)}
          placeholder="New name"
          class="flex-1 text-sm rounded-md px-2 py-1.5"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)" style:color="var(--alap-text)"
          autofocus />
        <button onclick={handleSaveAs} class="text-xs px-3 rounded-md" style:background="var(--alap-accent)" style:color="var(--alap-deep)">Save</button>
        <button onclick={() => showSaveAs = false} class="text-xs px-2 text-muted">Cancel</button>
      </div>
    {:else}
      <button
        onclick={() => { saveAsName = editor.configName; showSaveAs = true; }}
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        style:border="1px solid var(--alap-border-subtle)"
        style:color="var(--alap-text)"
      >
        <Icon svg={saveSvg} width={14} height={14} style="opacity: 0.7" />
        Save As
      </button>
    {/if}

    <!-- New Config -->
    {#if showNewInput}
      <div class="flex gap-2 fade-in">
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" bind:value={newName}
          onkeydown={(e) => handleInlineKeyDown(e, handleNew, () => showNewInput = false)}
          placeholder="Config name"
          class="flex-1 text-sm rounded-md px-2 py-1.5"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)" style:color="var(--alap-text)"
          autofocus />
        <button onclick={handleNew} class="text-xs px-3 rounded-md" style:background="var(--alap-accent)" style:color="var(--alap-deep)">Create</button>
        <button onclick={() => showNewInput = false} class="text-xs px-2 text-muted">Cancel</button>
      </div>
    {:else}
      <button
        onclick={() => showNewInput = true}
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        style:border="1px solid var(--alap-border-subtle)"
        style:color="var(--alap-text)"
      >
        <Icon svg={plusSvg} width={14} height={14} style="opacity: 0.7" />
        New Config
      </button>
    {/if}

    <!-- Delete from Storage -->
    <button
      onclick={() => deletePrompt = true}
      class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
      style:border="1px solid var(--alap-border-subtle)"
      style:color="var(--alap-danger)"
    >
      <Icon svg={trashSvg} width={14} height={14} style="opacity: 0.7" />
      Delete from Storage
    </button>
  </div>

  <hr style:border-color="var(--alap-border-subtle)" style:margin="0" />

  <!-- Storage mode -->
  <div>
    <label for="storage-mode" class="block text-xs mb-1 text-muted">Storage mode</label>
    <select id="storage-mode"
      class="w-full text-sm rounded-md px-2 py-1.5"
      style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)" style:color="var(--alap-text)"
      value={editor.storageMode}
      onchange={(e) => editor.setStorageMode(e.currentTarget.value as StorageMode)}
    >
      <option value="local">Local (IndexedDB)</option>
      <option value="remote">Remote (API)</option>
      <option value="hybrid">Local + Remote</option>
    </select>
  </div>

  <hr style:border-color="var(--alap-border-subtle)" style:margin="0" />

  <!-- JSON Files -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-muted">JSON Files</span>
      <div class="flex rounded-md overflow-hidden text-[10px]" style:border="1px solid var(--alap-border-subtle)">
        <button
          onclick={() => importMode = 'replace'}
          class="px-2 py-0.5"
          style:background={importMode === 'replace' ? 'var(--alap-accent)' : 'transparent'}
          style:color={importMode === 'replace' ? 'var(--alap-deep)' : 'var(--alap-text-dim)'}
        >Replace</button>
        <button
          onclick={() => importMode = 'merge'}
          class="px-2 py-0.5"
          style:background={importMode === 'merge' ? 'var(--alap-accent)' : 'transparent'}
          style:color={importMode === 'merge' ? 'var(--alap-deep)' : 'var(--alap-text-dim)'}
        >Merge</button>
      </div>
    </div>
    <div class="flex flex-col gap-1.5">
      <button
        onclick={handleImport}
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        style:border="1px solid var(--alap-border-subtle)"
        style:color="var(--alap-text)"
      >
        <Icon svg={importSvg} width={14} height={14} style="opacity: 0.7" />
        {hasFileSystemAccess() ? 'Open File' : 'Import JSON'}
      </button>
      <button
        onclick={handleExport}
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        style:border="1px solid var(--alap-border-subtle)"
        style:color="var(--alap-text)"
      >
        <Icon svg={exportSvg} width={14} height={14} style="opacity: 0.7" />
        {hasFileSystemAccess() ? 'Save to File' : 'Export JSON'}
      </button>
    </div>
  </div>
</div>
