/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createSignal, createEffect, createMemo, Show, Switch, Match, type JSX } from 'solid-js';
import { useEscapeStack } from './hooks/useEscapeStack';
import { validateConfig } from 'alap/core';
import { AlapProvider } from 'alap/solid';
import { editor } from './store/editor';
import { createStore } from './lib/store-factory';
import { Toolbar } from './components/Toolbar';
import { LeftPanel } from './components/LeftPanel';
import { EditPanel } from './components/EditPanel';
import { MacroEditor } from './components/MacroEditor';
import { QueryTester } from './components/QueryTester';
import { ConfigDrawer } from './components/ConfigDrawer';
import { LoadPanel } from './components/LoadPanel';
import { SettingsDialog } from './components/SettingsDialog';
import { HelpDialog } from './components/HelpDialog';
import { StatusBar } from './components/StatusBar';

function CenterPanel() {
  const style = (): JSX.CSSProperties => ({
    background: editor.panelMode === 'macros' ? 'var(--alap-macro-deep)' : 'var(--alap-deep)',
    transition: 'background var(--alap-transition), scrollbar-color 0.5s ease-in',
  });

  return (
    <div class="flex-1 overflow-y-auto p-6 scroll-fade" style={style()}>
      <Switch>
        <Match when={editor.panelMode === 'items'}>
          <EditPanel />
        </Match>
        <Match when={editor.panelMode === 'macros'}>
          <MacroEditor />
        </Match>
      </Switch>
    </div>
  );
}

export default function App() {
  const [showTester, setShowTester] = createSignal(false);
  const [showDrawer, setShowDrawer] = createSignal(false);
  const [showLoad, setShowLoad] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  const [showHelp, setShowHelp] = createSignal(false);
  const [dragOver, setDragOver] = createSignal(false);

  // Initialize store on mount and when mode or apiUrl changes
  createEffect(() => {
    const mode = editor.storageMode;
    const url = editor.apiUrl;
    createStore(mode, url, (_op, name, err) => {
      editor.setStatus(`Remote error: ${name} — ${err instanceof Error ? err.message : 'unknown'}`);
    }).then((store) => {
      editor.setStore(store);
      editor.loadConfigList();
    });
  });

  // --- Global Escape: close topmost open panel ---
  useEscapeStack([
    { isOpen: showHelp, onClose: () => setShowHelp(false) },
    { isOpen: showSettings, onClose: () => setShowSettings(false) },
    { isOpen: showLoad, onClose: () => setShowLoad(false) },
    { isOpen: showDrawer, onClose: () => setShowDrawer(false) },
  ]);

  // --- Tester overflow: allow menu to escape panel after animation ---
  const [testerOverflow, setTesterOverflow] = createSignal(false);
  let testerTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    clearTimeout(testerTimer);
    if (showTester()) {
      testerTimer = setTimeout(() => setTesterOverflow(true), 300);
    } else {
      setTesterOverflow(false);
    }
  });

  // --- Computed styles ---

  const testerPanelStyle = (): JSX.CSSProperties => ({
    background: 'var(--alap-mid)',
    'border-bottom': '1px solid var(--alap-border-subtle)',
    'max-height': showTester() ? '40vh' : '0',
    opacity: showTester() ? 1 : 0,
    overflow: testerOverflow() ? 'visible' : 'hidden',
    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
  });

  const drawerPanelStyle = (): JSX.CSSProperties => ({
    background: 'var(--alap-surface)',
    'border-right': showDrawer() ? '1px solid var(--alap-border-subtle)' : 'none',
    transform: showDrawer() ? 'translateX(0)' : 'translateX(-100%)',
    opacity: showDrawer() ? 1 : 0,
    'box-shadow': showDrawer() ? 'var(--alap-shadow-panel)' : 'none',
  });

  // --- Drag-and-drop ---

  const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/i;

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer?.files ?? []);
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

    const text = e.dataTransfer?.getData('text/plain');
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

          // Build tags from all available sources
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

          editor.updateItem(id, updates);
          editor.setStatus(`Updated: ${meta.title ?? hostname}`);
        })
        .catch(() => {});
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  // --- Render ---

  return (
    <AlapProvider config={editor.config}>
      <div
        class="flex flex-col h-screen overflow-hidden"
        style={{ background: 'var(--alap-deep)' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Show when={showLoad()}>
          <LoadPanel onClose={() => setShowLoad(false)} />
        </Show>
        <Show when={showSettings()}>
          <SettingsDialog onClose={() => setShowSettings(false)} />
        </Show>
        <Show when={showHelp()}>
          <HelpDialog onClose={() => setShowHelp(false)} />
        </Show>

        <Show when={dragOver()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              class="rounded-2xl border-2 border-dashed px-12 py-8 text-lg"
              style={{
                'border-color': 'var(--alap-accent)',
                color: 'var(--alap-accent)',
                background: 'var(--alap-drop-overlay-bg)',
              }}
            >
              Drop links, images, or JSON configs
            </div>
          </div>
        </Show>

        <Toolbar
          onToggleTester={() => setShowTester(!showTester())}
          onToggleDrawer={() => setShowDrawer(!showDrawer())}
          onShowHelp={() => setShowHelp(true)}
          testerOpen={showTester()}
        />

        <div class="flex flex-1 overflow-hidden relative">
          <LeftPanel />

          {/* Center column -- tester slides down above edit forms */}
          <div
            class="flex-1 flex flex-col overflow-hidden"
            onClick={() => showDrawer() && setShowDrawer(false)}
          >
            <div style={testerPanelStyle()}>
              <div class="p-5 scroll-fade" classList={{ 'overflow-visible': testerOverflow(), 'overflow-y-auto': !testerOverflow() }} style={{ 'max-height': testerOverflow() ? undefined : '40vh' }}>
                <QueryTester />
              </div>
            </div>
            <CenterPanel />
          </div>

          <div
            class="slide-panel absolute left-0 top-0 bottom-0 w-80 overflow-y-auto p-5 z-30 scroll-fade"
            style={drawerPanelStyle()}
          >
            <ConfigDrawer
              onClose={() => setShowDrawer(false)}
              onShowLoad={() => setShowLoad(true)}
              onShowSettings={() => setShowSettings(true)}
            />
          </div>
        </div>

        <StatusBar />
      </div>
    </AlapProvider>
  );
}
