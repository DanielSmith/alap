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
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';
import type { StorageMode } from '../store/editor';
import { hasFileSystemAccess, openFromFile, saveToFile } from '../../../shared/file-io';
import ConfirmDialog from './ConfirmDialog.vue';
import GearIcon from '../../assets/svg/gear.svg?component';
import SaveIcon from '../../assets/svg/save.svg?component';
import ImportIcon from '../../assets/svg/import.svg?component';
import ExportIcon from '../../assets/svg/export.svg?component';
import PlusIcon from '../../assets/svg/plus.svg?component';
import TrashIcon from '../../assets/svg/trash.svg?component';
import FolderOpenIcon from '../../assets/svg/folder-open.svg?component';

type LoadMode = 'replace' | 'merge';

const emit = defineEmits<{
  close: [];
  showLoad: [];
  showSettings: [];
}>();

const editorStore = useEditorStore();
const { configName, isDirty, storageMode, config, fileHandle } = storeToRefs(editorStore);

const showNewInput = ref(false);
const newName = ref('');
const showSaveAs = ref(false);
const saveAsName = ref('');
const deletePrompt = ref(false);
const importMode = ref<LoadMode>('replace');

const inputStyle = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};
const btnBorder = { border: '1px solid var(--alap-border-subtle)' };
const submitStyle = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const dividerStyle = { borderColor: 'var(--alap-border-subtle)', margin: '0' };

function handleNew() {
  const name = newName.value.trim();
  if (!name) return;
  editorStore.newConfig(name);
  showNewInput.value = false;
  newName.value = '';
}

function handleSaveAs() {
  const name = saveAsName.value.trim();
  if (!name) return;
  editorStore.saveConfig(name);
  showSaveAs.value = false;
  saveAsName.value = '';
}

function handleDelete() {
  editorStore.deleteConfig(configName.value);
  deletePrompt.value = false;
  editorStore.setStatus(`Deleted "${configName.value}" from storage — still editing in memory`);
}

async function handleImport() {
  const result = await openFromFile();
  if (!result) return;
  editorStore.replaceConfig(result.config, result.name);
  if (importMode.value === 'merge') {
    editorStore.setStatus(`Imported "${result.name}" (merge coming soon — replaced for now)`);
  }
  editorStore.setFileHandle(result.handle);
  emit('close');
}

async function handleExport() {
  const handle = await saveToFile(config.value, configName.value, fileHandle.value);
  if (handle) editorStore.setFileHandle(handle);
}

function handleInlineKeyDown(e: KeyboardEvent, onSubmit: () => void, onCancel: () => void) {
  if (e.key === 'Enter') onSubmit();
  if (e.key === 'Escape') onCancel();
}

const hasFileSys = hasFileSystemAccess();
</script>

<template>
  <div class="flex flex-col gap-4 fade-in">
    <ConfirmDialog
      v-if="deletePrompt"
      :message="`Delete &quot;${configName}&quot; from storage? You'll keep editing in memory. Save to a new name if you want to keep changes.`"
      @confirm="handleDelete"
      @cancel="deletePrompt = false"
    />

    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-accent">
        Config: <span class="text-muted">{{ configName }}</span>
        <span v-if="isDirty" class="text-dim"> *</span>
      </h2>
      <button class="toolbar-btn text-xs" @click="emit('close')">Close</button>
    </div>

    <!-- Settings -->
    <button
      class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
      :style="{ ...btnBorder, color: 'var(--alap-text)' }"
      @click="emit('showSettings')"
    >
      <GearIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
      Settings
    </button>

    <!-- Config operations -->
    <div class="flex flex-col gap-1.5">
      <button
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        :style="{ ...btnBorder, color: 'var(--alap-text)' }"
        @click="emit('showLoad'); emit('close')"
      >
        <FolderOpenIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
        Load
      </button>

      <button
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        :style="{ ...btnBorder, color: 'var(--alap-text)' }"
        @click="editorStore.saveConfig()"
      >
        <SaveIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
        Save
      </button>

      <!-- Save As -->
      <div v-if="showSaveAs" class="flex gap-2 fade-in">
        <input type="text" v-model="saveAsName" placeholder="New name" autofocus
          class="flex-1 text-sm rounded-md px-2 py-1.5" :style="inputStyle"
          @keydown="handleInlineKeyDown($event, handleSaveAs, () => showSaveAs = false)" />
        <button class="text-xs px-3 rounded-md" :style="submitStyle" @click="handleSaveAs">Save</button>
        <button class="text-xs px-2 text-muted" @click="showSaveAs = false">Cancel</button>
      </div>
      <button
        v-else
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        :style="{ ...btnBorder, color: 'var(--alap-text)' }"
        @click="saveAsName = configName; showSaveAs = true"
      >
        <SaveIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
        Save As
      </button>

      <!-- New Config -->
      <div v-if="showNewInput" class="flex gap-2 fade-in">
        <input type="text" v-model="newName" placeholder="Config name" autofocus
          class="flex-1 text-sm rounded-md px-2 py-1.5" :style="inputStyle"
          @keydown="handleInlineKeyDown($event, handleNew, () => showNewInput = false)" />
        <button class="text-xs px-3 rounded-md" :style="submitStyle" @click="handleNew">Create</button>
        <button class="text-xs px-2 text-muted" @click="showNewInput = false">Cancel</button>
      </div>
      <button
        v-else
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        :style="{ ...btnBorder, color: 'var(--alap-text)' }"
        @click="showNewInput = true"
      >
        <PlusIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
        New Config
      </button>

      <!-- Delete -->
      <button
        class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
        :style="{ ...btnBorder, color: 'var(--alap-danger)' }"
        @click="deletePrompt = true"
      >
        <TrashIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
        Delete from Storage
      </button>
    </div>

    <hr :style="dividerStyle" />

    <!-- Storage mode -->
    <div>
      <label class="block text-xs mb-1 text-muted">Storage mode</label>
      <select class="w-full text-sm rounded-md px-2 py-1.5" :style="inputStyle"
        :value="storageMode" @change="editorStore.setStorageMode(($event.target as HTMLSelectElement).value as StorageMode)">
        <option value="local">Local (IndexedDB)</option>
        <option value="remote">Remote (API)</option>
        <option value="hybrid">Local + Remote</option>
      </select>
    </div>

    <hr :style="dividerStyle" />

    <!-- JSON files -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium text-muted">JSON Files</span>
        <div class="flex rounded-md overflow-hidden text-[10px]" :style="btnBorder">
          <button class="px-2 py-0.5"
            :style="importMode === 'replace' ? { background: 'var(--alap-accent)', color: 'var(--alap-deep)' } : { background: 'transparent', color: 'var(--alap-text-dim)' }"
            @click="importMode = 'replace'">Replace</button>
          <button class="px-2 py-0.5"
            :style="importMode === 'merge' ? { background: 'var(--alap-accent)', color: 'var(--alap-deep)' } : { background: 'transparent', color: 'var(--alap-text-dim)' }"
            @click="importMode = 'merge'">Merge</button>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <button
          class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
          :style="{ ...btnBorder, color: 'var(--alap-text)' }"
          @click="handleImport"
        >
          <ImportIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
          <template v-if="hasFileSys">Open File</template>
          <template v-else>Import JSON</template>
        </button>
        <button
          class="w-full text-left text-sm px-3 py-2.5 rounded-lg hover-bg-input flex items-center gap-2.5"
          :style="{ ...btnBorder, color: 'var(--alap-text)' }"
          @click="handleExport"
        >
          <ExportIcon :width="14" :height="14" :style="{ opacity: 0.7 }" />
          <template v-if="hasFileSys">Save to File</template>
          <template v-else>Export JSON</template>
        </button>
      </div>
    </div>
  </div>
</template>
