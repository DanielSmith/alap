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

const OVERLAY_STYLE: CSSProperties = { background: 'var(--alap-overlay-bg)' };
const DIALOG_STYLE: CSSProperties = { background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' };

const SECTION_STYLE: CSSProperties = {
  background: 'var(--alap-input-bg)',
  border: '1px solid var(--alap-border-subtle)',
};

interface HelpDialogProps {
  onClose: () => void;
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={OVERLAY_STYLE} onClick={onClose}>
      <div className="rounded-xl p-6 w-[560px] max-h-[80vh] overflow-y-auto shadow-2xl fade-in"
        style={DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-accent">Alap Editor — Help</h2>
          <button onClick={onClose} className="toolbar-btn text-xs">Close</button>
        </div>

        <div className="flex flex-col gap-4 text-sm">

          <Section title="Getting Started">
            <p>Use the <strong>Items</strong> and <strong>Macros</strong> tabs on the left to manage your link library. Click an item to edit it in the center panel. Multiple items can be open at once.</p>
            <p className="mt-2">Drag a URL from your browser onto the editor to create a new item automatically.</p>
          </Section>

          <Section title="Items">
            <Row label="+ Add" desc="Create a new blank item" />
            <Row label="Click item" desc="Open for editing (toggle)" />
            <Row label="Hover icons" desc="Clone or delete an item" />
            <Row label="Enter key" desc="Save the current form" />
            <Row label="Drag & drop" desc="Drop a URL to create, drop an image to set thumbnail" />
          </Section>

          <Section title="Macros">
            <p>Macros are saved expressions. Define them once, use <code className="text-accent-soft">@macroName</code> in any expression.</p>
            <Row label="+ Add" desc="Create a new macro" />
            <Row label="Live resolution" desc="See which items a macro expression resolves to as you type" />
          </Section>

          <Section title="Expression Grammar">
            <Row label=".tag" desc="All items with this tag" />
            <Row label="itemId" desc="One specific item by ID" />
            <Row label="@macro" desc="Expand a saved macro" />
            <Row label=".a + .b" desc="AND — items with both tags" />
            <Row label=".a | .b" desc="OR — items with either tag" />
            <Row label=".a - .b" desc="WITHOUT — subtract matches" />
            <Row label="(.a + .b) | .c" desc="Parentheses for grouping" />
            <Row label="/pattern/" desc="Regex search" />
          </Section>

          <Section title="Query Tester">
            <p>Toggle the query tester from the toolbar to test expressions live. Click the expression link to see the actual Alap menu. The tag cloud and search pattern cloud let you click to insert expressions.</p>
          </Section>

          <Section title="Config Management">
            <p>Use the <strong>hamburger menu</strong> to access config management: Load, Save, Save As, New, Delete, Storage mode, and Settings.</p>
            <Row label="Load" desc="Browse and load saved configs (Replace or Merge)" />
            <Row label="Save / Save As" desc="Persist to IndexedDB, Remote API, or both" />
            <Row label="Import / Export" desc="JSON files on disk (separate from storage)" />
          </Section>

          <Section title="Keyboard">
            <Row label="Enter" desc="Save current item or macro form" />
            <Row label="Escape" desc="Close topmost dialog or drawer" />
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={SECTION_STYLE}>
      <h3 className="text-xs font-semibold text-accent mb-2">{title}</h3>
      <div className="text-xs text-muted leading-relaxed">{children}</div>
    </div>
  );
}

function Row({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-3 py-0.5">
      <code className="text-accent-soft text-[11px] w-28 flex-shrink-0 font-mono">{label}</code>
      <span className="text-dim">{desc}</span>
    </div>
  );
}
