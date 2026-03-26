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

import { createSignal, createEffect, createMemo, Show, For, onMount, onCleanup, type JSX } from 'solid-js';
import { editor } from '../store/editor';

const CARD_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-mid)',
};

const CANCEL_BTN_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-cancel-bg)',
  color: 'var(--alap-cancel-text)',
};

const FIELD_BASE_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
};

const FIELD_MONO_STYLE: JSX.CSSProperties = {
  ...FIELD_BASE_STYLE,
  'font-family': "'JetBrains Mono', monospace",
};

const LIGHTBOX_OVERLAY: JSX.CSSProperties = { background: 'var(--alap-overlay-bg)' };

export function EditPanel() {
  return (
    <Show
      when={editor.editingItemIds.length > 0}
      fallback={
        <div class="flex items-center justify-center h-full">
          <div class="text-center max-w-md">
            <p class="text-lg mb-2 text-muted">Select an item to edit</p>
            <p class="text-sm text-dim">Click an item in the list, or drag a link from your browser onto this window.</p>
          </div>
        </div>
      }
    >
      <div class="max-w-2xl mx-auto flex flex-col gap-4">
        <For each={editor.editingItemIds}>
          {(itemId) => <EditItemForm itemId={itemId} />}
        </For>
      </div>
    </Show>
  );
}

function EditItemForm(props: { itemId: string }) {
  const [expanded, setExpanded] = createSignal(true);
  const [localId, setLocalId] = createSignal('');
  const [label, setLabel] = createSignal('');
  const [url, setUrl] = createSignal('');
  const [tags, setTags] = createSignal('');
  const [cssClass, setCssClass] = createSignal('');
  const [targetWindow, setTargetWindow] = createSignal('');
  const [image, setImage] = createSignal('');
  const [altText, setAltText] = createSignal('');
  const [thumbnail, setThumbnail] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [isNew, setIsNew] = createSignal(false);
  const [isDirty, setIsDirty] = createSignal(false);
  const [saveLabel, setSaveLabel] = createSignal('');
  const [lightboxSrc, setLightboxSrc] = createSignal<string | null>(null);

  const item = () => editor.config.allLinks[props.itemId];

  createEffect(() => {
    const current = item();
    if (current) {
      setLocalId(props.itemId);
      setLabel(current.label ?? '');
      setUrl(current.url ?? '');
      setTags((current.tags ?? []).join(', '));
      setCssClass(current.cssClass ?? '');
      setTargetWindow(current.targetWindow ?? '');
      setImage(current.image ?? '');
      setAltText(current.altText ?? '');
      setThumbnail(current.thumbnail ?? '');
      setDescription(current.description ?? '');
      const fresh = !current.url && !current.label && !(current.tags?.length);
      setIsNew(fresh);
      setIsDirty(fresh);
      setSaveLabel(fresh ? 'Save Item' : 'Update Item');
    }
  });

  function handleChange(setter: (v: string) => void, value: string) {
    setter(value);
    setIsDirty(true);
  }

  const saveBtnStyle = (): JSX.CSSProperties => ({
    background: isDirty() ? 'var(--alap-accent)' : 'var(--alap-border-subtle)',
    color: isDirty() ? 'var(--alap-deep)' : 'var(--alap-text-dim)',
    cursor: isDirty() ? 'pointer' : 'default',
  });

  function handleSave() {
    if (!isDirty()) return;
    setSaveLabel('Saving...');

    if (localId() !== props.itemId) {
      const success = editor.renameItem(props.itemId, localId());
      if (!success) {
        editor.setStatus(`ID "${localId()}" already exists`);
        setLocalId(props.itemId);
        setSaveLabel(isNew() ? 'Save Item' : 'Update Item');
        return;
      }
    }

    const parsedTags = tags().split(',').map((t) => t.trim()).filter(Boolean);

    editor.updateItem(localId(), {
      label: label() || undefined,
      url: url(),
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      cssClass: cssClass() || undefined,
      targetWindow: targetWindow() || undefined,
      image: image() || undefined,
      altText: altText() || undefined,
      thumbnail: thumbnail() || undefined,
      description: description() || undefined,
    });

    setSaveLabel('Saved');
    setIsNew(false);
    setIsDirty(false);
    editor.setStatus(`${isNew() ? 'Saved' : 'Updated'} "${localId()}"`);
    setTimeout(() => setSaveLabel('Update Item'), 1500);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  }

  const summaryLabel = () =>
    expanded() ? props.itemId : `${props.itemId}${label() ? ` — ${label()}` : ''}`;

  return (
    <Show when={item()}>
      <div class="rounded-xl fade-in edit-card" style={CARD_STYLE}>
        {/* Header -- click to toggle */}
        <div
          class="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
          onClick={() => setExpanded(!expanded())}
        >
          <h2 class="text-sm font-semibold text-accent flex-shrink-0">Edit Item</h2>
          <span class="text-xs font-mono text-dim truncate ml-3">{summaryLabel()}</span>
        </div>

        <Show when={expanded()}>
          <div class="px-6 pb-6">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <Field label="Item ID" value={localId()} onInput={(v) => handleChange(setLocalId, v)} onKeyDown={handleKeyDown} mono />
              <Field label="Label" value={label()} onInput={(v) => handleChange(setLabel, v)} onKeyDown={handleKeyDown} />
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <Field label="URL" value={url()} onInput={(v) => handleChange(setUrl, v)} onKeyDown={handleKeyDown} mono />
              <Field label="Tags" value={tags()} onInput={(v) => handleChange(setTags, v)} onKeyDown={handleKeyDown} placeholder="comma-separated" mono />
            </div>

            <details class="mt-2 mb-4">
              <summary class="text-xs cursor-pointer select-none py-1 text-dim">Advanced fields</summary>
              <div class="grid grid-cols-2 gap-4 mt-3 fade-in">
                <Field label="Description" value={description()} onInput={(v) => handleChange(setDescription, v)} onKeyDown={handleKeyDown} />
                <Field label="CSS Class" value={cssClass()} onInput={(v) => handleChange(setCssClass, v)} onKeyDown={handleKeyDown} mono />
                <Field label="Target Window" value={targetWindow()} onInput={(v) => handleChange(setTargetWindow, v)} onKeyDown={handleKeyDown} placeholder="_self, _blank, fromAlap" mono />
                <Field label="Thumbnail URL" value={thumbnail()} onInput={(v) => handleChange(setThumbnail, v)} onKeyDown={handleKeyDown} mono />
                <Field label="Image URL (renders in menu)" value={image()} onInput={(v) => handleChange(setImage, v)} onKeyDown={handleKeyDown} mono />
                <Field label="Alt Text" value={altText()} onInput={(v) => handleChange(setAltText, v)} onKeyDown={handleKeyDown} />
              </div>

              {/* Image previews -- click for full size */}
              <Show when={thumbnail() || image()}>
                <div class="flex gap-3 mt-3">
                  <Show when={thumbnail()}>
                    <div>
                      <p class="text-[10px] text-dim mb-1">Thumbnail</p>
                      <img
                        src={thumbnail()}
                        alt="thumbnail preview"
                        class="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
                        style={{ border: '1px solid var(--alap-border-subtle)' }}
                        onClick={() => setLightboxSrc(thumbnail())}
                      />
                    </div>
                  </Show>
                  <Show when={image()}>
                    <div>
                      <p class="text-[10px] text-dim mb-1">Menu image</p>
                      <img
                        src={image()}
                        alt="menu image preview"
                        class="rounded-md max-h-20 max-w-32 object-cover cursor-pointer hover-opacity"
                        style={{ border: '1px solid var(--alap-border-subtle)' }}
                        onClick={() => setLightboxSrc(image())}
                      />
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={lightboxSrc()}>
                {(src) => <ImageLightbox src={src()} onClose={() => setLightboxSrc(null)} />}
              </Show>
            </details>

            <div class="flex justify-between items-center pt-4" style={{ 'border-top': '1px solid var(--alap-border-subtle)' }}>
              <button onClick={() => editor.closeEditItem(props.itemId)} class="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity" style={CANCEL_BTN_STYLE}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={!isDirty()} class="text-sm px-6 py-2 rounded-2xl font-medium shadow-lg min-w-[140px]" style={saveBtnStyle()}>
                {saveLabel()}
              </button>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}

/* --- Shared field input --- */

function Field(props: {
  label: string;
  value: string;
  onInput: (v: string) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  const inputStyle = () => props.mono ? FIELD_MONO_STYLE : FIELD_BASE_STYLE;

  return (
    <div>
      <label class="block text-xs mb-1 font-semibold text-accent">{props.label}</label>
      <input
        type="text"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        class="w-full rounded-md px-3 py-1.5 text-sm"
        style={inputStyle()}
      />
    </div>
  );
}

/* --- Image lightbox --- */

function ImageLightbox(props: { src: string; onClose: () => void }) {
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.stopImmediatePropagation(); props.onClose(); }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKey, true);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKey, true);
  });

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={LIGHTBOX_OVERLAY}
      onClick={props.onClose}
    >
      <img
        src={props.src}
        alt="Full size preview"
        class="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl fade-in object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
