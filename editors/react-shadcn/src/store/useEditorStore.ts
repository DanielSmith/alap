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

import { create } from 'zustand';
import { produce } from 'immer';
import type { AlapConfig, AlapLink } from 'alap/core';
import type { ConfigStore } from 'alap/storage';
import ShortUniqueId from 'short-unique-id';
import { loadPrefs, savePref } from '../../../shared/prefs';
import { identifierError } from '../../../shared/validate-identifier';

const uid = new ShortUniqueId({ length: 8 });
const prefs = loadPrefs();

export type StorageMode = 'local' | 'remote' | 'hybrid';

export interface EditorState {
  // --- Config ---
  config: AlapConfig;
  configName: string;
  configNames: string[];
  isDirty: boolean;

  // --- UI ---
  panelMode: 'items' | 'macros';
  editingItemIds: string[];
  editingMacroNames: string[];
  selectedItemId: string | null;
  filter: string;
  testQuery: string;
  storageMode: StorageMode;
  apiUrl: string;
  statusMessage: string | null;

  // --- File I/O ---
  fileHandle: FileSystemFileHandle | null;
  setFileHandle: (handle: FileSystemFileHandle | null) => void;
  replaceConfig: (config: AlapConfig, name?: string) => void;

  // --- Store reference ---
  store: ConfigStore | null;

  // --- Actions ---
  setStore: (store: ConfigStore) => void;
  setStorageMode: (mode: StorageMode) => void;
  setApiUrl: (url: string) => void;
  setStatus: (msg: string | null) => void;

  // Config management
  loadConfigList: () => Promise<void>;
  loadConfig: (name: string) => Promise<void>;
  saveConfig: (name?: string) => Promise<void>;
  deleteConfig: (name: string) => Promise<void>;
  newConfig: (name: string) => void;

  // Item CRUD
  addItem: () => string;
  updateItem: (id: string, updates: Partial<AlapLink>) => void;
  removeItem: (id: string) => void;
  cloneItem: (id: string) => string;
  renameItem: (oldId: string, newId: string) => boolean;

  // Macro CRUD
  addMacro: (name: string, linkItems: string) => void;
  updateMacro: (name: string, linkItems: string) => void;
  removeMacro: (name: string) => void;

  // Settings
  updateSettings: (key: string, value: unknown) => void;

  // UI
  setPanelMode: (mode: 'items' | 'macros') => void;
  selectItem: (id: string | null) => void;
  toggleEditItem: (id: string) => void;
  closeEditItem: (id: string) => void;
  toggleEditMacro: (name: string) => void;
  closeEditMacro: (name: string) => void;
  setFilter: (filter: string) => void;
  setTestQuery: (query: string) => void;
}

const emptyConfig: AlapConfig = {
  settings: { listType: 'ul', menuTimeout: 5000 },
  macros: {},
  allLinks: {},
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // --- Initial state ---
  config: { ...emptyConfig },
  configName: 'untitled',
  configNames: [],
  isDirty: false,
  panelMode: 'items',
  editingItemIds: [],
  editingMacroNames: [],
  selectedItemId: null,
  filter: '',
  testQuery: '.coffee',
  storageMode: prefs.storageMode as StorageMode,
  apiUrl: prefs.apiUrl,
  statusMessage: null,
  fileHandle: null,
  store: null,

  // --- Store ---

  setStore: (store) => set({ store }),
  setStorageMode: (mode) => { savePref('storageMode', mode); set({ storageMode: mode }); },
  setApiUrl: (url) => { savePref('apiUrl', url); set({ apiUrl: url }); },
  setStatus: (msg) => set({ statusMessage: msg }),
  setFileHandle: (handle) => set({ fileHandle: handle }),
  replaceConfig: (config, name) => set({
    config,
    configName: name ?? 'imported',
    isDirty: true,
    editingItemIds: [],
    editingMacroNames: [],
    selectedItemId: null,
    statusMessage: name ? `Loaded "${name}"` : 'Config loaded',
  }),

  // --- Config management ---

  loadConfigList: async () => {
    const { store } = get();
    if (!store) return;
    try {
      const names = await store.list();
      set({ configNames: names });
    } catch {
      set({ statusMessage: 'Failed to load config list' });
    }
  },

  loadConfig: async (name) => {
    const { store } = get();
    if (!store) return;
    try {
      const config = await store.load(name);
      if (config) {
        set({
          config,
          configName: name,
          isDirty: false,
          editingItemIds: [],
          selectedItemId: null,
          statusMessage: `Loaded "${name}"`,
        });
      } else {
        set({ statusMessage: `Config "${name}" not found` });
      }
    } catch {
      set({ statusMessage: `Failed to load "${name}"` });
    }
  },

  saveConfig: async (name?) => {
    const { store, config, configName } = get();
    if (!store) return;
    const saveName = name ?? configName;
    try {
      await store.save(saveName, config);
      set({ configName: saveName, isDirty: false, statusMessage: `Saved "${saveName}"` });
      get().loadConfigList();
    } catch {
      set({ statusMessage: `Failed to save "${saveName}"` });
    }
  },

  deleteConfig: async (name) => {
    const { store } = get();
    if (!store) return;
    try {
      await store.remove(name);
      set({ statusMessage: `Deleted "${name}"` });
      get().loadConfigList();
    } catch {
      set({ statusMessage: `Failed to delete "${name}"` });
    }
  },

  newConfig: (name) => {
    set({
      config: { ...emptyConfig, macros: {}, allLinks: {} },
      configName: name,
      isDirty: false,
      editingItemIds: [],
      selectedItemId: null,
      statusMessage: null,
    });
  },

  // --- Item CRUD ---

  addItem: () => {
    const id = `item_${uid.rnd()}`;
    set(produce((s: EditorState) => {
      s.config.allLinks[id] = { label: '', url: '', tags: [] };
      // Open for editing immediately
      if (!s.editingItemIds.includes(id)) {
        s.editingItemIds = [...s.editingItemIds, id];
      }
      s.selectedItemId = id;
      s.isDirty = true;
    }));
    return id;
  },

  updateItem: (id, updates) => {
    set(produce((s: EditorState) => {
      const item = s.config.allLinks[id];
      if (!item) return;
      s.config.allLinks[id] = { ...item, ...updates };
      s.isDirty = true;
    }));
  },

  removeItem: (id) => {
    set(produce((s: EditorState) => {
      delete s.config.allLinks[id];
      s.editingItemIds = s.editingItemIds.filter((i) => i !== id);
      if (s.selectedItemId === id) s.selectedItemId = null;
      s.isDirty = true;
    }));
  },

  cloneItem: (id) => {
    const { config } = get();
    const source = config.allLinks[id];
    if (!source) return id;

    const newId = `${id}_copy_${uid.rnd()}`;
    set(produce((s: EditorState) => {
      s.config.allLinks[newId] = { ...source, tags: [...(source.tags ?? [])] };
      // Open clone for editing
      if (!s.editingItemIds.includes(newId)) {
        s.editingItemIds = [...s.editingItemIds, newId];
      }
      s.selectedItemId = newId;
      s.isDirty = true;
    }));
    return newId;
  },

  renameItem: (oldId, newId) => {
    const { config } = get();
    if (newId === oldId) return true;
    const idErr = identifierError(newId);
    if (idErr) { set({ statusMessage: `Invalid ID "${newId}": ${idErr}` }); return false; }
    if (config.allLinks[newId]) return false;

    set(produce((s: EditorState) => {
      s.config.allLinks[newId] = s.config.allLinks[oldId];
      delete s.config.allLinks[oldId];
      // Update editing list
      s.editingItemIds = s.editingItemIds.map((i) => i === oldId ? newId : i);
      if (s.selectedItemId === oldId) s.selectedItemId = newId;
      s.isDirty = true;
    }));
    return true;
  },

  // --- Macro CRUD ---

  addMacro: (name, linkItems) => {
    const nameErr = identifierError(name);
    if (nameErr) { set({ statusMessage: `Invalid macro name "${name}": ${nameErr}` }); return; }
    set(produce((s: EditorState) => {
      if (!s.config.macros) s.config.macros = {};
      s.config.macros[name] = { linkItems };
      s.isDirty = true;
    }));
  },

  updateMacro: (name, linkItems) => {
    set(produce((s: EditorState) => {
      if (s.config.macros?.[name]) {
        s.config.macros[name].linkItems = linkItems;
        s.isDirty = true;
      }
    }));
  },

  removeMacro: (name) => {
    set(produce((s: EditorState) => {
      if (s.config.macros) {
        delete s.config.macros[name];
        s.isDirty = true;
      }
    }));
  },

  // --- Settings ---

  updateSettings: (key, value) => {
    set(produce((s: EditorState) => {
      if (!s.config.settings) s.config.settings = {};
      s.config.settings[key] = value;
      s.isDirty = true;
    }));
  },

  // --- UI ---

  setPanelMode: (mode) => set({ panelMode: mode, filter: '' }),
  selectItem: (id) => set({ selectedItemId: id }),

  toggleEditItem: (id) => {
    set(produce((s: EditorState) => {
      if (s.editingItemIds.includes(id)) {
        s.editingItemIds = s.editingItemIds.filter((i) => i !== id);
        if (s.selectedItemId === id) s.selectedItemId = null;
      } else {
        s.editingItemIds = [...s.editingItemIds, id];
        s.selectedItemId = id;
      }
    }));
  },

  closeEditItem: (id) => {
    set(produce((s: EditorState) => {
      s.editingItemIds = s.editingItemIds.filter((i) => i !== id);
      if (s.selectedItemId === id) s.selectedItemId = null;
    }));
  },

  toggleEditMacro: (name) => {
    set(produce((s: EditorState) => {
      if (s.editingMacroNames.includes(name)) {
        s.editingMacroNames = s.editingMacroNames.filter((n) => n !== name);
      } else {
        s.editingMacroNames = [...s.editingMacroNames, name];
      }
    }));
  },

  closeEditMacro: (name) => {
    set(produce((s: EditorState) => {
      s.editingMacroNames = s.editingMacroNames.filter((n) => n !== name);
    }));
  },

  setFilter: (filter) => set({ filter }),
  setTestQuery: (query) => set({ testQuery: query }),
}));
