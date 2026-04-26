/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

import { useState, useEffect } from 'react';
import { AlapProvider, AlapLink } from 'alap/react';
import type { AlapConfig, ProtocolHandlerRegistry } from 'alap/core';

// Make the embedded web components (`<alap-lens>`, `<alap-lightbox>`) quiet
// for React's JSX type checker — they're defined at runtime by `main.tsx`.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'alap-lens': Record<string, unknown>;
      'alap-lightbox': Record<string, unknown>;
    }
  }
}

const DIRECTIONS = ['NW','N','NE','W','C','E','SW','S','SE'] as const;
type Direction = typeof DIRECTIONS[number];

export function App({ config, handlers }: { config: AlapConfig; handlers: ProtocolHandlerRegistry }) {
  const [dir, setDir] = useState<Direction | null>(null);
  const placement = dir ?? 'SE';
  const toggleDir = (next: Direction) => setDir((prev) => (prev === next ? null : next));

  // Drive embedded web components (lens/lightbox) via attribute, matching
  // the compass-rose pattern in lens-wc/main.ts.
  useEffect(() => {
    document.querySelectorAll('alap-lens, alap-lightbox').forEach((el) => {
      if (dir) el.setAttribute('placement', dir);
      else el.removeAttribute('placement');
    });
  }, [dir]);

  return (
    <AlapProvider config={config} handlers={handlers}>
      <h1>React Adapter &mdash; Advanced Protocols</h1>
      <p className="page-intro">
        <code>&lt;AlapLink&gt;</code> from <code>alap/react</code>, backed
        by an <code>&lt;AlapProvider&gt;</code>. Lens and lightbox are the
        web-component variants (<code>&lt;alap-lens&gt;</code> /
        <code>&lt;alap-lightbox&gt;</code>), so the same engine powers all
        three renderers. Personalized around the React ecosystem &mdash;
        async queries search HN for <em>react hooks</em>, static links
        cover react.dev, Redux, TanStack Query, and react.gg.
      </p>

      <nav className="adapter-toc">
        <strong>Jump to:</strong>
        <a href="#compass">Compass</a>
        <a href="#progressive">Progressive menu</a>
        <a href="#mixed">Mixed static + async</a>
        <a href="#error">Error / empty</a>
        <a href="#lens">Lens</a>
        <a href="#lightbox">Lightbox</a>
        <a href="#dedup">In-flight dedup</a>
      </nav>

      <details id="compass" className="compass-wrap" open>
        <summary>
          Placement Compass Rose
          <span className="compass-summary-hint">(click a direction to set placement on every trigger on this page)</span>
        </summary>
        <div className="compass-body">
          <p className="note">
            Click any direction; every <code>&lt;AlapLink&gt;</code> on the
            page reads <code>placement</code> from the same state. Click the
            active direction again to clear (default <code>SE</code>).
          </p>
          <div className="compass-grid">
            {DIRECTIONS.map((d) => (
              <div key={d} className="compass-cell">
                <button
                  type="button"
                  className={`compass-btn${dir === d ? ' active' : ''}`}
                  onClick={() => toggleDir(d)}
                >{d}</button>
              </div>
            ))}
          </div>
          <p className="compass-driver-hint">
            Quick confirm &mdash;
            <AlapLink query=".react + .menu" placement={placement} className="compass-static-link">Static React links</AlapLink>
            (no async, opens instantly at the compass direction).
          </p>
        </div>
      </details>

      <h2 id="progressive">1. Progressive Async Menu</h2>
      <section className="scenario">
        <h3>Deterministic <code>:slow:</code> mock</h3>
        <p className="note">
          <code>ProgressiveRenderer</code> wires the React adapter to the
          engine. Items + sources are reactive state &mdash; React re-renders
          the menu each time a pending token settles.
        </p>
        <p><AlapLink query=":slow:2000:5:" placement={placement}>Slow menu &mdash; 5 items in 2s</AlapLink></p>
        <p><AlapLink query=":slow:500:8:" placement={placement}>Fast menu &mdash; 8 items in 500ms</AlapLink></p>
      </section>

      <section className="scenario">
        <h3>Real data: HN search for <em>react hooks</em></h3>
        <p>
          <AlapLink query=":hn:search:$react_hooks:" placement={placement}>
            Top HN stories about React hooks
          </AlapLink>
        </p>
      </section>

      <h2 id="mixed">2. Mixed Static + Dynamic</h2>
      <section className="scenario">
        <p className="mixed-legend">
          <span><span className="swatch static"></span>static</span>
          <span><span className="swatch mock"></span>mock (async)</span>
          <span><span className="swatch hn"></span>HN (async)</span>
        </p>
        <p>
          <AlapLink query="(.react + .menu) | :slow:1500:3:" placement={placement}>
            Static React refs + 3 slow items
          </AlapLink>
        </p>
        <p>
          <AlapLink query="(.react + .menu) | :hn:search:$react_hooks:limit=4:" placement={placement}>
            Static React refs + 4 HN stories
          </AlapLink>
        </p>
      </section>

      <h2 id="error">3. Error and Empty Placeholders</h2>
      <section className="scenario">
        <p><AlapLink query=":flaky:error:" placement={placement}>Forced error after 800ms</AlapLink></p>
        <p><AlapLink query=":flaky:empty:" placement={placement}>Empty result after 800ms</AlapLink></p>
        <p>
          <AlapLink query="(.react + .menu) | :flaky:error: | :slow:1200:2:" placement={placement}>
            Static + error + slow
          </AlapLink>
        </p>
      </section>

      <h2 id="lens">4. Lens &mdash; Metadata Card</h2>
      <section className="scenario">
        <p className="note">
          Embedded web component. Same config registry as <code>&lt;AlapLink&gt;</code>,
          so loading state is shared.
        </p>
        <p>
          <alap-lens query="(.react + .lens) | :slow:1500:2:">
            React ecosystem lens (static + slow)
          </alap-lens>
        </p>
      </section>

      <h2 id="lightbox">5. Lightbox &mdash; Fullscreen Media</h2>
      <section className="scenario">
        <p>
          <alap-lightbox query="(.react + .image) | :slow:1800:1:">
            React lightbox (Fiber diagram + slow)
          </alap-lightbox>
        </p>
      </section>

      <h2 id="dedup">6. In-Flight Dedup</h2>
      <section className="scenario">
        <p>
          <AlapLink query=":slow:2500:4:" placement={placement}>Trigger A &mdash; slow 4 items</AlapLink>
          &nbsp;&nbsp;
          <AlapLink query=":slow:2500:4:" placement={placement}>Trigger B &mdash; same token</AlapLink>
        </p>
      </section>
    </AlapProvider>
  );
}
