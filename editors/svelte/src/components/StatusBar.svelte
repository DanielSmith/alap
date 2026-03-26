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

  // Auto-clear status messages after 4 seconds
  $effect(() => {
    if (!editor.statusMessage) return;
    const timer = setTimeout(() => editor.setStatus(null), 4000);
    return () => clearTimeout(timer);
  });
</script>

<div
  class="px-5 py-1.5 flex items-center text-xs flex-shrink-0"
  style:background="var(--alap-mid)"
  style:border-top="1px solid var(--alap-border-subtle)"
  style:color="var(--alap-text-dim)"
>
  <span class="font-medium text-muted">{editor.configName}</span>
  {#if editor.isDirty}
    <span class="ml-1.5 text-accent">unsaved</span>
  {/if}
  <span class="mx-2 border-subtle">|</span>
  <span>{editor.storageMode}</span>
  <div class="flex-1"></div>
  {#if editor.statusMessage}
    <span class="fade-in text-muted">{editor.statusMessage}</span>
  {/if}
</div>
