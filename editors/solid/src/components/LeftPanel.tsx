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

import { createMemo, type JSX, Match, Switch } from 'solid-js';
import { editor } from '../store/editor';
import { ItemList } from './ItemList';
import { MacroList } from './MacroList';

export function LeftPanel() {
  const isMacroMode = createMemo(() => editor.panelMode === 'macros');

  const panelStyle = (): JSX.CSSProperties => ({
    background: isMacroMode() ? 'var(--alap-macro-mid)' : 'var(--alap-mid)',
    'border-right': '1px solid var(--alap-border-subtle)',
    transition: 'background var(--alap-transition)',
  });

  const itemsTabClass = () =>
    `panel-tab flex-1 ${editor.panelMode === 'items' ? 'active' : ''}`;

  const macrosTabClass = () =>
    `panel-tab flex-1 ${editor.panelMode === 'macros' ? 'active-macro' : ''}`;

  return (
    <div
      class={`w-72 flex-shrink-0 flex flex-col overflow-hidden ${isMacroMode() ? 'macro-mode' : ''}`}
      style={panelStyle()}
    >
      <div class="flex" style={{ 'border-bottom': '1px solid var(--alap-border-subtle)' }}>
        <button onClick={() => editor.setPanelMode('items')} class={itemsTabClass()}>Items</button>
        <button onClick={() => editor.setPanelMode('macros')} class={macrosTabClass()}>Macros</button>
      </div>
      <Switch>
        <Match when={editor.panelMode === 'items'}>
          <ItemList />
        </Match>
        <Match when={editor.panelMode === 'macros'}>
          <MacroList />
        </Match>
      </Switch>
    </div>
  );
}
