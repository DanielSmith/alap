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

import { useState, useRef, useCallback, type ReactNode } from 'react';

const COPIED_DURATION_MS = 1500;

interface CodeBlockProps {
  children: ReactNode;
}

/**
 * Wraps a <pre><code> block with a clipboard copy button.
 * Used as the MDX `pre` component override so all fenced code
 * blocks get the copy icon automatically.
 */
export function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = useCallback(() => {
    const text = preRef.current?.textContent ?? '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_DURATION_MS);
  }, []);

  return (
    <div className="code-block">
      <button
        type="button"
        className="copy-btn"
        onClick={handleCopy}
        aria-label="Copy to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}
