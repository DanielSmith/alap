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

import { ref, reactive } from 'vue';
import { defineStore } from 'pinia';
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

export const useEditorStore = defineStore('editor', () => {
  // --- State ---
  const config = ref<AlapConfig>({ ...emptyConfig, macros: {}, allLinks: {} });
  const configName = ref('untitled');
  const configNames = ref<string[]>([]);
  const isDirty = ref(false);

  const panelMode = ref<'items' | 'macros'>('items');
  const editingItemIds = ref<string[]>([]);
  const editingMacroNames = ref<string[]>([]);
  const selectedItemId = ref<string | null>(null);
  const filter = ref('');
  const testQuery = ref('.coffee');
  const storageMode = ref<StorageMode>(prefs.storageMode as StorageMode);
  const apiUrl = ref(prefs.apiUrl);
  const statusMessage = ref<string | null>(null);

  const fileHandle = ref<FileSystemFileHandle | null>(null);
  const store = ref<ConfigStore | null>(null);

  // --- Store ---

  function setStore(s: ConfigStore) {
    store.value = s;
  }

  function setStorageMode(mode: StorageMode) {
    savePref('storageMode', mode);
    storageMode.value = mode;
  }

  function setApiUrl(url: string) {
    savePref('apiUrl', url);
    apiUrl.value = url;
  }

  function setStatus(msg: string | null) {
    statusMessage.value = msg;
  }

  function setFileHandle(handle: FileSystemFileHandle | null) {
    fileHandle.value = handle;
  }

  function replaceConfig(cfg: AlapConfig, name?: string) {
    config.value = cfg;
    configName.value = name ?? 'imported';
    isDirty.value = true;
    editingItemIds.value = [];
    editingMacroNames.value = [];
    selectedItemId.value = null;
    statusMessage.value = name ? `Loaded "${name}"` : 'Config loaded';
  }

  // --- Config management ---

  async function loadConfigList() {
    if (!store.value) return;
    try {
      const names = await store.value.list();
      configNames.value = names;
    } catch {
      statusMessage.value = 'Failed to load config list';
    }
  }

  async function loadConfig(name: string) {
    if (!store.value) return;
    try {
      const cfg = await store.value.load(name);
      if (cfg) {
        config.value = cfg;
        configName.value = name;
        isDirty.value = false;
        editingItemIds.value = [];
        selectedItemId.value = null;
        statusMessage.value = `Loaded "${name}"`;
      } else {
        statusMessage.value = `Config "${name}" not found`;
      }
    } catch {
      statusMessage.value = `Failed to load "${name}"`;
    }
  }

  async function saveConfig(name?: string) {
    if (!store.value) return;
    const saveName = name ?? configName.value;
    try {
      await store.value.save(saveName, config.value);
      configName.value = saveName;
      isDirty.value = false;
      statusMessage.value = `Saved "${saveName}"`;
      loadConfigList();
    } catch {
      statusMessage.value = `Failed to save "${saveName}"`;
    }
  }

  async function deleteConfig(name: string) {
    if (!store.value) return;
    try {
      await store.value.remove(name);
      statusMessage.value = `Deleted "${name}"`;
      loadConfigList();
    } catch {
      statusMessage.value = `Failed to delete "${name}"`;
    }
  }

  function newConfig(name: string) {
    config.value = { ...emptyConfig, macros: {}, allLinks: {} };
    configName.value = name;
    isDirty.value = false;
    editingItemIds.value = [];
    selectedItemId.value = null;
    statusMessage.value = null;
  }

  // --- Item CRUD ---

  function addItem(): string {
    const id = `item_${uid.rnd()}`;
    if (!config.value.allLinks) config.value.allLinks = {};
    config.value.allLinks[id] = { label: '', url: '', tags: [] };
    if (!editingItemIds.value.includes(id)) {
      editingItemIds.value = [...editingItemIds.value, id];
    }
    selectedItemId.value = id;
    isDirty.value = true;
    return id;
  }

  function updateItem(id: string, updates: Partial<AlapLink>) {
    const item = config.value.allLinks[id];
    if (!item) return;
    config.value.allLinks[id] = { ...item, ...updates };
    isDirty.value = true;
  }

  function removeItem(id: string) {
    delete config.value.allLinks[id];
    editingItemIds.value = editingItemIds.value.filter((i) => i !== id);
    if (selectedItemId.value === id) selectedItemId.value = null;
    isDirty.value = true;
  }

  function cloneItem(id: string): string {
    const source = config.value.allLinks[id];
    if (!source) return id;

    const newId = `${id}_copy_${uid.rnd()}`;
    config.value.allLinks[newId] = { ...source, tags: [...(source.tags ?? [])] };
    if (!editingItemIds.value.includes(newId)) {
      editingItemIds.value = [...editingItemIds.value, newId];
    }
    selectedItemId.value = newId;
    isDirty.value = true;
    return newId;
  }

  function renameItem(oldId: string, newId: string): boolean {
    if (newId === oldId) return true;
    const idErr = identifierError(newId);
    if (idErr) { statusMessage.value = `Invalid ID "${newId}": ${idErr}`; return false; }
    if (config.value.allLinks[newId]) return false;

    config.value.allLinks[newId] = config.value.allLinks[oldId];
    delete config.value.allLinks[oldId];
    editingItemIds.value = editingItemIds.value.map((i) => (i === oldId ? newId : i));
    if (selectedItemId.value === oldId) selectedItemId.value = newId;
    isDirty.value = true;
    return true;
  }

  // --- Macro CRUD ---

  function addMacro(name: string, linkItems: string) {
    const nameErr = identifierError(name);
    if (nameErr) { statusMessage.value = `Invalid macro name "${name}": ${nameErr}`; return; }
    if (!config.value.macros) config.value.macros = {};
    config.value.macros[name] = { linkItems };
    isDirty.value = true;
  }

  function updateMacro(name: string, linkItems: string) {
    if (config.value.macros?.[name]) {
      config.value.macros[name].linkItems = linkItems;
      isDirty.value = true;
    }
  }

  function removeMacro(name: string) {
    if (config.value.macros) {
      delete config.value.macros[name];
      isDirty.value = true;
    }
  }

  // --- Settings ---

  function updateSettings(key: string, value: unknown) {
    if (!config.value.settings) config.value.settings = {};
    config.value.settings[key] = value;
    isDirty.value = true;
  }

  // --- UI ---

  function setPanelMode(mode: 'items' | 'macros') {
    panelMode.value = mode;
    filter.value = '';
  }

  function selectItem(id: string | null) {
    selectedItemId.value = id;
  }

  function toggleEditItem(id: string) {
    if (editingItemIds.value.includes(id)) {
      editingItemIds.value = editingItemIds.value.filter((i) => i !== id);
      if (selectedItemId.value === id) selectedItemId.value = null;
    } else {
      editingItemIds.value = [...editingItemIds.value, id];
      selectedItemId.value = id;
    }
  }

  function closeEditItem(id: string) {
    editingItemIds.value = editingItemIds.value.filter((i) => i !== id);
    if (selectedItemId.value === id) selectedItemId.value = null;
  }

  function toggleEditMacro(name: string) {
    if (editingMacroNames.value.includes(name)) {
      editingMacroNames.value = editingMacroNames.value.filter((n) => n !== name);
    } else {
      editingMacroNames.value = [...editingMacroNames.value, name];
    }
  }

  function closeEditMacro(name: string) {
    editingMacroNames.value = editingMacroNames.value.filter((n) => n !== name);
  }

  function setFilter(f: string) {
    filter.value = f;
  }

  function setTestQuery(query: string) {
    testQuery.value = query;
  }

  return {
    // State
    config,
    configName,
    configNames,
    isDirty,
    panelMode,
    editingItemIds,
    editingMacroNames,
    selectedItemId,
    filter,
    testQuery,
    storageMode,
    apiUrl,
    statusMessage,
    fileHandle,
    store,

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
});
