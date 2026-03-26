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
  import { onMount } from 'svelte';

  let { itemId }: { itemId: string } = $props();

  let item = $derived(editor.config.allLinks[itemId]);

  let expanded = $state(true);
  let localId = $state('');
  let label = $state('');
  let url = $state('');
  let tags = $state('');
  let cssClass = $state('');
  let targetWindow = $state('');
  let image = $state('');
  let altText = $state('');
  let thumbnail = $state('');
  let description = $state('');
  let isNew = $state(false);
  let isDirty = $state(false);
  let saveLabel = $state('');
  let lightboxSrc = $state<string | null>(null);

  // Sync form fields when item changes
  $effect(() => {
    if (item) {
      localId = itemId;
      label = item.label ?? '';
      url = item.url ?? '';
      tags = (item.tags ?? []).join(', ');
      cssClass = item.cssClass ?? '';
      targetWindow = item.targetWindow ?? '';
      image = item.image ?? '';
      altText = item.altText ?? '';
      thumbnail = item.thumbnail ?? '';
      description = item.description ?? '';
      const fresh = !item.url && !item.label && !(item.tags?.length);
      isNew = fresh;
      isDirty = fresh;
      saveLabel = fresh ? 'Save Item' : 'Update Item';
    }
  });

  function markDirty() {
    isDirty = true;
  }

  function handleSave() {
    if (!isDirty) return;
    saveLabel = 'Saving...';

    if (localId !== itemId) {
      const success = editor.renameItem(itemId, localId);
      if (!success) {
        editor.setStatus(`ID "${localId}" already exists`);
        localId = itemId;
        saveLabel = isNew ? 'Save Item' : 'Update Item';
        return;
      }
    }

    const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);

    editor.updateItem(localId, {
      label: label || undefined,
      url,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      cssClass: cssClass || undefined,
      targetWindow: targetWindow || undefined,
      image: image || undefined,
      altText: altText || undefined,
      thumbnail: thumbnail || undefined,
      description: description || undefined,
    });

    saveLabel = 'Saved';
    isNew = false;
    isDirty = false;
    editor.setStatus(`${isNew ? 'Saved' : 'Updated'} "${localId}"`);
    setTimeout(() => { saveLabel = 'Update Item'; }, 1500);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  function handleLightboxKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      lightboxSrc = null;
    }
  }

  let summaryLabel = $derived(expanded ? itemId : `${itemId}${label ? ` — ${label}` : ''}`);
</script>

{#if item}
  <div class="rounded-xl fade-in edit-card" style:background="var(--alap-mid)">
    <!-- Header — click to toggle -->
    <div
      class="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
      onclick={() => expanded = !expanded}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') expanded = !expanded; }}
      role="button"
      tabindex="0"
    >
      <h2 class="text-sm font-semibold text-accent flex-shrink-0">Edit Item</h2>
      <span class="text-xs font-mono text-dim truncate ml-3">{summaryLabel}</span>
    </div>

    {#if expanded}
      <div class="px-6 pb-6">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label for="{itemId}-id" class="block text-xs mb-1 font-semibold text-accent">Item ID</label>
            <input id="{itemId}-id" type="text" bind:value={localId} oninput={markDirty} onkeydown={handleKeyDown}
              class="w-full rounded-md px-3 py-1.5 text-sm"
              style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
              style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
          </div>
          <div>
            <label for="{itemId}-label" class="block text-xs mb-1 font-semibold text-accent">Label</label>
            <input id="{itemId}-label" type="text" bind:value={label} oninput={markDirty} onkeydown={handleKeyDown}
              class="w-full rounded-md px-3 py-1.5 text-sm"
              style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
              style:color="var(--alap-text)" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label for="{itemId}-url" class="block text-xs mb-1 font-semibold text-accent">URL</label>
            <input id="{itemId}-url" type="text" bind:value={url} oninput={markDirty} onkeydown={handleKeyDown}
              class="w-full rounded-md px-3 py-1.5 text-sm"
              style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
              style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
          </div>
          <div>
            <label for="{itemId}-tags" class="block text-xs mb-1 font-semibold text-accent">Tags</label>
            <input id="{itemId}-tags" type="text" bind:value={tags} oninput={markDirty} onkeydown={handleKeyDown}
              placeholder="comma-separated"
              class="w-full rounded-md px-3 py-1.5 text-sm"
              style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
              style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
          </div>
        </div>

        <details class="mt-2 mb-4">
          <summary class="text-xs cursor-pointer select-none py-1 text-dim">Advanced fields</summary>
          <div class="grid grid-cols-2 gap-4 mt-3 fade-in">
            <div>
              <label for="{itemId}-desc" class="block text-xs mb-1 font-semibold text-accent">Description</label>
              <input id="{itemId}-desc" type="text" bind:value={description} oninput={markDirty} onkeydown={handleKeyDown}
                class="w-full rounded-md px-3 py-1.5 text-sm"
                style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
                style:color="var(--alap-text)" />
            </div>
            <div>
              <label for="{itemId}-css" class="block text-xs mb-1 font-semibold text-accent">CSS Class</label>
              <input id="{itemId}-css" type="text" bind:value={cssClass} oninput={markDirty} onkeydown={handleKeyDown}
                class="w-full rounded-md px-3 py-1.5 text-sm"
                style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
                style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
            </div>
            <div>
              <label for="{itemId}-target" class="block text-xs mb-1 font-semibold text-accent">Target Window</label>
              <input id="{itemId}-target" type="text" bind:value={targetWindow} oninput={markDirty} onkeydown={handleKeyDown}
                placeholder="_self, _blank, fromAlap"
                class="w-full rounded-md px-3 py-1.5 text-sm"
                style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
                style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
            </div>
            <div>
              <label for="{itemId}-thumb" class="block text-xs mb-1 font-semibold text-accent">Thumbnail URL</label>
              <input id="{itemId}-thumb" type="text" bind:value={thumbnail} oninput={markDirty} onkeydown={handleKeyDown}
                class="w-full rounded-md px-3 py-1.5 text-sm"
                style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
                style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
            </div>
            <div>
              <label for="{itemId}-image" class="block text-xs mb-1 font-semibold text-accent">Image URL (renders in menu)</label>
              <input id="{itemId}-image" type="text" bind:value={image} oninput={markDirty} onkeydown={handleKeyDown}
                class="w-full rounded-md px-3 py-1.5 text-sm"
                style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
                style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
            </div>
            <div>
              <label for="{itemId}-alt" class="block text-xs mb-1 font-semibold text-accent">Alt Text</label>
              <input id="{itemId}-alt" type="text" bind:value={altText} oninput={markDirty} onkeydown={handleKeyDown}
                class="w-full rounded-md px-3 py-1.5 text-sm"
                style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
                style:color="var(--alap-text)" />
            </div>
          </div>

          <!-- Image previews — click for full size -->
          {#if thumbnail || image}
            <div class="flex gap-3 mt-3">
              {#if thumbnail}
                <div>
                  <p class="text-[10px] text-dim mb-1">Thumbnail</p>
                  <button type="button" class="p-0 bg-transparent border-0" onclick={() => lightboxSrc = thumbnail}>
                    <img src={thumbnail} alt="thumbnail preview"
                      class="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
                      style:border="1px solid var(--alap-border-subtle)" />
                  </button>
                </div>
              {/if}
              {#if image}
                <div>
                  <p class="text-[10px] text-dim mb-1">Menu image</p>
                  <button type="button" class="p-0 bg-transparent border-0" onclick={() => lightboxSrc = image}>
                    <img src={image} alt="menu preview"
                      class="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
                      style:border="1px solid var(--alap-border-subtle)" />
                  </button>
                </div>
              {/if}
            </div>
          {/if}

          {#if lightboxSrc}
            <div
              class="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
              style:background="var(--alap-overlay-bg)"
              onclick={() => lightboxSrc = null}
              onkeydown={handleLightboxKey}
              role="dialog"
              tabindex="-1"
            >
              <div role="presentation" onclick={(e) => e.stopPropagation()}>
                <img
                  src={lightboxSrc}
                  alt="Full size preview"
                  class="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl fade-in object-contain"
                />
              </div>
            </div>
          {/if}
        </details>

        <div class="flex justify-between items-center pt-4" style:border-top="1px solid var(--alap-border-subtle)">
          <button
            onclick={() => editor.closeEditItem(itemId)}
            class="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity"
            style:background="var(--alap-cancel-bg)"
            style:color="var(--alap-cancel-text)"
          >
            Cancel
          </button>
          <button
            onclick={handleSave}
            disabled={!isDirty}
            class="text-sm px-6 py-2 rounded-2xl font-medium shadow-lg min-w-[140px]"
            style:background={isDirty ? 'var(--alap-accent)' : 'var(--alap-border-subtle)'}
            style:color={isDirty ? 'var(--alap-deep)' : 'var(--alap-text-dim)'}
            style:cursor={isDirty ? 'pointer' : 'default'}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
