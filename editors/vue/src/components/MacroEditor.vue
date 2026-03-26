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
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';
import MacroEditForm from './MacroEditForm.vue';

const editorStore = useEditorStore();
const { editingMacroNames } = storeToRefs(editorStore);
</script>

<template>
  <div v-if="editingMacroNames.length === 0" class="flex items-center justify-center h-full">
    <div class="text-center max-w-md">
      <p class="text-lg mb-2 text-muted">Select a macro to edit</p>
      <p class="text-sm text-dim">Click a macro in the list, or use "+ Add" to create one.</p>
    </div>
  </div>

  <div v-else class="max-w-2xl mx-auto flex flex-col gap-4">
    <MacroEditForm v-for="name in editingMacroNames" :key="name" :macro-name="name" />
  </div>
</template>
