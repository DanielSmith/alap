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

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

const CARD_STYLE: CSSProperties = {
  background: 'var(--alap-mid)',
};

const CANCEL_BTN_STYLE: CSSProperties = {
  background: 'var(--alap-cancel-bg)',
  color: 'var(--alap-cancel-text)',
};

export function EditPanel() {
  const editingItemIds = useEditorStore((s) => s.editingItemIds);

  if (editingItemIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <p className="text-lg mb-2 text-muted">Select an item to edit</p>
          <p className="text-sm text-dim">Click an item in the list, or drag a link from your browser onto this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      {editingItemIds.map((itemId) => (
        <EditItemForm key={itemId} itemId={itemId} />
      ))}
    </div>
  );
}

function EditItemForm({ itemId }: { itemId: string }) {
  const config = useEditorStore((s) => s.config);
  const updateItem = useEditorStore((s) => s.updateItem);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const renameItem = useEditorStore((s) => s.renameItem);
  const closeEditItem = useEditorStore((s) => s.closeEditItem);
  const setStatus = useEditorStore((s) => s.setStatus);

  const item = config.allLinks[itemId];

  const [expanded, setExpanded] = useState(true);
  const [localId, setLocalId] = useState(itemId);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [cssClass, setCssClass] = useState('');
  const [targetWindow, setTargetWindow] = useState('');
  const [image, setImage] = useState('');
  const [altText, setAltText] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  useEffect(() => {
    if (item) {
      setLocalId(itemId);
      setLabel(item.label ?? '');
      setUrl(item.url ?? '');
      setTags((item.tags ?? []).join(', '));
      setCssClass(item.cssClass ?? '');
      setTargetWindow(item.targetWindow ?? '');
      setImage(item.image ?? '');
      setAltText(item.altText ?? '');
      setThumbnail(item.thumbnail ?? '');
      setDescription(item.description ?? '');
      const fresh = !item.url && !item.label && !(item.tags?.length);
      setIsNew(fresh);
      setIsDirty(fresh);
      setSaveLabel(fresh ? 'Save Item' : 'Update Item');
    }
  }, [itemId, item]);

  function handleChange(setter: (v: string) => void, value: string) {
    setter(value);
    setIsDirty(true);
  }

  const saveBtnStyle = useMemo<CSSProperties>(() => ({
    background: isDirty ? 'var(--alap-accent)' : 'var(--alap-border-subtle)',
    color: isDirty ? 'var(--alap-deep)' : 'var(--alap-text-dim)',
    cursor: isDirty ? 'pointer' : 'default',
  }), [isDirty]);

  if (!item) return null;

  function handleSave() {
    if (!isDirty) return;
    setSaveLabel('Saving...');

    if (localId !== itemId) {
      const success = renameItem(itemId, localId);
      if (!success) {
        setStatus(`ID "${localId}" already exists`);
        setLocalId(itemId);
        setSaveLabel(isNew ? 'Save Item' : 'Update Item');
        return;
      }
    }

    const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);

    updateItem(localId, {
      label: label || undefined,
      url,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      cssClass: cssClass || undefined,
      targetWindow: targetWindow || undefined,
      image: image || undefined,
      altText: altText || undefined,
      thumbnail: thumbnail || undefined,
      description: description || undefined,
    });

    setSaveLabel('Saved');
    setIsNew(false);
    setIsDirty(false);
    setStatus(`${isNew ? 'Saved' : 'Updated'} "${localId}"`);
    setTimeout(() => setSaveLabel('Update Item'), 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  }

  const summaryLabel = expanded ? itemId : `${itemId}${label ? ` — ${label}` : ''}`;

  return (
    <div className="rounded-xl fade-in edit-card" style={CARD_STYLE}>
      {/* Header — click to toggle */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-sm font-semibold text-accent flex-shrink-0">Edit Item</h2>
        <span className="text-xs font-mono text-dim truncate ml-3">{summaryLabel}</span>
      </div>

      {expanded && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Item ID" value={localId} onChange={(v) => handleChange(setLocalId, v)} onKeyDown={handleKeyDown} mono />
            <Field label="Label" value={label} onChange={(v) => handleChange(setLabel, v)} onKeyDown={handleKeyDown} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="URL" value={url} onChange={(v) => handleChange(setUrl, v)} onKeyDown={handleKeyDown} mono />
            <Field label="Tags" value={tags} onChange={(v) => handleChange(setTags, v)} onKeyDown={handleKeyDown} placeholder="comma-separated" mono />
          </div>

          <details className="mt-2 mb-4">
            <summary className="text-xs cursor-pointer select-none py-1 text-dim">Advanced fields</summary>
            <div className="grid grid-cols-2 gap-4 mt-3 fade-in">
              <Field label="Description" value={description} onChange={(v) => handleChange(setDescription, v)} onKeyDown={handleKeyDown} />
              <Field label="CSS Class" value={cssClass} onChange={(v) => handleChange(setCssClass, v)} onKeyDown={handleKeyDown} mono />
              <Field label="Target Window" value={targetWindow} onChange={(v) => handleChange(setTargetWindow, v)} onKeyDown={handleKeyDown} placeholder="_self, _blank, fromAlap" mono />
              <Field label="Thumbnail URL" value={thumbnail} onChange={(v) => handleChange(setThumbnail, v)} onKeyDown={handleKeyDown} mono />
              <Field label="Image URL (renders in menu)" value={image} onChange={(v) => handleChange(setImage, v)} onKeyDown={handleKeyDown} mono />
              <Field label="Alt Text" value={altText} onChange={(v) => handleChange(setAltText, v)} onKeyDown={handleKeyDown} />
            </div>

            {/* Image previews — click for full size */}
            {(thumbnail || image) && (
              <div className="flex gap-3 mt-3">
                {thumbnail && (
                  <div>
                    <p className="text-[10px] text-dim mb-1">Thumbnail</p>
                    <img src={thumbnail} alt="thumbnail preview"
                      className="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
                      style={{ border: '1px solid var(--alap-border-subtle)' }}
                      onClick={() => setLightboxSrc(thumbnail)} />
                  </div>
                )}
                {image && (
                  <div>
                    <p className="text-[10px] text-dim mb-1">Menu image</p>
                    <img src={image} alt="menu image preview"
                      className="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
                      style={{ border: '1px solid var(--alap-border-subtle)' }}
                      onClick={() => setLightboxSrc(image)} />
                  </div>
                )}
              </div>
            )}

            {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
          </details>

          <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid var(--alap-border-subtle)' }}>
            <button onClick={() => closeEditItem(itemId)} className="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity" style={CANCEL_BTN_STYLE}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!isDirty} className="text-sm px-6 py-2 rounded-2xl font-medium shadow-lg min-w-[140px]" style={saveBtnStyle}>
              {saveLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Shared field input --- */

const FIELD_BASE_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const FIELD_MONO_STYLE: CSSProperties = {
  ...FIELD_BASE_STYLE,
  fontFamily: "'JetBrains Mono', monospace",
};

function Field({ label, value, onChange, onKeyDown, placeholder, mono }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const inputStyle = mono ? FIELD_MONO_STYLE : FIELD_BASE_STYLE;

  return (
    <div>
      <label className="block text-xs mb-1 font-semibold text-accent">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md px-3 py-1.5 text-sm"
        style={inputStyle}
      />
    </div>
  );
}

/* --- Image lightbox --- */

const LIGHTBOX_OVERLAY: CSSProperties = { background: 'var(--alap-overlay-bg)' };

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
    }
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={LIGHTBOX_OVERLAY} onClick={onClose}>
      <img src={src} alt="Full size preview"
        className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl fade-in object-contain"
        onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
