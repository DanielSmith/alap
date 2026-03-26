/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createSignal, For } from 'solid-js';
import { AlapProvider, AlapLink, useAlap } from 'alap/solid';
import { demoConfig } from './config';
import type { AlapConfig } from 'alap/core';

// --- Section 1: Basic usage ---

function BasicExamples() {
  return (
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
      <pre><code>{`<AlapLink query="vwbug, bmwe36">VW Bug and the BMW E36</AlapLink>
<AlapLink query=".coffee">coffee spots</AlapLink>
<AlapLink query=".bridge">bridges</AlapLink>`}</code></pre>
    </section>
  );
}

// --- Section 2: Operators ---

function OperatorExamples() {
  return (
    <section>
      <h2>Operators</h2>
      <p class="section-note">AND, OR, WITHOUT — same expression language as vanilla.</p>
      <div class="example">
        <p>
          <AlapLink query=".nyc + .bridge">NYC bridges</AlapLink> (AND) —{' '}
          <AlapLink query=".nyc | .sf">NYC or SF</AlapLink> (OR) —{' '}
          <AlapLink query=".nyc - .bridge">NYC without bridges</AlapLink> (WITHOUT)
        </p>
        <p>
          <AlapLink query="(.nyc + .bridge) | (.sf + .bridge)">
            NYC or SF bridges
          </AlapLink>
          {' '} — parentheses for grouping.
        </p>
      </div>
      <pre><code>{`<AlapLink query=".nyc + .bridge">NYC bridges</AlapLink>
<AlapLink query=".nyc | .sf">NYC or SF</AlapLink>
<AlapLink query="(.nyc + .bridge) | (.sf + .bridge)">grouped</AlapLink>`}</code></pre>
    </section>
  );
}

// --- Section 3: Macros ---

function MacroExamples() {
  return (
    <section>
      <h2>Macros</h2>
      <p class="section-note">
        <code>@name</code> expands from config macros. <code>@</code> alone uses <code>anchorId</code>.
      </p>
      <div class="example">
        <p>
          My favorite <AlapLink query="@cars">cars (macro)</AlapLink> —{' '}
          <AlapLink query="@nycbridges">NYC bridges (macro)</AlapLink>.
        </p>
      </div>
      <pre><code>{`<AlapLink query="@cars">cars (macro)</AlapLink>
<AlapLink query="@nycbridges">NYC bridges (macro)</AlapLink>`}</code></pre>
    </section>
  );
}

// --- Section 4: menuClassName for theming ---

function ThemingExamples() {
  return (
    <section>
      <h2>Menu Theming (CSS Classes)</h2>
      <p class="section-note">
        Use <code>menuClassName</code> to apply different themes per link.
      </p>
      <div class="example">
        <p>
          <AlapLink query=".nyc" menuClassName="dark-menu">NYC (dark theme)</AlapLink> —{' '}
          <AlapLink query=".coffee" menuClassName="warm-menu">coffee (warm theme)</AlapLink> —{' '}
          <AlapLink query=".car">cars (default theme)</AlapLink>
        </p>
      </div>
      <pre><code>{`<AlapLink query=".nyc" menuClassName="dark-menu">NYC</AlapLink>
<AlapLink query=".coffee" menuClassName="warm-menu">coffee</AlapLink>
<AlapLink query=".car">cars (default)</AlapLink>`}</code></pre>
    </section>
  );
}

// --- Section 5: menuStyle for inline overrides ---

function InlineStyleExamples() {
  return (
    <section>
      <h2>Inline Style Overrides</h2>
      <p class="section-note">
        <code>menuStyle</code> prop for one-off inline styles. Merges with provider defaults.
      </p>
      <div class="example">
        <p>
          <AlapLink
            query=".sf"
            menuStyle={{ 'border-radius': '12px', border: '2px solid #10b981' }}
          >
            SF spots (rounded green border)
          </AlapLink>
          {' '} —{' '}
          <AlapLink
            query=".bridge"
            menuStyle={{ 'max-width': '160px', 'font-size': '0.8rem' }}
          >
            bridges (compact)
          </AlapLink>
        </p>
      </div>
      <pre><code>{`<AlapLink
  query=".sf"
  menuStyle={{ 'border-radius': '12px', border: '2px solid #10b981' }}
>
  SF spots
</AlapLink>`}</code></pre>
    </section>
  );
}

// --- Section 6: useAlap hook ---

function HookExample() {
  const { resolve, query } = useAlap();
  const [expression, setExpression] = createSignal('.coffee + .sf');

  return (
    <section>
      <h2>useAlap() Hook — Programmatic Access</h2>
      <p class="section-note">
        Use the hook directly for custom rendering, search, or headless access.
      </p>
      <div class="example">
        <label>
          Expression:{' '}
          <input
            type="text"
            value={expression()}
            onInput={(e) => setExpression(e.currentTarget.value)}
            style={{ padding: '0.3rem 0.5rem', width: '200px', 'font-family': 'monospace' }}
          />
        </label>
        <p style={{ 'font-size': '0.85rem', color: '#666' }}>
          IDs: <code>{query(expression()).join(', ') || '(none)'}</code>
        </p>
        {resolve(expression()).length > 0 && (
          <ul style={{ margin: '0.5rem 0', 'padding-left': '1.25rem' }}>
            <For each={resolve(expression())}>
              {(link) => (
                <li>
                  <a href={link.url} target="_blank" rel="noopener">
                    {link.label ?? link.id}
                  </a>
                </li>
              )}
            </For>
          </ul>
        )}
      </div>
      <pre><code>{`const { resolve, query } = useAlap();
const [expression, setExpression] = createSignal('.coffee + .sf');
const ids = query(expression());
const links = resolve(expression());`}</code></pre>
    </section>
  );
}

// --- Section 7: Dynamic config ---

function DynamicConfigExample() {
  const [config, setConfig] = createSignal<AlapConfig>(demoConfig);
  const [added, setAdded] = createSignal(false);

  const addLink = () => {
    setConfig((prev) => ({
      ...prev,
      allLinks: {
        ...prev.allLinks,
        peets: {
          label: "Peet's Coffee",
          url: 'https://peets.com',
          tags: ['coffee', 'sf'],
        },
      },
    }));
    setAdded(true);
  };

  return (
    <AlapProvider config={config()}>
      <section>
        <h2>Dynamic Config Updates</h2>
        <p class="section-note">
          Config is reactive — update it and menus reflect the changes.
        </p>
        <div class="example">
          <p>
            <AlapLink query=".coffee + .sf">SF coffee</AlapLink>
            {' '} — {' '}
            <button onClick={addLink} disabled={added()} style={{ padding: '0.3rem 0.75rem' }}>
              {added() ? "Peet's added!" : "Add Peet's Coffee"}
            </button>
          </p>
          <p style={{ 'font-size': '0.85rem', color: '#666' }}>
            Click the button, then click "SF coffee" to see the new item.
          </p>
        </div>
        <pre><code>{`const [config, setConfig] = createSignal(demoConfig);

const addLink = () => {
  setConfig(prev => ({
    ...prev,
    allLinks: {
      ...prev.allLinks,
      peets: { label: "Peet's Coffee", url: '...', tags: ['coffee', 'sf'] },
    },
  }));
};

<AlapProvider config={config()}>
  <AlapLink query=".coffee + .sf">SF coffee</AlapLink>
</AlapProvider>`}</code></pre>
      </section>
    </AlapProvider>
  );
}

// --- Section 8: List type ---

function ListTypeExample() {
  return (
    <section>
      <h2>List Type</h2>
      <p class="section-note">
        Override the list element — <code>listType="ol"</code> renders an ordered list.
      </p>
      <div class="example">
        <p>
          <AlapLink query=".car" listType="ol">cars (ordered)</AlapLink>
          {' '} vs {' '}
          <AlapLink query=".car">cars (unordered, default)</AlapLink>
        </p>
      </div>
    </section>
  );
}

// --- App ---

export function App() {
  return (
    <AlapProvider config={demoConfig}>
      <h1>Alap v3 — SolidJS Adapter</h1>
      <p>
        All examples use <code>&lt;AlapProvider&gt;</code> +{' '}
        <code>&lt;AlapLink&gt;</code> from <code>alap/solid</code>.
      </p>

      <BasicExamples />
      <OperatorExamples />
      <MacroExamples />
      <ThemingExamples />
      <InlineStyleExamples />
      <HookExample />
      <ListTypeExample />

      {/* Dynamic config needs its own provider to demo config swapping */}
      <DynamicConfigExample />
    </AlapProvider>
  );
}
