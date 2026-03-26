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
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';
import ItemList from './ItemList.vue';
import MacroList from './MacroList.vue';

const editorStore = useEditorStore();
const { panelMode } = storeToRefs(editorStore);

const isMacroMode = computed(() => panelMode.value === 'macros');

const panelStyle = computed(() => ({
  background: isMacroMode.value ? 'var(--alap-macro-mid)' : 'var(--alap-mid)',
  borderRight: '1px solid var(--alap-border-subtle)',
  transition: 'background var(--alap-transition)',
}));

const itemsTabClass = computed(() => `panel-tab flex-1 ${panelMode.value === 'items' ? 'active' : ''}`);
const macrosTabClass = computed(() => `panel-tab flex-1 ${panelMode.value === 'macros' ? 'active-macro' : ''}`);
</script>

<template>
  <div
    :class="['w-72 flex-shrink-0 flex flex-col overflow-hidden', { 'macro-mode': isMacroMode }]"
    :style="panelStyle"
  >
    <div class="flex" :style="{ borderBottom: '1px solid var(--alap-border-subtle)' }">
      <button :class="itemsTabClass" @click="editorStore.setPanelMode('items')">Items</button>
      <button :class="macrosTabClass" @click="editorStore.setPanelMode('macros')">Macros</button>
    </div>
    <ItemList v-if="panelMode === 'items'" />
    <MacroList v-else />
  </div>
</template>
