import { useState, useCallback } from 'react';
import { AlapProvider, AlapLink } from 'alap/react';
import { sandboxConfig } from '../shared/config';

type Strategy = 'flip' | 'clamp' | 'place';

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('flip');
  const [barPosition, setBarPosition] = useState<'left' | 'right'>('left');

  const p = useCallback((compass: string) => `${compass}, ${strategy}`, [strategy]);

  function toggleBarPosition() {
    setBarPosition((prev) => (prev === 'left' ? 'right' : 'left'));
  }

  return (
    <AlapProvider config={sandboxConfig}>
      <p className="back"><a href="../">&larr; All Adapters</a></p>
      <h1>React Adapter</h1>

      <div className="strategy-picker">
        <span className="strategy-picker__label">Strategy:</span>
        <label><input type="radio" name="strategy" checked={strategy === 'flip'} onChange={() => setStrategy('flip')} /> flip <span className="strategy-hint">(default — flips if it doesn't fit)</span></label>
        <label><input type="radio" name="strategy" checked={strategy === 'clamp'} onChange={() => setStrategy('clamp')} /> clamp <span className="strategy-hint">(flip + constrain to viewport)</span></label>
        <label><input type="radio" name="strategy" checked={strategy === 'place'} onChange={() => setStrategy('place')} /> place <span className="strategy-hint">(pinned, no fallback)</span></label>
        <code className="strategy-picker__example">placement="{p('SE')}"</code>
      </div>

      <h2>1. Compass Rose</h2>
      <div className="scenario">
        <p className="scenario__title">All 9 placements</p>
        <div className="compass-grid">
          <div className="compass-cell"><AlapLink query=".short" placement={p('NW')}>NW</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('N')}>N</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('NE')}>NE</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('W')}>W</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('C')}>C</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('E')}>E</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('SW')}>SW</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('S')}>S</AlapLink></div>
          <div className="compass-cell"><AlapLink query=".short" placement={p('SE')}>SE</AlapLink></div>
        </div>
      </div>

      <h2>2. Right-Edge Overflow (TTT Bug)</h2>

      <h3>2a. With placement engine</h3>
      <div className="scenario">
        <p className="scenario__title">Expression bar — trigger pushed right</p>
        <div className="edge-bar">
          <span className="edge-bar__label">Expression:</span>
          <span className="edge-bar__expr">.content_collections</span>
          <span className="edge-bar__trigger">
            <AlapLink query=".long" placement={p('SE')}>Browse filtered</AlapLink>
          </span>
        </div>
      </div>

      <h3>2b. No placement prop (tier 0 — CSS only)</h3>
      <div className="scenario">
        <p className="scenario__title">CSS-only positioning — strategy toggle has no effect</p>
        <div className="edge-bar">
          <span className="edge-bar__label">Expression:</span>
          <span className="edge-bar__expr">.tech | .news</span>
          <span className="edge-bar__trigger">
            <AlapLink query=".long">Browse filtered (no placement)</AlapLink>
          </span>
        </div>
      </div>

      <h2>3. Wide Menu Stress</h2>
      <div className="scenario wide-menu">
        <p className="scenario__title">min-width: 400px, right-aligned</p>
        <div className="right-push">
          <AlapLink query=".short" placement={p('SE')}>Wide menu SE</AlapLink>
        </div>
      </div>

      <h2>4. Dynamic Trigger Reflow</h2>
      <div className="scenario">
        <p className="scenario__title">
          Trigger moves from left to right edge
          <button onClick={toggleBarPosition} style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
            Toggle position ({barPosition})
          </button>
        </p>
        <div className={`dynamic-bar ${barPosition === 'left' ? 'dynamic-bar--left' : 'dynamic-bar--right'}`}>
          <AlapLink query=".long" placement={p('SE')}>Browse filtered</AlapLink>
        </div>
      </div>

      <h2>5. Corner Stress</h2>
      <div className="scenario">
        <p className="scenario__title">Long titles, worst-case placements</p>
        <div className="corner-grid">
          <span className="corner-tl"><AlapLink query=".long" placement={p('NW')}>NW corner</AlapLink></span>
          <span className="corner-tr"><AlapLink query=".long" placement={p('NE')}>NE corner</AlapLink></span>
          <span className="corner-bl"><AlapLink query=".long" placement={p('SW')}>SW corner</AlapLink></span>
          <span className="corner-br"><AlapLink query=".long" placement={p('SE')}>SE corner</AlapLink></span>
        </div>
      </div>

      <h2>6. Long Menu (14 items)</h2>
      <div className="scenario">
        <AlapLink query=".planet" placement={p('SE')}>14 planets (SE)</AlapLink>
        {' '}&mdash;{' '}
        <AlapLink query=".planet" placement={p('N')}>14 planets (N)</AlapLink>
      </div>
    </AlapProvider>
  );
}
