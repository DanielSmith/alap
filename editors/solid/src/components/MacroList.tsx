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

import { createSignal, createMemo, For, Show } from 'solid-js';
import { editor } from '../store/editor';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';

const MONO_STYLE = { 'font-family': "'JetBrains Mono', monospace" } as const;

export function MacroList() {
  const [pendingDeleteName, setPendingDeleteName] = createSignal<string | null>(null);

  const macros = createMemo(() => {
    const entries = Object.entries(editor.config.macros ?? {});
    const f = editor.filter.toLowerCase();
    if (!f) return entries;
    return entries.filter(([name, macro]) =>
      name.toLowerCase().includes(f) || macro.linkItems.toLowerCase().includes(f)
    );
  });

  function handleDelete(e: MouseEvent, name: string) {
    e.stopPropagation();
    setPendingDeleteName(name);
  }

  function confirmDelete() {
    const name = pendingDeleteName();
    if (name) {
      editor.removeMacro(name);
      if (editor.editingMacroNames.includes(name)) editor.toggleEditMacro(name);
      setPendingDeleteName(null);
    }
  }

  function handleClone(e: MouseEvent, name: string) {
    e.stopPropagation();
    const macro = editor.config.macros?.[name];
    if (!macro) return;
    const newName = `${name}_copy`;
    editor.addMacro(newName, macro.linkItems);
    editor.toggleEditMacro(newName);
    editor.setStatus(`Cloned @${name} → @${newName}`);
  }

  function handleAdd() {
    const name = `macro_${Date.now().toString(36)}`;
    editor.addMacro(name, '');
    editor.toggleEditMacro(name);
    editor.setStatus(`Created @${name}`);
  }

  return (
    <>
      <Show when={pendingDeleteName()}>
        {(name) => (
          <ConfirmDialog
            message={`Remove macro "@${name()}"?`}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDeleteName(null)}
          />
        )}
      </Show>

      <div class="p-3" style={{ 'border-bottom': '1px solid var(--alap-border-subtle)' }}>
        <input
          type="text"
          value={editor.filter}
          onInput={(e) => editor.setFilter(e.currentTarget.value)}
          placeholder="Filter macros..."
          class="w-full text-sm rounded-lg px-3 py-2 bg-input"
        />
      </div>

      <div class="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
        <span>
          {macros().length} macro{macros().length !== 1 ? 's' : ''}
          <Show when={editor.filter}>
            <span class="text-muted"> matching "{editor.filter}"</span>
          </Show>
        </span>
        <button onClick={handleAdd} class="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent">
          + Add
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
        <For each={macros()}>
          {([name, macro]) => {
            const isEditing = () => editor.editingMacroNames.includes(name);
            return (
              <div
                onClick={() => editor.toggleEditMacro(name)}
                class="item-card rounded-lg px-4 py-2.5 cursor-pointer group relative"
                classList={{ editing: isEditing(), 'hover-bg-hover': !isEditing() }}
              >
                <div class="flex items-center justify-between relative">
                  <span class="text-sm font-medium truncate item-name">@{name}</span>
                  <div class="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
                    <button onClick={(e) => handleDelete(e, name)} class="reveal-icon p-1 text-danger" title="Delete">
                      <Icon name="x" width={14} height={14} />
                    </button>
                    <button onClick={(e) => handleClone(e, name)} class="reveal-icon p-1 text-success" title="Clone">
                      <Icon name="clone" width={14} height={14} />
                    </button>
                  </div>
                </div>
                <div class="text-xs truncate mt-0.5 text-muted" style={MONO_STYLE}>{macro.linkItems}</div>
              </div>
            );
          }}
        </For>
        <Show when={macros().length === 0}>
          <div class="p-6 text-sm text-center rounded-lg text-dim" style={{ background: 'var(--alap-macro-item-bg)' }}>
            No macros yet
          </div>
        </Show>
      </div>
    </>
  );
}
