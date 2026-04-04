<!--
  Vue placement sandbox — reproduces the TTT "Browse filtered" scenario.
  Radio buttons at top switch strategy for all placements on the page.
-->

<script setup lang="ts">
import { ref, computed } from 'vue';
import { AlapProvider, AlapLink } from 'alap/vue';
import { sandboxConfig } from '../shared/config';

const strategy = ref<'flip' | 'clamp' | 'place'>('flip');
const barPosition = ref<'left' | 'right'>('left');

function p(compass: string) {
  return `${compass}, ${strategy.value}`;
}

function toggleBarPosition() {
  barPosition.value = barPosition.value === 'left' ? 'right' : 'left';
}
</script>

<template>
  <AlapProvider :config="sandboxConfig">
    <p class="back"><a href="../">&larr; All Adapters</a></p>
    <h1>Vue Adapter</h1>

    <div class="strategy-picker">
      <span class="strategy-picker__label">Strategy:</span>
      <label><input type="radio" v-model="strategy" value="flip" /> flip <span class="strategy-hint">(default — flips if it doesn't fit)</span></label>
      <label><input type="radio" v-model="strategy" value="clamp" /> clamp <span class="strategy-hint">(flip + constrain to viewport)</span></label>
      <label><input type="radio" v-model="strategy" value="place" /> place <span class="strategy-hint">(pinned, no fallback)</span></label>
      <code class="strategy-picker__example">placement="{{ p('SE') }}"</code>
    </div>

    <!-- 1. Compass rose -->
    <h2>1. Compass Rose</h2>
    <div class="scenario">
      <p class="scenario__title">All 9 placements</p>
      <div class="compass-grid">
        <div class="compass-cell"><AlapLink query=".short" :placement="p('NW')">NW</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('N')">N</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('NE')">NE</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('W')">W</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('C')">C</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('E')">E</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('SW')">SW</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('S')">S</AlapLink></div>
        <div class="compass-cell"><AlapLink query=".short" :placement="p('SE')">SE</AlapLink></div>
      </div>
    </div>

    <!-- 2. Right-edge overflow — THE TTT BUG -->
    <h2>2. Right-Edge Overflow (TTT Bug)</h2>

    <h3>2a. With placement engine</h3>
    <div class="scenario">
      <p class="scenario__title">Expression bar — trigger pushed right</p>
      <div class="edge-bar">
        <span class="edge-bar__label">Expression:</span>
        <span class="edge-bar__expr">.content_collections</span>
        <span class="edge-bar__trigger">
          <AlapLink query=".long" :placement="p('SE')">Browse filtered</AlapLink>
        </span>
      </div>
    </div>

    <div class="scenario">
      <p class="scenario__title">Expression bar — long expression, trigger further right</p>
      <div class="edge-bar">
        <span class="edge-bar__label">Expression:</span>
        <span class="edge-bar__expr">.tech, .news - .science + .content_collections</span>
        <span class="edge-bar__trigger">
          <AlapLink query=".long" :placement="p('SE')">Browse filtered</AlapLink>
        </span>
      </div>
    </div>

    <h3>2b. Without placement prop (tier 0 — CSS only)</h3>
    <p>No <code>placement</code> prop — engine doesn't run. Strategy toggle has no effect here.</p>
    <div class="scenario">
      <p class="scenario__title">CSS-only positioning, right edge</p>
      <div class="edge-bar">
        <span class="edge-bar__label">Expression:</span>
        <span class="edge-bar__expr">.tech | .news</span>
        <span class="edge-bar__trigger">
          <AlapLink query=".long">Browse filtered (no placement)</AlapLink>
        </span>
      </div>
    </div>

    <!-- 3. Wide menu stress -->
    <h2>3. Wide Menu Stress</h2>
    <div class="scenario wide-menu">
      <p class="scenario__title">min-width: 400px, right-aligned</p>
      <div class="right-push">
        <AlapLink query=".short" :placement="p('SE')">Wide menu SE</AlapLink>
      </div>
    </div>

    <!-- 4. Dynamic trigger reflow -->
    <h2>4. Dynamic Trigger Reflow</h2>
    <p>
      Simulates the TTT scenario where the expression bar wraps and pushes "Browse filtered" rightward.
      Click the button to toggle the trigger position, then open the menu.
    </p>
    <div class="scenario">
      <p class="scenario__title">
        Trigger moves from left to right edge
        <button @click="toggleBarPosition" style="margin-left: 0.5rem; padding: 0.2rem 0.5rem; cursor: pointer;">
          Toggle position ({{ barPosition }})
        </button>
      </p>
      <div :class="['dynamic-bar', barPosition === 'left' ? 'dynamic-bar--left' : 'dynamic-bar--right']">
        <AlapLink query=".long" :placement="p('SE')">Browse filtered</AlapLink>
      </div>
    </div>

    <!-- 5. Corners -->
    <h2>5. Corner Stress</h2>
    <div class="scenario">
      <p class="scenario__title">Long titles, worst-case placements</p>
      <div class="corner-grid">
        <span class="corner-tl"><AlapLink query=".long" :placement="p('NW')">NW corner</AlapLink></span>
        <span class="corner-tr"><AlapLink query=".long" :placement="p('NE')">NE corner</AlapLink></span>
        <span class="corner-bl"><AlapLink query=".long" :placement="p('SW')">SW corner</AlapLink></span>
        <span class="corner-br"><AlapLink query=".long" :placement="p('SE')">SE corner</AlapLink></span>
      </div>
    </div>

    <!-- 6. Long menu clamping -->
    <h2>6. Long Menu (14 items)</h2>
    <div class="scenario">
      <AlapLink query=".planet" :placement="p('SE')">14 planets (SE)</AlapLink>
      &nbsp;&mdash;&nbsp;
      <AlapLink query=".planet" :placement="p('N')">14 planets (N)</AlapLink>
    </div>
  </AlapProvider>
</template>
