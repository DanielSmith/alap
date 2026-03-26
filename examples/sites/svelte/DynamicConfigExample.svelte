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
  import { AlapProvider, AlapLink } from 'alap/svelte';
  import { demoConfig } from './config';
  import type { AlapConfig } from 'alap/core';

  let config = $state<AlapConfig>({ ...demoConfig });
  let added = $state(false);

  function addLink() {
    config = {
      ...config,
      allLinks: {
        ...config.allLinks,
        peets: {
          label: "Peet's Coffee",
          url: 'https://peets.com',
          tags: ['coffee', 'sf'],
        },
      },
    };
    added = true;
  }
</script>

<AlapProvider {config}>
  <section>
    <h2>Dynamic Config Updates</h2>
    <p class="section-note">
      Config is reactive — update it and menus reflect the changes.
    </p>
    <div class="example">
      <p>
        <AlapLink query=".coffee + .sf">SF coffee</AlapLink>
        —
        <button
          disabled={added}
          style="padding: 0.3rem 0.75rem"
          onclick={addLink}
        >
          {added ? "Peet's added!" : "Add Peet's Coffee"}
        </button>
      </p>
      <p style="font-size: 0.85rem; color: #666">
        Click the button, then click "SF coffee" to see the new item.
      </p>
    </div>
    <pre><code>let config = $state(demoConfig);

function addLink() &#123;
  config = &#123;
    ...config,
    allLinks: &#123;
      ...config.allLinks,
      peets: &#123; label: "Peet's Coffee", url: '...', tags: ['coffee', 'sf'] &#125;,
    &#125;,
  &#125;;
&#125;

&lt;AlapProvider &#123;config&#125;&gt;
  &lt;AlapLink query=".coffee + .sf"&gt;SF coffee&lt;/AlapLink&gt;
&lt;/AlapProvider&gt;</code></pre>
  </section>
</AlapProvider>
