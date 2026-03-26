<!--
  Copyright 2026 Daniel Smith

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<script lang="ts">
  import { editor } from '../store/editor.svelte';
  import { useAlap, AlapLink } from 'alap/svelte';

  const { query, resolve } = useAlap();

  let ids = $derived(editor.testQuery ? query(editor.testQuery) : []);
  let links = $derived(editor.testQuery ? resolve(editor.testQuery) : []);

  // --- Tag cloud ---
  let tagCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const item of Object.values(editor.config.allLinks)) {
      for (const tag of item.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  });

  // --- Pattern cloud ---
  let patterns = $derived(editor.config.searchPatterns);
  let patternKeys = $derived.by(() => {
    if (!patterns || Object.keys(patterns).length === 0) return [];
    return Object.keys(patterns).sort();
  });
</script>

<div class="flex flex-col gap-5 fade-in">
  <div>
    <h2 class="text-sm font-semibold mb-2 text-accent">Query Tester</h2>
    <input
      type="text"
      value={editor.testQuery}
      oninput={(e) => editor.setTestQuery(e.currentTarget.value)}
      placeholder=".coffee + .nyc  or  /patternKey/"
      class="w-full rounded-md px-3 py-1.5 text-sm"
      style:background="var(--alap-input-bg)"
      style:border="1px solid var(--alap-input-border)"
      style:color="var(--alap-text)"
      style:font-family="'JetBrains Mono', monospace"
    />
  </div>

  {#if editor.testQuery}
    <div>
      <p class="text-xs mb-1.5 text-dim">Click to test menu:</p>
      <AlapLink query={editor.testQuery} menuClassName="alapelem">
        <span class="cursor-pointer text-sm underline text-accent">{editor.testQuery}</span>
      </AlapLink>
    </div>
  {/if}

  <div>
    <p class="text-xs mb-1.5 text-dim">{ids.length} result{ids.length !== 1 ? 's' : ''}</p>
    {#if ids.length > 0}
      <ul class="text-xs space-y-1.5">
        {#each links as link (link.id)}
          <li class="flex items-center gap-2">
            <code class="text-xs font-mono text-accent-soft">{link.id}</code>
            <span class="text-dim">—</span>
            <span class="truncate text-muted">{link.label ?? link.url}</span>
          </li>
        {/each}
      </ul>
    {:else if editor.testQuery}
      <p class="text-xs text-dim">No matches</p>
    {/if}
  </div>

  <div>
    <h3 class="text-xs font-medium mb-1.5 text-dim">Tags</h3>
    {#if tagCounts.length === 0}
      <p class="text-xs text-dim">No tags yet</p>
    {:else}
      <div class="flex flex-wrap gap-1.5">
        {#each tagCounts as [tag, count] (tag)}
          <button onclick={() => editor.setTestQuery(`.${tag}`)} class="tag-pill cursor-pointer">
            .{tag} <span class="text-dim ml-0.5">{count}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if patternKeys.length > 0}
    <div>
      <h3 class="text-xs font-medium mb-1.5 text-dim">Search Patterns</h3>
      <div class="flex flex-wrap gap-1.5">
        {#each patternKeys as key (key)}
          {@const entry = patterns[key]}
          {@const pattern = typeof entry === 'string' ? entry : entry.pattern}
          <button
            onclick={() => editor.setTestQuery(`/${key}/`)}
            class="text-xs px-2 py-0.5 rounded-full cursor-pointer hover-bg-pattern"
            style:border="1px solid var(--alap-pattern-border)"
            title={`/${pattern}/`}
          >
            /{key}/
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
