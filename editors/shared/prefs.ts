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

/**
 * Editor preferences — persisted to localStorage, shared across all editors on the same origin.
 *
 * Namespace: `dev.alap.editor.prefs`
 *
 * These are editor-level user preferences (not config data).
 * Config data lives in IndexedDB / Remote via ConfigStore.
 */

const PREFS_KEY = 'dev.alap.editor.prefs';

export interface EditorPrefs {
  storageMode: string;
  apiUrl: string;
}

const DEFAULTS: EditorPrefs = {
  storageMode: 'local',
  apiUrl: 'http://localhost:3000',
};

/** Read all preferences, falling back to defaults for missing keys. */
export function loadPrefs(): EditorPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS };
    return {
      storageMode: typeof parsed.storageMode === 'string' ? parsed.storageMode : DEFAULTS.storageMode,
      apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : DEFAULTS.apiUrl,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Write all preferences. */
export function savePrefs(prefs: EditorPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Update a single preference key. */
export function savePref<K extends keyof EditorPrefs>(key: K, value: EditorPrefs[K]): void {
  const current = loadPrefs();
  current[key] = value;
  savePrefs(current);
}
