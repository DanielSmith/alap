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
  let { onClose }: { onClose: () => void } = $props();
</script>

{#snippet row(label: string, desc: string)}
  <div class="flex gap-3 py-0.5">
    <code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">{label}</code>
    <span class="text-dim">{desc}</span>
  </div>
{/snippet}

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
    class="rounded-xl p-6 w-[560px] max-h-[80vh] overflow-y-auto shadow-2xl fade-in"
    style:background="var(--alap-mid)"
    style:border="1px solid var(--alap-border)"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-sm font-semibold text-accent">Alap Editor — Help</h2>
      <button onclick={onClose} class="toolbar-btn text-xs">Close</button>
    </div>

    <div class="flex flex-col gap-4 text-sm">

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Getting Started</h3>
        <div class="text-xs text-muted leading-relaxed">
          <p>Use the <strong>Items</strong> and <strong>Macros</strong> tabs on the left to manage your link library. Click an item to edit it in the center panel. Multiple items can be open at once.</p>
          <p class="mt-2">Drag a URL from your browser onto the editor to create a new item automatically.</p>
        </div>
      </div>

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Items</h3>
        <div class="text-xs text-muted leading-relaxed">
          {@render row('+ Add', 'Create a new blank item')}
          {@render row('Click item', 'Open for editing (toggle)')}
          {@render row('Hover icons', 'Clone or delete an item')}
          {@render row('Enter key', 'Save the current form')}
          {@render row('Drag & drop', 'Drop a URL to create, drop an image to set thumbnail')}
        </div>
      </div>

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Macros</h3>
        <div class="text-xs text-muted leading-relaxed">
          <p>Macros are saved expressions. Define them once, use <code class="text-accent-soft">@macroName</code> in any expression.</p>
          {@render row('+ Add', 'Create a new macro')}
          {@render row('Live resolution', 'See which items a macro expression resolves to as you type')}
        </div>
      </div>

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Expression Grammar</h3>
        <div class="text-xs text-muted leading-relaxed">
          {@render row('.tag', 'All items with this tag')}
          {@render row('itemId', 'One specific item by ID')}
          {@render row('@macro', 'Expand a saved macro')}
          {@render row('.a + .b', 'AND — items with both tags')}
          {@render row('.a | .b', 'OR — items with either tag')}
          {@render row('.a - .b', 'WITHOUT — subtract matches')}
          {@render row('(.a + .b) | .c', 'Parentheses for grouping')}
          {@render row('/pattern/', 'Regex search')}
        </div>
      </div>

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Query Tester</h3>
        <div class="text-xs text-muted leading-relaxed">
          <p>Toggle the query tester from the toolbar to test expressions live. Click the expression link to see the actual Alap menu. The tag cloud and search pattern cloud let you click to insert expressions.</p>
        </div>
      </div>

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Config Management</h3>
        <div class="text-xs text-muted leading-relaxed">
          <p>Use the <strong>hamburger menu</strong> to access config management: Load, Save, Save As, New, Delete, Storage mode, and Settings.</p>
          {@render row('Load', 'Browse and load saved configs (Replace or Merge)')}
          {@render row('Save / Save As', 'Persist to IndexedDB, Remote API, or both')}
          {@render row('Import / Export', 'JSON files on disk (separate from storage)')}
        </div>
      </div>

      <div class="rounded-lg p-3" style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-border-subtle)">
        <h3 class="text-xs font-semibold text-accent mb-2">Keyboard</h3>
        <div class="text-xs text-muted leading-relaxed">
          {@render row('Enter', 'Save current item or macro form')}
          {@render row('Escape', 'Close topmost dialog or drawer')}
        </div>
      </div>

    </div>
  </div>
</div>
