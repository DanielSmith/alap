<!--
  Copyright 2026 Daniel Smith

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<script lang="ts">
  import { editor } from '../store/editor.svelte';

  let { onClose }: { onClose: () => void } = $props();

  let settings = $derived(editor.config.settings ?? {});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  style:background="var(--alap-overlay-bg)"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="rounded-xl p-6 w-[480px] shadow-2xl fade-in"
    style:background="var(--alap-mid)"
    style:border="1px solid var(--alap-border)"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-sm font-semibold text-accent">Settings</h2>
      <button onclick={onClose} class="toolbar-btn text-xs">Close</button>
    </div>

    <div class="grid gap-4">
      <div>
        <label for="set-list-type" class="block text-xs mb-1 text-muted">List Type</label>
        <select id="set-list-type"
          value={settings.listType ?? 'ul'}
          onchange={(e) => editor.updateSettings('listType', e.currentTarget.value)}
          class="w-full rounded-md px-3 py-2 text-sm"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)" style:color="var(--alap-text)"
        >
          <option value="ul">Unordered (ul)</option>
          <option value="ol">Ordered (ol)</option>
        </select>
      </div>

      <div>
        <label for="set-timeout" class="block text-xs mb-1 text-muted">Menu Timeout (ms)</label>
        <input id="set-timeout"
          type="number"
          value={settings.menuTimeout ?? 5000}
          onchange={(e) => editor.updateSettings('menuTimeout', Number(e.currentTarget.value))}
          class="w-full rounded-md px-3 py-2 text-sm"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
          style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace"
        />
      </div>

      <div>
        <label for="set-max-items" class="block text-xs mb-1 text-muted">Max Visible Items</label>
        <input id="set-max-items"
          type="number"
          value={(settings.maxVisibleItems as number) ?? 10}
          onchange={(e) => editor.updateSettings('maxVisibleItems', Number(e.currentTarget.value))}
          class="w-full rounded-md px-3 py-2 text-sm"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
          style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace"
        />
        <p class="text-[10px] mt-1 text-dim">Menu scrolls after this many items. 0 = no limit.</p>
      </div>

      <div>
        <label for="set-viewport" class="block text-xs mb-1 text-muted">Viewport Adjust</label>
        <select id="set-viewport"
          value={settings.viewportAdjust !== false ? 'true' : 'false'}
          onchange={(e) => editor.updateSettings('viewportAdjust', e.currentTarget.value === 'true')}
          class="w-full rounded-md px-3 py-2 text-sm"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)" style:color="var(--alap-text)"
        >
          <option value="true">Enabled — menus flip to stay on-screen</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      <div>
        <label for="set-existing-url" class="block text-xs mb-1 text-muted">Existing URL Handling</label>
        <select id="set-existing-url"
          value={(settings.existingUrl as string) ?? 'prepend'}
          onchange={(e) => editor.updateSettings('existingUrl', e.currentTarget.value)}
          class="w-full rounded-md px-3 py-2 text-sm"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)" style:color="var(--alap-text)"
        >
          <option value="prepend">Prepend — original URL is first menu item</option>
          <option value="append">Append — original URL is last menu item</option>
          <option value="ignore">Ignore — discard original URL</option>
        </select>
      </div>

      <div>
        <label for="set-api-url" class="block text-xs mb-1 text-muted">Remote API URL</label>
        <input id="set-api-url"
          type="text"
          value={editor.apiUrl}
          onchange={(e) => editor.setApiUrl(e.currentTarget.value)}
          class="w-full rounded-md px-3 py-2 text-sm"
          style:background="var(--alap-input-bg)" style:border="1px solid var(--alap-input-border)"
          style:color="var(--alap-text)" style:font-family="'JetBrains Mono', monospace"
        />
        <p class="text-[10px] mt-1 text-dim">Used by Remote and Hybrid storage modes. Changes take effect on next store initialization.</p>
      </div>
    </div>
  </div>
</div>
