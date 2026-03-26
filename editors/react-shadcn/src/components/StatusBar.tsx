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

import { useEffect, type CSSProperties } from 'react';
import { useEditorStore } from '../store/useEditorStore';

const BAR_STYLE: CSSProperties = {
  background: 'var(--alap-mid)',
  borderTop: '1px solid var(--alap-border-subtle)',
  color: 'var(--alap-text-dim)',
};

export function StatusBar() {
  const statusMessage = useEditorStore((s) => s.statusMessage);
  const isDirty = useEditorStore((s) => s.isDirty);
  const storageMode = useEditorStore((s) => s.storageMode);
  const configName = useEditorStore((s) => s.configName);
  const setStatus = useEditorStore((s) => s.setStatus);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage, setStatus]);

  return (
    <div className="px-5 py-1.5 flex items-center text-xs flex-shrink-0" style={BAR_STYLE}>
      <span className="font-medium text-muted">{configName}</span>
      {isDirty && <span className="ml-1.5 text-accent">unsaved</span>}
      <span className="mx-2 border-subtle">|</span>
      <span>{storageMode}</span>
      <div className="flex-1" />
      {statusMessage && <span className="fade-in text-muted">{statusMessage}</span>}
    </div>
  );
}
