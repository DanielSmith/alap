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
import { AlapProvider, AlapLink } from 'alap/vue';
import { demoConfig } from './config';
import type { AlapConfig } from 'alap/core';

const config = ref<AlapConfig>({ ...demoConfig });
const added = ref(false);

function addLink() {
  config.value = {
    ...config.value,
    allLinks: {
      ...config.value.allLinks,
      peets: {
        label: "Peet's Coffee",
        url: 'https://peets.com',
        tags: ['coffee', 'sf'],
      },
    },
  };
  added.value = true;
}
</script>

<template>
  <AlapProvider :config="config">
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
            :disabled="added"
            style="padding: 0.3rem 0.75rem"
            @click="addLink"
          >
            {{ added ? "Peet's added!" : "Add Peet's Coffee" }}
          </button>
        </p>
        <p style="font-size: 0.85rem; color: #666">
          Click the button, then click "SF coffee" to see the new item.
        </p>
      </div>
      <pre><code>const config = ref(demoConfig);

const addLink = () => {
  config.value = {
    ...config.value,
    allLinks: {
      ...config.value.allLinks,
      peets: { label: "Peet's Coffee", url: '...', tags: ['coffee', 'sf'] },
    },
  };
};

&lt;AlapProvider :config="config"&gt;
  &lt;AlapLink query=".coffee + .sf"&gt;SF coffee&lt;/AlapLink&gt;
&lt;/AlapProvider&gt;</code></pre>
    </section>
  </AlapProvider>
</template>
