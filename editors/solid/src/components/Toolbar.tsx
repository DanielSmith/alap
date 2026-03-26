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

import type { JSX } from 'solid-js';
import { editor } from '../store/editor';
import { Icon } from './Icon';

const BAR_STYLE: JSX.CSSProperties = {
  background: 'var(--alap-mid)',
  'border-bottom': '1px solid var(--alap-border-subtle)',
};

interface ToolbarProps {
  onToggleTester: () => void;
  onToggleDrawer: () => void;
  onShowHelp: () => void;
  testerOpen: boolean;
}

export function Toolbar(props: ToolbarProps) {
  const testerBtnStyle = (): JSX.CSSProperties =>
    props.testerOpen
      ? { color: 'var(--alap-accent)', background: 'var(--alap-surface)' }
      : { color: 'var(--alap-accent)' };

  return (
    <div class="relative flex items-center px-4 py-2.5 flex-shrink-0" style={BAR_STYLE}>
      {/* Left group */}
      <div class="flex items-center gap-2 z-10">
        <button onClick={props.onToggleDrawer} class="toolbar-btn p-1.5 text-accent" title="Config management">
          <Icon name="menu" width={18} height={18} />
        </button>

        <button
          onClick={props.onToggleTester}
          class="toolbar-btn flex items-center gap-1.5 px-2.5 py-1.5"
          style={testerBtnStyle()}
          title="Toggle query tester"
        >
          <Icon name="search" width={14} height={14} />
          <span class="text-xs">Query Tester</span>
        </button>

        <button onClick={props.onShowHelp} class="toolbar-btn p-1.5 text-accent" title="Help">
          <Icon name="help" width={16} height={16} />
        </button>
      </div>

      {/* Center title -- absolutely positioned for true centering */}
      <span class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span class="text-sm font-semibold tracking-wide text-accent">
          alap editor — solid{' '}
          <span class="text-muted font-normal">
            ({editor.configName}{editor.isDirty ? ' *' : ''})
          </span>
        </span>
      </span>
    </div>
  );
}
