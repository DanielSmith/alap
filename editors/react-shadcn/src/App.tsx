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
import { useEscapeStack } from './hooks/useEscapeStack';
import { validateConfig } from 'alap/core';
import { AlapProvider } from 'alap/react';
import { useEditorStore } from './store/useEditorStore';
import { createStore } from './lib/store-factory';
import { TooltipProvider } from './components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './components/ui/sheet';
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
import { extractMetadata } from '../../shared/meta';

function CenterPanel() {
  const panelMode = useEditorStore((s) => s.panelMode);

  const style = useMemo<CSSProperties>(() => ({
    background: panelMode === 'macros' ? 'var(--alap-macro-deep)' : 'var(--alap-deep)',
    transition: 'background var(--alap-transition), scrollbar-color 0.5s ease-in',
  }), [panelMode]);

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-fade" style={style}>
      {panelMode === 'items' ? <EditPanel /> : <MacroEditor />}
    </div>
  );
}

export default function App() {
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

  // Initialize store on mount and when storage mode or API URL changes
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

  // --- Computed styles ---

  const [testerOverflow, setTesterOverflow] = useState(false);

  useEffect(() => {
    if (showTester) {
      const id = setTimeout(() => setTesterOverflow(true), 300);
      return () => clearTimeout(id);
    }
    setTesterOverflow(false);
  }, [showTester]);

  const testerPanelStyle = useMemo<CSSProperties>(() => ({
    background: 'var(--alap-mid)',
    borderBottom: '1px solid var(--alap-border-subtle)',
    maxHeight: showTester ? '40vh' : '0',
    opacity: showTester ? 1 : 0,
    overflow: testerOverflow ? 'visible' : 'hidden',
    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
  }), [showTester, testerOverflow]);

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

      extractMetadata(url)
        .then((fields) => {
          const updates: Record<string, unknown> = {};
          if (fields.title) updates.label = fields.title;
          if (fields.description) updates.description = fields.description;
          if (fields.thumbnail) updates.thumbnail = fields.thumbnail;
          if (fields.canonicalUrl) updates.url = fields.canonicalUrl;
          if (fields.tags.length) updates.tags = fields.tags;
          updateItem(id, updates);
          setStatus(`Updated: ${fields.title ?? hostname}`);
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
    <TooltipProvider>
      <AlapProvider config={config}>
        <div
          className="flex flex-col h-screen overflow-hidden"
          style={{ background: 'var(--alap-deep)' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <LoadPanel open={showLoad} onClose={() => setShowLoad(false)} />
          <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
          <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />

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
            <div className="flex-1 flex flex-col overflow-hidden">
              <div style={testerPanelStyle}>
                <div className={`p-5 scroll-fade ${testerOverflow ? 'overflow-visible' : 'overflow-y-auto'}`} style={{ maxHeight: testerOverflow ? undefined : '40vh' }}>
                  <QueryTester />
                </div>
              </div>
              <CenterPanel />
            </div>
          </div>

          <Sheet open={showDrawer} onOpenChange={setShowDrawer}>
            <SheetContent side="left">
              <SheetTitle className="sr-only">Config Drawer</SheetTitle>
              <SheetDescription className="sr-only">Manage configuration, storage, and file operations</SheetDescription>
              <ConfigDrawer onClose={() => setShowDrawer(false)} onShowLoad={() => setShowLoad(true)} onShowSettings={() => setShowSettings(true)} />
            </SheetContent>
          </Sheet>

          <StatusBar />
        </div>
      </AlapProvider>
    </TooltipProvider>
  );
}
