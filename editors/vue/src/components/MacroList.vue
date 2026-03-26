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
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';
import ConfirmDialog from './ConfirmDialog.vue';
import XIcon from '../../assets/svg/x.svg?component';
import CloneIcon from '../../assets/svg/clone.svg?component';

const editorStore = useEditorStore();
const { config, filter, editingMacroNames } = storeToRefs(editorStore);

const pendingDeleteName = ref<string | null>(null);

const macros = computed(() => {
  const entries = Object.entries(config.value.macros ?? {});
  if (!filter.value) return entries;
  const f = filter.value.toLowerCase();
  return entries.filter(([name, macro]) =>
    name.toLowerCase().includes(f) || macro.linkItems.toLowerCase().includes(f)
  );
});

function handleDelete(e: MouseEvent, name: string) {
  e.stopPropagation();
  pendingDeleteName.value = name;
}

function confirmDelete() {
  if (pendingDeleteName.value) {
    editorStore.removeMacro(pendingDeleteName.value);
    if (editingMacroNames.value.includes(pendingDeleteName.value)) {
      editorStore.toggleEditMacro(pendingDeleteName.value);
    }
    pendingDeleteName.value = null;
  }
}

function handleClone(e: MouseEvent, name: string) {
  e.stopPropagation();
  const macro = config.value.macros?.[name];
  if (!macro) return;
  const newName = `${name}_copy`;
  editorStore.addMacro(newName, macro.linkItems);
  editorStore.toggleEditMacro(newName);
  editorStore.setStatus(`Cloned @${name} → @${newName}`);
}

function handleAdd() {
  const name = `macro_${Date.now().toString(36)}`;
  editorStore.addMacro(name, '');
  editorStore.toggleEditMacro(name);
  editorStore.setStatus(`Created @${name}`);
}

function isEditing(name: string): boolean {
  return editingMacroNames.value.includes(name);
}
</script>

<template>
  <ConfirmDialog
    v-if="pendingDeleteName"
    :message="`Remove macro &quot;@${pendingDeleteName}&quot;?`"
    @confirm="confirmDelete"
    @cancel="pendingDeleteName = null"
  />

  <div class="p-3" :style="{ borderBottom: '1px solid var(--alap-border-subtle)' }">
    <input
      type="text"
      :value="filter"
      placeholder="Filter macros..."
      class="w-full text-sm rounded-lg px-3 py-2 bg-input"
      @input="editorStore.setFilter(($event.target as HTMLInputElement).value)"
    />
  </div>

  <div class="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
    <span>
      {{ macros.length }} macro{{ macros.length !== 1 ? 's' : '' }}
      <span v-if="filter" class="text-muted"> matching "{{ filter }}"</span>
    </span>
    <button class="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent" @click="handleAdd">+ Add</button>
  </div>

  <div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
    <div
      v-for="[name, macro] in macros"
      :key="name"
      :class="[
        'item-card rounded-lg px-4 py-2.5 cursor-pointer group relative',
        isEditing(name) ? 'editing' : 'hover-bg-hover',
      ]"
      @click="editorStore.toggleEditMacro(name)"
    >
      <div class="flex items-center justify-between relative">
        <span class="text-sm font-medium truncate item-name">@{{ name }}</span>
        <div class="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
          <button class="reveal-icon p-1 text-danger" title="Delete" @click="handleDelete($event, name)">
            <XIcon :width="14" :height="14" />
          </button>
          <button class="reveal-icon p-1 text-success" title="Clone" @click="handleClone($event, name)">
            <CloneIcon :width="14" :height="14" />
          </button>
        </div>
      </div>
      <div class="text-xs truncate mt-0.5 text-muted" :style="{ fontFamily: '\'JetBrains Mono\', monospace' }">
        {{ macro.linkItems }}
      </div>
    </div>

    <div
      v-if="macros.length === 0"
      class="p-6 text-sm text-center rounded-lg text-dim"
      :style="{ background: 'var(--alap-macro-item-bg)' }"
    >
      No macros yet
    </div>
  </div>
</template>
