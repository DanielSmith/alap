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
  import { useAlap } from 'alap/svelte';

  const { resolve, query } = useAlap();
  let expression = $state('.coffee + .sf');
</script>

<section>
  <h2>useAlap() — Programmatic Access</h2>
  <p class="section-note">
    Use the composable directly for custom rendering, search, or headless access.
  </p>
  <div class="example">
    <label>
      Expression:
      <input
        type="text"
        bind:value={expression}
        style="padding: 0.3rem 0.5rem; width: 200px; font-family: monospace"
      />
    </label>
    <p style="font-size: 0.85rem; color: #666">
      IDs: <code>{query(expression).join(', ') || '(none)'}</code>
    </p>
    {#if resolve(expression).length > 0}
      <ul style="margin: 0.5rem 0; padding-left: 1.25rem">
        {#each resolve(expression) as link (link.id)}
          <li>
            <a href={link.url} target="_blank" rel="noopener">
              {link.label ?? link.id}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <pre><code>const &#123; resolve, query &#125; = useAlap();
const ids = query('.coffee + .sf');
const links = resolve('.coffee + .sf');</code></pre>
</section>
