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
  import ItemList from './ItemList.svelte';
  import MacroList from './MacroList.svelte';

  let isMacroMode = $derived(editor.panelMode === 'macros');

  let itemsTabClass = $derived(`panel-tab flex-1 ${editor.panelMode === 'items' ? 'active' : ''}`);
  let macrosTabClass = $derived(`panel-tab flex-1 ${editor.panelMode === 'macros' ? 'active-macro' : ''}`);
</script>

<div
  class="w-72 flex-shrink-0 flex flex-col overflow-hidden"
  class:macro-mode={isMacroMode}
  style:background={isMacroMode ? 'var(--alap-macro-mid)' : 'var(--alap-mid)'}
  style:border-right="1px solid var(--alap-border-subtle)"
  style:transition="background var(--alap-transition)"
>
  <div class="flex" style:border-bottom="1px solid var(--alap-border-subtle)">
    <button onclick={() => editor.setPanelMode('items')} class={itemsTabClass}>Items</button>
    <button onclick={() => editor.setPanelMode('macros')} class={macrosTabClass}>Macros</button>
  </div>

  {#if editor.panelMode === 'items'}
    <ItemList />
  {:else}
    <MacroList />
  {/if}
</div>
