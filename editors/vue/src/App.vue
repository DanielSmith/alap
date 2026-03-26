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
import { storeToRefs } from 'pinia';
import { validateConfig } from 'alap/core';
import { AlapProvider } from 'alap/vue';
import { useEditorStore } from './store/editor';
import { createStore } from './lib/store-factory';
import { useEscapeStack } from './composables/useEscapeStack';
import Toolbar from './components/Toolbar.vue';
import LeftPanel from './components/LeftPanel.vue';
import EditPanel from './components/EditPanel.vue';
import MacroEditor from './components/MacroEditor.vue';
import QueryTester from './components/QueryTester.vue';
import ConfigDrawer from './components/ConfigDrawer.vue';
import LoadPanel from './components/LoadPanel.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import HelpDialog from './components/HelpDialog.vue';
import StatusBar from './components/StatusBar.vue';

const editorStore = useEditorStore();
const { config, storageMode, apiUrl, panelMode, selectedItemId } = storeToRefs(editorStore);

const showTester = ref(false);
const showDrawer = ref(false);
const showLoad = ref(false);
const showSettings = ref(false);
const showHelp = ref(false);
const dragOver = ref(false);

// --- Initialize store on mount and when mode or apiUrl changes ---
watch([storageMode, apiUrl], () => initStore(), { immediate: true });

async function initStore() {
  const store = await createStore(storageMode.value, apiUrl.value, (_op, name, err) => {
    editorStore.setStatus(`Remote error: ${name} — ${err instanceof Error ? err.message : 'unknown'}`);
  });
  editorStore.setStore(store);
  editorStore.loadConfigList();
}

// --- Global Escape: close topmost open panel ---
useEscapeStack([
  { isOpen: showHelp, onClose: () => { showHelp.value = false; } },
  { isOpen: showSettings, onClose: () => { showSettings.value = false; } },
  { isOpen: showLoad, onClose: () => { showLoad.value = false; } },
  { isOpen: showDrawer, onClose: () => { showDrawer.value = false; } },
]);

// --- Computed styles ---
const centerBg = computed(() =>
  panelMode.value === 'macros' ? 'var(--alap-macro-deep)' : 'var(--alap-deep)'
);

const testerOverflow = ref(false);
let testerTimer: ReturnType<typeof setTimeout> | undefined;

watch(showTester, (open) => {
  clearTimeout(testerTimer);
  if (open) {
    testerTimer = setTimeout(() => { testerOverflow.value = true; }, 300);
  } else {
    testerOverflow.value = false;
  }
});

const testerPanelStyle = computed(() => ({
  background: 'var(--alap-mid)',
  borderBottom: '1px solid var(--alap-border-subtle)',
  maxHeight: showTester.value ? '40vh' : '0',
  opacity: showTester.value ? 1 : 0,
  overflow: testerOverflow.value ? 'visible' : 'hidden',
  transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
}));

const drawerPanelStyle = computed(() => ({
  background: 'var(--alap-surface)',
  borderRight: showDrawer.value ? '1px solid var(--alap-border-subtle)' : 'none',
  transform: showDrawer.value ? 'translateX(0)' : 'translateX(-100%)',
  opacity: showDrawer.value ? 1 : 0,
  boxShadow: showDrawer.value ? 'var(--alap-shadow-panel)' : 'none',
}));

// --- Drag-and-drop ---
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/i;

function handleDrop(e: DragEvent) {
  e.preventDefault();
  dragOver.value = false;

  if (!e.dataTransfer) return;

  const files = Array.from(e.dataTransfer.files);
  const jsonFile = files.find((f) => f.name.endsWith('.json'));
  if (jsonFile) {
    jsonFile.text().then((text) => {
      try {
        const parsed = validateConfig(JSON.parse(text));
        editorStore.replaceConfig(parsed, jsonFile.name.replace(/\.json$/i, ''));
      } catch {
        editorStore.setStatus('Invalid JSON file');
      }
    });
    return;
  }

  const imageFile = files.find((f) => f.type.startsWith('image/'));
  if (imageFile) {
    if (!selectedItemId.value) { editorStore.setStatus('Select an item first'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      editorStore.updateItem(selectedItemId.value!, { thumbnail: reader.result as string });
      editorStore.setStatus(`Thumbnail set from ${imageFile.name}`);
    };
    reader.readAsDataURL(imageFile);
    return;
  }

  const text = e.dataTransfer.getData('text/plain');
  if (!text) return;

  const urls = text.split('\n').map((s) => s.trim()).filter((s) => {
    try { new URL(s); return true; } catch { return false; }
  });

  for (const url of urls) {
    if (IMAGE_EXTENSIONS.test(url)) {
      if (!selectedItemId.value) { editorStore.setStatus('Select an item first'); return; }
      editorStore.updateItem(selectedItemId.value, { thumbnail: url });
      editorStore.setStatus('Thumbnail set from image URL');
      return;
    }

    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const id = editorStore.addItem();
    editorStore.updateItem(id, { label: hostname, url, tags: [hostname.replace(/\./g, '_')] });
    editorStore.setStatus(`Dropped: ${hostname}`);

    fetch(`/api/meta?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((meta: {
        title?: string; description?: string; images?: string[];
        keywords?: string[]; articleTags?: string[]; articleSection?: string;
        siteName?: string; type?: string; canonicalUrl?: string; locale?: string;
      }) => {
        const updates: Record<string, unknown> = {};
        if (meta.title) updates.label = meta.title;
        if (meta.description) updates.description = meta.description;
        if (meta.images?.length) updates.thumbnail = meta.images[0];
        if (meta.canonicalUrl) updates.url = meta.canonicalUrl;

        const hostTag = hostname.replace(/\./g, '_');
        const seen = new Set<string>();
        const tags: string[] = [];

        function addTag(raw: string) {
          for (const part of raw.split(',')) {
            const normalized = part.trim().toLowerCase().replace(/\s+/g, '_');
            if (normalized && !seen.has(normalized)) {
              seen.add(normalized);
              tags.push(normalized);
            }
          }
        }

        addTag(hostTag);
        if (meta.siteName) addTag(meta.siteName);
        if (meta.type) addTag(meta.type);
        if (meta.articleSection) addTag(meta.articleSection);
        for (const k of meta.keywords ?? []) addTag(k);
        for (const t of meta.articleTags ?? []) addTag(t);
        if (meta.locale) addTag(meta.locale.replace(/-/g, '_'));
        updates.tags = tags;

        editorStore.updateItem(id, updates);
        editorStore.setStatus(`Updated: ${meta.title ?? hostname}`);
      })
      .catch(() => {});
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  dragOver.value = true;
}

function handleDragLeave() {
  dragOver.value = false;
}

function handleCenterClick() {
  if (showDrawer.value) showDrawer.value = false;
}
</script>

<template>
  <AlapProvider :config="config">
    <div
      class="flex flex-col h-screen overflow-hidden"
      :style="{ background: 'var(--alap-deep)' }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <!-- Modal dialogs -->
      <LoadPanel v-if="showLoad" @close="showLoad = false" />
      <SettingsDialog v-if="showSettings" @close="showSettings = false" />
      <HelpDialog v-if="showHelp" @close="showHelp = false" />

      <!-- Drop overlay -->
      <div v-if="dragOver" class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div class="rounded-2xl border-2 border-dashed px-12 py-8 text-lg"
          :style="{ borderColor: 'var(--alap-accent)', color: 'var(--alap-accent)', background: 'var(--alap-drop-overlay-bg)' }">
          Drop links, images, or JSON configs
        </div>
      </div>

      <Toolbar
        :tester-open="showTester"
        @toggle-tester="showTester = !showTester"
        @toggle-drawer="showDrawer = !showDrawer"
        @show-help="showHelp = true"
      />

      <div class="flex flex-1 overflow-hidden relative">
        <LeftPanel />

        <!-- Center column -->
        <div class="flex-1 flex flex-col overflow-hidden" @click="handleCenterClick">
          <!-- Tester slide-down -->
          <div :style="testerPanelStyle">
            <div :class="['p-5', 'scroll-fade', testerOverflow ? 'overflow-visible' : 'overflow-y-auto']" :style="{ maxHeight: testerOverflow ? undefined : '40vh' }">
              <QueryTester />
            </div>
          </div>

          <!-- Edit forms -->
          <div class="flex-1 overflow-y-auto p-6 scroll-fade" :style="{ background: centerBg, transition: 'background var(--alap-transition), scrollbar-color 0.5s ease-in' }">
            <EditPanel v-if="panelMode === 'items'" />
            <MacroEditor v-else />
          </div>
        </div>

        <!-- Config drawer -->
        <div class="slide-panel absolute left-0 top-0 bottom-0 w-80 overflow-y-auto p-5 z-30 scroll-fade" :style="drawerPanelStyle">
          <ConfigDrawer
            @close="showDrawer = false"
            @show-load="showLoad = true"
            @show-settings="showSettings = true"
          />
        </div>
      </div>

      <StatusBar />
    </div>
  </AlapProvider>
</template>
