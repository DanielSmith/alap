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
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  message: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const confirmBtn = ref<HTMLButtonElement | null>(null);

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel');
}

onMounted(() => {
  confirmBtn.value?.focus();
  document.addEventListener('keydown', handleKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKey);
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    :style="{ background: 'var(--alap-overlay-bg)' }"
    @click="emit('cancel')"
  >
    <div
      class="rounded-xl p-8 w-96 shadow-2xl fade-in"
      :style="{ background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' }"
      @click.stop
    >
      <p class="text-center text-lg mb-8">{{ message }}</p>
      <div class="flex justify-between gap-4">
        <button
          class="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-opacity"
          :style="{ background: 'var(--alap-cancel-bg)', color: 'var(--alap-cancel-text)' }"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          ref="confirmBtn"
          class="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-lift shadow-lg"
          :style="{ background: 'var(--alap-danger)', color: '#fff' }"
          @click="emit('confirm')"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</template>
