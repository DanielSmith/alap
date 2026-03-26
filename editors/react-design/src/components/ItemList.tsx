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

import { useMemo, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ConfirmDialog } from './ConfirmDialog';
import CloneIcon from '../../assets/svg/clone.svg?react';
import XIcon from '../../assets/svg/x.svg?react';

export function ItemList() {
  const config = useEditorStore((s) => s.config);
  const filter = useEditorStore((s) => s.filter);
  const editingItemIds = useEditorStore((s) => s.editingItemIds);
  const toggleEditItem = useEditorStore((s) => s.toggleEditItem);
  const setFilter = useEditorStore((s) => s.setFilter);
  const addItem = useEditorStore((s) => s.addItem);
  const updateItem = useEditorStore((s) => s.updateItem);
  const removeItem = useEditorStore((s) => s.removeItem);
  const cloneItem = useEditorStore((s) => s.cloneItem);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const items = useMemo(() => {
    const entries = Object.entries(config.allLinks);
    if (!filter) return entries;
    const f = filter.toLowerCase();
    return entries.filter(([id, item]) =>
      id.toLowerCase().includes(f) ||
      (item.label ?? '').toLowerCase().includes(f) ||
      (item.tags ?? []).some(t => t.toLowerCase().includes(f))
    );
  }, [config.allLinks, filter]);

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setPendingDeleteId(id);
  }

  function confirmDelete() {
    if (pendingDeleteId) {
      removeItem(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }

  function handleClone(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    cloneItem(id);
  }

  function handleRemoveTag(e: React.MouseEvent, id: string, tag: string) {
    e.stopPropagation();
    const item = config.allLinks[id];
    if (!item?.tags) return;
    updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
  }

  return (
    <>
      {pendingDeleteId && (
        <ConfirmDialog
          message={`Remove item "${pendingDeleteId}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      <div className="p-3" style={{ borderBottom: '1px solid var(--alap-border-subtle)' }}>
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter items..." className="w-full text-sm rounded-lg px-3 py-2 bg-input" />
      </div>

      <div className="px-4 py-1.5 text-xs flex justify-between items-center text-dim">
        <span>
          {items.length} item{items.length !== 1 ? 's' : ''}
          {filter && <span className="text-muted"> matching "{filter}"</span>}
        </span>
        <button onClick={() => addItem()} className="text-xs hover-bg-hover rounded px-1.5 py-0.5 text-accent">+ Add</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2 scroll-fade">
        {items.map(([id, item]) => {
          const isEditing = editingItemIds.includes(id);
          return (
            <div key={id} onClick={() => toggleEditItem(id)}
              className={`item-card rounded-lg px-4 py-2.5 cursor-pointer group relative ${isEditing ? 'editing' : 'hover-bg-hover'}`}>
              <div className="flex items-center justify-between relative">
                <span className="text-sm font-medium truncate item-name">{id}</span>
                <div className="absolute right-0 top-0 flex gap-1.5 items-center item-actions">
                  <button onClick={(e) => handleDelete(e, id)} className="reveal-icon p-1 text-danger" title="Delete">
                    <XIcon width={14} height={14} />
                  </button>
                  <button onClick={(e) => handleClone(e, id)} className="reveal-icon p-1 text-success" title="Clone">
                    <CloneIcon width={14} height={14} />
                  </button>
                </div>
              </div>
              {item.label && <div className="text-xs truncate mt-0.5 text-muted">{item.label}</div>}
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {item.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                      <span className="tag-remove" onClick={(e) => handleRemoveTag(e, id, tag)}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="p-6 text-sm text-center rounded-lg text-dim" style={{ background: 'var(--alap-item-bg)' }}>
            {filter ? 'No items match filter' : 'No items yet'}
          </div>
        )}
      </div>
    </>
  );
}
