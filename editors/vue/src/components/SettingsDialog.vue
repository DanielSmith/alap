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

const emit = defineEmits<{ close: [] }>();

const editorStore = useEditorStore();
const settings = computed(() => editorStore.config.settings ?? {});
const { apiUrl } = storeToRefs(editorStore);

const inputStyle = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};
const monoInputStyle = {
  ...inputStyle,
  fontFamily: "'JetBrains Mono', monospace",
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    :style="{ background: 'var(--alap-overlay-bg)' }"
    @click="emit('close')"
  >
    <div
      class="rounded-xl p-6 w-[480px] shadow-2xl fade-in"
      :style="{ background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' }"
      @click.stop
    >
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-sm font-semibold text-accent">Settings</h2>
        <button class="toolbar-btn text-xs" @click="emit('close')">Close</button>
      </div>

      <div class="grid gap-4">
        <div>
          <label class="block text-xs mb-1 text-muted">List Type</label>
          <select class="w-full rounded-md px-3 py-2 text-sm" :style="inputStyle"
            :value="settings.listType ?? 'ul'"
            @change="editorStore.updateSettings('listType', ($event.target as HTMLSelectElement).value)">
            <option value="ul">Unordered (ul)</option>
            <option value="ol">Ordered (ol)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs mb-1 text-muted">Menu Timeout (ms)</label>
          <input type="number" class="w-full rounded-md px-3 py-2 text-sm" :style="monoInputStyle"
            :value="settings.menuTimeout ?? 5000"
            @input="editorStore.updateSettings('menuTimeout', Number(($event.target as HTMLInputElement).value))" />
        </div>

        <div>
          <label class="block text-xs mb-1 text-muted">Max Visible Items</label>
          <input type="number" class="w-full rounded-md px-3 py-2 text-sm" :style="monoInputStyle"
            :value="(settings.maxVisibleItems as number) ?? 10"
            @input="editorStore.updateSettings('maxVisibleItems', Number(($event.target as HTMLInputElement).value))" />
          <p class="text-[10px] mt-1 text-dim">Menu scrolls after this many items. 0 = no limit.</p>
        </div>

        <div>
          <label class="block text-xs mb-1 text-muted">Viewport Adjust</label>
          <select class="w-full rounded-md px-3 py-2 text-sm" :style="inputStyle"
            :value="settings.viewportAdjust !== false ? 'true' : 'false'"
            @change="editorStore.updateSettings('viewportAdjust', ($event.target as HTMLSelectElement).value === 'true')">
            <option value="true">Enabled — menus flip to stay on-screen</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        <div>
          <label class="block text-xs mb-1 text-muted">Existing URL Handling</label>
          <select class="w-full rounded-md px-3 py-2 text-sm" :style="inputStyle"
            :value="(settings.existingUrl as string) ?? 'prepend'"
            @change="editorStore.updateSettings('existingUrl', ($event.target as HTMLSelectElement).value)">
            <option value="prepend">Prepend — original URL is first menu item</option>
            <option value="append">Append — original URL is last menu item</option>
            <option value="ignore">Ignore — discard original URL</option>
          </select>
        </div>

        <div>
          <label class="block text-xs mb-1 text-muted">Remote API URL</label>
          <input type="text" class="w-full rounded-md px-3 py-2 text-sm" :style="monoInputStyle"
            :value="apiUrl"
            @input="editorStore.setApiUrl(($event.target as HTMLInputElement).value)" />
          <p class="text-[10px] mt-1 text-dim">Used by Remote and Hybrid storage modes. Changes take effect on next store initialization.</p>
        </div>
      </div>
    </div>
  </div>
</template>
