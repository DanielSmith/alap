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
import CloneIcon from '../../assets/svg/clone.svg?component';
import XIcon from '../../assets/svg/x.svg?component';

const editorStore = useEditorStore();
const { config, filter, editingItemIds } = storeToRefs(editorStore);

const pendingDeleteId = ref<string | null>(null);

const items = computed(() => {
  const entries = Object.entries(config.value.allLinks);
  if (!filter.value) return entries;
  const f = filter.value.toLowerCase();
  return entries.filter(([id, item]) =>
    id.toLowerCase().includes(f) ||
    (item.label ?? '').toLowerCase().includes(f) ||
    (item.tags ?? []).some((t) => t.toLowerCase().includes(f))
  );
});

function handleDelete(e: MouseEvent, id: string) {
  e.stopPropagation();
  pendingDeleteId.value = id;
}

function confirmDelete() {
  if (pendingDeleteId.value) {
    editorStore.removeItem(pendingDeleteId.value);
    pendingDeleteId.value = null;
  }
}

function handleClone(e: MouseEvent, id: string) {
  e.stopPropagation();
  editorStore.cloneItem(id);
}

function handleRemoveTag(e: MouseEvent, id: string, tag: string) {
  e.stopPropagation();
  const item = config.value.allLinks[id];
  if (!item?.tags) return;
  editorStore.updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
}

function isEditing(id: string): boolean {
  return editingItemIds.value.includes(id);
}
</script>

<template>
  <ConfirmDialog
    v-if="pendingDeleteId"
    :message="`Remove item &quot;${pendingDeleteId}&quot;?`"
    @confirm="confirmDelete"
    @cancel="pendingDeleteId = null"
  />

  <div class="p-3" :style="{ borderBottom: '1px solid var(--alap-border-subtle)' }">
    <input
      type="text"
      :value="filter"
      placeholder="Filter items..."
      class="w-full text-sm rounded-lg px-3 py-2 bg-input"
      @input="editorStore.setFilter(($event.target as HTMLInputElement).value)"
    />
  </div>

  <div class="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
    <span>
      {{ items.length }} item{{ items.length !== 1 ? 's' : '' }}
      <span v-if="filter" class="text-muted"> matching "{{ filter }}"</span>
    </span>
    <button class="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent" @click="editorStore.addItem()">+ Add</button>
  </div>

  <div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
    <div
      v-for="[id, item] in items"
      :key="id"
      :class="[
        'item-card rounded-lg px-4 py-2.5 cursor-pointer group relative',
        isEditing(id) ? 'editing' : 'hover-bg-hover',
      ]"
      @click="editorStore.toggleEditItem(id)"
    >
      <div class="flex items-center justify-between relative">
        <span class="text-sm font-medium truncate item-name">{{ id }}</span>
        <div class="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
          <button class="reveal-icon p-1 text-danger" title="Delete" @click="handleDelete($event, id)">
            <XIcon :width="14" :height="14" />
          </button>
          <button class="reveal-icon p-1 text-success" title="Clone" @click="handleClone($event, id)">
            <CloneIcon :width="14" :height="14" />
          </button>
        </div>
      </div>
      <div v-if="item.label" class="text-xs truncate mt-0.5 text-muted">{{ item.label }}</div>
      <div v-if="item.tags && item.tags.length > 0" class="flex gap-1 mt-1.5 flex-wrap">
        <span v-for="tag in item.tags" :key="tag" class="tag-pill">
          {{ tag }}
          <span class="tag-remove" @click="handleRemoveTag($event, id, tag)">&times;</span>
        </span>
      </div>
    </div>

    <div
      v-if="items.length === 0"
      class="p-6 text-sm text-center rounded-lg text-dim"
      :style="{ background: 'var(--alap-item-bg)' }"
    >
      <template v-if="filter">No items match filter</template>
      <template v-else>No items yet</template>
    </div>
  </div>
</template>
