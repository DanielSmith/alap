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

  type LoadMode = 'replace' | 'merge';

  let { onClose }: { onClose: () => void } = $props();

  let loadMode = $state<LoadMode>('replace');
  let filter = $state('');

  function handleLoad(name: string) {
    editor.loadConfig(name);
    if (loadMode === 'merge') {
      editor.setStatus(`Loaded "${name}" (merge coming soon — replaced for now)`);
    }
    onClose();
  }

  let filtered = $derived(
    editor.configNames.filter((n) => !filter || n.toLowerCase().includes(filter.toLowerCase()))
  );

  let actionLabel = $derived(loadMode === 'merge' ? 'merge into current' : 'load');
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  style:background="var(--alap-overlay-bg)"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="rounded-xl p-6 w-[480px] max-h-[70vh] flex flex-col shadow-2xl fade-in"
    style:background="var(--alap-mid)"
    style:border="1px solid var(--alap-border)"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-semibold text-accent">Load Config</h2>
      <div class="flex items-center gap-3">
        <div class="flex rounded-md overflow-hidden text-[10px]" style:border="1px solid var(--alap-border-subtle)">
          <button
            onclick={() => loadMode = 'replace'}
            class="px-2.5 py-1"
            style:background={loadMode === 'replace' ? 'var(--alap-accent)' : 'transparent'}
            style:color={loadMode === 'replace' ? 'var(--alap-deep)' : 'var(--alap-text-dim)'}
          >Replace</button>
          <button
            onclick={() => loadMode = 'merge'}
            class="px-2.5 py-1"
            style:background={loadMode === 'merge' ? 'var(--alap-accent)' : 'transparent'}
            style:color={loadMode === 'merge' ? 'var(--alap-deep)' : 'var(--alap-text-dim)'}
          >Merge</button>
        </div>
        <button onclick={onClose} class="toolbar-btn text-xs">Close</button>
      </div>
    </div>

    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="text"
      bind:value={filter}
      placeholder="Search configs..."
      class="w-full text-sm rounded-lg px-3 py-2 mb-4 bg-input"
      autofocus
    />

    <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">
      {#if filtered.length > 0}
        {#each filtered as name (name)}
          {@const isCurrent = name === editor.configName}
          <button
            onclick={() => { if (!isCurrent) handleLoad(name); }}
            class="w-full text-left text-sm flex items-center justify-between item-card rounded-lg px-4 py-3"
            class:editing={isCurrent}
            class:hover-bg-hover={!isCurrent}
            class:cursor-pointer={!isCurrent}
            disabled={isCurrent}
          >
            <span class:text-accent={isCurrent}>{name}</span>
            <span class="text-[10px] text-dim">
              {#if isCurrent}
                current
              {:else}
                {actionLabel}
              {/if}
            </span>
          </button>
        {/each}
      {:else}
        <p class="text-sm text-center py-6 text-dim">
          {#if filter}
            No configs match filter
          {:else}
            No saved configs
          {/if}
        </p>
      {/if}
    </div>
  </div>
</div>
