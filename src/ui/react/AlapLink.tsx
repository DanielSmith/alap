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
import type { AlapLink as AlapLinkType } from '../../core/types';
import { sanitizeUrl } from '../../core/sanitizeUrl';
import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail, Placement } from '../shared';
import { calcPlacementState, applyPlacementToMenu, clearPlacementClass, observeTriggerOffscreen } from '../shared';
import { REM_PER_MENU_ITEM } from '../../constants';

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

  /** Compass placement (N, NE, E, SE, S, SW, W, NW, C). When set, uses the placement engine instead of CSS-only positioning. */
  placement?: Placement;

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
  const { engine, config, menuTimeout, defaultMenuStyle, defaultMenuClassName, defaultListType, defaultMaxVisibleItems } =
    useAlapContext();

  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ResolvedLink[]>([]);

  const triggerId = useId();
  const menuId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const resolvedListType = listType ?? defaultListType;
  const resolvedMaxVisibleItems = maxVisibleItems ?? defaultMaxVisibleItems;

  // --- Merged styles and classes ---

  const menuPositionDefaults: CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 10,
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

  // --- Open / close ---

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    const resolved = engine.resolve(query, anchorId);
    if (resolved.length === 0) return;
    setItems(resolved);
    setIsOpen(true);
  }, [engine, query, anchorId]);

  const toggleMenu = useCallback(() => {
    if (isOpen) closeMenu();
    else openMenu();
  }, [isOpen, closeMenu, openMenu]);

  // --- Dismiss (timer, click outside, escape) ---

  const { startTimer, stopTimer } = useMenuDismiss(
    isOpen, closeMenu, menuTimeout, mode, triggerRef, menuRef,
  );

  // --- Focus first item on open ---

  useEffect(() => {
    if (isOpen && itemRefs.current[0]) {
      itemRefs.current[0].focus();
      startTimer();
    }
  }, [isOpen, startTimer]);

  // --- Compass placement ---

  useEffect(() => {
    if (!isOpen || !placement || mode === 'popover') return;
    if (!triggerRef.current || !menuRef.current || !wrapperRef.current) return;

    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    const wrapperEl = wrapperRef.current;

    const apply = () => {
      const state = calcPlacementState(triggerEl, menuEl, { placement, gap, padding });
      applyPlacementToMenu(menuEl, wrapperEl, state);
    };

    // Initial placement
    apply();

    // Recompute on scroll
    const onScroll = () => apply();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearPlacementClass(menuEl);
    };
  }, [isOpen, placement, gap, padding, mode]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setIsOpen(false);
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
      openMenu();
    } else {
      toggleMenu();
    }
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (mode === 'popover' && !isOpen) {
        openMenu();
      } else {
        toggleMenu();
      }
    }
  };

  // --- Menu items ---

  const menuContent = isOpen && (
    <MenuList
      items={items}
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
  listType: string;
  maxVisibleItems: number;
  itemRefs: React.RefObject<(HTMLAnchorElement | null)[]>;
  query: string;
  onItemHover?: (detail: ItemHoverDetail) => void;
  onItemContext?: (detail: ItemContextDetail) => void;
}

function MenuList({ items, listType, maxVisibleItems, itemRefs, query, onItemHover, onItemContext }: MenuListProps) {
  itemRefs.current = [];
  const ListTag = listType as 'ul' | 'ol';

  const scrollStyle: CSSProperties | undefined =
    maxVisibleItems > 0 && items.length > maxVisibleItems
      ? { maxHeight: `${maxVisibleItems * REM_PER_MENU_ITEM}rem`, overflowY: 'auto' }
      : undefined;

  return (
    <ListTag role="presentation" style={scrollStyle}>
      {items.map((item, i) => (
        <li
          key={item.id}
          role="none"
          className={item.cssClass ? `alapListElem ${item.cssClass}` : 'alapListElem'}
        >
          <a
            ref={(el) => { itemRefs.current[i] = el; }}
            href={sanitizeUrl(item.url)}
            target={item.targetWindow ?? 'fromAlap'}
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
              <img src={sanitizeUrl(item.image)} alt={item.altText ?? `image for ${item.id}`} />
            ) : (
              item.label ?? item.id
            )}
          </a>
        </li>
      ))}
    </ListTag>
  );
}
