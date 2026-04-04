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

import { createSignal, createEffect, onCleanup, For, Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useAlapContext } from './context';
import type { AlapLink as AlapLinkType } from '../../core/types';
import { sanitizeUrl } from '../../core/sanitizeUrl';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from '../shared';
import { applyPlacementAfterLayout, clearPlacementClass, observeTriggerOffscreen } from '../shared';
import { REM_PER_MENU_ITEM } from '../../constants';

export type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail };
export type AlapLinkMode = 'dom' | 'webcomponent' | 'popover';

export interface AlapLinkProps {
  query: string;
  anchorId?: string;
  mode?: AlapLinkMode;
  children: JSX.Element;
  class?: string;
  menuClassName?: string;
  menuStyle?: JSX.CSSProperties;
  listType?: 'ul' | 'ol';
  maxVisibleItems?: number;
  onTriggerHover?: (detail: TriggerHoverDetail) => void;
  onTriggerContext?: (detail: TriggerContextDetail) => void;
  onItemHover?: (detail: ItemHoverDetail) => void;
  onItemContext?: (detail: ItemContextDetail) => void;
  /** Placement string, e.g. "SE", "SE, clamp", "N, place". When set, uses the placement engine. */
  placement?: string;
  /** Pixel gap between trigger and menu edge. Default: 4. */
  gap?: number;
  /** Minimum pixel distance from viewport edges. Default: 8. */
  padding?: number;
}

type ResolvedLink = { id: string } & AlapLinkType;

let idCounter = 0;
function uid() {
  return `alap-${++idCounter}`;
}

export function AlapLink(props: AlapLinkProps) {
  const ctx = useAlapContext();

  const [isOpen, setIsOpen] = createSignal(false);
  const [items, setItems] = createSignal<ResolvedLink[]>([]);

  const triggerId = uid();
  const menuId = uid();

  let triggerEl: HTMLSpanElement | undefined;
  let menuEl: HTMLDivElement | undefined;
  let wrapperEl: HTMLSpanElement | undefined;
  const itemEls: HTMLAnchorElement[] = [];

  let timerId = 0;

  const mode = () => props.mode ?? 'dom';
  const resolvedListType = () => props.listType ?? ctx.defaultListType;
  const resolvedMaxVisibleItems = () => props.maxVisibleItems ?? ctx.defaultMaxVisibleItems;

  const mergedMenuClassName = () => {
    const parts = ['alapelem'];
    if (ctx.defaultMenuClassName) parts.push(ctx.defaultMenuClassName);
    if (props.menuClassName) parts.push(props.menuClassName);
    return parts.join(' ');
  };

  const menuPositionDefaults: JSX.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '0',
    'z-index': '10',
  };

  const mergedMenuStyle = (): JSX.CSSProperties => {
    return { ...menuPositionDefaults, ...ctx.defaultMenuStyle, ...props.menuStyle };
  };

  // --- Timer ---

  function startTimer() {
    stopTimer();
    timerId = window.setTimeout(closeMenu, ctx.menuTimeout);
  }

  function stopTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = 0;
    }
  }

  // --- Menu coordinator (close others when this one opens) ---

  const unsubscribe = ctx.menuCoordinator.subscribe(triggerId, () => {
    setIsOpen(false);
  });

  // --- Open / close ---

  function openMenu() {
    const resolved = ctx.engine.resolve(props.query, props.anchorId);
    if (resolved.length === 0) return;
    ctx.menuCoordinator.notifyOpen(triggerId);
    setItems(resolved);
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
    stopTimer();
    triggerEl?.focus();
  }

  function toggleMenu() {
    if (isOpen()) closeMenu();
    else openMenu();
  }

  // --- Focus first item on open ---

  createEffect(() => {
    if (isOpen() && itemEls[0]) {
      itemEls[0].focus();
      startTimer();
    }
  });

  // --- Click outside + Escape (dom/webcomponent modes) ---

  createEffect(() => {
    if (!isOpen() || mode() === 'popover') return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuEl && !menuEl.contains(target) &&
        triggerEl && !triggerEl.contains(target)
      ) {
        closeMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    onCleanup(() => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    });
  });

  // --- Popover toggle event ---

  createEffect(() => {
    if (mode() !== 'popover' || !menuEl) return;
    const el = menuEl;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === 'closed') {
        setIsOpen(false);
      }
    };
    el.addEventListener('toggle', onToggle);
    onCleanup(() => el.removeEventListener('toggle', onToggle));
  });

  // --- Compass placement ---

  createEffect(() => {
    if (!isOpen() || !props.placement || mode() === 'popover') return;
    if (!triggerEl || !menuEl || !wrapperEl) return;

    const tEl = triggerEl;
    const mEl = menuEl;
    const wEl = wrapperEl;
    const p = props.placement;

    const applyNow = applyPlacementAfterLayout(tEl, mEl, wEl, {
      placement: p,
      gap: props.gap,
      padding: props.padding,
    });

    const onScroll = () => applyNow();
    window.addEventListener('scroll', onScroll, { passive: true });

    onCleanup(() => {
      window.removeEventListener('scroll', onScroll);
      clearPlacementClass(mEl);
    });
  });

  // --- Trigger scroll-away detection ---

  createEffect(() => {
    if (!isOpen() || mode() === 'popover') return;
    if (!triggerEl) return;

    const observer = observeTriggerOffscreen(triggerEl, closeMenu);
    onCleanup(() => observer.disconnect());
  });

  // --- Cleanup timer on unmount ---

  onCleanup(() => {
    stopTimer();
    unsubscribe();
  });

  // --- Keyboard nav ---

  function handleMenuKeyDown(e: KeyboardEvent) {
    const validItems = itemEls.filter(Boolean);
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
  }

  // --- Trigger handlers ---

  function handleTriggerClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mode() === 'popover' && !isOpen()) {
      openMenu();
    } else {
      toggleMenu();
    }
  }

  function handleTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (mode() === 'popover' && !isOpen()) {
        openMenu();
      } else {
        toggleMenu();
      }
    }
  }

  // --- Scroll style for max visible items ---

  const scrollStyle = (): JSX.CSSProperties | undefined => {
    const max = resolvedMaxVisibleItems();
    if (max > 0 && items().length > max) {
      return { 'max-height': `${max * REM_PER_MENU_ITEM}rem`, 'overflow-y': 'auto' };
    }
    return undefined;
  };

  // --- Menu list ---

  function MenuList() {
    itemEls.length = 0;

    return (
      <Dynamic component={resolvedListType()} role="presentation" style={scrollStyle()}>
        <For each={items()}>
          {(item, i) => (
            <li
              role="none"
              class={item.cssClass ? `alapListElem ${item.cssClass}` : 'alapListElem'}
            >
              <a
                ref={(el) => { itemEls[i()] = el; }}
                href={sanitizeUrl(item.url)}
                target={item.targetWindow ?? 'fromAlap'}
                role="menuitem"
                tabIndex={-1}
                onMouseEnter={props.onItemHover
                  ? () => props.onItemHover!({ id: item.id, link: item, query: props.query })
                  : undefined}
                onContextMenu={props.onItemContext
                  ? (e: MouseEvent) => props.onItemContext!({ id: item.id, link: item, query: props.query, event: e })
                  : undefined}
              >
                {item.image ? (
                  <img src={sanitizeUrl(item.image)} alt={item.altText ?? `image for ${item.id}`} />
                ) : (
                  item.label ?? item.id
                )}
              </a>
            </li>
          )}
        </For>
      </Dynamic>
    );
  }

  // --- Render ---

  const triggerProps = {
    ref: (el: HTMLSpanElement) => { triggerEl = el; },
    role: 'button' as const,
    tabIndex: 0,
    'aria-haspopup': 'true' as const,
    get 'aria-expanded'() { return isOpen(); },
    get 'aria-controls'() { return isOpen() ? menuId : undefined; },
    class: props.class,
    onClick: handleTriggerClick,
    onKeyDown: handleTriggerKeyDown,
    onMouseEnter: props.onTriggerHover
      ? () => props.onTriggerHover!({ query: props.query, anchorId: props.anchorId })
      : undefined,
    onContextMenu: props.onTriggerContext
      ? (e: MouseEvent) => props.onTriggerContext!({ query: props.query, anchorId: props.anchorId, event: e })
      : undefined,
  };

  const menuContainerProps = {
    ref: (el: HTMLDivElement) => { menuEl = el; },
    id: menuId,
    role: 'menu' as const,
    'aria-labelledby': triggerId,
    get class() { return mergedMenuClassName(); },
    get style() { return mergedMenuStyle(); },
    onKeyDown: handleMenuKeyDown,
    onMouseLeave: startTimer,
    onMouseEnter: stopTimer,
  };

  if (mode() === 'popover') {
    return (
      <>
        <span {...triggerProps} popover-target={menuId}>
          {props.children}
        </span>
        <div {...menuContainerProps} popover="auto">
          <Show when={isOpen()}>
            <MenuList />
          </Show>
        </div>
      </>
    );
  }

  return (
    <span ref={(el) => { wrapperEl = el; }} style={{ position: 'relative', display: 'inline' }}>
      <span {...triggerProps}>{props.children}</span>
      <Show when={isOpen()}>
        <div {...menuContainerProps}>
          <MenuList />
        </div>
      </Show>
    </span>
  );
}
