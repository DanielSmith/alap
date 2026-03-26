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

import { useEffect, useCallback, useState, useMemo, type CSSProperties } from 'react';
import { useEscapeStack } from '../hooks/useEscapeStack';
import { validateConfig } from 'alap/core';
import { AlapProvider } from 'alap/react';
import { useEditorStore } from '../store/useEditorStore';
import { createStore } from '../lib/store-factory';
import { Toolbar } from './editor/Toolbar';
import { LeftPanel } from './editor/LeftPanel';
import { EditPanel } from './editor/EditPanel';
import { MacroEditor } from './editor/MacroEditor';
import { QueryTester } from './editor/QueryTester';
import { ConfigDrawer } from './editor/ConfigDrawer';
import { LoadPanel } from './editor/LoadPanel';
import { SettingsDialog } from './editor/SettingsDialog';
import { HelpDialog } from './editor/HelpDialog';
import { StatusBar } from './editor/StatusBar';

function CenterPanel() {
  const panelMode = useEditorStore((s) => s.panelMode);

  const style = useMemo<CSSProperties>(() => ({
    background: panelMode === 'macros' ? 'var(--alap-macro-deep)' : 'var(--alap-deep)',
    transition: 'background var(--alap-transition), scrollbar-color 0.5s ease-in',
  }), [panelMode]);

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-fade" style={style}>
      {panelMode === 'items' && <EditPanel />}
      {panelMode === 'macros' && <MacroEditor />}
    </div>
  );
}

/**
 * Editor — the fully interactive React island that Astro hydrates
 * via `client:only="react"`. This is the single entry point for the
 * entire editor UI, rendered inside an Astro layout shell.
 */
export default function Editor() {
  const config = useEditorStore((s) => s.config);
  const storageMode = useEditorStore((s) => s.storageMode);
  const apiUrl = useEditorStore((s) => s.apiUrl);
  const setStore = useEditorStore((s) => s.setStore);
  const setStatus = useEditorStore((s) => s.setStatus);
  const addItem = useEditorStore((s) => s.addItem);
  const updateItem = useEditorStore((s) => s.updateItem);
  const replaceConfig = useEditorStore((s) => s.replaceConfig);
  const selectedItemId = useEditorStore((s) => s.selectedItemId);

  const [showTester, setShowTester] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Initialize store on mount and when mode or API URL changes
  useEffect(() => {
    createStore(storageMode, apiUrl, (_op, name, err) => {
      setStatus(`Remote error: ${name} — ${err instanceof Error ? err.message : 'unknown'}`);
    }).then((store) => {
      setStore(store);
      useEditorStore.getState().loadConfigList();
    });
  }, [storageMode, apiUrl, setStore, setStatus]);

  // --- Global Escape: close topmost open panel ---
  useEscapeStack([
    { isOpen: showHelp, onClose: () => setShowHelp(false) },
    { isOpen: showSettings, onClose: () => setShowSettings(false) },
    { isOpen: showLoad, onClose: () => setShowLoad(false) },
    { isOpen: showDrawer, onClose: () => setShowDrawer(false) },
  ]);

  // --- Tester overflow: allow menu to escape panel after animation ---
  const [testerOverflow, setTesterOverflow] = useState(false);

  useEffect(() => {
    if (showTester) {
      const id = setTimeout(() => setTesterOverflow(true), 300);
      return () => clearTimeout(id);
    }
    setTesterOverflow(false);
  }, [showTester]);

  // --- Computed styles ---

  const testerPanelStyle = useMemo<CSSProperties>(() => ({
    background: 'var(--alap-mid)',
    borderBottom: '1px solid var(--alap-border-subtle)',
    maxHeight: showTester ? '40vh' : '0',
    opacity: showTester ? 1 : 0,
    overflow: testerOverflow ? 'visible' : 'hidden',
    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
  }), [showTester, testerOverflow]);

  const drawerPanelStyle = useMemo<CSSProperties>(() => ({
    background: 'var(--alap-surface)',
    borderRight: showDrawer ? '1px solid var(--alap-border-subtle)' : 'none',
    transform: showDrawer ? 'translateX(0)' : 'translateX(-100%)',
    opacity: showDrawer ? 1 : 0,
    boxShadow: showDrawer ? 'var(--alap-shadow-panel)' : 'none',
  }), [showDrawer]);

  // --- Drag-and-drop ---

  const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/i;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find((f) => f.name.endsWith('.json'));
    if (jsonFile) {
      jsonFile.text().then((text) => {
        try {
          const parsed = validateConfig(JSON.parse(text));
          replaceConfig(parsed, jsonFile.name.replace(/\.json$/i, ''));
        } catch {
          setStatus('Invalid JSON file');
        }
      });
      return;
    }

    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile) {
      if (!selectedItemId) { setStatus('Select an item first'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        updateItem(selectedItemId, { thumbnail: reader.result as string });
        setStatus(`Thumbnail set from ${imageFile.name}`);
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
        if (!selectedItemId) { setStatus('Select an item first'); return; }
        updateItem(selectedItemId, { thumbnail: url });
        setStatus('Thumbnail set from image URL');
        return;
      }

      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const id = addItem();
      updateItem(id, { label: hostname, url, tags: [hostname.replace(/\./g, '_')] });
      setStatus(`Dropped: ${hostname}`);

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
          // Normalize: lowercase, spaces to underscores, split on commas, deduplicate
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

          updateItem(id, updates);
          setStatus(`Updated: ${meta.title ?? hostname}`);
        })
        .catch(() => {});
    }
  }, [addItem, updateItem, setStatus, replaceConfig, selectedItemId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // --- Render ---

  return (
    <AlapProvider config={config}>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ background: 'var(--alap-deep)' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {showLoad && <LoadPanel onClose={() => setShowLoad(false)} />}
        {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
        {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}

        {dragOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="rounded-2xl border-2 border-dashed px-12 py-8 text-lg"
              style={{ borderColor: 'var(--alap-accent)', color: 'var(--alap-accent)', background: 'var(--alap-drop-overlay-bg)' }}>
              Drop links, images, or JSON configs
            </div>
          </div>
        )}

        <Toolbar
          onToggleTester={() => setShowTester(!showTester)}
          onToggleDrawer={() => setShowDrawer(!showDrawer)}
          onShowHelp={() => setShowHelp(true)}
          testerOpen={showTester}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <LeftPanel />

          {/* Center column — tester slides down above edit forms */}
          <div className="flex-1 flex flex-col overflow-hidden" onClick={() => showDrawer && setShowDrawer(false)}>
            <div style={testerPanelStyle}>
              <div className={`p-5 scroll-fade ${testerOverflow ? 'overflow-visible' : 'overflow-y-auto'}`} style={{ maxHeight: testerOverflow ? undefined : '40vh' }}>
                <QueryTester />
              </div>
            </div>
            <CenterPanel />
          </div>

          <div className="slide-panel absolute left-0 top-0 bottom-0 w-80 overflow-y-auto p-5 z-30 scroll-fade" style={drawerPanelStyle}>
            <ConfigDrawer onClose={() => setShowDrawer(false)} onShowLoad={() => setShowLoad(true)} onShowSettings={() => setShowSettings(true)} />
          </div>
        </div>

        <StatusBar />
      </div>
    </AlapProvider>
  );
}
