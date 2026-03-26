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
  import EditItemForm from './EditItemForm.svelte';
</script>

{#if editor.editingItemIds.length === 0}
  <div class="flex items-center justify-center h-full">
    <div class="text-center max-w-md">
      <p class="text-lg mb-2 text-muted">Select an item to edit</p>
      <p class="text-sm text-dim">Click an item in the list, or drag a link from your browser onto this window.</p>
    </div>
  </div>
{:else}
  <div class="max-w-2xl mx-auto flex flex-col gap-4">
    {#each editor.editingItemIds as itemId (itemId)}
      <EditItemForm {itemId} />
    {/each}
  </div>
{/if}
