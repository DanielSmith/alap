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
  import { AlapProvider, AlapLink } from '../../../src/ui/svelte';
  import type { AlapConfig } from '../../../src/core/types';

  interface Props {
    config: AlapConfig;
    query: string;
    slotText: string;
    triggerClass?: string;
    menuClassName?: string;
    menuStyle?: Record<string, string>;
    listType?: 'ul' | 'ol';
    maxVisibleItems?: number;
    defaultMenuClassName?: string;
    defaultMenuStyle?: Record<string, string>;
  }

  let {
    config,
    query,
    slotText,
    triggerClass,
    menuClassName,
    menuStyle,
    listType,
    maxVisibleItems,
    defaultMenuClassName,
    defaultMenuStyle,
  }: Props = $props();
</script>

<AlapProvider {config} {defaultMenuClassName} {defaultMenuStyle}>
  <AlapLink
    {query}
    class={triggerClass}
    {menuClassName}
    {menuStyle}
    {listType}
    {maxVisibleItems}
  >
    {slotText}
  </AlapLink>
</AlapProvider>
