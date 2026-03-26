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

import { createSignal, createMemo, For, Show, type JSX } from 'solid-js';
import { editor } from '../store/editor';

type LoadMode = 'replace' | 'merge';

const OVERLAY_STYLE: JSX.CSSProperties = { background: 'var(--alap-overlay-bg)' };
const DIALOG_STYLE: JSX.CSSProperties = { background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' };
const TOGGLE_BORDER: JSX.CSSProperties = { border: '1px solid var(--alap-border-subtle)' };
const TOGGLE_ACTIVE: JSX.CSSProperties = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const TOGGLE_INACTIVE: JSX.CSSProperties = { background: 'transparent', color: 'var(--alap-text-dim)' };

interface LoadPanelProps {
  onClose: () => void;
}

export function LoadPanel(props: LoadPanelProps) {
  const [loadMode, setLoadMode] = createSignal<LoadMode>('replace');
  const [filter, setFilter] = createSignal('');

  function handleLoad(name: string) {
    editor.loadConfig(name);
    if (loadMode() === 'merge') {
      editor.setStatus(`Loaded "${name}" (merge coming soon — replaced for now)`);
    }
    props.onClose();
  }

  const filtered = createMemo(() =>
    editor.configNames.filter((n) =>
      !filter() || n.toLowerCase().includes(filter().toLowerCase())
    )
  );

  const actionLabel = () => loadMode() === 'merge' ? 'merge into current' : 'load';

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center" style={OVERLAY_STYLE} onClick={props.onClose}>
      <div
        class="rounded-xl p-6 w-[480px] max-h-[70vh] flex flex-col shadow-2xl fade-in"
        style={DIALOG_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-accent">Load Config</h2>
          <div class="flex items-center gap-3">
            <div class="flex rounded-md overflow-hidden text-[10px]" style={TOGGLE_BORDER}>
              <button
                onClick={() => setLoadMode('replace')}
                class="px-2.5 py-1"
                style={loadMode() === 'replace' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
              >
                Replace
              </button>
              <button
                onClick={() => setLoadMode('merge')}
                class="px-2.5 py-1"
                style={loadMode() === 'merge' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
              >
                Merge
              </button>
            </div>
            <button onClick={props.onClose} class="toolbar-btn text-xs">Close</button>
          </div>
        </div>

        <input
          type="text"
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
          placeholder="Search configs..."
          class="w-full text-sm rounded-lg px-3 py-2 mb-4 bg-input"
          autofocus
        />

        <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">
          <Show
            when={filtered().length > 0}
            fallback={
              <p class="text-sm text-center py-6 text-dim">
                <Show when={filter()} fallback="No saved configs">
                  No configs match filter
                </Show>
              </p>
            }
          >
            <For each={filtered()}>
              {(name) => {
                const isCurrent = () => name === editor.configName;
                return (
                  <button
                    onClick={() => { if (!isCurrent()) handleLoad(name); }}
                    class="w-full text-left text-sm flex items-center justify-between item-card rounded-lg px-4 py-3"
                    classList={{
                      editing: isCurrent(),
                      'hover-bg-hover': !isCurrent(),
                      'cursor-pointer': !isCurrent(),
                    }}
                    disabled={isCurrent()}
                  >
                    <span classList={{ 'text-accent': isCurrent() }}>{name}</span>
                    <span class="text-[10px] text-dim">
                      <Show when={isCurrent()} fallback={actionLabel()}>
                        current
                      </Show>
                    </span>
                  </button>
                );
              }}
            </For>
          </Show>
        </div>
      </div>
    </div>
  );
}
