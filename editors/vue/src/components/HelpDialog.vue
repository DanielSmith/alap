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

<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();

const sectionStyle = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-border-subtle)',
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    :style="{ background: 'var(--alap-overlay-bg)' }"
    @click="emit('close')"
  >
    <div
      class="rounded-xl p-6 w-[560px] max-h-[80vh] overflow-y-auto shadow-2xl fade-in"
      :style="{ background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' }"
      @click.stop
    >
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-sm font-semibold text-accent">Alap Editor — Help</h2>
        <button class="toolbar-btn text-xs" @click="emit('close')">Close</button>
      </div>

      <div class="flex flex-col gap-4 text-sm">

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Getting Started</h3>
          <div class="text-xs text-muted leading-relaxed">
            <p>Use the <strong>Items</strong> and <strong>Macros</strong> tabs on the left to manage your link library. Click an item to edit it in the center panel. Multiple items can be open at once.</p>
            <p class="mt-2">Drag a URL from your browser onto the editor to create a new item automatically.</p>
          </div>
        </div>

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Items</h3>
          <div class="text-xs text-muted leading-relaxed">
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">+ Add</code><span class="text-dim">Create a new blank item</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Click item</code><span class="text-dim">Open for editing (toggle)</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Hover icons</code><span class="text-dim">Clone or delete an item</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Enter key</code><span class="text-dim">Save the current form</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Drag &amp; drop</code><span class="text-dim">Drop a URL to create, drop an image to set thumbnail</span></div>
          </div>
        </div>

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Macros</h3>
          <div class="text-xs text-muted leading-relaxed">
            <p>Macros are saved expressions. Define them once, use <code class="text-accent-soft">@macroName</code> in any expression.</p>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">+ Add</code><span class="text-dim">Create a new macro</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Live resolution</code><span class="text-dim">See which items a macro expression resolves to as you type</span></div>
          </div>
        </div>

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Expression Grammar</h3>
          <div class="text-xs text-muted leading-relaxed">
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">.tag</code><span class="text-dim">All items with this tag</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">itemId</code><span class="text-dim">One specific item by ID</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">@macro</code><span class="text-dim">Expand a saved macro</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">.a + .b</code><span class="text-dim">AND — items with both tags</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">.a | .b</code><span class="text-dim">OR — items with either tag</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">.a - .b</code><span class="text-dim">WITHOUT — subtract matches</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">(.a + .b) | .c</code><span class="text-dim">Parentheses for grouping</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">/pattern/</code><span class="text-dim">Regex search</span></div>
          </div>
        </div>

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Query Tester</h3>
          <div class="text-xs text-muted leading-relaxed">
            <p>Toggle the query tester from the toolbar to test expressions live. Click the expression link to see the actual Alap menu. The tag cloud and search pattern cloud let you click to insert expressions.</p>
          </div>
        </div>

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Config Management</h3>
          <div class="text-xs text-muted leading-relaxed">
            <p>Use the <strong>hamburger menu</strong> to access config management: Load, Save, Save As, New, Delete, Storage mode, and Settings.</p>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Load</code><span class="text-dim">Browse and load saved configs (Replace or Merge)</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Save / Save As</code><span class="text-dim">Persist to IndexedDB, Remote API, or both</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Import / Export</code><span class="text-dim">JSON files on disk (separate from storage)</span></div>
          </div>
        </div>

        <div class="rounded-lg p-3" :style="sectionStyle">
          <h3 class="text-xs font-semibold text-accent mb-2">Keyboard</h3>
          <div class="text-xs text-muted leading-relaxed">
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Enter</code><span class="text-dim">Save current item or macro form</span></div>
            <div class="flex gap-3 py-0.5"><code class="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">Escape</code><span class="text-dim">Close topmost dialog or drawer</span></div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
