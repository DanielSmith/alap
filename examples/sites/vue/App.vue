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
import { AlapProvider, AlapLink } from 'alap/vue';
import { demoConfig } from './config';
import ComposableExample from './ComposableExample.vue';
import DynamicConfigExample from './DynamicConfigExample.vue';
</script>

<template>
  <AlapProvider :config="demoConfig">
    <h1>Alap v3 — Vue Adapter</h1>
    <p>
      All examples use <code>&lt;AlapProvider&gt;</code> +
      <code>&lt;AlapLink&gt;</code> from <code>alap/vue</code>.
    </p>

    <!-- Section 1: Basic usage -->
    <section>
      <h2>Basic Usage</h2>
      <p class="section-note">
        <code>&lt;AlapLink query="..."&gt;</code> — click to open a menu.
      </p>
      <div class="example">
        <p>
          I like the <AlapLink query="vwbug, bmwe36">VW Bug and the BMW E36</AlapLink> —
          direct item IDs.
        </p>
        <p>
          Check out some <AlapLink query=".coffee">coffee spots</AlapLink> or
          famous <AlapLink query=".bridge">bridges</AlapLink> — class queries.
        </p>
      </div>
      <pre><code>&lt;AlapLink query="vwbug, bmwe36"&gt;VW Bug and the BMW E36&lt;/AlapLink&gt;
&lt;AlapLink query=".coffee"&gt;coffee spots&lt;/AlapLink&gt;
&lt;AlapLink query=".bridge"&gt;bridges&lt;/AlapLink&gt;</code></pre>
    </section>

    <!-- Section 2: Operators -->
    <section>
      <h2>Operators</h2>
      <p class="section-note">AND, OR, WITHOUT — same expression language as vanilla.</p>
      <div class="example">
        <p>
          <AlapLink query=".nyc + .bridge">NYC bridges</AlapLink> (AND) —
          <AlapLink query=".nyc | .sf">NYC or SF</AlapLink> (OR) —
          <AlapLink query=".nyc - .bridge">NYC without bridges</AlapLink> (WITHOUT)
        </p>
        <p>
          <AlapLink query="(.nyc + .bridge) | (.sf + .bridge)">NYC or SF bridges</AlapLink>
          — parentheses for grouping.
        </p>
      </div>
      <pre><code>&lt;AlapLink query=".nyc + .bridge"&gt;NYC bridges&lt;/AlapLink&gt;
&lt;AlapLink query=".nyc | .sf"&gt;NYC or SF&lt;/AlapLink&gt;
&lt;AlapLink query="(.nyc + .bridge) | (.sf + .bridge)"&gt;grouped&lt;/AlapLink&gt;</code></pre>
    </section>

    <!-- Section 3: Macros -->
    <section>
      <h2>Macros</h2>
      <p class="section-note">
        <code>@name</code> expands from config macros. <code>@</code> alone uses <code>anchorId</code>.
      </p>
      <div class="example">
        <p>
          My favorite <AlapLink query="@cars">cars (macro)</AlapLink> —
          <AlapLink query="@nycbridges">NYC bridges (macro)</AlapLink>.
        </p>
      </div>
      <pre><code>&lt;AlapLink query="@cars"&gt;cars (macro)&lt;/AlapLink&gt;
&lt;AlapLink query="@nycbridges"&gt;NYC bridges (macro)&lt;/AlapLink&gt;</code></pre>
    </section>

    <!-- Section 4: menuClassName for theming -->
    <section>
      <h2>Menu Theming (CSS Classes)</h2>
      <p class="section-note">
        Use <code>menu-class-name</code> to apply different themes per link.
      </p>
      <div class="example">
        <p>
          <AlapLink query=".nyc" menu-class-name="dark-menu">NYC (dark theme)</AlapLink> —
          <AlapLink query=".coffee" menu-class-name="warm-menu">coffee (warm theme)</AlapLink> —
          <AlapLink query=".car">cars (default theme)</AlapLink>
        </p>
      </div>
      <pre><code>&lt;AlapLink query=".nyc" menu-class-name="dark-menu"&gt;NYC&lt;/AlapLink&gt;
&lt;AlapLink query=".coffee" menu-class-name="warm-menu"&gt;coffee&lt;/AlapLink&gt;
&lt;AlapLink query=".car"&gt;cars (default)&lt;/AlapLink&gt;</code></pre>
    </section>

    <!-- Section 5: menuStyle for inline overrides -->
    <section>
      <h2>Inline Style Overrides</h2>
      <p class="section-note">
        <code>:menu-style</code> prop for one-off inline styles. Merges with provider defaults.
      </p>
      <div class="example">
        <p>
          <AlapLink
            query=".sf"
            :menu-style="{ borderRadius: '12px', border: '2px solid #10b981' }"
          >
            SF spots (rounded green border)
          </AlapLink>
          —
          <AlapLink
            query=".bridge"
            :menu-style="{ maxWidth: '160px', fontSize: '0.8rem' }"
          >
            bridges (compact)
          </AlapLink>
        </p>
      </div>
      <pre><code>&lt;AlapLink
  query=".sf"
  :menu-style="{ borderRadius: '12px', border: '2px solid #10b981' }"
&gt;
  SF spots
&lt;/AlapLink&gt;</code></pre>
    </section>

    <!-- Section 6: useAlap composable -->
    <ComposableExample />

    <!-- Section 7: List type -->
    <section>
      <h2>List Type</h2>
      <p class="section-note">
        Override the list element — <code>list-type="ol"</code> renders an ordered list.
      </p>
      <div class="example">
        <p>
          <AlapLink query=".car" list-type="ol">cars (ordered)</AlapLink>
          vs
          <AlapLink query=".car">cars (unordered, default)</AlapLink>
        </p>
      </div>
    </section>
  </AlapProvider>

  <!-- Dynamic config needs its own provider to demo config swapping -->
  <DynamicConfigExample />
</template>
