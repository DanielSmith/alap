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
  import { setContext, untrack } from 'svelte';
  import { AlapEngine } from '../../core/AlapEngine';
  import type { AlapConfig } from '../../core/types';
  import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';
  import { createMenuCoordinator, type AlapContextValue } from './context';

  const ALAP_KEY = Symbol.for('alap');

  interface Props {
    config: AlapConfig;
    menuTimeout?: number;
    defaultMenuStyle?: Record<string, string>;
    defaultMenuClassName?: string;
    children: import('svelte').Snippet;
  }

  const props: Props = $props();
  let { children } = $derived(props);

  const engine = new AlapEngine(untrack(() => props.config));
  const menuCoordinator = createMenuCoordinator();

  // Keep engine in sync when config changes
  $effect(() => {
    engine.updateConfig(props.config);
  });

  const ctx: AlapContextValue = {
    engine,
    menuCoordinator,
    get config() { return props.config; },
    get menuTimeout() {
      return props.menuTimeout
        ?? (props.config.settings?.menuTimeout as number)
        ?? DEFAULT_MENU_TIMEOUT;
    },
    get defaultMenuStyle() { return props.defaultMenuStyle; },
    get defaultMenuClassName() { return props.defaultMenuClassName; },
    get defaultListType() { return (props.config.settings?.listType as 'ul' | 'ol') ?? 'ul'; },
    get defaultMaxVisibleItems() { return (props.config.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS; },
  };

  setContext(ALAP_KEY, ctx);
</script>

{@render children()}
