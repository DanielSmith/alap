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

<script setup lang="ts">
import { provide, shallowRef, watch, computed, type CSSProperties } from 'vue';
import { AlapEngine } from '../../core/AlapEngine';
import type { AlapConfig, ProtocolHandlerRegistry } from '../../core/types';
import { DEFAULT_MENU_TIMEOUT, DEFAULT_MAX_VISIBLE_ITEMS } from '../../constants';
import { AlapKey, type AlapContextValue, createMenuCoordinator } from './providerKey';

const props = defineProps<{
  config: AlapConfig;
  /**
   * Protocol handler registry. Required for any expression that uses a
   * protocol (`:web:`, `:time:`, `:hn:`, custom…). Attached at construction
   * and preserved across config updates.
   */
  handlers?: ProtocolHandlerRegistry;
  menuTimeout?: number;
  defaultMenuStyle?: CSSProperties;
  defaultMenuClassName?: string;
}>();

// Handlers pass through at construction; updateConfig later leaves them in place.
const engineRef = shallowRef(new AlapEngine(props.config, { handlers: props.handlers }));
const menuCoordinator = createMenuCoordinator();

watch(() => props.config, (cfg) => {
  engineRef.value.updateConfig(cfg);
});

const ctx = computed<AlapContextValue>(() => ({
  engine: engineRef.value,
  config: props.config,
  menuTimeout: props.menuTimeout
    ?? (props.config.settings?.menuTimeout as number)
    ?? DEFAULT_MENU_TIMEOUT,
  menuCoordinator,
  defaultMenuStyle: props.defaultMenuStyle,
  defaultMenuClassName: props.defaultMenuClassName,
  defaultListType: (props.config.settings?.listType as 'ul' | 'ol') ?? 'ul',
  defaultMaxVisibleItems: (props.config.settings?.maxVisibleItems as number) ?? DEFAULT_MAX_VISIBLE_ITEMS,
}));

provide(AlapKey, ctx);
</script>

<template>
  <slot />
</template>
