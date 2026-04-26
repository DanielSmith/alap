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
import { ref, shallowRef, computed, watch, nextTick, onMounted, onUnmounted, type CSSProperties, type ComponentPublicInstance } from 'vue';
import { useAlapContext } from './useAlap';
import { useMenuDismiss } from './useMenuDismiss';
import { createMenuKeyHandler } from './useMenuKeyboard';
import type { AlapLink as AlapLinkType, SourceState } from '../../core/types';
import {
  sanitizeUrlByTier,
  sanitizeCssClassByTier,
  sanitizeTargetWindowByTier,
} from '../../core/sanitizeByTier';

// Vue templates can't call multi-arg helpers inline cleanly; wrap each
// (AlapLinkType is already imported above alongside SourceState.)
// tier helper as a single-arg lambda over the item so the template reads
// naturally (`:class="classFor(item)"`).
function classFor(item: AlapLinkType): string {
  const safe = sanitizeCssClassByTier(item.cssClass, item);
  return safe ? `alapListElem ${safe}` : 'alapListElem';
}
function hrefFor(item: AlapLinkType): string {
  return sanitizeUrlByTier(item.url, item);
}
function imageFor(item: AlapLinkType): string {
  return sanitizeUrlByTier(item.image ?? '', item);
}
function targetFor(item: AlapLinkType): string {
  return sanitizeTargetWindowByTier(item.targetWindow, item) ?? 'fromAlap';
}
import type { AlapLinkMode } from './providerKey';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ProgressiveRenderContext } from '../shared';
import { applyPlacementAfterLayout, clearPlacementClass, observeTriggerOffscreen, ProgressiveRenderer, flipFromRect, centerOverTrigger, placeholderDescriptor } from '../shared';
import { DEFAULT_MENU_Z_INDEX, REM_PER_MENU_ITEM } from '../../constants';

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
  /** Placement string, e.g. "SE", "SE, clamp", "N, place". When set, uses the placement engine. */
  placement?: string;
  /** Pixel gap between trigger and menu edge. Default: 4. Only used when placement is set. */
  gap?: number;
  /** Minimum pixel distance from viewport edges. Default: 8. Only used when placement is set. */
  padding?: number;
}>(), {
  mode: 'dom',
});

const ctx = useAlapContext();

const isOpen = ref(false);
// shallowRef so each ResolvedLink keeps its raw object identity. Vue's
// default `ref` deep-proxies array elements, which would break the
// WeakMap-keyed provenance lookup that sanitizeByTier relies on — the
// proxied item is a different reference from the one validateConfig
// stamped, and getProvenance(proxy) returns undefined (fail-closed
// drops cssClass, clamps target). The items array is replaced as a
// whole on each resolve cycle, so shallow reactivity is enough.
const items = shallowRef<ResolvedLink[]>([]);
const sources = ref<SourceState[]>([]);
const isLoadingOnly = ref(false);
let openedViaKeyboard = false;
let progressive: ProgressiveRenderer | null = null;
let pendingFlipRect: DOMRect | null = null;
let lastClickEvent: MouseEvent | null = null;

let idCounter = 0;
const uid = ++idCounter + Math.random().toString(36).slice(2, 8);
const triggerId = `alap-trigger-${uid}`;
const menuId = `alap-menu-${uid}`;

const triggerRef = ref<HTMLElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const itemEls: HTMLAnchorElement[] = [];

const resolvedListType = computed(() => props.listType ?? ctx.defaultListType);
const resolvedMaxVisibleItems = computed(() => props.maxVisibleItems ?? ctx.defaultMaxVisibleItems);

// --- Merged styles and classes ---

const menuPositionDefaults: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: '0',
  zIndex: DEFAULT_MENU_Z_INDEX,
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

const placeholderDescriptors = computed(() =>
  sources.value.map((src) => ({ key: `ph:${src.token}`, ...placeholderDescriptor(src) }))
);

// --- Menu coordinator (close others when this one opens) ---

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = ctx.menuCoordinator.subscribe(triggerId, () => {
    progressive?.stop();
    isOpen.value = false;
    isLoadingOnly.value = false;
  });

  progressive = new ProgressiveRenderer({
    engine: ctx.engine,
    onRender: (renderCtx: ProgressiveRenderContext) => {
      if (renderCtx.transitioningFromLoading && menuRef.value) {
        pendingFlipRect = menuRef.value.getBoundingClientRect();
      }
      if (!renderCtx.isUpdate) {
        ctx.menuCoordinator.notifyOpen(triggerId);
      }
      items.value = renderCtx.state.resolved as ResolvedLink[];
      sources.value = renderCtx.state.sources as SourceState[];
      isLoadingOnly.value = renderCtx.isLoadingOnly;
      isOpen.value = true;
    },
    cancelFetchOnDismiss: () => ctx.config?.settings?.cancelFetchOnDismiss === true,
  });
});

onUnmounted(() => {
  progressive?.stop();
  progressive = null;
  unsubscribe?.();
});

// --- Open / close ---

function closeMenu() {
  progressive?.stop();
  const wasOpen = isOpen.value;
  isLoadingOnly.value = false;
  isOpen.value = false;
  if (wasOpen) triggerRef.value?.focus();
}

function openMenu(event: MouseEvent) {
  if (!triggerRef.value) return;
  lastClickEvent = event;
  progressive?.start(triggerRef.value, props.query, event, props.anchorId);
}

function toggleMenu(event: MouseEvent) {
  if (isOpen.value) closeMenu();
  else openMenu(event);
}

// --- Dismiss (timer, click outside, escape) ---

const { startTimer, stopTimer } = useMenuDismiss(
  isOpen, closeMenu, ctx.menuTimeout, props.mode, triggerRef, menuRef,
);

// --- Focus first item on open ---

watch([isOpen, isLoadingOnly], async ([open, loading]) => {
  if (open && !loading) {
    await nextTick();
    if (openedViaKeyboard) itemEls[0]?.focus();
    openedViaKeyboard = false;
    startTimer();
  }
});

// --- Center-over-trigger while loading-only; FLIP on transition ---
//
// Loading-only uses CSS-var-driven inline styles from `centerOverTrigger` so
// a tiny placeholder doesn't flip direction differently from the resolved menu.
// Once real items arrive, the compass watcher below takes over, and we animate
// from the previously-measured rect to the new placement.
watch([isOpen, isLoadingOnly, items, sources], async () => {
  await nextTick();
  if (!menuRef.value || !triggerRef.value) return;

  if (isOpen.value && isLoadingOnly.value && lastClickEvent) {
    centerOverTrigger(
      menuRef.value,
      triggerRef.value,
      lastClickEvent,
      DEFAULT_MENU_Z_INDEX,
    );
    return;
  }

  if (pendingFlipRect && !isLoadingOnly.value) {
    flipFromRect(menuRef.value, pendingFlipRect);
    pendingFlipRect = null;
  }
});

// --- Compass placement ---

let scrollHandler: (() => void) | null = null;

watch([isOpen, isLoadingOnly, items, sources], async () => {
  // Clean up previous scroll handler
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }

  if (!isOpen.value || isLoadingOnly.value || !props.placement || props.mode === 'popover') return;

  await nextTick();
  const triggerEl = triggerRef.value;
  const menuEl = menuRef.value;
  const wrapperEl = wrapperRef.value;
  if (!triggerEl || !menuEl || !wrapperEl) return;

  // Clear any inline styles set by centerOverTrigger so placement can take over.
  menuEl.style.cssText = '';

  const applyNow = applyPlacementAfterLayout(triggerEl, menuEl, wrapperEl, {
    placement: props.placement!,
    gap: props.gap,
    padding: props.padding,
  });

  scrollHandler = () => applyNow();
  window.addEventListener('scroll', scrollHandler, { passive: true });
});

// --- Trigger scroll-away detection ---

let intersectionObserver: IntersectionObserver | null = null;

watch(isOpen, (open) => {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }

  if (!open || props.mode === 'popover') return;
  if (!triggerRef.value) return;

  intersectionObserver = observeTriggerOffscreen(triggerRef.value, closeMenu);
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
    progressive?.stop();
    isOpen.value = false;
    isLoadingOnly.value = false;
  }
}

// --- Trigger handlers ---

function handleTriggerClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (props.mode === 'popover' && !isOpen.value) {
    openMenu(e);
  } else {
    toggleMenu(e);
  }
}

function handleTriggerKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openedViaKeyboard = true;
    const synth = new MouseEvent('click', { bubbles: true, cancelable: true });
    if (props.mode === 'popover' && !isOpen.value) {
      openMenu(synth);
    } else {
      toggleMenu(synth);
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
      :data-alap-loading-only="isLoadingOnly ? '' : null"
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
            :class="classFor(item)"
          >
            <a
              :ref="(el) => setItemRef(el, i)"
              :href="hrefFor(item)"
              :target="targetFor(item)"
              rel="noopener noreferrer"
              role="menuitem"
              :tabindex="-1"
              @mouseenter="handleItemMouseEnter(item)"
              @contextmenu="handleItemContextMenu($event, item)"
            >
              <img
                v-if="item.image"
                :src="imageFor(item)"
                :alt="item.altText ?? `image for ${item.id}`"
              />
              <template v-else>{{ item.label ?? item.id }}</template>
            </a>
          </li>
          <li
            v-for="desc in placeholderDescriptors"
            :key="desc.key"
            v-bind="desc.attrs"
            :class="desc.className"
          >
            <a aria-disabled="true" :tabindex="-1">{{ desc.label }}</a>
          </li>
        </component>
      </template>
    </div>
  </template>

  <!-- DOM and Web Component modes -->
  <template v-else>
    <span ref="wrapperRef" style="position: relative; display: inline">
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
      :data-alap-loading-only="isLoadingOnly ? '' : null"
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
          :class="classFor(item)"
        >
          <a
            :ref="(el) => setItemRef(el, i)"
            :href="hrefFor(item)"
            :target="targetFor(item)"
            rel="noopener noreferrer"
            role="menuitem"
            :tabindex="-1"
            @mouseenter="handleItemMouseEnter(item)"
            @contextmenu="handleItemContextMenu($event, item)"
          >
            <img
              v-if="item.image"
              :src="imageFor(item)"
              :alt="item.altText ?? `image for ${item.id}`"
            />
            <template v-else>{{ item.label ?? item.id }}</template>
          </a>
        </li>
        <li
          v-for="src in sources"
          :key="`ph:${src.token}`"
          role="none"
          aria-live="polite"
          :data-alap-placeholder="src.status"
          :data-alap-placeholder-token="src.token"
          :class="`alapListElem alap-placeholder alap-placeholder-${src.status}`"
        >
          <a aria-disabled="true" :tabindex="-1">{{ placeholderLabel(src.status) }}</a>
        </li>
      </component>
    </div>
    </span>
  </template>
</template>
