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

import {
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
  useId,
  noSerialize,
  $,
  Slot,
  type NoSerialize,
  type QRL,
  type CSSProperties,
} from '@builder.io/qwik';
import { useAlapContext } from './context';
import type { AlapLink as AlapLinkType, SourceState } from '../../core/types';
import {
  sanitizeUrlByTier,
  sanitizeCssClassByTier,
  sanitizeTargetWindowByTier,
} from '../../core/sanitizeByTier';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ProgressiveRenderContext } from '../shared';
import { applyPlacementAfterLayout, clearPlacementClass, observeTriggerOffscreen, ProgressiveRenderer, flipFromRect, centerOverTrigger, placeholderDescriptor } from '../shared';
import {
  REM_PER_MENU_ITEM,
  DEFAULT_MENU_Z_INDEX,
  MENU_CONTAINER_CLASS,
  MENU_ITEM_CLASS,
  DEFAULT_LINK_TARGET,
} from '../../constants';

export type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail };
export type AlapLinkMode = 'dom' | 'popover';

export interface AlapLinkProps {
  query: string;
  anchorId?: string;
  mode?: AlapLinkMode;
  class?: string;
  menuClassName?: string;
  menuStyle?: CSSProperties;
  listType?: 'ul' | 'ol';
  maxVisibleItems?: number;
  onTriggerHover$?: QRL<(detail: TriggerHoverDetail) => void>;
  onTriggerContext$?: QRL<(detail: TriggerContextDetail) => void>;
  onItemHover$?: QRL<(detail: ItemHoverDetail) => void>;
  onItemContext$?: QRL<(detail: ItemContextDetail) => void>;
  /** Placement string, e.g. "SE", "SE, clamp", "N, place". */
  placement?: string;
  gap?: number;
  padding?: number;
}

type ResolvedLink = { id: string } & AlapLinkType;

const WRAPPER_STYLE: CSSProperties = { position: 'relative', display: 'inline' };

const MENU_POSITION_DEFAULTS: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: '0',
  zIndex: String(DEFAULT_MENU_Z_INDEX),
};

export const AlapLink = component$<AlapLinkProps>((props) => {
  const ctx = useAlapContext();

  const isOpen = useSignal(false);
  const items = useSignal<ResolvedLink[]>([]);
  const sources = useSignal<SourceState[]>([]);
  const isLoadingOnly = useSignal(false);

  const triggerId = useId();
  const menuId = useId();

  const triggerRef = useSignal<HTMLSpanElement>();
  const menuRef = useSignal<HTMLDivElement>();
  const wrapperRef = useSignal<HTMLSpanElement>();
  const itemRefs = useSignal<HTMLAnchorElement[]>([]);

  const timerId = useSignal(0);
  const openedViaKeyboard = useSignal(false);

  // Qwik serializes component state across server/client, so runtime-only
  // objects (renderer instance, DOMRect, MouseEvent) go through noSerialize.
  const progressiveBox = useStore<{ current: NoSerialize<ProgressiveRenderer> | undefined }>({ current: undefined });
  const pendingFlipBox = useStore<{ current: NoSerialize<DOMRect> | undefined }>({ current: undefined });
  const lastClickBox = useStore<{ current: NoSerialize<MouseEvent> | undefined }>({ current: undefined });

  const mode = props.mode ?? 'dom';
  const resolvedListType = props.listType ?? ctx.defaultListType;
  const resolvedMaxVisibleItems = props.maxVisibleItems ?? ctx.defaultMaxVisibleItems;

  const mergedMenuClassName = (() => {
    const parts = [MENU_CONTAINER_CLASS];
    if (ctx.defaultMenuClassName) parts.push(ctx.defaultMenuClassName);
    if (props.menuClassName) parts.push(props.menuClassName);
    return parts.join(' ');
  })();

  const mergedMenuStyle: CSSProperties = { ...MENU_POSITION_DEFAULTS, ...props.menuStyle };

  // --- Timer ---

  const stopTimer = $(() => {
    if (timerId.value) {
      clearTimeout(timerId.value);
      timerId.value = 0;
    }
  });

  const closeMenu = $(() => {
    progressiveBox.current?.stop();
    const wasOpen = isOpen.value;
    isLoadingOnly.value = false;
    isOpen.value = false;
    stopTimer();
    if (wasOpen) triggerRef.value?.focus();
  });

  const startTimer = $(() => {
    stopTimer();
    timerId.value = window.setTimeout(() => {
      const wasOpen = isOpen.value;
      isOpen.value = false;
      timerId.value = 0;
      if (wasOpen) triggerRef.value?.focus();
    }, ctx.menuTimeout);
  });

  // --- Open / close ---

  const openMenu = $((event: MouseEvent) => {
    if (!ctx.engine || !triggerRef.value) return;
    lastClickBox.current = noSerialize(event);
    progressiveBox.current?.start(triggerRef.value, props.query, event, props.anchorId);
  });

  const toggleMenu = $((event: MouseEvent) => {
    if (isOpen.value) closeMenu();
    else openMenu(event);
  });

  // --- Browser-only setup: initialize ProgressiveRenderer on client ---

  useVisibleTask$(({ cleanup }) => {
    const renderer = new ProgressiveRenderer({
      engine: () => ctx.engine,
      onRender: (renderCtx: ProgressiveRenderContext) => {
        if (renderCtx.transitioningFromLoading && menuRef.value) {
          pendingFlipBox.current = noSerialize(menuRef.value.getBoundingClientRect());
        }
        items.value = renderCtx.state.resolved as ResolvedLink[];
        sources.value = renderCtx.state.sources as SourceState[];
        isLoadingOnly.value = renderCtx.isLoadingOnly;
        isOpen.value = true;
      },
      cancelFetchOnDismiss: () => ctx.config?.settings?.cancelFetchOnDismiss === true,
    });
    progressiveBox.current = noSerialize(renderer);

    cleanup(() => {
      renderer.stop();
      progressiveBox.current = undefined;
    });
  });

  // --- Browser-only effects: dismissal, focus, placement ---

  useVisibleTask$(({ track, cleanup }) => {
    const open = track(() => isOpen.value);
    const loading = track(() => isLoadingOnly.value);
    track(() => items.value);
    track(() => sources.value);
    if (!open) return;

    // Focus first item on keyboard open only (skip while loading-only).
    if (!loading) {
      requestAnimationFrame(() => {
        const firstItem = itemRefs.value[0];
        if (firstItem) {
          if (openedViaKeyboard.value) firstItem.focus();
          openedViaKeyboard.value = false;
          startTimer();
        }
      });
    }

    // Loading-only: center the menu over the trigger via CSS-var-driven inline
    // styles. Skips compass placement because a tiny placeholder would flip
    // differently than the full menu. When items arrive, the compass branch
    // below runs and the pending rect triggers a FLIP animation.
    if (loading && menuRef.value && triggerRef.value && lastClickBox.current) {
      centerOverTrigger(
        menuRef.value,
        triggerRef.value,
        lastClickBox.current,
        DEFAULT_MENU_Z_INDEX,
      );
    }

    // Click outside + escape (dom mode only)
    if (mode !== 'popover') {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          menuRef.value && !menuRef.value.contains(target) &&
          triggerRef.value && !triggerRef.value.contains(target)
        ) {
          closeMenu();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeMenu();
      };

      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      cleanup(() => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      });
    }

    // Compass placement (only once real items are present).
    if (!loading && props.placement && mode !== 'popover') {
      const tEl = triggerRef.value;
      const mEl = menuRef.value;
      const wEl = wrapperRef.value;

      if (tEl && mEl && wEl) {
        // Clear any inline styles set by centerOverTrigger so placement can take over.
        mEl.style.cssText = '';

        const applyNow = applyPlacementAfterLayout(tEl, mEl, wEl, {
          placement: props.placement!,
          gap: props.gap,
          padding: props.padding,
        });

        const onScroll = () => applyNow();
        window.addEventListener('scroll', onScroll, { passive: true });

        cleanup(() => {
          window.removeEventListener('scroll', onScroll);
          clearPlacementClass(mEl);
        });
      }
    }

    // FLIP animation on transition from loading → resolved.
    if (!loading && pendingFlipBox.current && menuRef.value) {
      flipFromRect(menuRef.value, pendingFlipBox.current);
      pendingFlipBox.current = undefined;
    }

    // Trigger scroll-away detection
    if (mode !== 'popover' && triggerRef.value) {
      const observer = observeTriggerOffscreen(triggerRef.value, () => closeMenu());
      cleanup(() => observer.disconnect());
    }
  });

  // Popover toggle event

  useVisibleTask$(({ cleanup }) => {
    if (mode !== 'popover' || !menuRef.value) return;
    const el = menuRef.value;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === 'closed') {
        progressiveBox.current?.stop();
        isOpen.value = false;
        isLoadingOnly.value = false;
      }
    };
    el.addEventListener('toggle', onToggle);
    cleanup(() => el.removeEventListener('toggle', onToggle));
  });

  // Cleanup timer on unmount

  useVisibleTask$(({ cleanup }) => {
    cleanup(() => {
      if (timerId.value) clearTimeout(timerId.value);
    });
  });

  // --- Trigger handlers ---

  const handleTriggerClick = $((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'popover' && !isOpen.value) {
      openMenu(e);
    } else {
      toggleMenu(e);
    }
  });

  const handleTriggerKeyDown = $((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openedViaKeyboard.value = true;
      const synth = new MouseEvent('click', { bubbles: true, cancelable: true });
      if (mode === 'popover' && !isOpen.value) {
        openMenu(synth);
      } else {
        toggleMenu(synth);
      }
    }
  });

  // --- Keyboard nav ---

  const handleMenuKeyDown = $((e: KeyboardEvent) => {
    const validItems = itemRefs.value.filter(Boolean);
    if (validItems.length === 0) return;

    const activeIndex = validItems.indexOf(document.activeElement as HTMLAnchorElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = activeIndex < validItems.length - 1 ? activeIndex + 1 : 0;
        validItems[next].focus();
        validItems[next].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : validItems.length - 1;
        validItems[prev].focus();
        validItems[prev].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'Home':
        e.preventDefault();
        validItems[0].focus();
        validItems[0].scrollIntoView({ block: 'nearest' });
        break;
      case 'End':
        e.preventDefault();
        validItems[validItems.length - 1].focus();
        validItems[validItems.length - 1].scrollIntoView({ block: 'nearest' });
        break;
      case 'Escape':
      case 'Tab':
        closeMenu();
        break;
    }
  });

  // --- Scroll style for max visible items ---

  const scrollStyle: CSSProperties | undefined =
    resolvedMaxVisibleItems > 0 && items.value.length > resolvedMaxVisibleItems
      ? { maxHeight: `${resolvedMaxVisibleItems * REM_PER_MENU_ITEM}rem`, overflowY: 'auto' }
      : undefined;

  // --- Shared menu item renderer ---

  const renderItems = () =>
    items.value.map((item, i) => {
      const safeCssClass = sanitizeCssClassByTier(item.cssClass, item);
      return (
      <li
        key={item.id}
        role="none"
        class={safeCssClass ? `${MENU_ITEM_CLASS} ${safeCssClass}` : MENU_ITEM_CLASS}
      >
        <a
          ref={(el: Element) => { itemRefs.value[i] = el as HTMLAnchorElement; }}
          href={sanitizeUrlByTier(item.url, item)}
          target={sanitizeTargetWindowByTier(item.targetWindow, item) ?? DEFAULT_LINK_TARGET}
          rel="noopener noreferrer"
          role="menuitem"
          tabIndex={-1}
          onMouseEnter$={props.onItemHover$
            ? $(() => props.onItemHover$!({ id: item.id, link: item, query: props.query }))
            : undefined}
          onContextMenu$={props.onItemContext$
            ? $((e: MouseEvent) => props.onItemContext$!({ id: item.id, link: item, query: props.query, event: e }))
            : undefined}
        >
          {item.image ? (
            <img src={sanitizeUrlByTier(item.image, item)} alt={item.altText ?? `image for ${item.id}`} />
          ) : (
            item.label ?? item.id
          )}
        </a>
      </li>
      );
    });

  // --- Render ---

  const ListTag = resolvedListType;

  const triggerProps = {
    ref: triggerRef,
    role: 'button' as const,
    tabIndex: 0,
    'aria-haspopup': 'true' as const,
    'aria-expanded': isOpen.value,
    'aria-controls': isOpen.value ? menuId : undefined,
    class: props.class,
    onClick$: handleTriggerClick,
    onKeyDown$: handleTriggerKeyDown,
    onMouseEnter$: props.onTriggerHover$
      ? $(() => props.onTriggerHover$!({ query: props.query, anchorId: props.anchorId }))
      : undefined,
    onContextMenu$: props.onTriggerContext$
      ? $((e: MouseEvent) => props.onTriggerContext$!({ query: props.query, anchorId: props.anchorId, event: e }))
      : undefined,
  };

  const menuContainerProps = {
    ref: menuRef,
    id: menuId,
    role: 'menu' as const,
    'aria-labelledby': triggerId,
    class: mergedMenuClassName,
    style: mergedMenuStyle,
    'data-alap-loading-only': isLoadingOnly.value ? '' : undefined,
    onKeyDown$: handleMenuKeyDown,
    onMouseLeave$: startTimer,
    onMouseEnter$: stopTimer,
  };

  const renderPlaceholders = () =>
    sources.value.map((src) => {
      const desc = placeholderDescriptor(src);
      return (
        <li key={`ph:${src.token}`} {...desc.attrs} class={desc.className}>
          <a aria-disabled="true" tabIndex={-1}>{desc.label}</a>
        </li>
      );
    });

  if (mode === 'popover') {
    return (
      <>
        <span {...triggerProps} {...{ popoverTarget: menuId } as Record<string, string>}>
          <Slot />
        </span>
        <div {...menuContainerProps} {...{ popover: 'auto' } as Record<string, string>}>
          {isOpen.value && (
            <ListTag role="presentation" style={scrollStyle}>
              {renderItems()}
              {renderPlaceholders()}
            </ListTag>
          )}
        </div>
      </>
    );
  }

  return (
    <span ref={wrapperRef} style={WRAPPER_STYLE}>
      <span {...triggerProps}>
        <Slot />
      </span>
      {isOpen.value && (
        <div {...menuContainerProps}>
          <ListTag role="presentation" style={scrollStyle}>
            {renderItems()}
            {renderPlaceholders()}
          </ListTag>
        </div>
      )}
    </span>
  );
});
