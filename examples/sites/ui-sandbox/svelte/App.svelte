<!--
  Svelte placement sandbox — radio buttons switch strategy for all placements.
-->

<script lang="ts">
  import { AlapProvider, AlapLink } from 'alap/svelte';
  import { sandboxConfig } from '../shared/config';

  let strategy = $state<'flip' | 'clamp' | 'place'>('flip');
  let barPosition = $state<'left' | 'right'>('left');

  function p(compass: string) {
    return `${compass}, ${strategy}`;
  }

  function toggleBarPosition() {
    barPosition = barPosition === 'left' ? 'right' : 'left';
  }
</script>

<AlapProvider config={sandboxConfig}>
  <p class="back"><a href="../">&larr; All Adapters</a></p>
  <h1>Svelte Adapter</h1>

  <div class="strategy-picker">
    <span class="strategy-picker__label">Strategy:</span>
    <label><input type="radio" bind:group={strategy} value="flip" /> flip <span class="strategy-hint">(default — flips if it doesn't fit)</span></label>
    <label><input type="radio" bind:group={strategy} value="clamp" /> clamp <span class="strategy-hint">(flip + constrain to viewport)</span></label>
    <label><input type="radio" bind:group={strategy} value="place" /> place <span class="strategy-hint">(pinned, no fallback)</span></label>
    <code class="strategy-picker__example">placement="{p('SE')}"</code>
  </div>

  <h2>1. Compass Rose</h2>
  <div class="scenario">
    <p class="scenario__title">All 9 placements</p>
    <div class="compass-grid">
      <div class="compass-cell"><AlapLink query=".short" placement={p('NW')}>NW</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('N')}>N</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('NE')}>NE</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('W')}>W</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('C')}>C</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('E')}>E</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('SW')}>SW</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('S')}>S</AlapLink></div>
      <div class="compass-cell"><AlapLink query=".short" placement={p('SE')}>SE</AlapLink></div>
    </div>
  </div>

  <h2>2. Right-Edge Overflow (TTT Bug)</h2>

  <h3>2a. With placement engine</h3>
  <div class="scenario">
    <p class="scenario__title">Expression bar — trigger pushed right</p>
    <div class="edge-bar">
      <span class="edge-bar__label">Expression:</span>
      <span class="edge-bar__expr">.content_collections</span>
      <span class="edge-bar__trigger">
        <AlapLink query=".long" placement={p('SE')}>Browse filtered</AlapLink>
      </span>
    </div>
  </div>

  <h3>2b. No placement prop (tier 0 — CSS only)</h3>
  <div class="scenario">
    <p class="scenario__title">CSS-only positioning — strategy toggle has no effect</p>
    <div class="edge-bar">
      <span class="edge-bar__label">Expression:</span>
      <span class="edge-bar__expr">.tech | .news</span>
      <span class="edge-bar__trigger">
        <AlapLink query=".long">Browse filtered (no placement)</AlapLink>
      </span>
    </div>
  </div>

  <h2>3. Wide Menu Stress</h2>
  <div class="scenario wide-menu">
    <p class="scenario__title">min-width: 400px, right-aligned</p>
    <div class="right-push">
      <AlapLink query=".short" placement={p('SE')}>Wide menu SE</AlapLink>
    </div>
  </div>

  <h2>4. Dynamic Trigger Reflow</h2>
  <div class="scenario">
    <p class="scenario__title">
      Trigger moves from left to right edge
      <button onclick={toggleBarPosition} style="margin-left: 0.5rem; padding: 0.2rem 0.5rem; cursor: pointer;">
        Toggle position ({barPosition})
      </button>
    </p>
    <div class={`dynamic-bar ${barPosition === 'left' ? 'dynamic-bar--left' : 'dynamic-bar--right'}`}>
      <AlapLink query=".long" placement={p('SE')}>Browse filtered</AlapLink>
    </div>
  </div>

  <h2>5. Corner Stress</h2>
  <div class="scenario">
    <p class="scenario__title">Long titles, worst-case placements</p>
    <div class="corner-grid">
      <span class="corner-tl"><AlapLink query=".long" placement={p('NW')}>NW corner</AlapLink></span>
      <span class="corner-tr"><AlapLink query=".long" placement={p('NE')}>NE corner</AlapLink></span>
      <span class="corner-bl"><AlapLink query=".long" placement={p('SW')}>SW corner</AlapLink></span>
      <span class="corner-br"><AlapLink query=".long" placement={p('SE')}>SE corner</AlapLink></span>
    </div>
  </div>

  <h2>6. Long Menu (14 items)</h2>
  <div class="scenario">
    <AlapLink query=".planet" placement={p('SE')}>14 planets (SE)</AlapLink>
    &nbsp;&mdash;&nbsp;
    <AlapLink query=".planet" placement={p('N')}>14 planets (N)</AlapLink>
  </div>
</AlapProvider>
