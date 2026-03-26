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

function createEditorStore() {
  // --- Config state ---
  let config = $state<AlapConfig>({ ...emptyConfig, macros: {}, allLinks: {} });
  let configName = $state('untitled');
  let configNames = $state<string[]>([]);
  let isDirty = $state(false);

  // --- UI state ---
  let panelMode = $state<'items' | 'macros'>('items');
  let editingItemIds = $state<string[]>([]);
  let editingMacroNames = $state<string[]>([]);
  let selectedItemId = $state<string | null>(null);
  let filter = $state('');
  let testQuery = $state('.coffee');
  let storageMode = $state<StorageMode>(prefs.storageMode as StorageMode);
  let apiUrl = $state(prefs.apiUrl);
  let statusMessage = $state<string | null>(null);

  // --- File I/O ---
  let fileHandle = $state<FileSystemFileHandle | null>(null);

  // --- Store reference ---
  let store = $state<ConfigStore | null>(null);

  // --- Actions ---

  function setStore(s: ConfigStore) { store = s; }
  function setStorageMode(mode: StorageMode) { storageMode = mode; savePref('storageMode', mode); }
  function setApiUrl(url: string) { apiUrl = url; savePref('apiUrl', url); }
  function setStatus(msg: string | null) { statusMessage = msg; }
  function setFileHandle(handle: FileSystemFileHandle | null) { fileHandle = handle; }

  function replaceConfig(cfg: AlapConfig, name?: string) {
    config = cfg;
    configName = name ?? 'imported';
    isDirty = true;
    editingItemIds = [];
    editingMacroNames = [];
    selectedItemId = null;
    statusMessage = name ? `Loaded "${name}"` : 'Config loaded';
  }

  // --- Config management ---

  async function loadConfigList() {
    if (!store) return;
    try {
      const names = await store.list();
      configNames = names;
    } catch {
      statusMessage = 'Failed to load config list';
    }
  }

  async function loadConfig(name: string) {
    if (!store) return;
    try {
      const cfg = await store.load(name);
      if (cfg) {
        config = cfg;
        configName = name;
        isDirty = false;
        editingItemIds = [];
        selectedItemId = null;
        statusMessage = `Loaded "${name}"`;
      } else {
        statusMessage = `Config "${name}" not found`;
      }
    } catch {
      statusMessage = `Failed to load "${name}"`;
    }
  }

  async function saveConfig(name?: string) {
    if (!store) return;
    const saveName = name ?? configName;
    try {
      await store.save(saveName, config);
      configName = saveName;
      isDirty = false;
      statusMessage = `Saved "${saveName}"`;
      loadConfigList();
    } catch {
      statusMessage = `Failed to save "${saveName}"`;
    }
  }

  async function deleteConfig(name: string) {
    if (!store) return;
    try {
      await store.remove(name);
      statusMessage = `Deleted "${name}"`;
      loadConfigList();
    } catch {
      statusMessage = `Failed to delete "${name}"`;
    }
  }

  function newConfig(name: string) {
    config = { ...emptyConfig, macros: {}, allLinks: {} };
    configName = name;
    isDirty = false;
    editingItemIds = [];
    selectedItemId = null;
    statusMessage = null;
  }

  // --- Item CRUD ---

  function addItem(): string {
    const id = `item_${uid.rnd()}`;
    config.allLinks[id] = { label: '', url: '', tags: [] };
    if (!editingItemIds.includes(id)) {
      editingItemIds = [...editingItemIds, id];
    }
    selectedItemId = id;
    isDirty = true;
    return id;
  }

  function updateItem(id: string, updates: Partial<AlapLink>) {
    const item = config.allLinks[id];
    if (!item) return;
    config.allLinks[id] = { ...item, ...updates };
    isDirty = true;
  }

  function removeItem(id: string) {
    delete config.allLinks[id];
    editingItemIds = editingItemIds.filter((i) => i !== id);
    if (selectedItemId === id) selectedItemId = null;
    isDirty = true;
  }

  function cloneItem(id: string): string {
    const source = config.allLinks[id];
    if (!source) return id;

    const newId = `${id}_copy_${uid.rnd()}`;
    config.allLinks[newId] = { ...source, tags: [...(source.tags ?? [])] };
    if (!editingItemIds.includes(newId)) {
      editingItemIds = [...editingItemIds, newId];
    }
    selectedItemId = newId;
    isDirty = true;
    return newId;
  }

  function renameItem(oldId: string, newId: string): boolean {
    if (newId === oldId) return true;
    const idErr = identifierError(newId);
    if (idErr) { statusMessage = `Invalid ID "${newId}": ${idErr}`; return false; }
    if (config.allLinks[newId]) return false;

    config.allLinks[newId] = config.allLinks[oldId];
    delete config.allLinks[oldId];
    editingItemIds = editingItemIds.map((i) => (i === oldId ? newId : i));
    if (selectedItemId === oldId) selectedItemId = newId;
    isDirty = true;
    return true;
  }

  // --- Macro CRUD ---

  function addMacro(name: string, linkItems: string) {
    const nameErr = identifierError(name);
    if (nameErr) { statusMessage = `Invalid macro name "${name}": ${nameErr}`; return; }
    if (!config.macros) config.macros = {};
    config.macros[name] = { linkItems };
    isDirty = true;
  }

  function updateMacro(name: string, linkItems: string) {
    if (config.macros?.[name]) {
      config.macros[name].linkItems = linkItems;
      isDirty = true;
    }
  }

  function removeMacro(name: string) {
    if (config.macros) {
      delete config.macros[name];
      isDirty = true;
    }
  }

  // --- Settings ---

  function updateSettings(key: string, value: unknown) {
    if (!config.settings) config.settings = {};
    config.settings[key] = value;
    isDirty = true;
  }

  // --- UI ---

  function setPanelMode(mode: 'items' | 'macros') {
    panelMode = mode;
    filter = '';
  }

  function selectItem(id: string | null) { selectedItemId = id; }

  function toggleEditItem(id: string) {
    if (editingItemIds.includes(id)) {
      editingItemIds = editingItemIds.filter((i) => i !== id);
      if (selectedItemId === id) selectedItemId = null;
    } else {
      editingItemIds = [...editingItemIds, id];
      selectedItemId = id;
    }
  }

  function closeEditItem(id: string) {
    editingItemIds = editingItemIds.filter((i) => i !== id);
    if (selectedItemId === id) selectedItemId = null;
  }

  function toggleEditMacro(name: string) {
    if (editingMacroNames.includes(name)) {
      editingMacroNames = editingMacroNames.filter((n) => n !== name);
    } else {
      editingMacroNames = [...editingMacroNames, name];
    }
  }

  function closeEditMacro(name: string) {
    editingMacroNames = editingMacroNames.filter((n) => n !== name);
  }

  function setFilter(f: string) { filter = f; }
  function setTestQuery(q: string) { testQuery = q; }

  return {
    // Getters — use $state runes
    get config() { return config; },
    set config(v: AlapConfig) { config = v; },
    get configName() { return configName; },
    get configNames() { return configNames; },
    get isDirty() { return isDirty; },
    get panelMode() { return panelMode; },
    get editingItemIds() { return editingItemIds; },
    get editingMacroNames() { return editingMacroNames; },
    get selectedItemId() { return selectedItemId; },
    get filter() { return filter; },
    get testQuery() { return testQuery; },
    get storageMode() { return storageMode; },
    get apiUrl() { return apiUrl; },
    get statusMessage() { return statusMessage; },
    get fileHandle() { return fileHandle; },
    get store() { return store; },

    // Actions
    setStore,
    setStorageMode,
    setApiUrl,
    setStatus,
    setFileHandle,
    replaceConfig,
    loadConfigList,
    loadConfig,
    saveConfig,
    deleteConfig,
    newConfig,
    addItem,
    updateItem,
    removeItem,
    cloneItem,
    renameItem,
    addMacro,
    updateMacro,
    removeMacro,
    updateSettings,
    setPanelMode,
    selectItem,
    toggleEditItem,
    closeEditItem,
    toggleEditMacro,
    closeEditMacro,
    setFilter,
    setTestQuery,
  };
}

export const editor = createEditorStore();
