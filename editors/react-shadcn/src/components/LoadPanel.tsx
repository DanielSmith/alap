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

import { useState, useMemo, type CSSProperties } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

type LoadMode = 'replace' | 'merge';

const TOGGLE_BORDER: CSSProperties = { border: '1px solid var(--alap-border-subtle)' };
const TOGGLE_ACTIVE: CSSProperties = { background: 'var(--alap-accent)', color: 'var(--alap-deep)' };
const TOGGLE_INACTIVE: CSSProperties = { background: 'transparent', color: 'var(--alap-text-dim)' };

interface LoadPanelProps {
  open: boolean;
  onClose: () => void;
}

export function LoadPanel({ open, onClose }: LoadPanelProps) {
  const configName = useEditorStore((s) => s.configName);
  const configNames = useEditorStore((s) => s.configNames);
  const loadConfig = useEditorStore((s) => s.loadConfig);
  const setStatus = useEditorStore((s) => s.setStatus);

  const [loadMode, setLoadMode] = useState<LoadMode>('replace');
  const [filter, setFilter] = useState('');

  function handleLoad(name: string) {
    loadConfig(name);
    if (loadMode === 'merge') {
      setStatus(`Loaded "${name}" (merge coming soon — replaced for now)`);
    }
    onClose();
  }

  const filtered = useMemo(() =>
    configNames.filter((n) => !filter || n.toLowerCase().includes(filter.toLowerCase())),
    [configNames, filter]
  );

  const actionLabel = loadMode === 'merge' ? 'merge into current' : 'load';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[480px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Config</DialogTitle>
          <DialogDescription className="sr-only">Select a saved configuration to load</DialogDescription>
          <div className="flex items-center gap-3">
            <div className="flex rounded-md overflow-hidden text-[10px]" style={TOGGLE_BORDER}>
              <button onClick={() => setLoadMode('replace')} className="px-2.5 py-1"
                style={loadMode === 'replace' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}>Replace</button>
              <button onClick={() => setLoadMode('merge')} className="px-2.5 py-1"
                style={loadMode === 'merge' ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}>Merge</button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </DialogHeader>

        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search configs..."
          className="mb-4"
          autoFocus
        />

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
          {filtered.length > 0 && filtered.map((name) => {
            const isCurrent = name === configName;
            const cardClass = isCurrent
              ? 'item-card editing rounded-lg px-4 py-3'
              : 'item-card rounded-lg px-4 py-3 hover-bg-hover cursor-pointer';

            return (
              <button key={name} onClick={() => !isCurrent && handleLoad(name)}
                className={`w-full text-left text-sm flex items-center justify-between ${cardClass}`}
                disabled={isCurrent}>
                <span className={isCurrent ? 'text-accent' : ''}>{name}</span>
                <span className="text-[10px] text-dim">{isCurrent ? 'current' : actionLabel}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-center py-6 text-dim">
              {filter ? 'No configs match filter' : 'No saved configs'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
