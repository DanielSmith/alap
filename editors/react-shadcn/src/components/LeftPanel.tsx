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

import { useMemo, type CSSProperties } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { ItemList } from './ItemList';
import { MacroList } from './MacroList';

export function LeftPanel() {
  const panelMode = useEditorStore((s) => s.panelMode);
  const setPanelMode = useEditorStore((s) => s.setPanelMode);
  const isMacroMode = panelMode === 'macros';

  const panelStyle = useMemo<CSSProperties>(() => ({
    background: isMacroMode ? 'var(--alap-macro-mid)' : 'var(--alap-mid)',
    borderRight: '1px solid var(--alap-border-subtle)',
    transition: 'background var(--alap-transition)',
  }), [isMacroMode]);

  return (
    <div className={`w-72 flex-shrink-0 flex flex-col overflow-hidden ${isMacroMode ? 'macro-mode' : ''}`} style={panelStyle}>
      <Tabs value={panelMode} onValueChange={(v) => setPanelMode(v as 'items' | 'macros')} className="flex flex-col flex-1 overflow-hidden">
        <TabsList>
          <TabsTrigger value="items" className={panelMode === 'items' ? 'active' : ''}>Items</TabsTrigger>
          <TabsTrigger value="macros" className={panelMode === 'macros' ? 'active-macro' : ''}>Macros</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <ItemList />
        </TabsContent>
        <TabsContent value="macros">
          <MacroList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
