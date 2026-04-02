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

<script lang="ts">
  import { validateConfig } from 'alap/core';
  import { AlapProvider } from 'alap/svelte';
  import { editor } from './store/editor.svelte';
  import { createStore } from './lib/store-factory';
  import { useEscapeStack } from './hooks/useEscapeStack';
  import Toolbar from './components/Toolbar.svelte';
  import LeftPanel from './components/LeftPanel.svelte';
  import EditPanel from './components/EditPanel.svelte';
  import MacroEditor from './components/MacroEditor.svelte';
  import QueryTester from './components/QueryTester.svelte';
  import ConfigDrawer from './components/ConfigDrawer.svelte';
  import LoadPanel from './components/LoadPanel.svelte';
  import SettingsDialog from './components/SettingsDialog.svelte';
  import HelpDialog from './components/HelpDialog.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import { extractMetadata } from '../../shared/meta';

  let showTester = $state(false);
  let showDrawer = $state(false);
  let showLoad = $state(false);
  let showSettings = $state(false);
  let showHelp = $state(false);
  let dragOver = $state(false);

  // Initialize store on mount and when mode or apiUrl changes
  $effect(() => {
    const mode = editor.storageMode;
    const apiUrl = editor.apiUrl;
    createStore(mode, apiUrl, (_op, name, err) => {
      editor.setStatus(`Remote error: ${name} — ${err instanceof Error ? err.message : 'unknown'}`);
    }).then((store) => {
      editor.setStore(store);
      editor.loadConfigList();
    });
  });

  // Global Escape: close topmost open panel
  useEscapeStack([
    { isOpen: () => showHelp, onClose: () => { showHelp = false; } },
    { isOpen: () => showSettings, onClose: () => { showSettings = false; } },
    { isOpen: () => showLoad, onClose: () => { showLoad = false; } },
    { isOpen: () => showDrawer, onClose: () => { showDrawer = false; } },
  ]);

  // --- Drag-and-drop ---

  const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/i;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    if (!e.dataTransfer) return;

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find((f) => f.name.endsWith('.json'));
    if (jsonFile) {
      jsonFile.text().then((text) => {
        try {
          const parsed = validateConfig(JSON.parse(text));
          editor.replaceConfig(parsed, jsonFile.name.replace(/\.json$/i, ''));
        } catch {
          editor.setStatus('Invalid JSON file');
        }
      });
      return;
    }

    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile) {
      if (!editor.selectedItemId) { editor.setStatus('Select an item first'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        editor.updateItem(editor.selectedItemId!, { thumbnail: reader.result as string });
        editor.setStatus(`Thumbnail set from ${imageFile.name}`);
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
        if (!editor.selectedItemId) { editor.setStatus('Select an item first'); return; }
        editor.updateItem(editor.selectedItemId, { thumbnail: url });
        editor.setStatus('Thumbnail set from image URL');
        return;
      }

      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const id = editor.addItem();
      editor.updateItem(id, { label: hostname, url, tags: [hostname.replace(/\./g, '_')] });
      editor.setStatus(`Dropped: ${hostname}`);

      extractMetadata(url)
        .then((fields) => {
          const updates: Record<string, unknown> = {};
          if (fields.title) updates.label = fields.title;
          if (fields.description) updates.description = fields.description;
          if (fields.thumbnail) updates.thumbnail = fields.thumbnail;
          if (fields.canonicalUrl) updates.url = fields.canonicalUrl;
          if (fields.tags.length) updates.tags = fields.tags;
          editor.updateItem(id, updates);
          editor.setStatus(`Updated: ${fields.title ?? hostname}`);
        })
        .catch(() => {});
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  // --- Tester overflow: allow menu to escape panel after animation ---
  let testerOverflow = $state(false);
  let testerTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    clearTimeout(testerTimer);
    if (showTester) {
      testerTimer = setTimeout(() => { testerOverflow = true; }, 300);
    } else {
      testerOverflow = false;
    }
  });

  // --- Computed styles ---
  let centerBackground = $derived(
    editor.panelMode === 'macros' ? 'var(--alap-macro-deep)' : 'var(--alap-deep)'
  );
</script>

<AlapProvider config={editor.config}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col h-screen overflow-hidden"
      role="application"
      style:background="var(--alap-deep)"
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
    >
      {#if showLoad}
        <LoadPanel onClose={() => showLoad = false} />
      {/if}

      {#if showSettings}
        <SettingsDialog onClose={() => showSettings = false} />
      {/if}

      {#if showHelp}
        <HelpDialog onClose={() => showHelp = false} />
      {/if}

      {#if dragOver}
        <div class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            class="rounded-2xl border-2 border-dashed px-12 py-8 text-lg"
            style:border-color="var(--alap-accent)"
            style:color="var(--alap-accent)"
            style:background="var(--alap-drop-overlay-bg)"
          >
            Drop links, images, or JSON configs
          </div>
        </div>
      {/if}

      <Toolbar
        onToggleTester={() => showTester = !showTester}
        onToggleDrawer={() => showDrawer = !showDrawer}
        onShowHelp={() => showHelp = true}
        testerOpen={showTester}
      />

      <div class="flex flex-1 overflow-hidden relative">
        <LeftPanel />

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <!-- Center column — tester slides down above edit forms -->
        <div class="flex-1 flex flex-col overflow-hidden" onclick={() => { if (showDrawer) showDrawer = false; }}>
          <div
            style:background="var(--alap-mid)"
            style:border-bottom="1px solid var(--alap-border-subtle)"
            style:max-height={showTester ? '40vh' : '0'}
            style:opacity={showTester ? '1' : '0'}
            style:overflow={testerOverflow ? 'visible' : 'hidden'}
            style:transition="max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease"
          >
            <div class="p-5 scroll-fade" class:overflow-visible={testerOverflow} class:overflow-y-auto={!testerOverflow} style:max-height={testerOverflow ? undefined : '40vh'}>
              <QueryTester />
            </div>
          </div>

          <div
            class="flex-1 overflow-y-auto p-6 scroll-fade"
            style:background={centerBackground}
            style:transition="background var(--alap-transition), scrollbar-color 0.5s ease-in"
          >
            {#if editor.panelMode === 'items'}
              <EditPanel />
            {:else}
              <MacroEditor />
            {/if}
          </div>
        </div>

        <!-- Config drawer -->
        <div
          class="slide-panel absolute left-0 top-0 bottom-0 w-80 overflow-y-auto p-5 z-30 scroll-fade"
          style:background="var(--alap-surface)"
          style:border-right={showDrawer ? '1px solid var(--alap-border-subtle)' : 'none'}
          style:transform={showDrawer ? 'translateX(0)' : 'translateX(-100%)'}
          style:opacity={showDrawer ? '1' : '0'}
          style:box-shadow={showDrawer ? 'var(--alap-shadow-panel)' : 'none'}
        >
          <ConfigDrawer
            onClose={() => showDrawer = false}
            onShowLoad={() => showLoad = true}
            onShowSettings={() => showSettings = true}
          />
        </div>
      </div>

      <StatusBar />
    </div>
</AlapProvider>
