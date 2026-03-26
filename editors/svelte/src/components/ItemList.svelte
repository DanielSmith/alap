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
  import cloneSvg from '../../assets/svg/clone.svg?raw';
  import xSvg from '../../assets/svg/x.svg?raw';

  let pendingDeleteId = $state<string | null>(null);

  let items = $derived.by(() => {
    const entries = Object.entries(editor.config.allLinks);
    if (!editor.filter) return entries;
    const f = editor.filter.toLowerCase();
    return entries.filter(([id, item]) =>
      id.toLowerCase().includes(f) ||
      (item.label ?? '').toLowerCase().includes(f) ||
      (item.tags ?? []).some((t) => t.toLowerCase().includes(f))
    );
  });

  function handleDelete(e: MouseEvent, id: string) {
    e.stopPropagation();
    pendingDeleteId = id;
  }

  function confirmDelete() {
    if (pendingDeleteId) {
      editor.removeItem(pendingDeleteId);
      pendingDeleteId = null;
    }
  }

  function handleClone(e: MouseEvent, id: string) {
    e.stopPropagation();
    editor.cloneItem(id);
  }

  function handleRemoveTag(e: MouseEvent, id: string, tag: string) {
    e.stopPropagation();
    const item = editor.config.allLinks[id];
    if (!item?.tags) return;
    editor.updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
  }
</script>

{#if pendingDeleteId}
  <ConfirmDialog
    message={`Remove item "${pendingDeleteId}"?`}
    onConfirm={confirmDelete}
    onCancel={() => pendingDeleteId = null}
  />
{/if}

<div class="p-3" style:border-bottom="1px solid var(--alap-border-subtle)">
  <input
    type="text"
    value={editor.filter}
    oninput={(e) => editor.setFilter(e.currentTarget.value)}
    placeholder="Filter items..."
    class="w-full text-sm rounded-lg px-3 py-2 bg-input"
  />
</div>

<div class="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
  <span>
    {items.length} item{items.length !== 1 ? 's' : ''}
    {#if editor.filter}
      <span class="text-muted"> matching "{editor.filter}"</span>
    {/if}
  </span>
  <button onclick={() => editor.addItem()} class="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent">+ Add</button>
</div>

<div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
  {#each items as [id, item] (id)}
    {@const isEditing = editor.editingItemIds.includes(id)}
    <div
      onclick={() => editor.toggleEditItem(id)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') editor.toggleEditItem(id); }}
      role="button"
      tabindex="0"
      class="item-card rounded-lg px-4 py-2.5 cursor-pointer group relative"
      class:editing={isEditing}
      class:hover-bg-hover={!isEditing}
    >
      <div class="flex items-center justify-between relative">
        <span class="text-sm font-medium truncate item-name">{id}</span>
        <div class="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
          <button onclick={(e) => handleDelete(e, id)} class="reveal-icon p-1 text-danger" title="Delete">
            <Icon svg={xSvg} width={14} height={14} />
          </button>
          <button onclick={(e) => handleClone(e, id)} class="reveal-icon p-1 text-success" title="Clone">
            <Icon svg={cloneSvg} width={14} height={14} />
          </button>
        </div>
      </div>

      {#if item.label}
        <div class="text-xs truncate mt-0.5 text-muted">{item.label}</div>
      {/if}

      {#if item.tags && item.tags.length > 0}
        <div class="flex gap-1 mt-1.5 flex-wrap">
          {#each item.tags as tag (tag)}
            <span class="tag-pill">
              {tag}
              <button class="tag-remove" onclick={(e) => handleRemoveTag(e, id, tag)}>×</button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  {#if items.length === 0}
    <div class="p-6 text-sm text-center rounded-lg text-dim" style:background="var(--alap-item-bg)">
      {#if editor.filter}
        No items match filter
      {:else}
        No items yet
      {/if}
    </div>
  {/if}
</div>
