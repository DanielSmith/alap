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
  import Icon from './Icon.svelte';
  import menuSvg from '../../assets/svg/menu.svg?raw';
  import searchSvg from '../../assets/svg/search.svg?raw';
  import helpSvg from '../../assets/svg/help.svg?raw';

  let {
    onToggleTester,
    onToggleDrawer,
    onShowHelp,
    testerOpen,
  }: {
    onToggleTester: () => void;
    onToggleDrawer: () => void;
    onShowHelp: () => void;
    testerOpen: boolean;
  } = $props();
</script>

<div
  class="relative flex items-center px-4 py-2.5 flex-shrink-0"
  style:background="var(--alap-mid)"
  style:border-bottom="1px solid var(--alap-border-subtle)"
>
  <!-- Left group -->
  <div class="flex items-center gap-2 z-10">
    <button onclick={onToggleDrawer} class="toolbar-btn p-1.5 text-accent" title="Config management">
      <Icon svg={menuSvg} width={18} height={18} />
    </button>

    <button
      onclick={onToggleTester}
      class="toolbar-btn flex items-center gap-1.5 px-2.5 py-1.5"
      style:color="var(--alap-accent)"
      style:background={testerOpen ? 'var(--alap-surface)' : 'transparent'}
      title="Toggle query tester"
    >
      <Icon svg={searchSvg} width={14} height={14} />
      <span class="text-xs">Query Tester</span>
    </button>

    <button onclick={onShowHelp} class="toolbar-btn p-1.5 text-accent" title="Help">
      <Icon svg={helpSvg} width={16} height={16} />
    </button>
  </div>

  <!-- Center title — absolutely positioned for true centering -->
  <span class="absolute inset-0 flex items-center justify-center pointer-events-none">
    <span class="text-sm font-semibold tracking-wide text-accent">
      alap editor — svelte <span class="text-muted font-normal">({editor.configName}{#if editor.isDirty} *{/if})</span>
    </span>
  </span>
</div>
