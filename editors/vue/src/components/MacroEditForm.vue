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
import { useAlap } from 'alap/vue';

const props = defineProps<{ macroName: string }>();

const editorStore = useEditorStore();
const { resolve } = useAlap();

const expanded = ref(true);
const editName = ref('');
const editExpr = ref('');
const isNew = ref(false);
const isDirty = ref(false);
const saveLabel = ref('Save Macro');

const macro = computed(() => editorStore.config.macros?.[props.macroName]);
const resolvedLinks = computed(() => editExpr.value ? resolve(editExpr.value) : []);

const monoInputStyle = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
  fontFamily: "'JetBrains Mono', monospace",
};

watch(
  () => [props.macroName, macro.value] as const,
  ([, currentMacro]) => {
    if (!currentMacro) return;
    editName.value = props.macroName;
    editExpr.value = currentMacro.linkItems;
    const freshlyCreated = !currentMacro.linkItems;
    isNew.value = freshlyCreated;
    isDirty.value = freshlyCreated;
    saveLabel.value = freshlyCreated ? 'Save Macro' : 'Update Macro';
  },
  { immediate: true },
);

function markDirty() {
  isDirty.value = true;
}

const saveBtnStyle = computed(() => ({
  background: isDirty.value ? 'var(--alap-macro-accent)' : 'var(--alap-border-subtle)',
  color: isDirty.value ? 'var(--alap-macro-deep)' : 'var(--alap-text-dim)',
  cursor: isDirty.value ? 'pointer' : 'default',
}));

function handleSave() {
  if (!isDirty.value) return;
  const name = editName.value.trim();
  const expr = editExpr.value.trim();
  if (!name || !expr) return;

  saveLabel.value = 'Saving...';
  const wasNew = isNew.value;

  if (name !== props.macroName) editorStore.removeMacro(props.macroName);
  editorStore.addMacro(name, expr);

  saveLabel.value = 'Saved';
  isNew.value = false;
  isDirty.value = false;
  editorStore.setStatus(`${wasNew ? 'Saved' : 'Updated'} macro @${name}`);
  setTimeout(() => { saveLabel.value = 'Update Macro'; }, 1500);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
}

const summaryLabel = computed(() =>
  expanded.value ? `@${props.macroName}` : `@${props.macroName}${editExpr.value ? ` — ${editExpr.value}` : ''}`
);
</script>

<template>
  <div v-if="macro" class="rounded-xl fade-in edit-card" :style="{ background: 'var(--alap-macro-mid)' }">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
      @click="expanded = !expanded"
    >
      <h2 class="text-sm font-semibold text-macro-accent flex-shrink-0">Edit Macro</h2>
      <span class="text-xs font-mono text-dim truncate ml-3">{{ summaryLabel }}</span>
    </div>

    <div v-if="expanded" class="px-6 pb-6">
      <div class="space-y-4 mb-4">
        <div>
          <label class="block text-xs mb-1 font-semibold text-accent">Name</label>
          <input type="text" v-model="editName" class="w-full rounded-md px-3 py-1.5 text-sm"
            :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
        </div>
        <div>
          <label class="block text-xs mb-1 font-semibold text-accent">Expression</label>
          <input type="text" v-model="editExpr" class="w-full rounded-md px-3 py-1.5 text-sm"
            :style="monoInputStyle" @input="markDirty" @keydown="handleKeyDown" />
        </div>
      </div>

      <!-- Resolution preview -->
      <div class="mb-4 p-3 rounded-lg" :style="{ background: 'var(--alap-macro-deep)' }">
        <p class="text-xs mb-2 text-dim">
          Resolves to {{ resolvedLinks.length }} item{{ resolvedLinks.length !== 1 ? 's' : '' }}
        </p>
        <div v-if="resolvedLinks.length > 0" class="flex flex-wrap gap-1.5">
          <span v-for="link in resolvedLinks" :key="link.id" class="tag-pill">
            {{ link.id }}
            <span v-if="link.label" class="ml-1 text-dim">{{ link.label }}</span>
          </span>
        </div>
        <p v-else-if="editExpr" class="text-xs text-dim">No matches</p>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-4" :style="{ borderTop: '1px solid var(--alap-border-subtle)' }">
        <button
          class="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity"
          :style="{ background: 'var(--alap-cancel-bg)', color: 'var(--alap-cancel-text)' }"
          @click="editorStore.closeEditMacro(macroName)"
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
