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

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '../store/editor';
import { AlapLink, useAlap } from 'alap/vue';

const editorStore = useEditorStore();
const { testQuery, config } = storeToRefs(editorStore);
const { query, resolve } = useAlap();

const ids = computed(() => testQuery.value ? query(testQuery.value) : []);
const links = computed(() => testQuery.value ? resolve(testQuery.value) : []);

const monoInputStyle = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
  fontFamily: "'JetBrains Mono', monospace",
};

// --- Tag cloud ---
const sortedTags = computed(() => {
  const tagCounts = new Map<string, number>();
  for (const item of Object.values(config.value.allLinks)) {
    for (const tag of item.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return [...tagCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
});

// --- Pattern cloud ---
const patternKeys = computed(() => {
  const patterns = config.value.searchPatterns;
  if (!patterns || Object.keys(patterns).length === 0) return null;
  return Object.keys(patterns).sort();
});

function getPatternTitle(key: string): string {
  const entry = config.value.searchPatterns?.[key];
  if (!entry) return '';
  const pattern = typeof entry === 'string' ? entry : entry.pattern;
  return `/${pattern}/`;
}
</script>

<template>
  <div class="flex flex-col gap-5 fade-in">
    <div>
      <h2 class="text-sm font-semibold mb-2 text-accent">Query Tester</h2>
      <input type="text" :value="testQuery"
        placeholder=".coffee + .nyc  or  /patternKey/"
        class="w-full rounded-md px-3 py-1.5 text-sm" :style="monoInputStyle"
        @input="editorStore.setTestQuery(($event.target as HTMLInputElement).value)" />
    </div>

    <div v-if="testQuery">
      <p class="text-xs mb-1.5 text-dim">Click to test menu:</p>
      <AlapLink :query="testQuery" menu-class-name="alapelem">
        <span class="cursor-pointer text-sm underline text-accent">{{ testQuery }}</span>
      </AlapLink>
    </div>

    <div>
      <p class="text-xs mb-1.5 text-dim">{{ ids.length }} result{{ ids.length !== 1 ? 's' : '' }}</p>
      <ul v-if="ids.length > 0" class="text-xs space-y-1.5">
        <li v-for="link in links" :key="link.id" class="flex items-center gap-2">
          <code class="text-xs font-mono text-accent-soft">{{ link.id }}</code>
          <span class="text-dim">&mdash;</span>
          <span class="truncate text-muted">{{ link.label ?? link.url }}</span>
        </li>
      </ul>
      <p v-else-if="testQuery" class="text-xs text-dim">No matches</p>
    </div>

    <!-- Tag cloud -->
    <div>
      <h3 class="text-xs font-medium mb-1.5 text-dim">Tags</h3>
      <p v-if="sortedTags.length === 0" class="text-xs text-dim">No tags yet</p>
      <div v-else class="flex flex-wrap gap-1.5">
        <button
          v-for="[tag, count] in sortedTags"
          :key="tag"
          class="tag-pill cursor-pointer"
          @click="editorStore.setTestQuery(`.${tag}`)"
        >
          .{{ tag }} <span class="text-dim ml-0.5">{{ count }}</span>
        </button>
      </div>
    </div>

    <!-- Pattern cloud -->
    <div v-if="patternKeys">
      <h3 class="text-xs font-medium mb-1.5 text-dim">Search Patterns</h3>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="key in patternKeys"
          :key="key"
          class="text-xs px-2 py-0.5 rounded-full cursor-pointer hover-bg-pattern"
          :style="{ border: '1px solid var(--alap-pattern-border)' }"
          :title="getPatternTitle(key)"
          @click="editorStore.setTestQuery(`/${key}/`)"
        >
          /{{ key }}/
        </button>
      </div>
    </div>
  </div>
</template>
