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

import { onMount, onCleanup, type JSX } from 'solid-js';

const OVERLAY_STYLE: JSX.CSSProperties = { background: 'var(--alap-overlay-bg)' };
const DIALOG_STYLE: JSX.CSSProperties = { background: 'var(--alap-mid)', border: '1px solid var(--alap-border)' };
const CANCEL_STYLE: JSX.CSSProperties = { background: 'var(--alap-cancel-bg)', color: 'var(--alap-cancel-text)' };
const CONFIRM_STYLE: JSX.CSSProperties = { background: 'var(--alap-danger)', color: '#fff' };

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  let confirmRef: HTMLButtonElement | undefined;

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') props.onCancel();
  }

  onMount(() => {
    confirmRef?.focus();
    document.addEventListener('keydown', handleKey);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKey);
  });

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center" style={OVERLAY_STYLE} onClick={props.onCancel}>
      <div class="rounded-xl p-8 w-96 shadow-2xl fade-in" style={DIALOG_STYLE} onClick={(e) => e.stopPropagation()}>
        <p class="text-center text-lg mb-8">{props.message}</p>
        <div class="flex justify-between gap-4">
          <button onClick={props.onCancel} class="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-opacity" style={CANCEL_STYLE}>
            Cancel
          </button>
          <button ref={confirmRef} onClick={props.onConfirm} class="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium hover-lift shadow-lg" style={CONFIRM_STYLE}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
