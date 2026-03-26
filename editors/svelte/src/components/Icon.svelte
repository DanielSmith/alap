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
  let { svg, width = 16, height = 16, ...rest }: {
    svg: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  } = $props();
</script>

<span
  class="inline-flex items-center justify-center"
  style:width="{width}px"
  style:height="{height}px"
  {...rest}
>
  {@html svg}
</span>
