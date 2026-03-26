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

import type { AlapConfig, AlapLink } from 'alap/core';
import { AlapEngine } from 'alap/core';
import type { ConfigStore } from 'alap/storage';
import ShortUniqueId from 'short-unique-id';
import { loadPrefs, savePref } from '../../../shared/prefs';
import { identifierError } from '../../../shared/validate-identifier';

const uid = new ShortUniqueId({ length: 8 });
const prefs = loadPrefs();

export type StorageMode = 'local' | 'remote' | 'hybrid';

const emptyConfig: AlapConfig = {
  settings: { listType: 'ul', menuTimeout: 5000 },
  macros: {},
  allLinks: {},
};

/**
 * Creates the reactive store object for Alpine.store('editor', ...).
 *
 * Alpine wraps this in a Proxy, so all property assignments
 * automatically trigger reactivity. No Immer needed.
 */
export function createEditorStore() {
  return {
    // --- Config state ---
    config: { ...emptyConfig, macros: {}, allLinks: {} } as AlapConfig,
    configName: 'untitled',
    configNames: [] as string[],
    isDirty: false,

    // --- UI state ---
    panelMode: 'items' as 'items' | 'macros',
    editingItemIds: [] as string[],
    editingMacroNames: [] as string[],
    selectedItemId: null as string | null,
    filter: '',
    testQuery: '.coffee',
    storageMode: prefs.storageMode as StorageMode,
    apiUrl: prefs.apiUrl,
    statusMessage: null as string | null,

    // --- File I/O ---
    fileHandle: null as FileSystemFileHandle | null,

    // --- Overlay visibility ---
    showTester: false,
    testerOverflow: false,
    showDrawer: false,
    showLoad: false,
    showSettings: false,
    showHelp: false,
    dragOver: false,

    // --- Store reference ---
    _store: null as ConfigStore | null,

    // --- Engine (rebuilt when config changes) ---
    _engine: null as AlapEngine | null,
    _engineConfig: null as AlapConfig | null,

    getEngine(): AlapEngine {
      if (!this._engine || this._engineConfig !== this.config) {
        this._engine = new AlapEngine(this.config);
        this._engineConfig = this.config;
      }
      return this._engine;
    },

    /** Expression to deduplicated array of item IDs */
    query(expression: string, anchorId?: string): string[] {
      return this.getEngine().query(expression, anchorId);
    },

    /** Expression to full link objects */
    resolve(expression: string, anchorId?: string): Array<{ id: string } & AlapLink> {
      return this.getEngine().resolve(expression, anchorId);
    },

    // --- Actions ---

    setStore(store: ConfigStore) {
      this._store = store;
    },

    setStorageMode(mode: StorageMode) {
      this.storageMode = mode;
      savePref('storageMode', mode);
    },

    setApiUrl(url: string) {
      this.apiUrl = url;
      savePref('apiUrl', url);
    },

    setStatus(msg: string | null) {
      this.statusMessage = msg;
    },

    setFileHandle(handle: FileSystemFileHandle | null) {
      this.fileHandle = handle;
    },

    replaceConfig(config: AlapConfig, name?: string) {
      this.config = config;
      this.configName = name ?? 'imported';
      this.isDirty = true;
      this.editingItemIds = [];
      this.editingMacroNames = [];
      this.selectedItemId = null;
      this._engine = null;
      this.statusMessage = name ? `Loaded "${name}"` : 'Config loaded';
    },

    // --- Config management ---

    async loadConfigList() {
      if (!this._store) return;
      try {
        this.configNames = await this._store.list();
      } catch {
        this.statusMessage = 'Failed to load config list';
      }
    },

    async loadConfig(name: string) {
      if (!this._store) return;
      try {
        const config = await this._store.load(name);
        if (config) {
          this.config = config;
          this.configName = name;
          this.isDirty = false;
          this.editingItemIds = [];
          this.selectedItemId = null;
          this._engine = null;
          this.statusMessage = `Loaded "${name}"`;
        } else {
          this.statusMessage = `Config "${name}" not found`;
        }
      } catch {
        this.statusMessage = `Failed to load "${name}"`;
      }
    },

    async saveConfig(name?: string) {
      if (!this._store) return;
      const saveName = name ?? this.configName;
      try {
        await this._store.save(saveName, this.config);
        this.configName = saveName;
        this.isDirty = false;
        this.statusMessage = `Saved "${saveName}"`;
        this.loadConfigList();
      } catch {
        this.statusMessage = `Failed to save "${saveName}"`;
      }
    },

    async deleteConfig(name: string) {
      if (!this._store) return;
      try {
        await this._store.remove(name);
        this.statusMessage = `Deleted "${name}"`;
        this.loadConfigList();
      } catch {
        this.statusMessage = `Failed to delete "${name}"`;
      }
    },

    newConfig(name: string) {
      this.config = { ...emptyConfig, macros: {}, allLinks: {} };
      this.configName = name;
      this.isDirty = false;
      this.editingItemIds = [];
      this.editingMacroNames = [];
      this.selectedItemId = null;
      this._engine = null;
      this.statusMessage = null;
    },

    // --- Item CRUD ---

    addItem(): string {
      const id = `item_${uid.rnd()}`;
      this.config.allLinks = {
        ...this.config.allLinks,
        [id]: { label: '', url: '', tags: [] },
      };
      if (!this.editingItemIds.includes(id)) {
        this.editingItemIds = [...this.editingItemIds, id];
      }
      this.selectedItemId = id;
      this.isDirty = true;
      this._engine = null;
      return id;
    },

    updateItem(id: string, updates: Partial<AlapLink>) {
      const item = this.config.allLinks[id];
      if (!item) return;
      this.config.allLinks = {
        ...this.config.allLinks,
        [id]: { ...item, ...updates },
      };
      this.isDirty = true;
      this._engine = null;
    },

    removeItem(id: string) {
      const { [id]: _, ...rest } = this.config.allLinks;
      this.config.allLinks = rest;
      this.editingItemIds = this.editingItemIds.filter((i) => i !== id);
      if (this.selectedItemId === id) this.selectedItemId = null;
      this.isDirty = true;
      this._engine = null;
    },

    cloneItem(id: string): string {
      const source = this.config.allLinks[id];
      if (!source) return id;

      const newId = `${id}_copy_${uid.rnd()}`;
      this.config.allLinks = {
        ...this.config.allLinks,
        [newId]: { ...source, tags: [...(source.tags ?? [])] },
      };
      if (!this.editingItemIds.includes(newId)) {
        this.editingItemIds = [...this.editingItemIds, newId];
      }
      this.selectedItemId = newId;
      this.isDirty = true;
      this._engine = null;
      return newId;
    },

    renameItem(oldId: string, newId: string): boolean {
      if (newId === oldId) return true;
      const idErr = identifierError(newId);
      if (idErr) { this.statusMessage = `Invalid ID "${newId}": ${idErr}`; return false; }
      if (this.config.allLinks[newId]) return false;

      const item = this.config.allLinks[oldId];
      const { [oldId]: _, ...rest } = this.config.allLinks;
      this.config.allLinks = { ...rest, [newId]: item };
      this.editingItemIds = this.editingItemIds.map((i) => (i === oldId ? newId : i));
      if (this.selectedItemId === oldId) this.selectedItemId = newId;
      this.isDirty = true;
      this._engine = null;
      return true;
    },

    // --- Macro CRUD ---

    addMacro(name: string, linkItems: string) {
      const nameErr = identifierError(name);
      if (nameErr) { this.statusMessage = `Invalid macro name "${name}": ${nameErr}`; return; }
      if (!this.config.macros) this.config.macros = {};
      this.config.macros = { ...this.config.macros, [name]: { linkItems } };
      this.isDirty = true;
      this._engine = null;
    },

    updateMacro(name: string, linkItems: string) {
      if (!this.config.macros?.[name]) return;
      this.config.macros = {
        ...this.config.macros,
        [name]: { ...this.config.macros[name], linkItems },
      };
      this.isDirty = true;
      this._engine = null;
    },

    removeMacro(name: string) {
      if (!this.config.macros) return;
      const { [name]: _, ...rest } = this.config.macros;
      this.config.macros = rest;
      this.isDirty = true;
      this._engine = null;
    },

    // --- Settings ---

    updateSettings(key: string, value: unknown) {
      if (!this.config.settings) this.config.settings = {};
      this.config.settings = { ...this.config.settings, [key]: value };
      this.isDirty = true;
    },

    // --- UI ---

    setPanelMode(mode: 'items' | 'macros') {
      this.panelMode = mode;
      this.filter = '';
    },

    selectItem(id: string | null) {
      this.selectedItemId = id;
    },

    toggleEditItem(id: string) {
      if (this.editingItemIds.includes(id)) {
        this.editingItemIds = this.editingItemIds.filter((i) => i !== id);
        if (this.selectedItemId === id) this.selectedItemId = null;
      } else {
        this.editingItemIds = [...this.editingItemIds, id];
        this.selectedItemId = id;
      }
    },

    closeEditItem(id: string) {
      this.editingItemIds = this.editingItemIds.filter((i) => i !== id);
      if (this.selectedItemId === id) this.selectedItemId = null;
    },

    toggleEditMacro(name: string) {
      if (this.editingMacroNames.includes(name)) {
        this.editingMacroNames = this.editingMacroNames.filter((n) => n !== name);
      } else {
        this.editingMacroNames = [...this.editingMacroNames, name];
      }
    },

    closeEditMacro(name: string) {
      this.editingMacroNames = this.editingMacroNames.filter((n) => n !== name);
    },

    setFilter(filter: string) {
      this.filter = filter;
    },

    setTestQuery(query: string) {
      this.testQuery = query;
    },
  };
}
