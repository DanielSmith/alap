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

import { type CSSProperties } from 'react';
import { AlapLink, useAlap } from 'alap/react';
import { useEditorStore } from '../../store/useEditorStore';

const INPUT_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-input-border)',
  color: 'var(--alap-text)',
  fontFamily: "'JetBrains Mono', monospace",
};

const PATTERN_BTN_STYLE: CSSProperties = {
  border: '1px solid var(--alap-pattern-border)',
};

export function QueryTester() {
  const testQuery = useEditorStore((s) => s.testQuery);
  const setTestQuery = useEditorStore((s) => s.setTestQuery);
  const { query, resolve } = useAlap();

  const ids = testQuery ? query(testQuery) : [];
  const links = testQuery ? resolve(testQuery) : [];

  return (
    <div className="flex flex-col gap-5 fade-in">
      <div>
        <h2 className="text-sm font-semibold mb-2 text-accent">Query Tester</h2>
        <input type="text" value={testQuery} onChange={(e) => setTestQuery(e.target.value)}
          placeholder=".coffee + .nyc  or  /patternKey/"
          className="w-full rounded-md px-3 py-1.5 text-sm" style={INPUT_STYLE} />
      </div>

      {testQuery && (
        <div>
          <p className="text-xs mb-1.5 text-dim">Click to test menu:</p>
          <AlapLink query={testQuery} menuClassName="alapelem">
            <span className="cursor-pointer text-sm underline text-accent">{testQuery}</span>
          </AlapLink>
        </div>
      )}

      <div>
        <p className="text-xs mb-1.5 text-dim">{ids.length} result{ids.length !== 1 ? 's' : ''}</p>
        {ids.length > 0 && (
          <ul className="text-xs space-y-1.5">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-2">
                <code className="text-xs font-mono text-accent-soft">{link.id}</code>
                <span className="text-dim">--</span>
                <span className="truncate text-muted">{link.label ?? link.url}</span>
              </li>
            ))}
          </ul>
        )}
        {ids.length === 0 && testQuery && (
          <p className="text-xs text-dim">No matches</p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium mb-1.5 text-dim">Tags</h3>
        <TagCloud />
      </div>

      <PatternCloud />
    </div>
  );
}

function TagCloud() {
  const config = useEditorStore((s) => s.config);
  const setTestQuery = useEditorStore((s) => s.setTestQuery);

  const tagCounts = new Map<string, number>();
  for (const item of Object.values(config.allLinks)) {
    for (const tag of item.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const sorted = [...tagCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  if (sorted.length === 0) return <p className="text-xs text-dim">No tags yet</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map(([tag, count]) => (
        <button key={tag} onClick={() => setTestQuery(`.${tag}`)} className="tag-pill cursor-pointer">
          .{tag} <span className="text-dim ml-0.5">{count}</span>
        </button>
      ))}
    </div>
  );
}

function PatternCloud() {
  const config = useEditorStore((s) => s.config);
  const setTestQuery = useEditorStore((s) => s.setTestQuery);

  const patterns = config.searchPatterns;
  if (!patterns || Object.keys(patterns).length === 0) return null;

  const keys = Object.keys(patterns).sort();

  return (
    <div>
      <h3 className="text-xs font-medium mb-1.5 text-dim">Search Patterns</h3>
      <div className="flex flex-wrap gap-1.5">
        {keys.map((key) => {
          const entry = patterns[key];
          const pattern = typeof entry === 'string' ? entry : entry.pattern;
          return (
            <button key={key} onClick={() => setTestQuery(`/${key}/`)}
              className="text-xs px-2 py-0.5 rounded-full cursor-pointer hover-bg-pattern"
              style={PATTERN_BTN_STYLE} title={`/${pattern}/`}>
              /{key}/
            </button>
          );
        })}
      </div>
    </div>
  );
}
