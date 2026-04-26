/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { For, createSignal, createEffect } from 'solid-js';
import { AlapProvider, AlapLink } from 'alap/solid';
import type { AlapConfig, ProtocolHandlerRegistry } from 'alap/core';

const compassDirs = ['NW','N','NE','W','C','E','SW','S','SE'] as const;
type Direction = typeof compassDirs[number];

export default function App(props: { config: AlapConfig; handlers: ProtocolHandlerRegistry }) {
  const [dir, setDir] = createSignal<Direction | null>(null);
  const placement = () => dir() ?? 'SE';
  const toggleDir = (next: Direction) =>
    setDir((prev) => (prev === next ? null : next));

  // Drive embedded web components (<alap-lens>, <alap-lightbox>) — mirrors
  // the lens-wc compass-rose pattern.
  createEffect(() => {
    const current = dir();
    document.querySelectorAll('alap-lens, alap-lightbox').forEach((el) => {
      if (current) el.setAttribute('placement', current);
      else el.removeAttribute('placement');
    });
  });

  return (
    <AlapProvider config={props.config} handlers={props.handlers}>
      <h1>Solid Adapter &mdash; Advanced Protocols</h1>
      <p class="page-intro">
        <code>&lt;AlapLink&gt;</code> from <code>alap/solid</code> &mdash;
        fine-grained reactivity via signals, no VDOM. Lens and lightbox are
        embedded web components. Personalized around the SolidJS ecosystem
        &mdash; async queries search HN for <em>solidjs</em>, static links
        cover solidjs.com, SolidStart, and Ryan Carniato's primer on
        fine-grained reactivity.
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
            <code>placement</code> from the same signal. Click the active
            one again to clear (default <code>SE</code>).
          </p>
          <div class="compass-grid">
            <For each={compassDirs}>
              {(d) => (
                <div class="compass-cell">
                  <button
                    type="button"
                    class="compass-btn"
                    classList={{ active: dir() === d }}
                    onClick={() => toggleDir(d)}
                  >{d}</button>
                </div>
              )}
            </For>
          </div>
          <p class="compass-driver-hint">
            Quick confirm &mdash;
            <AlapLink query=".solid + .menu" placement={placement()} class="compass-static-link">Static Solid links</AlapLink>
            (no async, opens instantly at the compass direction).
          </p>
        </div>
      </details>

      <h2 id="progressive">1. Progressive Async Menu</h2>
      <section class="scenario">
        <h3>Deterministic <code>:slow:</code> mock</h3>
        <p class="note">
          The Solid adapter uses <code>createSignal</code> for
          items/sources/isLoadingOnly. <code>createEffect</code> drives
          center-over-trigger and FLIP transitions.
        </p>
        <p><AlapLink query=":slow:2000:5:" placement={placement()}>Slow menu &mdash; 5 items in 2s</AlapLink></p>
        <p><AlapLink query=":slow:500:8:" placement={placement()}>Fast menu &mdash; 8 items in 500ms</AlapLink></p>
      </section>

      <section class="scenario">
        <h3>Real data: HN search for <em>solidjs</em></h3>
        <p><AlapLink query=":hn:search:$solidjs:" placement={placement()}>Top HN stories about Solid</AlapLink></p>
      </section>

      <h2 id="mixed">2. Mixed Static + Dynamic</h2>
      <section class="scenario">
        <p class="mixed-legend">
          <span><span class="swatch static"></span>static</span>
          <span><span class="swatch mock"></span>mock (async)</span>
          <span><span class="swatch hn"></span>HN (async)</span>
        </p>
        <p><AlapLink query="(.solid + .menu) | :slow:1500:3:" placement={placement()}>Static Solid refs + 3 slow items</AlapLink></p>
        <p><AlapLink query="(.solid + .menu) | :hn:search:$solidjs:limit=4:" placement={placement()}>Static Solid refs + 4 HN stories</AlapLink></p>
      </section>

      <h2 id="error">3. Error and Empty Placeholders</h2>
      <section class="scenario">
        <p><AlapLink query=":flaky:error:" placement={placement()}>Forced error after 800ms</AlapLink></p>
        <p><AlapLink query=":flaky:empty:" placement={placement()}>Empty result after 800ms</AlapLink></p>
        <p><AlapLink query="(.solid + .menu) | :flaky:error: | :slow:1200:2:" placement={placement()}>Static + error + slow</AlapLink></p>
      </section>

      <h2 id="lens">4. Lens &mdash; Metadata Card</h2>
      <section class="scenario">
        <p>
          <alap-lens query="(.solid + .lens) | :slow:1500:2:">
            Solid ecosystem lens (static + slow)
          </alap-lens>
        </p>
      </section>

      <h2 id="lightbox">5. Lightbox &mdash; Fullscreen Media</h2>
      <section class="scenario">
        <p>
          <alap-lightbox query="(.solid + .image) | :slow:1800:1:">
            Solid lightbox (benchmark + slow)
          </alap-lightbox>
        </p>
      </section>

      <h2 id="dedup">6. In-Flight Dedup</h2>
      <section class="scenario">
        <p>
          <AlapLink query=":slow:2500:4:" placement={placement()}>Trigger A &mdash; slow 4 items</AlapLink>
          &nbsp;&nbsp;
          <AlapLink query=":slow:2500:4:" placement={placement()}>Trigger B &mdash; same token</AlapLink>
        </p>
      </section>
    </AlapProvider>
  );
}
