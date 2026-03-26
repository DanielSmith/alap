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
import { ref } from 'vue';
import { useAlap } from 'alap/vue';

const { resolve, query } = useAlap();
const expression = ref('.coffee + .sf');
</script>

<template>
  <section>
    <h2>useAlap() Composable — Programmatic Access</h2>
    <p class="section-note">
      Use the composable directly for custom rendering, search, or headless access.
    </p>
    <div class="example">
      <label>
        Expression:
        <input
          v-model="expression"
          type="text"
          style="padding: 0.3rem 0.5rem; width: 200px; font-family: monospace"
        />
      </label>
      <p style="font-size: 0.85rem; color: #666">
        IDs: <code>{{ query(expression).join(', ') || '(none)' }}</code>
      </p>
      <ul v-if="resolve(expression).length > 0" style="margin: 0.5rem 0; padding-left: 1.25rem">
        <li v-for="link in resolve(expression)" :key="link.id">
          <a :href="link.url" target="_blank" rel="noopener">
            {{ link.label ?? link.id }}
          </a>
        </li>
      </ul>
    </div>
    <pre><code>const { resolve, query } = useAlap();
const ids = query('.coffee + .sf');
const links = resolve('.coffee + .sf');</code></pre>
  </section>
</template>
