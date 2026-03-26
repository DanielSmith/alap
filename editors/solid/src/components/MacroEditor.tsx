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

import { createSignal, createEffect, Show, For, type JSX } from 'solid-js';
import { editor } from '../store/editor';
import { useAlap } from 'alap/solid';

const CARD_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-macro-mid)',
};

const CANCEL_BTN_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-cancel-bg)',
  color: 'var(--alap-cancel-text)',
};

const INPUT_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
  'font-family': "'JetBrains Mono', monospace",
};

const RESOLVE_BG: JSX.CSSProperties = { background: 'var(--alap-macro-deep)' };

export function MacroEditor() {
  return (
    <Show
      when={editor.editingMacroNames.length > 0}
      fallback={
        <div class="flex items-center justify-center h-full">
          <div class="text-center max-w-md">
            <p class="text-lg mb-2 text-muted">Select a macro to edit</p>
            <p class="text-sm text-dim">Click a macro in the list, or use "+ Add" to create one.</p>
          </div>
        </div>
      }
    >
      <div class="max-w-2xl mx-auto flex flex-col gap-4">
        <For each={editor.editingMacroNames}>
          {(name) => <MacroEditForm macroName={name} />}
        </For>
      </div>
    </Show>
  );
}

function MacroEditForm(props: { macroName: string }) {
  const [expanded, setExpanded] = createSignal(true);
  const [editName, setEditName] = createSignal('');
  const [editExpr, setEditExpr] = createSignal('');
  const [isNew, setIsNew] = createSignal(false);
  const [isDirty, setIsDirty] = createSignal(false);
  const [saveLabel, setSaveLabel] = createSignal('Save Macro');

  const { resolve } = useAlap();

  const macro = () => editor.config.macros?.[props.macroName];
  const resolvedLinks = () => editExpr() ? resolve(editExpr()) : [];

  createEffect(() => {
    const m = macro();
    if (m) {
      setEditName(props.macroName);
      setEditExpr(m.linkItems);
      const freshlyCreated = !m.linkItems;
      setIsNew(freshlyCreated);
      setIsDirty(freshlyCreated);
      setSaveLabel(freshlyCreated ? 'Save Macro' : 'Update Macro');
    }
  });

  const saveBtnStyle = (): JSX.CSSProperties => ({
    background: isDirty() ? 'var(--alap-macro-accent)' : 'var(--alap-border-subtle)',
    color: isDirty() ? 'var(--alap-macro-deep)' : 'var(--alap-text-dim)',
    cursor: isDirty() ? 'pointer' : 'default',
  });

  function handleChange(setter: (v: string) => void, value: string) {
    setter(value);
    setIsDirty(true);
  }

  function handleSave() {
    if (!isDirty()) return;
    const name = editName().trim();
    const expr = editExpr().trim();
    if (!name || !expr) return;

    setSaveLabel('Saving...');

    if (name !== props.macroName) editor.removeMacro(props.macroName);
    editor.addMacro(name, expr);

    setSaveLabel('Saved');
    setIsNew(false);
    setIsDirty(false);
    editor.setStatus(`${isNew() ? 'Saved' : 'Updated'} macro @${name}`);
    setTimeout(() => setSaveLabel('Update Macro'), 1500);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  }

  const summaryLabel = () =>
    expanded() ? `@${props.macroName}` : `@${props.macroName}${editExpr() ? ` — ${editExpr()}` : ''}`;

  return (
    <Show when={macro()}>
      <div class="rounded-xl fade-in edit-card" style={CARD_STYLE}>
        {/* Header -- click to toggle */}
        <div
          class="flex items-center justify-between px-6 py-4 cursor-pointer select-none hover-bg-hover rounded-t-xl"
          onClick={() => setExpanded(!expanded())}
        >
          <h2 class="text-sm font-semibold text-macro-accent flex-shrink-0">Edit Macro</h2>
          <span class="text-xs font-mono text-dim truncate ml-3">{summaryLabel()}</span>
        </div>

        <Show when={expanded()}>
          <div class="px-6 pb-6">
            <div class="space-y-4 mb-4">
              <div>
                <label class="block text-xs mb-1 font-semibold text-accent">Name</label>
                <input
                  type="text"
                  value={editName()}
                  onInput={(e) => handleChange(setEditName, e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  class="w-full rounded-md px-3 py-1.5 text-sm"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label class="block text-xs mb-1 font-semibold text-accent">Expression</label>
                <input
                  type="text"
                  value={editExpr()}
                  onInput={(e) => handleChange(setEditExpr, e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  class="w-full rounded-md px-3 py-1.5 text-sm"
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            <div class="mb-4 p-3 rounded-lg" style={RESOLVE_BG}>
              <p class="text-xs mb-2 text-dim">
                Resolves to {resolvedLinks().length} item{resolvedLinks().length !== 1 ? 's' : ''}
              </p>
              <Show
                when={resolvedLinks().length > 0}
                fallback={
                  <Show when={editExpr()}>
                    <p class="text-xs text-dim">No matches</p>
                  </Show>
                }
              >
                <div class="flex flex-wrap gap-1.5">
                  <For each={resolvedLinks()}>
                    {(link) => (
                      <span class="tag-pill">
                        {link.id}
                        <Show when={link.label}>
                          <span class="ml-1 text-dim">{link.label}</span>
                        </Show>
                      </span>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div class="flex justify-between items-center pt-4" style={{ 'border-top': '1px solid var(--alap-border-subtle)' }}>
              <button onClick={() => editor.closeEditMacro(props.macroName)} class="text-sm px-6 py-2 rounded-2xl font-medium hover-opacity" style={CANCEL_BTN_STYLE}>
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
