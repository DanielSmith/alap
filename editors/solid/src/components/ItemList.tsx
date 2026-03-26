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

export function ItemList() {
  const [pendingDeleteId, setPendingDeleteId] = createSignal<string | null>(null);

  const items = createMemo(() => {
    const entries = Object.entries(editor.config.allLinks);
    const f = editor.filter.toLowerCase();
    if (!f) return entries;
    return entries.filter(([id, item]) =>
      id.toLowerCase().includes(f) ||
      (item.label ?? '').toLowerCase().includes(f) ||
      (item.tags ?? []).some((t) => t.toLowerCase().includes(f))
    );
  });

  function handleDelete(e: MouseEvent, id: string) {
    e.stopPropagation();
    setPendingDeleteId(id);
  }

  function confirmDelete() {
    const id = pendingDeleteId();
    if (id) {
      editor.removeItem(id);
      setPendingDeleteId(null);
    }
  }

  function handleClone(e: MouseEvent, id: string) {
    e.stopPropagation();
    editor.cloneItem(id);
  }

  function handleRemoveTag(e: MouseEvent, id: string, tag: string) {
    e.stopPropagation();
    const item = editor.config.allLinks[id];
    if (!item?.tags) return;
    editor.updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
  }

  return (
    <>
      <Show when={pendingDeleteId()}>
        {(id) => (
          <ConfirmDialog
            message={`Remove item "${id()}"?`}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDeleteId(null)}
          />
        )}
      </Show>

      <div class="p-3" style={{ 'border-bottom': '1px solid var(--alap-border-subtle)' }}>
        <input
          type="text"
          value={editor.filter}
          onInput={(e) => editor.setFilter(e.currentTarget.value)}
          placeholder="Filter items..."
          class="w-full text-sm rounded-lg px-3 py-2 bg-input"
        />
      </div>

      <div class="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
        <span>
          {items().length} item{items().length !== 1 ? 's' : ''}
          <Show when={editor.filter}>
            <span class="text-muted"> matching "{editor.filter}"</span>
          </Show>
        </span>
        <button onClick={() => editor.addItem()} class="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent">
          + Add
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
        <For each={items()}>
          {([id, item]) => {
            const isEditing = () => editor.editingItemIds.includes(id);
            return (
              <div
                onClick={() => editor.toggleEditItem(id)}
                class="item-card rounded-lg px-4 py-2.5 cursor-pointer group relative"
                classList={{ editing: isEditing(), 'hover-bg-hover': !isEditing() }}
              >
                <div class="flex items-center justify-between relative">
                  <span class="text-sm font-medium truncate item-name">{id}</span>
                  <div class="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
                    <button onClick={(e) => handleDelete(e, id)} class="reveal-icon p-1 text-danger" title="Delete">
                      <Icon name="x" width={14} height={14} />
                    </button>
                    <button onClick={(e) => handleClone(e, id)} class="reveal-icon p-1 text-success" title="Clone">
                      <Icon name="clone" width={14} height={14} />
                    </button>
                  </div>
                </div>
                <Show when={item.label}>
                  <div class="text-xs truncate mt-0.5 text-muted">{item.label}</div>
                </Show>
                <Show when={item.tags && item.tags.length > 0}>
                  <div class="flex gap-1 mt-1.5 flex-wrap">
                    <For each={item.tags}>
                      {(tag) => (
                        <span class="tag-pill">
                          {tag}
                          <span class="tag-remove" onClick={(e) => handleRemoveTag(e, id, tag)}>
                            x
                          </span>
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
        <Show when={items().length === 0}>
          <div class="p-6 text-sm text-center rounded-lg text-dim" style={{ background: 'var(--alap-item-bg)' }}>
            <Show when={editor.filter} fallback="No items yet">
              No items match filter
            </Show>
          </div>
        </Show>
      </div>
    </>
  );
}
