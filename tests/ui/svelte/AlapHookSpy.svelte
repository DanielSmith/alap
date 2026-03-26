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
  import { AlapProvider, useAlap } from '../../../src/ui/svelte';
  import type { AlapConfig } from '../../../src/core/types';

  interface Props {
    config: AlapConfig;
    expression: string;
    mode: 'query' | 'resolve' | 'getLinks';
  }

  let { config, expression, mode }: Props = $props();
</script>

<AlapProvider {config}>
  {@const { query, resolve, getLinks } = useAlap()}
  <span data-testid="result">
    {#if mode === 'query'}
      {JSON.stringify(query(expression))}
    {:else if mode === 'resolve'}
      {JSON.stringify(resolve(expression))}
    {:else if mode === 'getLinks'}
      {JSON.stringify(getLinks(expression.split(',')))}
    {/if}
  </span>
</AlapProvider>
