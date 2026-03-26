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
import MenuIcon from '../../assets/svg/menu.svg?component';
import SearchIcon from '../../assets/svg/search.svg?component';
import HelpIcon from '../../assets/svg/help.svg?component';

const props = defineProps<{
  testerOpen: boolean;
}>();

const emit = defineEmits<{
  toggleTester: [];
  toggleDrawer: [];
  showHelp: [];
}>();

const editorStore = useEditorStore();
const { configName, isDirty } = storeToRefs(editorStore);

const testerBtnStyle = computed(() =>
  props.testerOpen
    ? { color: 'var(--alap-accent)', background: 'var(--alap-surface)' }
    : { color: 'var(--alap-accent)' }
);
</script>

<template>
  <div
    class="relative flex items-center px-4 py-2.5 flex-shrink-0"
    :style="{ background: 'var(--alap-mid)', borderBottom: '1px solid var(--alap-border-subtle)' }"
  >
    <!-- Left group -->
    <div class="flex items-center gap-2 z-10">
      <button class="toolbar-btn p-1.5 text-accent" title="Config management" @click="emit('toggleDrawer')">
        <MenuIcon :width="18" :height="18" />
      </button>

      <button
        class="toolbar-btn flex items-center gap-1.5 px-2.5 py-1.5"
        :style="testerBtnStyle"
        title="Toggle query tester"
        @click="emit('toggleTester')"
      >
        <SearchIcon :width="14" :height="14" />
        <span class="text-xs">Query Tester</span>
      </button>

      <button class="toolbar-btn p-1.5 text-accent" title="Help" @click="emit('showHelp')">
        <HelpIcon :width="16" :height="16" />
      </button>
    </div>

    <!-- Center title — absolutely positioned for true centering -->
    <span class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span class="text-sm font-semibold tracking-wide text-accent">
        alap editor — vue <span class="text-muted font-normal">({{ configName }}<template v-if="isDirty"> *</template>)</span>
      </span>
    </span>
  </div>
</template>
