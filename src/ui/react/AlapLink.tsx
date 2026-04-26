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
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
  useMemo,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
} from 'react';
import { useAlapContext } from './AlapContext';
import { useMenuDismiss } from './useMenuDismiss';
import { createMenuKeyHandler } from './useMenuKeyboard';
import type { AlapLink as AlapLinkType, SourceState } from '../../core/types';
import {
  sanitizeUrlByTier,
  sanitizeCssClassByTier,
  sanitizeTargetWindowByTier,
} from '../../core/sanitizeByTier';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, ProgressiveRenderContext } from '../shared';
import { applyPlacementAfterLayout, clearPlacementClass, observeTriggerOffscreen, ProgressiveRenderer, flipFromRect, centerOverTrigger, placeholderDescriptor } from '../shared';
import { DEFAULT_MENU_Z_INDEX, REM_PER_MENU_ITEM } from '../../constants';

export type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail };
export type AlapLinkMode = 'dom' | 'webcomponent' | 'popover';

export interface AlapLinkProps {
  /** The expression to evaluate, e.g. ".coffee + .nyc" */
  query: string;

  /** Anchor ID for bare @ macro expansion */
  anchorId?: string;

  /** Rendering mode. Default: "dom" */
  mode?: AlapLinkMode;

  /** Trigger content */
  children: ReactNode;

  /** CSS class for the trigger element */
  className?: string;

  /** CSS class for the menu container. Merged with provider's defaultMenuClassName. */
  menuClassName?: string;

  /** Inline styles for the menu container. Merged with provider's defaultMenuStyle. */
  menuStyle?: CSSProperties;

  /** List type override. Default: from config or "ul" */
  listType?: 'ul' | 'ol';

  /** Max visible items before the menu scrolls. 0 = no limit. Overrides config default. */
  maxVisibleItems?: number;

  /** Fired when the mouse enters the trigger */
  onTriggerHover?: (detail: TriggerHoverDetail) => void;

  /** Fired on right-click of the trigger */
  onTriggerContext?: (detail: TriggerContextDetail) => void;

  /** Fired when the mouse enters a menu item */
  onItemHover?: (detail: ItemHoverDetail) => void;

  /** Fired on right-click of a menu item */
  onItemContext?: (detail: ItemContextDetail) => void;

  /** Placement string, e.g. "SE", "SE, clamp", "N, place". When set, uses the placement engine. */
  placement?: string;

  /** Pixel gap between trigger and menu edge. Default: 4. Only used when placement is set. */
  gap?: number;

  /** Minimum pixel distance from viewport edges. Default: 8. Only used when placement is set. */
  padding?: number;
}

type ResolvedLink = { id: string } & AlapLinkType;

export function AlapLink({
  query,
  anchorId,
  mode = 'dom',
  children,
  className,
  menuClassName,
  menuStyle,
  listType,
  maxVisibleItems,
  onTriggerHover,
  onTriggerContext,
  onItemHover,
  onItemContext,
  placement,
  gap,
  padding,
}: AlapLinkProps) {
  const { engine, config, menuTimeout, defaultMenuStyle, defaultMenuClassName, defaultListType, defaultMaxVisibleItems, menuCoordinator } =
    useAlapContext();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ResolvedLink[]>([]);
  const [sources, setSources] = useState<SourceState[]>([]);
  const [isLoadingOnly, setIsLoadingOnly] = useState(false);
  const openedViaKeyboard = useRef(false);

  const triggerId = useId();
  const menuId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const progressiveRef = useRef<ProgressiveRenderer | null>(null);
  const pendingFlipRect = useRef<DOMRect | null>(null);
  const lastClickEvent = useRef<MouseEvent | null>(null);

  const resolvedListType = listType ?? defaultListType;
  const resolvedMaxVisibleItems = maxVisibleItems ?? defaultMaxVisibleItems;

  // --- Merged styles and classes ---

  const menuPositionDefaults: CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: DEFAULT_MENU_Z_INDEX,
  };

  const mergedMenuStyle = useMemo<CSSProperties>(() => {
    return { ...menuPositionDefaults, ...defaultMenuStyle, ...menuStyle };
  }, [defaultMenuStyle, menuStyle]);

  const mergedMenuClassName = useMemo(() => {
    const parts = ['alapelem'];
    if (defaultMenuClassName) parts.push(defaultMenuClassName);
    if (menuClassName) parts.push(menuClassName);
    return parts.join(' ');
  }, [defaultMenuClassName, menuClassName]);

  // --- Coordinate with other AlapLinks (only one menu open at a time) ---

  const closeMenuSilent = useCallback(() => {
    progressiveRef.current?.stop();
    setIsOpen(false);
    setIsLoadingOnly(false);
  }, []);

  useEffect(() => {
    return menuCoordinator.subscribe(triggerId, closeMenuSilent);
  }, [menuCoordinator, triggerId, closeMenuSilent]);

  // --- Open / close ---

  const closeMenu = useCallback(() => {
    progressiveRef.current?.stop();
    setIsLoadingOnly(false);
    setIsOpen((prev) => {
      if (prev) triggerRef.current?.focus();
      return false;
    });
  }, []);

  // --- Progressive rendering ---
  //
  // `ProgressiveRenderer` invokes `onRender` synchronously on first paint and
  // again each time a pending async source settles. We mirror its payload into
  // reactive state; React re-renders the menu with items + placeholders.
  //
  // The FLIP animation (loading-only → resolved) is driven by capturing the
  // menu's box *before* `setState` runs (we're still in the renderer's
  // microtask) and applying `flipFromRect` in a `useLayoutEffect` after React
  // commits the new DOM.
  const onProgressiveRender = useCallback((ctx: ProgressiveRenderContext) => {
    if (ctx.transitioningFromLoading && menuRef.current) {
      pendingFlipRect.current = menuRef.current.getBoundingClientRect();
    }
    if (!ctx.isUpdate) {
      menuCoordinator.notifyOpen(triggerId);
    }
    setItems(ctx.state.resolved as ResolvedLink[]);
    setSources(ctx.state.sources as SourceState[]);
    setIsLoadingOnly(ctx.isLoadingOnly);
    setIsOpen(true);
  }, [menuCoordinator, triggerId]);

  useEffect(() => {
    progressiveRef.current = new ProgressiveRenderer({
      engine,
      onRender: onProgressiveRender,
      cancelFetchOnDismiss: () => config?.settings?.cancelFetchOnDismiss === true,
    });
    return () => {
      progressiveRef.current?.stop();
      progressiveRef.current = null;
    };
  }, [engine, config, onProgressiveRender]);

  const openMenu = useCallback((event: MouseEvent) => {
    if (!triggerRef.current) return;
    lastClickEvent.current = event;
    progressiveRef.current?.start(triggerRef.current, query, event, anchorId);
  }, [query, anchorId]);

  const toggleMenu = useCallback((event: MouseEvent) => {
    if (isOpen) closeMenu();
    else openMenu(event);
  }, [isOpen, closeMenu, openMenu]);

  // --- Dismiss (timer, click outside, escape) ---

  const { startTimer, stopTimer } = useMenuDismiss(
    isOpen, closeMenu, menuTimeout, mode, triggerRef, menuRef,
  );

  // --- Focus first item on open ---

  useEffect(() => {
    if (isOpen && !isLoadingOnly) {
      if (openedViaKeyboard.current && itemRefs.current[0]) {
        itemRefs.current[0].focus();
      }
      openedViaKeyboard.current = false;
      startTimer();
    }
  }, [isOpen, isLoadingOnly, startTimer]);

  // --- Center-over-trigger while loading-only ---
  //
  // In the loading-only phase we skip the compass placement engine. A tiny
  // "Loading…" box would flip in a different direction than the resolved menu,
  // which is both jarring and prone to overflow. Instead we center on the
  // trigger (via CSS-var-driven inline styles) and FLIP-animate to the final
  // placement on transition.
  useLayoutEffect(() => {
    if (!isOpen || !isLoadingOnly) return;
    if (!menuRef.current || !triggerRef.current || !lastClickEvent.current) return;
    centerOverTrigger(
      menuRef.current,
      triggerRef.current,
      lastClickEvent.current,
      DEFAULT_MENU_Z_INDEX,
    );
  }, [isOpen, isLoadingOnly, items, sources]);

  // --- FLIP animation from loading-only box to final placement ---

  useLayoutEffect(() => {
    if (isLoadingOnly) return;
    const prev = pendingFlipRect.current;
    if (!prev || !menuRef.current) return;
    flipFromRect(menuRef.current, prev);
    pendingFlipRect.current = null;
  }, [isLoadingOnly, items, sources]);

  // --- Compass placement ---

  useLayoutEffect(() => {
    if (!isOpen || isLoadingOnly || !placement || mode === 'popover') return;
    if (!triggerRef.current || !menuRef.current || !wrapperRef.current) return;

    // Clear any inline styles set by centerOverTrigger so placement can take over.
    menuRef.current.style.cssText = '';

    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    const wrapperEl = wrapperRef.current;

    const applyNow = applyPlacementAfterLayout(triggerEl, menuEl, wrapperEl, { placement, gap, padding });

    const onScroll = () => applyNow();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearPlacementClass(menuEl);
    };
  }, [isOpen, isLoadingOnly, placement, gap, padding, mode, items, sources]);

  // --- Trigger scroll-away detection ---

  useEffect(() => {
    if (!isOpen || mode === 'popover') return;
    if (!triggerRef.current) return;

    const observer = observeTriggerOffscreen(triggerRef.current, closeMenu);
    return () => observer.disconnect();
  }, [isOpen, mode, closeMenu]);

  // --- Close on config change ---

  useEffect(() => {
    if (isOpen) closeMenu();

  }, [config]);

  // --- Keyboard nav ---

  const handleMenuKeyDown = useMemo(
    () => createMenuKeyHandler(
      () => itemRefs.current.filter(Boolean) as HTMLAnchorElement[],
      closeMenu,
    ),
    [closeMenu],
  );

  // --- Popover toggle event ---

  useEffect(() => {
    if (mode !== 'popover' || !menuRef.current) return;
    const el = menuRef.current;
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === 'closed') {
        progressiveRef.current?.stop();
        setIsOpen(false);
        setIsLoadingOnly(false);
      }
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [mode]);

  // --- Trigger handlers ---

  const handleTriggerClick = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'popover' && !isOpen) {
      openMenu(e.nativeEvent);
    } else {
      toggleMenu(e.nativeEvent);
    }
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openedViaKeyboard.current = true;
      // Synthesize a MouseEvent so centerOverTrigger can still read click coords.
      const synth = new MouseEvent('click', { bubbles: true, cancelable: true });
      if (mode === 'popover' && !isOpen) {
        openMenu(synth);
      } else {
        toggleMenu(synth);
      }
    }
  };

  // --- Menu items ---

  const menuContent = isOpen && (
    <MenuList
      items={items}
      sources={sources}
      listType={resolvedListType}
      maxVisibleItems={resolvedMaxVisibleItems}
      itemRefs={itemRefs}
      query={query}
      onItemHover={onItemHover}
      onItemContext={onItemContext}
    />
  );

  // --- Trigger (shared across all modes) ---

  const triggerProps = {
    ref: triggerRef,
    role: 'button' as const,
    tabIndex: 0,
    'aria-haspopup': 'true' as const,
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? menuId : undefined,
    className,
    onClick: handleTriggerClick,
    onKeyDown: handleTriggerKeyDown,
    onMouseEnter: onTriggerHover
      ? () => onTriggerHover({ query, anchorId })
      : undefined,
    onContextMenu: onTriggerContext
      ? (e: ReactMouseEvent) => onTriggerContext({ query, anchorId, event: e.nativeEvent })
      : undefined,
  };

  // --- Menu container (shared across all modes) ---

  const menuContainerProps = {
    ref: menuRef,
    id: menuId,
    role: 'menu' as const,
    'aria-labelledby': triggerId,
    className: mergedMenuClassName,
    style: mergedMenuStyle,
    onKeyDown: handleMenuKeyDown,
    onMouseLeave: startTimer,
    onMouseEnter: stopTimer,
    'data-alap-loading-only': isLoadingOnly ? '' : undefined,
  };

  // --- Render: Popover mode ---

  if (mode === 'popover') {
    return (
      <>
        <span
          {...triggerProps}
          popoverTarget={menuId}
        >
          {children}
        </span>
        {/* popover element always in DOM, browser controls visibility */}
        <div
          {...menuContainerProps}
          popover="auto"
        >
          {menuContent}
        </div>
      </>
    );
  }

  // --- Render: DOM and Web Component modes ---

  return (
    <span ref={wrapperRef} style={{ position: 'relative', display: 'inline' }}>
      <span {...triggerProps}>{children}</span>
      {isOpen && (
        <div {...menuContainerProps}>
          {menuContent}
        </div>
      )}
    </span>
  );
}

// --- MenuList: extracted to avoid re-creating JSX logic ---

interface MenuListProps {
  items: ResolvedLink[];
  sources: SourceState[];
  listType: string;
  maxVisibleItems: number;
  itemRefs: React.RefObject<(HTMLAnchorElement | null)[]>;
  query: string;
  onItemHover?: (detail: ItemHoverDetail) => void;
  onItemContext?: (detail: ItemContextDetail) => void;
}

function MenuList({ items, sources, listType, maxVisibleItems, itemRefs, query, onItemHover, onItemContext }: MenuListProps) {
  itemRefs.current = [];
  const ListTag = listType as 'ul' | 'ol';

  // Only resolved items count toward the overflow cap — placeholders are
  // transient. If the menu grows past `maxVisibleItems` after async items
  // arrive, scroll kicks in as usual.
  const scrollStyle: CSSProperties | undefined =
    maxVisibleItems > 0 && items.length > maxVisibleItems
      ? { maxHeight: `${maxVisibleItems * REM_PER_MENU_ITEM}rem`, overflowY: 'auto' }
      : undefined;

  return (
    <ListTag role="presentation" style={scrollStyle}>
      {items.map((item, i) => {
        const safeCssClass = sanitizeCssClassByTier(item.cssClass, item);
        return (
        <li
          key={item.id}
          role="none"
          className={safeCssClass ? `alapListElem ${safeCssClass}` : 'alapListElem'}
        >
          <a
            ref={(el) => { itemRefs.current[i] = el; }}
            href={sanitizeUrlByTier(item.url, item)}
            target={sanitizeTargetWindowByTier(item.targetWindow, item) ?? 'fromAlap'}
            rel="noopener noreferrer"
            role="menuitem"
            tabIndex={-1}
            onMouseEnter={onItemHover
              ? () => onItemHover({ id: item.id, link: item, query })
              : undefined}
            onContextMenu={onItemContext
              ? (e: ReactMouseEvent) => onItemContext({ id: item.id, link: item, query, event: e.nativeEvent })
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
      })}
      {sources.map((src) => {
        const ph = placeholderDescriptor(src);
        return (
          <li key={`ph:${src.token}`} {...ph.attrs} className={ph.className}>
            <a aria-disabled="true" tabIndex={-1}>{ph.label}</a>
          </li>
        );
      })}
    </ListTag>
  );
}
