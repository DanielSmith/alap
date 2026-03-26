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
  import { editor } from '../store/editor.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import Icon from './Icon.svelte';
  import xSvg from '../../assets/svg/x.svg?raw';
  import cloneSvg from '../../assets/svg/clone.svg?raw';

  let pendingDeleteName = $state<string | null>(null);

  let macros = $derived.by(() => {
    const entries = Object.entries(editor.config.macros ?? {});
    if (!editor.filter) return entries;
    const f = editor.filter.toLowerCase();
    return entries.filter(([name, macro]) =>
      name.toLowerCase().includes(f) || macro.linkItems.toLowerCase().includes(f)
    );
  });

  function handleDelete(e: MouseEvent, name: string) {
    e.stopPropagation();
    pendingDeleteName = name;
  }

  function confirmDelete() {
    if (pendingDeleteName) {
      editor.removeMacro(pendingDeleteName);
      if (editor.editingMacroNames.includes(pendingDeleteName)) {
        editor.toggleEditMacro(pendingDeleteName);
      }
      pendingDeleteName = null;
    }
  }

  function handleClone(e: MouseEvent, name: string) {
    e.stopPropagation();
    const macro = editor.config.macros?.[name];
    if (!macro) return;
    const newName = `${name}_copy`;
    editor.addMacro(newName, macro.linkItems);
    editor.toggleEditMacro(newName);
    editor.setStatus(`Cloned @${name} → @${newName}`);
  }

  function handleAdd() {
    const name = `macro_${Date.now().toString(36)}`;
    editor.addMacro(name, '');
    editor.toggleEditMacro(name);
    editor.setStatus(`Created @${name}`);
  }
</script>

{#if pendingDeleteName}
  <ConfirmDialog
    message={`Remove macro "@${pendingDeleteName}"?`}
    onConfirm={confirmDelete}
    onCancel={() => pendingDeleteName = null}
  />
{/if}

<div class="p-3" style:border-bottom="1px solid var(--alap-border-subtle)">
  <input
    type="text"
    value={editor.filter}
    oninput={(e) => editor.setFilter(e.currentTarget.value)}
    placeholder="Filter macros..."
    class="w-full text-sm rounded-lg px-3 py-2 bg-input"
  />
</div>

<div class="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
  <span>
    {macros.length} macro{macros.length !== 1 ? 's' : ''}
    {#if editor.filter}
      <span class="text-muted"> matching "{editor.filter}"</span>
    {/if}
  </span>
  <button onclick={handleAdd} class="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent">+ Add</button>
</div>

<div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
  {#each macros as [name, macro] (name)}
    {@const isEditing = editor.editingMacroNames.includes(name)}
    <div
      onclick={() => editor.toggleEditMacro(name)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') editor.toggleEditMacro(name); }}
      role="button"
      tabindex="0"
      class="item-card rounded-lg px-4 py-2.5 cursor-pointer group relative"
      class:editing={isEditing}
      class:hover-bg-hover={!isEditing}
    >
      <div class="flex items-center justify-between relative">
        <span class="text-sm font-medium truncate item-name">@{name}</span>
        <div class="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
          <button onclick={(e) => handleDelete(e, name)} class="reveal-icon p-1 text-danger" title="Delete">
            <Icon svg={xSvg} width={14} height={14} />
          </button>
          <button onclick={(e) => handleClone(e, name)} class="reveal-icon p-1 text-success" title="Clone">
            <Icon svg={cloneSvg} width={14} height={14} />
          </button>
        </div>
      </div>
      <div class="text-xs truncate mt-0.5 text-muted" style:font-family="'JetBrains Mono', monospace">{macro.linkItems}</div>
    </div>
  {/each}

  {#if macros.length === 0}
    <div class="p-6 text-sm text-center rounded-lg text-dim" style:background="var(--alap-macro-item-bg)">
      No macros yet
    </div>
  {/if}
</div>
