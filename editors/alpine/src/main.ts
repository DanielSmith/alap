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

import Alpine from 'alpinejs';
import { createEditorStore } from './store/editor';
import { createStore } from './lib/store-factory';
import { icons } from './icons';
import { installEscapeStack } from './escape-stack';
import { validateConfig } from 'alap/core';
import { hasFileSystemAccess, openFromFile, saveToFile } from '../../shared/file-io';
import type { AlapConfig, AlapLink } from 'alap/core';
import './index.css';

// --- Register global stores ---

Alpine.store('editor', createEditorStore());
Alpine.store('icons', icons);

// --- Type helper for accessing the editor store ---

type EditorStore = ReturnType<typeof createEditorStore>;

function editor(): EditorStore {
  return Alpine.store('editor') as EditorStore;
}

// --- Initialize storage on startup ---

async function initStorage() {
  const ed = editor();
  try {
    const store = await createStore(ed.storageMode, ed.apiUrl, (_op, name, err) => {
      ed.setStatus(`Remote error: ${name} — ${err instanceof Error ? err.message : 'unknown'}`);
    });
    ed.setStore(store);
    ed.loadConfigList();
  } catch {
    ed.setStatus('Failed to initialize storage');
  }
}

// --- Escape stack ---

installEscapeStack(() => {
  const ed = editor();
  return [
    { isOpen: () => ed.showHelp, onClose: () => { ed.showHelp = false; } },
    { isOpen: () => ed.showSettings, onClose: () => { ed.showSettings = false; } },
    { isOpen: () => ed.showLoad, onClose: () => { ed.showLoad = false; } },
    { isOpen: () => ed.showDrawer, onClose: () => { ed.showDrawer = false; } },
  ];
});

// --- Tester overflow: allow menu to escape panel after animation ---

let testerTimer: ReturnType<typeof setTimeout> | undefined;

Alpine.effect(() => {
  const ed = editor();
  const open = ed.showTester;
  clearTimeout(testerTimer);
  if (open) {
    testerTimer = setTimeout(() => { ed.testerOverflow = true; }, 300);
  } else {
    ed.testerOverflow = false;
  }
});

// --- Status message auto-clear ---

let statusTimer: ReturnType<typeof setTimeout> | null = null;

Alpine.effect(() => {
  const ed = editor();
  const msg = ed.statusMessage;
  if (statusTimer) clearTimeout(statusTimer);
  if (msg) {
    statusTimer = setTimeout(() => ed.setStatus(null), 4000);
  }
});

// --- Register reusable Alpine.data() components ---

/**
 * Edit item form — local state per editing item.
 * Usage: x-data="editItemForm('itemId')"
 */
Alpine.data('editItemForm', (itemId: string) => ({
  expanded: true,
  localId: itemId,
  label: '',
  url: '',
  tags: '',
  cssClass: '',
  targetWindow: '',
  image: '',
  altText: '',
  thumbnail: '',
  description: '',
  isNew: false,
  isDirty: false,
  saveLabel: '',
  lightboxSrc: null as string | null,

  init() {
    this.syncFromStore();
  },

  syncFromStore() {
    const item = editor().config.allLinks[itemId];
    if (!item) return;
    this.localId = itemId;
    this.label = item.label ?? '';
    this.url = item.url ?? '';
    this.tags = (item.tags ?? []).join(', ');
    this.cssClass = item.cssClass ?? '';
    this.targetWindow = item.targetWindow ?? '';
    this.image = item.image ?? '';
    this.altText = item.altText ?? '';
    this.thumbnail = item.thumbnail ?? '';
    this.description = item.description ?? '';
    const fresh = !item.url && !item.label && !(item.tags?.length);
    this.isNew = fresh;
    this.isDirty = fresh;
    this.saveLabel = fresh ? 'Save Item' : 'Update Item';
  },

  markDirty() {
    this.isDirty = true;
  },

  handleSave() {
    if (!this.isDirty) return;
    this.saveLabel = 'Saving...';
    const ed = editor();

    if (this.localId !== itemId) {
      const success = ed.renameItem(itemId, this.localId);
      if (!success) {
        ed.setStatus(`ID "${this.localId}" already exists`);
        this.localId = itemId;
        this.saveLabel = this.isNew ? 'Save Item' : 'Update Item';
        return;
      }
    }

    const parsedTags = this.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    ed.updateItem(this.localId, {
      label: this.label || undefined,
      url: this.url,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      cssClass: this.cssClass || undefined,
      targetWindow: this.targetWindow || undefined,
      image: this.image || undefined,
      altText: this.altText || undefined,
      thumbnail: this.thumbnail || undefined,
      description: this.description || undefined,
    });

    this.saveLabel = 'Saved';
    this.isNew = false;
    this.isDirty = false;
    ed.setStatus(`${this.isNew ? 'Saved' : 'Updated'} "${this.localId}"`);
    setTimeout(() => { this.saveLabel = 'Update Item'; }, 1500);
  },

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.handleSave(); }
  },

  get summaryLabel(): string {
    if (this.expanded) return itemId;
    return `${itemId}${this.label ? ` — ${this.label}` : ''}`;
  },

  get saveBtnBg(): string {
    return this.isDirty ? 'var(--alap-accent)' : 'var(--alap-border-subtle)';
  },

  get saveBtnColor(): string {
    return this.isDirty ? 'var(--alap-deep)' : 'var(--alap-text-dim)';
  },

  get saveBtnCursor(): string {
    return this.isDirty ? 'pointer' : 'default';
  },
}));

/**
 * Edit macro form — local state per editing macro.
 * Usage: x-data="editMacroForm('macroName')"
 */
Alpine.data('editMacroForm', (macroName: string) => ({
  expanded: true,
  editName: '',
  editExpr: '',
  isNew: false,
  isDirty: false,
  saveLabel: 'Save Macro',

  init() {
    this.syncFromStore();
  },

  syncFromStore() {
    const macro = editor().config.macros?.[macroName];
    if (!macro) return;
    this.editName = macroName;
    this.editExpr = macro.linkItems;
    const freshlyCreated = !macro.linkItems;
    this.isNew = freshlyCreated;
    this.isDirty = freshlyCreated;
    this.saveLabel = freshlyCreated ? 'Save Macro' : 'Update Macro';
  },

  markDirty() {
    this.isDirty = true;
  },

  get resolvedLinks(): Array<{ id: string } & AlapLink> {
    if (!this.editExpr) return [];
    return editor().resolve(this.editExpr);
  },

  handleSave() {
    if (!this.isDirty) return;
    const name = this.editName.trim();
    const expr = this.editExpr.trim();
    if (!name || !expr) return;

    this.saveLabel = 'Saving...';
    const ed = editor();

    if (name !== macroName) ed.removeMacro(macroName);
    ed.addMacro(name, expr);

    this.saveLabel = 'Saved';
    this.isNew = false;
    this.isDirty = false;
    ed.setStatus(`${this.isNew ? 'Saved' : 'Updated'} macro @${name}`);
    setTimeout(() => { this.saveLabel = 'Update Macro'; }, 1500);
  },

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.handleSave(); }
  },

  get summaryLabel(): string {
    if (this.expanded) return `@${macroName}`;
    return `@${macroName}${this.editExpr ? ` — ${this.editExpr}` : ''}`;
  },

  get saveBtnBg(): string {
    return this.isDirty ? 'var(--alap-macro-accent)' : 'var(--alap-border-subtle)';
  },

  get saveBtnColor(): string {
    return this.isDirty ? 'var(--alap-macro-deep)' : 'var(--alap-text-dim)';
  },

  get saveBtnCursor(): string {
    return this.isDirty ? 'pointer' : 'default';
  },
}));

/**
 * Config drawer — local state for inline forms.
 * Usage: x-data="configDrawer"
 */
Alpine.data('configDrawer', () => ({
  showNewInput: false,
  newName: '',
  showSaveAs: false,
  saveAsName: '',
  deletePrompt: false,
  importMode: 'replace' as 'replace' | 'merge',

  handleNew() {
    const name = this.newName.trim();
    if (!name) return;
    editor().newConfig(name);
    this.showNewInput = false;
    this.newName = '';
  },

  handleSaveAs() {
    const name = this.saveAsName.trim();
    if (!name) return;
    editor().saveConfig(name);
    this.showSaveAs = false;
    this.saveAsName = '';
  },

  handleDelete() {
    const ed = editor();
    ed.deleteConfig(ed.configName);
    this.deletePrompt = false;
    ed.setStatus(`Deleted "${ed.configName}" from storage — still editing in memory`);
  },

  async handleImport() {
    const result = await openFromFile();
    if (!result) return;
    const ed = editor();
    ed.replaceConfig(result.config, result.name);
    if (this.importMode === 'merge') {
      ed.setStatus(`Imported "${result.name}" (merge coming soon — replaced for now)`);
    }
    ed.setFileHandle(result.handle);
    ed.showDrawer = false;
  },

  async handleExport() {
    const ed = editor();
    const handle = await saveToFile(ed.config, ed.configName, ed.fileHandle);
    if (handle) ed.setFileHandle(handle);
  },

  get hasFileSystemAccess(): boolean {
    return hasFileSystemAccess();
  },
}));

/**
 * Load panel — local state for filtering.
 * Usage: x-data="loadPanel"
 */
Alpine.data('loadPanel', () => ({
  loadMode: 'replace' as 'replace' | 'merge',
  filter: '',

  get filteredNames(): string[] {
    const names = editor().configNames;
    if (!this.filter) return names;
    const f = this.filter.toLowerCase();
    return names.filter((n: string) => n.toLowerCase().includes(f));
  },

  handleLoad(name: string) {
    const ed = editor();
    ed.loadConfig(name);
    if (this.loadMode === 'merge') {
      ed.setStatus(`Loaded "${name}" (merge coming soon — replaced for now)`);
    }
    ed.showLoad = false;
  },

  get actionLabel(): string {
    return this.loadMode === 'merge' ? 'merge into current' : 'load';
  },
}));

/**
 * Item list — local state for confirm dialog.
 * Usage: x-data="itemList"
 */
Alpine.data('itemList', () => ({
  pendingDeleteId: null as string | null,

  get filteredItems(): Array<[string, AlapLink]> {
    const ed = editor();
    const entries = Object.entries(ed.config.allLinks) as Array<[string, AlapLink]>;
    if (!ed.filter) return entries;
    const f = ed.filter.toLowerCase();
    return entries.filter(([id, item]) =>
      id.toLowerCase().includes(f) ||
      (item.label ?? '').toLowerCase().includes(f) ||
      (item.tags ?? []).some((t: string) => t.toLowerCase().includes(f))
    );
  },

  confirmDelete() {
    if (this.pendingDeleteId) {
      editor().removeItem(this.pendingDeleteId);
      this.pendingDeleteId = null;
    }
  },

  handleRemoveTag(id: string, tag: string) {
    const item = editor().config.allLinks[id];
    if (!item?.tags) return;
    editor().updateItem(id, { tags: item.tags.filter((t: string) => t !== tag) });
  },
}));

/**
 * Macro list — local state for confirm dialog.
 * Usage: x-data="macroList"
 */
Alpine.data('macroList', () => ({
  pendingDeleteName: null as string | null,

  get filteredMacros(): Array<[string, { linkItems: string }]> {
    const ed = editor();
    const entries = Object.entries(ed.config.macros ?? {});
    if (!ed.filter) return entries;
    const f = ed.filter.toLowerCase();
    return entries.filter(([name, macro]) =>
      name.toLowerCase().includes(f) || macro.linkItems.toLowerCase().includes(f)
    );
  },

  confirmDelete() {
    if (this.pendingDeleteName) {
      const ed = editor();
      ed.removeMacro(this.pendingDeleteName);
      if (ed.editingMacroNames.includes(this.pendingDeleteName)) {
        ed.toggleEditMacro(this.pendingDeleteName);
      }
      this.pendingDeleteName = null;
    }
  },

  handleAdd() {
    const name = `macro_${Date.now().toString(36)}`;
    const ed = editor();
    ed.addMacro(name, '');
    ed.toggleEditMacro(name);
    ed.setStatus(`Created @${name}`);
  },

  handleClone(name: string) {
    const ed = editor();
    const macro = ed.config.macros?.[name];
    if (!macro) return;
    const newName = `${name}_copy`;
    ed.addMacro(newName, macro.linkItems);
    ed.toggleEditMacro(newName);
    ed.setStatus(`Cloned @${name} → @${newName}`);
  },
}));

/**
 * Query tester — tag cloud and pattern cloud helpers.
 * Usage: x-data="queryTester"
 */
Alpine.data('queryTester', () => ({
  get testIds(): string[] {
    const ed = editor();
    if (!ed.testQuery) return [];
    return ed.query(ed.testQuery);
  },

  get testLinks(): Array<{ id: string } & AlapLink> {
    const ed = editor();
    if (!ed.testQuery) return [];
    return ed.resolve(ed.testQuery);
  },

  get tagCounts(): Array<[string, number]> {
    const counts = new Map<string, number>();
    const allLinks = editor().config.allLinks;
    for (const item of Object.values(allLinks)) {
      for (const tag of (item as AlapLink).tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  },

  get patternKeys(): string[] {
    const patterns = editor().config.searchPatterns;
    if (!patterns || Object.keys(patterns).length === 0) return [];
    return Object.keys(patterns).sort();
  },

  getPatternTitle(key: string): string {
    const patterns = editor().config.searchPatterns;
    if (!patterns) return '';
    const entry = patterns[key];
    const pattern = typeof entry === 'string' ? entry : entry.pattern;
    return `/${pattern}/`;
  },
}));

/**
 * Drag-and-drop handler for the main app shell.
 * Usage: x-data="appDragDrop"
 */
Alpine.data('appDragDrop', () => ({
  IMAGE_EXTENSIONS: /\.(png|jpe?g|gif|webp|svg)$/i,

  handleDrop(e: DragEvent) {
    e.preventDefault();
    const ed = editor();
    ed.dragOver = false;

    if (!e.dataTransfer) return;

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find((f) => f.name.endsWith('.json'));
    if (jsonFile) {
      jsonFile.text().then((text) => {
        try {
          const parsed = validateConfig(JSON.parse(text));
          ed.replaceConfig(parsed, jsonFile.name.replace(/\.json$/i, ''));
        } catch {
          ed.setStatus('Invalid JSON file');
        }
      });
      return;
    }

    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile) {
      if (!ed.selectedItemId) { ed.setStatus('Select an item first'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        ed.updateItem(ed.selectedItemId!, { thumbnail: reader.result as string });
        ed.setStatus(`Thumbnail set from ${imageFile.name}`);
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
      if (this.IMAGE_EXTENSIONS.test(url)) {
        if (!ed.selectedItemId) { ed.setStatus('Select an item first'); return; }
        ed.updateItem(ed.selectedItemId, { thumbnail: url });
        ed.setStatus('Thumbnail set from image URL');
        return;
      }

      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const id = ed.addItem();
      ed.updateItem(id, { label: hostname, url, tags: [hostname.replace(/\./g, '_')] });
      ed.setStatus(`Dropped: ${hostname}`);

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

          ed.updateItem(id, updates);
          ed.setStatus(`Updated: ${meta.title ?? hostname}`);
        })
        .catch(() => {});
    }
  },

  handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    editor().dragOver = true;
  },

  handleDragLeave() {
    editor().dragOver = false;
  },
}));

// --- Watch storage mode for reinit ---

Alpine.effect(() => {
  const mode = editor().storageMode;
  const apiUrl = editor().apiUrl;
  // Re-initialize storage when mode or API URL changes
  void mode;    // read for reactivity
  void apiUrl;  // read for reactivity
  initStorage();
});

// --- Make Alpine available globally (standard pattern) ---

(window as any).Alpine = Alpine;

// --- Start Alpine ---

Alpine.start();
