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
  import { onMount, onDestroy } from 'svelte';

  let {
    message,
    onConfirm,
    onCancel,
  }: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();

  let confirmBtn: HTMLButtonElement | undefined = $state();

  onMount(() => {
    confirmBtn?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);

    return () => document.removeEventListener('keydown', handleKey);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  style:background="var(--alap-overlay-bg)"
  onclick={onCancel}
  onkeydown={(e) => { if (e.key === 'Escape') onCancel(); }}
  role="dialog"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="rounded-xl p-8 w-96 shadow-2xl fade-in"
    style:background="var(--alap-mid)"
    style:border="1px solid var(--alap-border)"
    onclick={(e) => e.stopPropagation()}
  >
    <p class="text-center text-lg mb-8">{message}</p>
    <div class="flex justify-between gap-4">
      <button
        onclick={onCancel}
        class="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-opacity"
        style:background="var(--alap-cancel-bg)"
        style:color="var(--alap-cancel-text)"
      >
        Cancel
      </button>
      <button
        bind:this={confirmBtn}
        onclick={onConfirm}
        class="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-lift shadow-lg"
        style:background="var(--alap-danger)"
        style:color="#fff"
      >
        Remove
      </button>
    </div>
  </div>
</div>
