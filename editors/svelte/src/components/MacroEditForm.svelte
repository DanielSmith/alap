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
  import { useAlap } from 'alap/svelte';

  let { macroName }: { macroName: string } = $props();

  let macro = $derived(editor.config.macros?.[macroName]);

  let expanded = $state(true);
  let editName = $state('');
  let editExpr = $state('');
  let isNew = $state(false);
  let isDirty = $state(false);
  let saveLabel = $state('Save Macro');

  const { resolve } = useAlap();

  let resolvedLinks = $derived(editExpr ? resolve(editExpr) : []);

  // Sync form fields when macro changes
  $effect(() => {
    if (macro) {
      editName = macroName;
      editExpr = macro.linkItems;
      const freshlyCreated = !macro.linkItems;
      isNew = freshlyCreated;
      isDirty = freshlyCreated;
      saveLabel = freshlyCreated ? 'Save Macro' : 'Update Macro';
    }
  });

  function markDirty() {
    isDirty = true;
  }

  function handleSave() {
    if (!isDirty) return;
    const name = editName.trim();
    const expr = editExpr.trim();
    if (!name || !expr) return;

    saveLabel = 'Saving...';

    if (name !== macroName) editor.removeMacro(macroName);
    editor.addMacro(name, expr);

    saveLabel = 'Saved';
    isNew = false;
    isDirty = false;
    editor.setStatus(`${isNew ? 'Saved' : 'Updated'} macro @${name}`);
    setTimeout(() => { saveLabel = 'Update Macro'; }, 1500);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  let summaryLabel = $derived(expanded ? `@${macroName}` : `@${macroName}${editExpr ? ` — ${editExpr}` : ''}`);
</script>

{#if macro}
  <div class="rounded-xl fade-in edit-card" style:background="var(--alap-macro-mid)">
    <!-- Header — click to toggle -->
    <div
      class="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
      onclick={() => expanded = !expanded}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') expanded = !expanded; }}
      role="button"
      tabindex="0"
    >
      <h2 class="text-sm font-semibold text-macro-accent flex-shrink-0">Edit Macro</h2>
      <span class="text-xs font-mono text-dim truncate ml-3">{summaryLabel}</span>
    </div>

    {#if expanded}
      <div class="px-6 pb-6">
        <div class="space-y-4 mb-4">
          <div>
            <label for="{macroName}-name" class="block text-xs mb-1 font-semibold text-accent">Name</label>
            <input id="{macroName}-name" type="text" bind:value={editName} oninput={markDirty} onkeydown={handleKeyDown}
              class="w-full rounded-md px-3 py-1.5 text-sm"
              style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
              style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
          </div>
          <div>
            <label for="{macroName}-expr" class="block text-xs mb-1 font-semibold text-accent">Expression</label>
            <input id="{macroName}-expr" type="text" bind:value={editExpr} oninput={markDirty} onkeydown={handleKeyDown}
              class="w-full rounded-md px-3 py-1.5 text-sm"
              style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
              style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace" />
          </div>
        </div>

        <div class="mb-4 p-3 rounded-lg" style:background="var(--alap-macro-deep)">
          <p class="text-xs mb-2 text-dim">
            Resolves to {resolvedLinks.length} item{resolvedLinks.length !== 1 ? 's' : ''}
          </p>
          {#if resolvedLinks.length > 0}
            <div class="flex flex-wrap gap-1.5">
              {#each resolvedLinks as link (link.id)}
                <span class="tag-pill">
                  {link.id}
                  {#if link.label}
                    <span class="ml-1 text-dim">{link.label}</span>
                  {/if}
                </span>
              {/each}
            </div>
          {:else if editExpr}
            <p class="text-xs text-dim">No matches</p>
          {/if}
        </div>

        <div class="flex justify-between items-center pt-4" style:border-top="1px solid var(--alap-border-subtle)">
          <button
            onclick={() => editor.closeEditMacro(macroName)}
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
            style:background={isDirty ? 'var(--alap-macro-accent)' : 'var(--alap-border-subtle)'}
            style:color={isDirty ? 'var(--alap-macro-deep)' : 'var(--alap-text-dim)'}
            style:cursor={isDirty ? 'pointer' : 'default'}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
