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

import { createSignal, createRoot, batch } from 'solid-js';
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
  // --- Config ---
  const [config, setConfig] = createSignal<AlapConfig>({ ...emptyConfig });
  const [configName, setConfigName] = createSignal('untitled');
  const [configNames, setConfigNames] = createSignal<string[]>([]);
  const [isDirty, setIsDirty] = createSignal(false);

  // --- UI ---
  const [panelMode, setPanelModeRaw] = createSignal<'items' | 'macros'>('items');
  const [editingItemIds, setEditingItemIds] = createSignal<string[]>([]);
  const [editingMacroNames, setEditingMacroNames] = createSignal<string[]>([]);
  const [selectedItemId, setSelectedItemId] = createSignal<string | null>(null);
  const [filter, setFilter] = createSignal('');
  const [testQuery, setTestQuery] = createSignal('.coffee');
  const [storageMode, setStorageMode] = createSignal<StorageMode>(prefs.storageMode as StorageMode);
  const [apiUrl, setApiUrl] = createSignal(prefs.apiUrl);
  const [statusMessage, setStatusMessage] = createSignal<string | null>(null);

  function setStorageModeWithPref(mode: StorageMode) {
    savePref('storageMode', mode);
    setStorageMode(mode);
  }

  function setApiUrlWithPref(url: string) {
    savePref('apiUrl', url);
    setApiUrl(url);
  }

  // --- File I/O ---
  const [fileHandle, setFileHandle] = createSignal<FileSystemFileHandle | null>(null);

  // --- Store reference ---
  const [store, setStore] = createSignal<ConfigStore | null>(null);

  // --- Config management ---

  async function loadConfigList() {
    const s = store();
    if (!s) return;
    try {
      const names = await s.list();
      setConfigNames(names);
    } catch {
      setStatusMessage('Failed to load config list');
    }
  }

  async function loadConfig(name: string) {
    const s = store();
    if (!s) return;
    try {
      const cfg = await s.load(name);
      if (cfg) {
        batch(() => {
          setConfig(cfg);
          setConfigName(name);
          setIsDirty(false);
          setEditingItemIds([]);
          setSelectedItemId(null);
          setStatusMessage(`Loaded "${name}"`);
        });
      } else {
        setStatusMessage(`Config "${name}" not found`);
      }
    } catch {
      setStatusMessage(`Failed to load "${name}"`);
    }
  }

  async function saveConfig(name?: string) {
    const s = store();
    if (!s) return;
    const saveName = name ?? configName();
    try {
      await s.save(saveName, config());
      batch(() => {
        setConfigName(saveName);
        setIsDirty(false);
        setStatusMessage(`Saved "${saveName}"`);
      });
      loadConfigList();
    } catch {
      setStatusMessage(`Failed to save "${saveName}"`);
    }
  }

  async function deleteConfig(name: string) {
    const s = store();
    if (!s) return;
    try {
      await s.remove(name);
      setStatusMessage(`Deleted "${name}"`);
      loadConfigList();
    } catch {
      setStatusMessage(`Failed to delete "${name}"`);
    }
  }

  function newConfig(name: string) {
    batch(() => {
      setConfig({ ...emptyConfig, macros: {}, allLinks: {} });
      setConfigName(name);
      setIsDirty(false);
      setEditingItemIds([]);
      setSelectedItemId(null);
      setStatusMessage(null);
    });
  }

  function replaceConfig(cfg: AlapConfig, name?: string) {
    batch(() => {
      setConfig(cfg);
      setConfigName(name ?? 'imported');
      setIsDirty(true);
      setEditingItemIds([]);
      setEditingMacroNames([]);
      setSelectedItemId(null);
      setStatusMessage(name ? `Loaded "${name}"` : 'Config loaded');
    });
  }

  // --- Item CRUD ---

  function addItem(): string {
    const id = `item_${uid.rnd()}`;
    batch(() => {
      setConfig((prev) => ({
        ...prev,
        allLinks: { ...prev.allLinks, [id]: { label: '', url: '', tags: [] } },
      }));
      setEditingItemIds((prev) => prev.includes(id) ? prev : [...prev, id]);
      setSelectedItemId(id);
      setIsDirty(true);
    });
    return id;
  }

  function updateItem(id: string, updates: Partial<AlapLink>) {
    setConfig((prev) => {
      const item = prev.allLinks[id];
      if (!item) return prev;
      return {
        ...prev,
        allLinks: { ...prev.allLinks, [id]: { ...item, ...updates } },
      };
    });
    setIsDirty(true);
  }

  function removeItem(id: string) {
    batch(() => {
      setConfig((prev) => {
        const { [id]: _, ...rest } = prev.allLinks;
        return { ...prev, allLinks: rest };
      });
      setEditingItemIds((prev) => prev.filter((i) => i !== id));
      setSelectedItemId((prev) => prev === id ? null : prev);
      setIsDirty(true);
    });
  }

  function cloneItem(id: string): string {
    const source = config().allLinks[id];
    if (!source) return id;

    const newId = `${id}_copy_${uid.rnd()}`;
    batch(() => {
      setConfig((prev) => ({
        ...prev,
        allLinks: { ...prev.allLinks, [newId]: { ...source, tags: [...(source.tags ?? [])] } },
      }));
      setEditingItemIds((prev) => prev.includes(newId) ? prev : [...prev, newId]);
      setSelectedItemId(newId);
      setIsDirty(true);
    });
    return newId;
  }

  function renameItem(oldId: string, newId: string): boolean {
    if (newId === oldId) return true;
    const idErr = identifierError(newId);
    if (idErr) { setStatusMessage(`Invalid ID "${newId}": ${idErr}`); return false; }
    if (config().allLinks[newId]) return false;

    batch(() => {
      setConfig((prev) => {
        const { [oldId]: item, ...rest } = prev.allLinks;
        return { ...prev, allLinks: { ...rest, [newId]: item } };
      });
      setEditingItemIds((prev) => prev.map((i) => i === oldId ? newId : i));
      setSelectedItemId((prev) => prev === oldId ? newId : prev);
      setIsDirty(true);
    });
    return true;
  }

  // --- Macro CRUD ---

  function addMacro(name: string, linkItems: string) {
    const nameErr = identifierError(name);
    if (nameErr) { setStatusMessage(`Invalid macro name "${name}": ${nameErr}`); return; }
    setConfig((prev) => ({
      ...prev,
      macros: { ...(prev.macros ?? {}), [name]: { linkItems } },
    }));
    setIsDirty(true);
  }

  function updateMacro(name: string, linkItems: string) {
    setConfig((prev) => {
      const macros = prev.macros ?? {};
      if (!macros[name]) return prev;
      return { ...prev, macros: { ...macros, [name]: { ...macros[name], linkItems } } };
    });
    setIsDirty(true);
  }

  function removeMacro(name: string) {
    setConfig((prev) => {
      const macros = prev.macros ?? {};
      const { [name]: _, ...rest } = macros;
      return { ...prev, macros: rest };
    });
    setIsDirty(true);
  }

  // --- Settings ---

  function updateSettings(key: string, value: unknown) {
    setConfig((prev) => ({
      ...prev,
      settings: { ...(prev.settings ?? {}), [key]: value },
    }));
    setIsDirty(true);
  }

  // --- UI ---

  function setPanelMode(mode: 'items' | 'macros') {
    batch(() => {
      setPanelModeRaw(mode);
      setFilter('');
    });
  }

  function selectItem(id: string | null) {
    setSelectedItemId(id);
  }

  function toggleEditItem(id: string) {
    batch(() => {
      const current = editingItemIds();
      if (current.includes(id)) {
        setEditingItemIds(current.filter((i) => i !== id));
        if (selectedItemId() === id) setSelectedItemId(null);
      } else {
        setEditingItemIds([...current, id]);
        setSelectedItemId(id);
      }
    });
  }

  function closeEditItem(id: string) {
    batch(() => {
      setEditingItemIds((prev) => prev.filter((i) => i !== id));
      if (selectedItemId() === id) setSelectedItemId(null);
    });
  }

  function toggleEditMacro(name: string) {
    setEditingMacroNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  function closeEditMacro(name: string) {
    setEditingMacroNames((prev) => prev.filter((n) => n !== name));
  }

  return {
    // Reactive getters (called as functions in templates)
    get config() { return config(); },
    get configName() { return configName(); },
    get configNames() { return configNames(); },
    get isDirty() { return isDirty(); },
    get panelMode() { return panelMode(); },
    get editingItemIds() { return editingItemIds(); },
    get editingMacroNames() { return editingMacroNames(); },
    get selectedItemId() { return selectedItemId(); },
    get filter() { return filter(); },
    get testQuery() { return testQuery(); },
    get storageMode() { return storageMode(); },
    get apiUrl() { return apiUrl(); },
    get statusMessage() { return statusMessage(); },
    get fileHandle() { return fileHandle(); },
    get store() { return store(); },

    // Setters
    setStore,
    setStorageMode: setStorageModeWithPref,
    setApiUrl: setApiUrlWithPref,
    setStatus: setStatusMessage,
    setFileHandle,
    setFilter,
    setTestQuery,

    // Config management
    loadConfigList,
    loadConfig,
    saveConfig,
    deleteConfig,
    newConfig,
    replaceConfig,

    // Item CRUD
    addItem,
    updateItem,
    removeItem,
    cloneItem,
    renameItem,

    // Macro CRUD
    addMacro,
    updateMacro,
    removeMacro,

    // Settings
    updateSettings,

    // UI
    setPanelMode,
    selectItem,
    toggleEditItem,
    closeEditItem,
    toggleEditMacro,
    closeEditMacro,
  };
}

export const editor = createRoot(createEditorStore);
