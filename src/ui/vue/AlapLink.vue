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
import { ref, computed, watch, nextTick, type CSSProperties, type ComponentPublicInstance } from 'vue';
import { useAlapContext } from './useAlap';
import { useMenuDismiss } from './useMenuDismiss';
import { createMenuKeyHandler } from './useMenuKeyboard';
import type { AlapLink as AlapLinkType } from '../../core/types';
import { sanitizeUrl } from '../../core/sanitizeUrl';
import type { AlapLinkMode } from './providerKey';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from '../shared';
import { REM_PER_MENU_ITEM } from '../../constants';

type ResolvedLink = { id: string } & AlapLinkType;

const emit = defineEmits<{
  'trigger-hover': [detail: TriggerHoverDetail];
  'trigger-context': [detail: TriggerContextDetail];
  'item-hover': [detail: ItemHoverDetail];
  'item-context': [detail: ItemContextDetail];
}>();

const props = withDefaults(defineProps<{
  query: string;
  anchorId?: string;
  mode?: AlapLinkMode;
  class?: string;
  menuClassName?: string;
  menuStyle?: CSSProperties;
  listType?: 'ul' | 'ol';
  maxVisibleItems?: number;
}>(), {
  mode: 'dom',
});

const ctx = useAlapContext();

const isOpen = ref(false);
const items = ref<ResolvedLink[]>([]);

let idCounter = 0;
const uid = ++idCounter + Math.random().toString(36).slice(2, 8);
const triggerId = `alap-trigger-${uid}`;
const menuId = `alap-menu-${uid}`;

const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const itemEls: HTMLAnchorElement[] = [];

const resolvedListType = computed(() => props.listType ?? ctx.defaultListType);
const resolvedMaxVisibleItems = computed(() => props.maxVisibleItems ?? ctx.defaultMaxVisibleItems);

// --- Merged styles and classes ---

const menuPositionDefaults: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: '0',
  zIndex: 10,
};

const mergedMenuStyle = computed<CSSProperties>(() => {
  return { ...menuPositionDefaults, ...ctx.defaultMenuStyle, ...props.menuStyle };
});

const mergedMenuClassName = computed(() => {
  const parts = ['alapelem'];
  if (ctx.defaultMenuClassName) parts.push(ctx.defaultMenuClassName);
  if (props.menuClassName) parts.push(props.menuClassName);
  return parts.join(' ');
});

const scrollStyle = computed<CSSProperties | undefined>(() =>
  resolvedMaxVisibleItems.value > 0 && items.value.length > resolvedMaxVisibleItems.value
    ? { maxHeight: `${resolvedMaxVisibleItems.value * REM_PER_MENU_ITEM}rem`, overflowY: 'auto' }
    : undefined
);

// --- Open / close ---

function closeMenu() {
  isOpen.value = false;
  triggerRef.value?.focus();
}

function openMenu() {
  const resolved = ctx.engine.resolve(props.query, props.anchorId);
  if (resolved.length === 0) return;
  items.value = resolved;
  isOpen.value = true;
}

function toggleMenu() {
  if (isOpen.value) closeMenu();
  else openMenu();
}

// --- Dismiss (timer, click outside, escape) ---

const { startTimer, stopTimer } = useMenuDismiss(
  isOpen, closeMenu, ctx.menuTimeout, props.mode, triggerRef, menuRef,
);

// --- Focus first item on open ---

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    itemEls[0]?.focus();
    startTimer();
  }
});

// --- Close on config change ---

watch(() => ctx.config, () => {
  if (isOpen.value) closeMenu();
});

// --- Keyboard nav ---

const handleMenuKeyDown = createMenuKeyHandler(
  () => itemEls.filter(Boolean),
  closeMenu,
);

// --- Popover toggle event ---

function handlePopoverToggle(e: Event) {
  if ((e as ToggleEvent).newState === 'closed') {
    isOpen.value = false;
  }
}

// --- Trigger handlers ---

function handleTriggerClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (props.mode === 'popover' && !isOpen.value) {
    openMenu();
  } else {
    toggleMenu();
  }
}

function handleTriggerKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (props.mode === 'popover' && !isOpen.value) {
      openMenu();
    } else {
      toggleMenu();
    }
  }
}

// --- Event hooks ---

function handleTriggerMouseEnter() {
  emit('trigger-hover', { query: props.query, anchorId: props.anchorId });
}

function handleTriggerContextMenu(e: MouseEvent) {
  emit('trigger-context', { query: props.query, anchorId: props.anchorId, event: e });
}

function handleItemMouseEnter(item: ResolvedLink) {
  emit('item-hover', { id: item.id, link: item, query: props.query });
}

function handleItemContextMenu(e: MouseEvent, item: ResolvedLink) {
  emit('item-context', { id: item.id, link: item, query: props.query, event: e });
}

// --- Collect item refs ---

function setItemRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el) itemEls[index] = el as HTMLAnchorElement;
}
</script>

<template>
  <!-- Popover mode -->
  <template v-if="mode === 'popover'">
    <span
      ref="triggerRef"
      :id="triggerId"
      role="button"
      :tabindex="0"
      aria-haspopup="true"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="isOpen ? menuId : undefined"
      :class="props.class"
      :popovertarget="menuId"
      @click="handleTriggerClick"
      @keydown="handleTriggerKeyDown"
      @mouseenter="handleTriggerMouseEnter"
      @contextmenu="handleTriggerContextMenu"
    >
      <slot />
    </span>
    <div
      ref="menuRef"
      :id="menuId"
      role="menu"
      :aria-labelledby="triggerId"
      :class="mergedMenuClassName"
      :style="mergedMenuStyle"
      popover="auto"
      @keydown="handleMenuKeyDown"
      @mouseleave="startTimer"
      @mouseenter="stopTimer"
      @toggle="handlePopoverToggle"
    >
      <template v-if="isOpen">
        <component
          :is="resolvedListType"
          role="presentation"
          :style="scrollStyle"
        >
          <li
            v-for="(item, i) in items"
            :key="item.id"
            role="none"
            :class="item.cssClass ? `alapListElem ${item.cssClass}` : 'alapListElem'"
          >
            <a
              :ref="(el) => setItemRef(el, i)"
              :href="sanitizeUrl(item.url)"
              :target="item.targetWindow ?? 'fromAlap'"
              role="menuitem"
              :tabindex="-1"
              @mouseenter="handleItemMouseEnter(item)"
              @contextmenu="handleItemContextMenu($event, item)"
            >
              <img
                v-if="item.image"
                :src="sanitizeUrl(item.image)"
                :alt="item.altText ?? `image for ${item.id}`"
              />
              <template v-else>{{ item.label ?? item.id }}</template>
            </a>
          </li>
        </component>
      </template>
    </div>
  </template>

  <!-- DOM and Web Component modes -->
  <template v-else>
    <span style="position: relative; display: inline">
    <span
      ref="triggerRef"
      :id="triggerId"
      role="button"
      :tabindex="0"
      aria-haspopup="true"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="isOpen ? menuId : undefined"
      :class="props.class"
      @click="handleTriggerClick"
      @keydown="handleTriggerKeyDown"
      @mouseenter="handleTriggerMouseEnter"
      @contextmenu="handleTriggerContextMenu"
    >
      <slot />
    </span>
    <div
      v-if="isOpen"
      ref="menuRef"
      :id="menuId"
      role="menu"
      :aria-labelledby="triggerId"
      :class="mergedMenuClassName"
      :style="mergedMenuStyle"
      @keydown="handleMenuKeyDown"
      @mouseleave="startTimer"
      @mouseenter="stopTimer"
    >
      <component
        :is="resolvedListType"
        role="presentation"
        :style="scrollStyle"
      >
        <li
          v-for="(item, i) in items"
          :key="item.id"
          role="none"
          :class="item.cssClass ? `alapListElem ${item.cssClass}` : 'alapListElem'"
        >
          <a
            :ref="(el) => setItemRef(el, i)"
            :href="sanitizeUrl(item.url)"
            :target="item.targetWindow ?? 'fromAlap'"
            role="menuitem"
            :tabindex="-1"
            @mouseenter="handleItemMouseEnter(item)"
            @contextmenu="handleItemContextMenu($event, item)"
          >
            <img
              v-if="item.image"
              :src="sanitizeUrl(item.image)"
              :alt="item.altText ?? `image for ${item.id}`"
            />
            <template v-else>{{ item.label ?? item.id }}</template>
          </a>
        </li>
      </component>
    </div>
    </span>
  </template>
</template>
