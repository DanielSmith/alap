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
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import MenuIcon from '../../assets/svg/menu.svg?react';
import SearchIcon from '../../assets/svg/search.svg?react';
import HelpIcon from '../../assets/svg/help.svg?react';

const BAR_STYLE: CSSProperties = {
  background: 'var(--alap-mid)',
  borderBottom: '1px solid var(--alap-border-subtle)',
};

interface ToolbarProps {
  onToggleTester: () => void;
  onToggleDrawer: () => void;
  onShowHelp: () => void;
  testerOpen: boolean;
}

export function Toolbar({ onToggleTester, onToggleDrawer, onShowHelp, testerOpen }: ToolbarProps) {
  const configName = useEditorStore((s) => s.configName);
  const isDirty = useEditorStore((s) => s.isDirty);

  const testerBtnStyle = useMemo<CSSProperties>(() =>
    testerOpen ? { color: 'var(--alap-accent)', background: 'var(--alap-surface)' } : { color: 'var(--alap-accent)' },
    [testerOpen]
  );

  return (
    <div className="relative flex items-center px-4 py-2.5 flex-shrink-0" style={BAR_STYLE}>
      {/* Left group */}
      <div className="flex items-center gap-2 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="toolbar" onClick={onToggleDrawer} className="p-1.5 text-accent">
              <MenuIcon width={18} height={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Config management</TooltipContent>
        </Tooltip>

        <Button
          variant="toolbar"
          onClick={onToggleTester}
          className="flex items-center gap-1.5 px-2.5 py-1.5"
          style={testerBtnStyle}
        >
          <SearchIcon width={14} height={14} />
          <span className="text-xs">Query Tester</span>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="toolbar" onClick={onShowHelp} className="p-1.5 text-accent">
              <HelpIcon width={16} height={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help</TooltipContent>
        </Tooltip>
      </div>

      {/* Center title — absolutely positioned for true centering */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-semibold tracking-wide text-accent">
          alap editor — react-shadcn <span className="text-muted font-normal">({configName}{isDirty ? ' *' : ''})</span>
        </span>
      </span>
    </div>
  );
}
