<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { AlapProvider, AlapLink } from 'alap/vue';
import type { AlapConfig, ProtocolHandlerRegistry } from 'alap/core';

defineProps<{ config: AlapConfig; handlers: ProtocolHandlerRegistry }>();

const compassDirs = ['NW','N','NE','W','C','E','SW','S','SE'] as const;
type Direction = typeof compassDirs[number];

const dir = ref<Direction | null>(null);
const placement = computed(() => dir.value ?? 'SE');
function toggleDir(next: Direction) {
  dir.value = dir.value === next ? null : next;
}

// Drive embedded web components (<alap-lens>, <alap-lightbox>) to match the
// lens-wc compass-rose pattern — framework state reaches non-framework elements
// via setAttribute on the DOM.
watch(dir, (current) => {
  document.querySelectorAll('alap-lens, alap-lightbox').forEach((el) => {
    if (current) el.setAttribute('placement', current);
    else el.removeAttribute('placement');
  });
});
</script>

<template>
  <AlapProvider :config="config" :handlers="handlers">
    <h1>Vue Adapter &mdash; Advanced Protocols</h1>
    <p class="page-intro">
      <code>&lt;AlapLink&gt;</code> from <code>alap/vue</code>, Composition
      API and <code>provide</code>/<code>inject</code>. Lens and lightbox
      are embedded web components sharing the same config registry.
      Personalized around the Vue 3 ecosystem &mdash; async queries search
      HN for <em>vue composition api</em>, static links cover vuejs.org,
      Pinia, VueUse, and VitePress.
    </p>

    <nav class="adapter-toc">
      <strong>Jump to:</strong>
      <a href="#compass">Compass</a>
      <a href="#progressive">Progressive menu</a>
      <a href="#mixed">Mixed static + async</a>
      <a href="#error">Error / empty</a>
      <a href="#lens">Lens</a>
      <a href="#lightbox">Lightbox</a>
      <a href="#dedup">In-flight dedup</a>
    </nav>

    <details id="compass" class="compass-wrap" open>
      <summary>
        Placement Compass Rose
        <span class="compass-summary-hint">(click a direction to set placement on every trigger on this page)</span>
      </summary>
      <div class="compass-body">
        <p class="note">
          Click any direction; every <code>&lt;AlapLink&gt;</code> reads
          <code>placement</code> from a shared <code>ref</code>. Click the
          active one again to clear (default <code>SE</code>).
        </p>
        <div class="compass-grid">
          <div v-for="d in compassDirs" :key="d" class="compass-cell">
            <button
              type="button"
              class="compass-btn"
              :class="{ active: dir === d }"
              @click="toggleDir(d)"
            >{{ d }}</button>
          </div>
        </div>
        <p class="compass-driver-hint">
          Quick confirm &mdash;
          <AlapLink query=".vue + .menu" :placement="placement" class="compass-static-link">Static Vue links</AlapLink>
          (no async, opens instantly at the compass direction).
        </p>
      </div>
    </details>

    <h2 id="progressive">1. Progressive Async Menu</h2>
    <section class="scenario">
      <h3>Deterministic <code>:slow:</code> mock</h3>
      <p class="note">
        The Vue adapter drives a <code>ProgressiveRenderer</code> from
        <code>onMounted</code>. Reactive refs hold items/sources/isLoadingOnly
        &mdash; the template re-renders on each settle.
      </p>
      <p><AlapLink query=":slow:2000:5:" :placement="placement">Slow menu &mdash; 5 items in 2s</AlapLink></p>
      <p><AlapLink query=":slow:500:8:" :placement="placement">Fast menu &mdash; 8 items in 500ms</AlapLink></p>
    </section>

    <section class="scenario">
      <h3>Real data: HN search for <em>vue composition api</em></h3>
      <p>
        <AlapLink query=":hn:search:$vue_composition:" :placement="placement">
          Top HN stories about the Composition API
        </AlapLink>
      </p>
    </section>

    <h2 id="mixed">2. Mixed Static + Dynamic</h2>
    <section class="scenario">
      <p class="mixed-legend">
        <span><span class="swatch static"></span>static</span>
        <span><span class="swatch mock"></span>mock (async)</span>
        <span><span class="swatch hn"></span>HN (async)</span>
      </p>
      <p>
        <AlapLink query="(.vue + .menu) | :slow:1500:3:" :placement="placement">
          Static Vue refs + 3 slow items
        </AlapLink>
      </p>
      <p>
        <AlapLink query="(.vue + .menu) | :hn:search:$vue_composition:limit=4:" :placement="placement">
          Static Vue refs + 4 HN stories
        </AlapLink>
      </p>
    </section>

    <h2 id="error">3. Error and Empty Placeholders</h2>
    <section class="scenario">
      <p><AlapLink query=":flaky:error:" :placement="placement">Forced error after 800ms</AlapLink></p>
      <p><AlapLink query=":flaky:empty:" :placement="placement">Empty result after 800ms</AlapLink></p>
      <p>
        <AlapLink query="(.vue + .menu) | :flaky:error: | :slow:1200:2:" :placement="placement">
          Static + error + slow
        </AlapLink>
      </p>
    </section>

    <h2 id="lens">4. Lens &mdash; Metadata Card</h2>
    <section class="scenario">
      <p>
        <alap-lens query="(.vue + .lens) | :slow:1500:2:">
          Vue ecosystem lens (static + slow)
        </alap-lens>
      </p>
    </section>

    <h2 id="lightbox">5. Lightbox &mdash; Fullscreen Media</h2>
    <section class="scenario">
      <p>
        <alap-lightbox query="(.vue + .image) | :slow:1800:1:">
          Vue lightbox (reactivity graph + slow)
        </alap-lightbox>
      </p>
    </section>

    <h2 id="dedup">6. In-Flight Dedup</h2>
    <section class="scenario">
      <p>
        <AlapLink query=":slow:2500:4:" :placement="placement">Trigger A &mdash; slow 4 items</AlapLink>
        &nbsp;&nbsp;
        <AlapLink query=":slow:2500:4:" :placement="placement">Trigger B &mdash; same token</AlapLink>
      </p>
    </section>
  </AlapProvider>
</template>
