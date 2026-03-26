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

import { useEffect, useRef, type CSSProperties } from 'react';

const OVERLAY_STYLE: CSSProperties = { background: 'var(--alap-overlay-bg)' };
const DIALOG_STYLE: CSSProperties = { background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' };
const CANCEL_STYLE: CSSProperties = { background: 'var(--alap-cancel-bg)', color: 'var(--alap-cancel-text)' };
const CONFIRM_STYLE: CSSProperties = { background: 'var(--alap-danger)', color: '#fff' };

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={OVERLAY_STYLE} onClick={onCancel}>
      <div className="rounded-xl p-8 w-96 shadow-2xl fade-in" style={DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-lg mb-8">{message}</p>
        <div className="flex justify-between gap-4">
          <button onClick={onCancel} className="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-opacity" style={CANCEL_STYLE}>
            Cancel
          </button>
          <button ref={confirmRef} onClick={onConfirm} className="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-lift shadow-lg" style={CONFIRM_STYLE}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
