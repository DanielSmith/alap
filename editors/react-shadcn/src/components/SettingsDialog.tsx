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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const config = useEditorStore((s) => s.config);
  const updateSettings = useEditorStore((s) => s.updateSettings);
  const apiUrl = useEditorStore((s) => s.apiUrl);
  const setApiUrl = useEditorStore((s) => s.setApiUrl);

  const settings = config.settings ?? {};

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[480px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">Configure editor settings</DialogDescription>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="block text-xs mb-1 text-muted">List Type</label>
            <Select value={settings.listType ?? 'ul'} onValueChange={(v) => updateSettings('listType', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ul">Unordered (ul)</SelectItem>
                <SelectItem value="ol">Ordered (ol)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Menu Timeout (ms)</label>
            <Input
              type="number"
              mono
              value={settings.menuTimeout ?? 5000}
              onChange={(e) => updateSettings('menuTimeout', Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Max Visible Items</label>
            <Input
              type="number"
              mono
              value={(settings.maxVisibleItems as number) ?? 10}
              onChange={(e) => updateSettings('maxVisibleItems', Number(e.target.value))}
            />
            <p className="text-[10px] mt-1 text-dim">Menu scrolls after this many items. 0 = no limit.</p>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Viewport Adjust</label>
            <Select
              value={settings.viewportAdjust !== false ? 'true' : 'false'}
              onValueChange={(v) => updateSettings('viewportAdjust', v === 'true')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled — menus flip to stay on-screen</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Existing URL Handling</label>
            <Select
              value={(settings.existingUrl as string) ?? 'prepend'}
              onValueChange={(v) => updateSettings('existingUrl', v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepend">Prepend — original URL is first menu item</SelectItem>
                <SelectItem value="append">Append — original URL is last menu item</SelectItem>
                <SelectItem value="ignore">Ignore — discard original URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-muted">Remote API URL</label>
            <Input
              mono
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
            <p className="text-[10px] mt-1 text-dim">Used by Remote and Hybrid storage modes. Changes take effect on next store initialization.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
