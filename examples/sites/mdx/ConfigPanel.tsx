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

import { useState, useRef, useCallback } from 'react';
import type { AlapConfig } from 'alap/core';

const COPIED_DURATION_MS = 1500;

interface ConfigPanelProps {
  config: AlapConfig;
}

/**
 * Collapsible panel showing the Alap config JSON.
 * Collapsed by default — users expand to see how links are defined.
 */
export function ConfigPanel({ config }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const handleCopy = useCallback(() => {
    const text = codeRef.current?.textContent ?? '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_DURATION_MS);
  }, []);

  const json = JSON.stringify(config, null, 2);

  return (
    <details className="config-panel" open={open || undefined} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="config-summary">
        Alap Config
        <span className="config-hint">
          {open ? '' : ' — expand to see how links, tags, and macros are defined'}
        </span>
      </summary>
      <div className="config-body">
        <button
          type="button"
          className="copy-btn config-copy-btn"
          onClick={handleCopy}
          aria-label="Copy config to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre><code ref={codeRef}>{json}</code></pre>
      </div>
    </details>
  );
}
