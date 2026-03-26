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

import { createMemo, For, Show, type JSX } from 'solid-js';
import { AlapLink, useAlap } from 'alap/solid';
import { editor } from '../store/editor';

const INPUT_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
  'font-family': "'JetBrains Mono', monospace",
};

const PATTERN_BTN_STYLE: JSX.CSSProperties = {
  border: '1px solid var(--alap-pattern-border)',
};

export function QueryTester() {
  const { query, resolve } = useAlap();

  const ids = () => editor.testQuery ? query(editor.testQuery) : [];
  const links = () => editor.testQuery ? resolve(editor.testQuery) : [];

  return (
    <div class="flex flex-col gap-5 fade-in">
      <div>
        <h2 class="text-sm font-semibold mb-2 text-accent">Query Tester</h2>
        <input
          type="text"
          value={editor.testQuery}
          onInput={(e) => editor.setTestQuery(e.currentTarget.value)}
          placeholder=".coffee + .nyc  or  /patternKey/"
          class="w-full rounded-md px-3 py-1.5 text-sm"
          style={INPUT_STYLE}
        />
      </div>

      <Show when={editor.testQuery}>
        <div>
          <p class="text-xs mb-1.5 text-dim">Click to test menu:</p>
          <AlapLink query={editor.testQuery} menuClassName="alapelem">
            <span class="cursor-pointer text-sm underline text-accent">{editor.testQuery}</span>
          </AlapLink>
        </div>
      </Show>

      <div>
        <p class="text-xs mb-1.5 text-dim">{ids().length} result{ids().length !== 1 ? 's' : ''}</p>
        <Show
          when={ids().length > 0}
          fallback={
            <Show when={editor.testQuery}>
              <p class="text-xs text-dim">No matches</p>
            </Show>
          }
        >
          <ul class="text-xs space-y-1.5">
            <For each={links()}>
              {(link) => (
                <li class="flex items-center gap-2">
                  <code class="text-xs font-mono text-accent-soft">{link.id}</code>
                  <span class="text-dim">--</span>
                  <span class="truncate text-muted">{link.label ?? link.url}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      <div>
        <h3 class="text-xs font-medium mb-1.5 text-dim">Tags</h3>
        <TagCloud />
      </div>

      <PatternCloud />
    </div>
  );
}

function TagCloud() {
  const sorted = createMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const item of Object.values(editor.config.allLinks)) {
      for (const tag of item.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    return [...tagCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  });

  return (
    <Show when={sorted().length > 0} fallback={<p class="text-xs text-dim">No tags yet</p>}>
      <div class="flex flex-wrap gap-1.5">
        <For each={sorted()}>
          {([tag, count]) => (
            <button onClick={() => editor.setTestQuery(`.${tag}`)} class="tag-pill cursor-pointer">
              .{tag} <span class="text-dim ml-0.5">{count}</span>
            </button>
          )}
        </For>
      </div>
    </Show>
  );
}

function PatternCloud() {
  const patterns = () => editor.config.searchPatterns;
  const keys = createMemo(() => {
    const p = patterns();
    if (!p || Object.keys(p).length === 0) return [];
    return Object.keys(p).sort();
  });

  return (
    <Show when={keys().length > 0}>
      <div>
        <h3 class="text-xs font-medium mb-1.5 text-dim">Search Patterns</h3>
        <div class="flex flex-wrap gap-1.5">
          <For each={keys()}>
            {(key) => {
              const entry = patterns()![key];
              const pattern = typeof entry === 'string' ? entry : entry.pattern;
              return (
                <button
                  onClick={() => editor.setTestQuery(`/${key}/`)}
                  class="text-xs px-2 py-0.5 rounded-full cursor-pointer hover-bg-pattern"
                  style={PATTERN_BTN_STYLE}
                  title={`/${pattern}/`}
                >
                  /{key}/
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
}
