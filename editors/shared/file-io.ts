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

import type { AlapConfig } from 'alap/core';
import { validateConfig } from 'alap/core';

/**
 * Whether the File System Access API (showSaveFilePicker / showOpenFilePicker)
 * is available in the current browser (Chrome/Edge/Opera — not Firefox/Safari).
 */
export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    'showOpenFilePicker' in window
  );
}

/**
 * Save config JSON to a file.
 *
 * - If `existingHandle` is provided, writes in-place (save-in-place).
 * - Otherwise tries the File System Access API (showSaveFilePicker).
 * - Falls back to `downloadAsFile` if the API is unavailable.
 *
 * Returns the FileSystemFileHandle used (or null if the fallback was used).
 */
export async function saveToFile(
  config: AlapConfig,
  name: string,
  existingHandle?: FileSystemFileHandle | null,
): Promise<FileSystemFileHandle | null> {
  const json = JSON.stringify(config, null, 2);

  // Save-in-place with existing handle
  if (existingHandle) {
    try {
      const writable = await existingHandle.createWritable();
      await writable.write(json);
      await writable.close();
      return existingHandle;
    } catch {
      // Permission revoked or handle stale — fall through to picker
    }
  }

  // File System Access API
  if (hasFileSystemAccess()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${name}.json`,
        types: [
          {
            description: 'Alap Config',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return handle;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      throw err;
    }
  }

  // Fallback
  downloadAsFile(config, name);
  return null;
}

/**
 * Open a JSON config file from disk.
 *
 * Returns the parsed config plus the handle (if the File System Access API
 * was used), or null if the user cancelled.
 */
export async function openFromFile(): Promise<{
  name: string;
  config: AlapConfig;
  handle: FileSystemFileHandle | null;
} | null> {
  if (hasFileSystemAccess()) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Alap Config',
            accept: { 'application/json': ['.json'] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const config = validateConfig(JSON.parse(text));
      const name = file.name.replace(/\.json$/i, '');
      return { name, config, handle };
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      throw err;
    }
  }

  // Fallback: hidden <input type="file">
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        const config = validateConfig(JSON.parse(text));
        const name = file.name.replace(/\.json$/i, '');
        resolve({ name, config, handle: null });
      } catch { resolve(null); }
      finally { input.remove(); }
    });

    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Download config as a JSON file via an `<a download>` element.
 * Works in all browsers.
 */
export function downloadAsFile(config: AlapConfig, name: string): void {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}
