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
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';

type LoadMode = 'replace' | 'merge';

const emit = defineEmits<{ close: [] }>();

const editorStore = useEditorStore();
const { configName, configNames } = storeToRefs(editorStore);

const loadMode = ref<LoadMode>('replace');
const filter = ref('');

const filtered = computed(() =>
  configNames.value.filter((n) => !filter.value || n.toLowerCase().includes(filter.value.toLowerCase()))
);

const actionLabel = computed(() => loadMode.value === 'merge' ? 'merge into current' : 'load');

function handleLoad(name: string) {
  editorStore.loadConfig(name);
  if (loadMode.value === 'merge') {
    editorStore.setStatus(`Loaded "${name}" (merge coming soon — replaced for now)`);
  }
  emit('close');
}

const toggleBorder = { border: '1px solid var(--alap-border-subtle)' };
const activeStyle = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const inactiveStyle = { background: 'transparent', color: 'var(--alap-text-dim)' };
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    :style="{ background: 'var(--alap-overlay-bg)' }"
    @click="emit('close')"
  >
    <div
      class="rounded-xl p-6 w-[480px] max-h-[70vh] flex flex-col shadow-2xl fade-in"
      :style="{ background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' }"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-accent">Load Config</h2>
        <div class="flex items-center gap-3">
          <div class="flex rounded-md overflow-hidden text-[10px]" :style="toggleBorder">
            <button class="px-2.5 py-1" :style="loadMode === 'replace' ? activeStyle : inactiveStyle"
              @click="loadMode = 'replace'">Replace</button>
            <button class="px-2.5 py-1" :style="loadMode === 'merge' ? activeStyle : inactiveStyle"
              @click="loadMode = 'merge'">Merge</button>
          </div>
          <button class="toolbar-btn text-xs" @click="emit('close')">Close</button>
        </div>
      </div>

      <input type="text" v-model="filter" placeholder="Search configs..." autofocus
        class="w-full text-sm rounded-lg px-3 py-2 mb-4 bg-input" />

      <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">
        <template v-if="filtered.length > 0">
          <button
            v-for="name in filtered"
            :key="name"
            :disabled="name === configName"
            :class="[
              'w-full text-left text-sm flex items-center justify-between',
              name === configName
                ? 'item-card editing rounded-lg px-4 py-3'
                : 'item-card rounded-lg px-4 py-3 hover-bg-hover cursor-pointer',
            ]"
            @click="name !== configName && handleLoad(name)"
          >
            <span :class="{ 'text-accent': name === configName }">{{ name }}</span>
            <span class="text-[10px] text-dim">
              <template v-if="name === configName">current</template>
              <template v-else>{{ actionLabel }}</template>
            </span>
          </button>
        </template>
        <p v-else class="text-sm text-center py-6 text-dim">
          <template v-if="filter">No configs match filter</template>
          <template v-else>No saved configs</template>
        </p>
      </div>
    </div>
  </div>
</template>
