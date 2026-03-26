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
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';

const editorStore = useEditorStore();
const { statusMessage, isDirty, storageMode, configName } = storeToRefs(editorStore);

let timer: ReturnType<typeof setTimeout> | undefined;

watch(statusMessage, (msg) => {
  if (timer) clearTimeout(timer);
  if (!msg) return;
  timer = setTimeout(() => editorStore.setStatus(null), 4000);
});
</script>

<template>
  <div
    class="px-5 py-1.5 flex items-center text-xs flex-shrink-0"
    :style="{
      background: 'var(--alap-mid)',
      borderTop: '1px solid var(--alap-border-subtle)',
      color: 'var(--alap-text-dim)',
    }"
  >
    <span class="font-medium text-muted">{{ configName }}</span>
    <span v-if="isDirty" class="ml-1.5 text-accent">unsaved</span>
    <span class="mx-2 border-subtle">|</span>
    <span>{{ storageMode }}</span>
    <div class="flex-1" />
    <span v-if="statusMessage" class="fade-in text-muted">{{ statusMessage }}</span>
  </div>
</template>
