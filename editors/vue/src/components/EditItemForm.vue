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
import { ref, computed, watch } from 'vue';
import { useEditorStore } from '../store/editor';

const props = defineProps<{ itemId: string }>();

const editorStore = useEditorStore();

const expanded = ref(true);
const localId = ref(props.itemId);
const label = ref('');
const url = ref('');
const tags = ref('');
const cssClass = ref('');
const targetWindow = ref('');
const image = ref('');
const altText = ref('');
const thumbnail = ref('');
const description = ref('');
const isNew = ref(false);
const isDirty = ref(false);
const saveLabel = ref('');
const lightboxSrc = ref<string | null>(null);

const item = computed(() => editorStore.config.allLinks[props.itemId]);

const inputStyle = { background: 'var(--alap-input-bg)', border: '1px solid var(--alap-input-border)', color: 'var(--alap-text)' };
const monoInputStyle = { ...inputStyle, fontFamily: "'JetBrains Mono', monospace" };

watch(
  () => [props.itemId, item.value] as const,
  ([, currentItem]) => {
    if (!currentItem) return;
    localId.value = props.itemId;
    label.value = currentItem.label ?? '';
    url.value = currentItem.url ?? '';
    tags.value = (currentItem.tags ?? []).join(', ');
    cssClass.value = currentItem.cssClass ?? '';
    targetWindow.value = currentItem.targetWindow ?? '';
    image.value = currentItem.image ?? '';
    altText.value = currentItem.altText ?? '';
    thumbnail.value = currentItem.thumbnail ?? '';
    description.value = currentItem.description ?? '';
    const fresh = !currentItem.url && !currentItem.label && !(currentItem.tags?.length);
    isNew.value = fresh;
    isDirty.value = fresh;
    saveLabel.value = fresh ? 'Save Item' : 'Update Item';
  },
  { immediate: true },
);

function markDirty() {
  isDirty.value = true;
}

const saveBtnStyle = computed(() => ({
  background: isDirty.value ? 'var(--alap-accent)' : 'var(--alap-border-subtle)',
  color: isDirty.value ? 'var(--alap-deep)' : 'var(--alap-text-dim)',
  cursor: isDirty.value ? 'pointer' : 'default',
}));

function handleSave() {
  if (!isDirty.value) return;
  saveLabel.value = 'Saving...';

  if (localId.value !== props.itemId) {
    const success = editorStore.renameItem(props.itemId, localId.value);
    if (!success) {
      editorStore.setStatus(`ID "${localId.value}" already exists`);
      localId.value = props.itemId;
      saveLabel.value = isNew.value ? 'Save Item' : 'Update Item';
      return;
    }
  }

  const parsedTags = tags.value.split(',').map((t) => t.trim()).filter(Boolean);
  const wasNew = isNew.value;

  editorStore.updateItem(localId.value, {
    label: label.value || undefined,
    url: url.value,
    tags: parsedTags.length > 0 ? parsedTags : undefined,
    cssClass: cssClass.value || undefined,
    targetWindow: targetWindow.value || undefined,
    image: image.value || undefined,
    altText: altText.value || undefined,
    thumbnail: thumbnail.value || undefined,
    description: description.value || undefined,
  });

  saveLabel.value = 'Saved';
  isNew.value = false;
  isDirty.value = false;
  editorStore.setStatus(`${wasNew ? 'Saved' : 'Updated'} "${localId.value}"`);
  setTimeout(() => { saveLabel.value = 'Update Item'; }, 1500);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
}

const summaryLabel = computed(() =>
  expanded.value ? props.itemId : `${props.itemId}${label.value ? ` — ${label.value}` : ''}`
);

const hasImagePreviews = computed(() => !!(thumbnail.value || image.value));
</script>

<template>
  <div v-if="item" class="rounded-xl fade-in edit-card" :style="{ background: 'var(--alap-mid)' }">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
      @click="expanded = !expanded"
    >
      <h2 class="text-sm font-semibold text-accent flex-shrink-0">Edit Item</h2>
      <span class="text-xs font-mono text-dim truncate ml-3">{{ summaryLabel }}</span>
    </div>

    <div v-if="expanded" class="px-6 pb-6">
      <!-- Primary fields -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs mb-1 font-semibold text-accent">Item ID</label>
          <input type="text" v-model="localId" class="w-full rounded-md px-3 py-1.5 text-sm"
            :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
        </div>
        <div>
          <label class="block text-xs mb-1 font-semibold text-accent">Label</label>
          <input type="text" v-model="label" class="w-full rounded-md px-3 py-1.5 text-sm"
            :style="inputStyle" @input="markDirty" @keydown="handleKeyDown" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs mb-1 font-semibold text-accent">URL</label>
          <input type="text" v-model="url" class="w-full rounded-md px-3 py-1.5 text-sm"
            :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
        </div>
        <div>
          <label class="block text-xs mb-1 font-semibold text-accent">Tags</label>
          <input type="text" v-model="tags" placeholder="comma-separated" class="w-full rounded-md px-3 py-1.5 text-sm"
            :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
        </div>
      </div>

      <!-- Advanced fields -->
      <details class="mt-2 mb-4">
        <summary class="text-xs cursor-pointer select-none py-1 text-dim">Advanced fields</summary>
        <div class="grid grid-cols-2 gap-4 mt-3 fade-in">
          <div>
            <label class="block text-xs mb-1 font-semibold text-accent">Description</label>
            <input type="text" v-model="description" class="w-full rounded-md px-3 py-1.5 text-sm"
              :style="inputStyle" @input="markDirty" @keydown="handleKeyDown" />
          </div>
          <div>
            <label class="block text-xs mb-1 font-semibold text-accent">CSS Class</label>
            <input type="text" v-model="cssClass" class="w-full rounded-md px-3 py-1.5 text-sm"
              :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
          </div>
          <div>
            <label class="block text-xs mb-1 font-semibold text-accent">Target Window</label>
            <input type="text" v-model="targetWindow" placeholder="_self, _blank, fromAlap"
              class="w-full rounded-md px-3 py-1.5 text-sm"
              :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
          </div>
          <div>
            <label class="block text-xs mb-1 font-semibold text-accent">Thumbnail URL</label>
            <input type="text" v-model="thumbnail" class="w-full rounded-md px-3 py-1.5 text-sm"
              :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
          </div>
          <div>
            <label class="block text-xs mb-1 font-semibold text-accent">Image URL (renders in menu)</label>
            <input type="text" v-model="image" class="w-full rounded-md px-3 py-1.5 text-sm"
              :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
          </div>
          <div>
            <label class="block text-xs mb-1 font-semibold text-accent">Alt Text</label>
            <input type="text" v-model="altText" class="w-full rounded-md px-3 py-1.5 text-sm"
              :style="inputStyle" @input="markDirty" @keydown="handleKeyDown" />
          </div>
        </div>

        <!-- Image previews -->
        <div v-if="hasImagePreviews" class="flex gap-3 mt-3">
          <div v-if="thumbnail">
            <p class="text-[10px] text-dim mb-1">Thumbnail</p>
            <img :src="thumbnail" alt="thumbnail preview"
              class="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
              :style="{ border: '1px solid var(--alap-border-subtle)' }"
              @click="lightboxSrc = thumbnail" />
          </div>
          <div v-if="image">
            <p class="text-[10px] text-dim mb-1">Menu image</p>
            <img :src="image" alt="menu image preview"
              class="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
              :style="{ border: '1px solid var(--alap-border-subtle)' }"
              @click="lightboxSrc = image" />
          </div>
        </div>

        <!-- Lightbox -->
        <Teleport to="body">
          <div v-if="lightboxSrc" class="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            :style="{ background: 'var(--alap-overlay-bg)' }" @click="lightboxSrc = null">
            <img :src="lightboxSrc" alt="Full size preview"
              class="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl fade-in object-contain"
              @click.stop />
          </div>
        </Teleport>
      </details>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-4" :style="{ borderTop: '1px solid var(--alap-border-subtle)' }">
        <button
          class="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity"
          :style="{ background: 'var(--alap-cancel-bg)', color: 'var(--alap-cancel-text)' }"
          @click="editorStore.closeEditItem(itemId)"
        >
          Cancel
        </button>
        <button
          :disabled="!isDirty"
          class="text-sm px-6 py-2 rounded-2xl font-medium shadow-lg min-w-[140px]"
          :style="saveBtnStyle"
          @click="handleSave"
        >
          {{ saveLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
