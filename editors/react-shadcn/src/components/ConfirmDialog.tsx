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

import { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Small delay to let Radix finish mounting
      const timer = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="w-96">
        <DialogTitle className="sr-only">Confirm action</DialogTitle>
        <DialogDescription className="sr-only">{message}</DialogDescription>
        <p className="text-center text-lg mb-8">{message}</p>
        <div className="flex justify-between gap-4">
          <Button variant="cancel" onClick={onCancel} className="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium">
            Cancel
          </Button>
          <Button ref={confirmRef} variant="destructive" onClick={onConfirm} className="flex-1 text-sm px-4 py-2.5 rounded-2xl font-medium shadow-lg">
            Remove
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
