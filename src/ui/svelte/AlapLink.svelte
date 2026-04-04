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
  import { onDestroy } from 'svelte';
  import { getAlapContext, type AlapContextValue } from './context';
  import type { AlapLink as AlapLinkType } from '../../core/types';
  import { sanitizeUrl } from '../../core/sanitizeUrl';
  import type { TriggerHoverDetail, TriggerContextDetail, ItemHoverDetail, ItemContextDetail } from '../shared';
  import { applyPlacementAfterLayout, clearPlacementClass, observeTriggerOffscreen } from '../shared';
  import { REM_PER_MENU_ITEM } from '../../constants';

  type ResolvedLink = { id: string } & AlapLinkType;

  interface Props {
    query: string;
    anchorId?: string;
    mode?: 'dom' | 'webcomponent' | 'popover';
    class?: string;
    menuClassName?: string;
    menuStyle?: Record<string, string>;
    listType?: 'ul' | 'ol';
    maxVisibleItems?: number;
    children: import('svelte').Snippet;
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

  let {
    query,
    anchorId,
    mode = 'dom',
    class: className,
    menuClassName,
    menuStyle,
    listType,
    maxVisibleItems,
    children,
    onTriggerHover,
    onTriggerContext,
    onItemHover,
    onItemContext,
    placement,
    gap: gapProp,
    padding: paddingProp,
  }: Props = $props();

  const ctx: AlapContextValue = getAlapContext();

  let isOpen = $state(false);
  let items = $state<ResolvedLink[]>([]);

  // IDs for ARIA
  const uid = Math.random().toString(36).slice(2, 8);
  const triggerId = `alap-trigger-${uid}`;
  const menuId = `alap-menu-${uid}`;

  // Element refs
  let triggerEl: HTMLElement | undefined = $state();
  let menuEl: HTMLElement | undefined = $state();
  let wrapperEl: HTMLElement | undefined = $state();
  let itemEls: HTMLAnchorElement[] = $state([]);

  // Resolved props
  let resolvedListType = $derived(listType ?? ctx.defaultListType);
  let resolvedMaxVisibleItems = $derived(maxVisibleItems ?? ctx.defaultMaxVisibleItems);

  // Merged styles and classes
  let mergedMenuClassName = $derived(
    ['alapelem', ctx.defaultMenuClassName, menuClassName].filter(Boolean).join(' ')
  );

  const menuPositionDefaults: Record<string, string> = {
    position: 'absolute',
    top: '100%',
    left: '0',
    'z-index': '10',
  };

  let mergedMenuStyle = $derived<Record<string, string>>(
    { ...menuPositionDefaults, ...ctx.defaultMenuStyle, ...menuStyle }
  );

  let scrollStyle = $derived<string | undefined>(
    resolvedMaxVisibleItems > 0 && items.length > resolvedMaxVisibleItems
      ? `max-height: ${resolvedMaxVisibleItems * REM_PER_MENU_ITEM}rem; overflow-y: auto`
      : undefined
  );

  // --- Timer ---

  let timer = 0;

  function stopTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  function startTimer() {
    stopTimer();
    timer = window.setTimeout(closeMenu, ctx.menuTimeout);
  }

  // --- Menu coordinator (close others when this one opens) ---

  const unsubscribe = ctx.menuCoordinator.subscribe(triggerId, () => {
    isOpen = false;
  });

  // --- Open / close ---

  function closeMenu() {
    isOpen = false;
    triggerEl?.focus();
  }

  function openMenu() {
    const resolved = ctx.engine.resolve(query, anchorId);
    if (resolved.length === 0) return;
    ctx.menuCoordinator.notifyOpen(triggerId);
    items = resolved;
    isOpen = true;
  }

  function toggleMenu() {
    if (isOpen) closeMenu();
    else openMenu();
  }

  // --- Focus first item on open ---

  $effect(() => {
    if (isOpen) {
      // Wait for DOM update
      requestAnimationFrame(() => {
        itemEls[0]?.focus();
        startTimer();
      });
    }
  });

  // --- Compass placement ---

  let placementScrollHandler: (() => void) | null = null;

  $effect(() => {
    // Clean up previous
    if (placementScrollHandler) {
      window.removeEventListener('scroll', placementScrollHandler);
      placementScrollHandler = null;
    }

    if (!isOpen || !placement || mode === 'popover') return;
    if (!triggerEl || !menuEl || !wrapperEl) return;

    const tEl = triggerEl;
    const mEl = menuEl;
    const wEl = wrapperEl;
    const p = placement;

    const applyNow = applyPlacementAfterLayout(tEl, mEl, wEl, {
      placement: p,
      gap: gapProp,
      padding: paddingProp,
    });

    placementScrollHandler = () => applyNow();
    window.addEventListener('scroll', placementScrollHandler, { passive: true });

    return () => {
      if (placementScrollHandler) {
        window.removeEventListener('scroll', placementScrollHandler);
        placementScrollHandler = null;
      }
      clearPlacementClass(mEl);
    };
  });

  // --- Trigger scroll-away detection ---

  $effect(() => {
    if (!isOpen || mode === 'popover') return;
    if (!triggerEl) return;

    const observer = observeTriggerOffscreen(triggerEl, closeMenu);
    return () => observer.disconnect();
  });

  // --- Click outside + Escape (non-popover) ---

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as Node;
    if (
      menuEl && !menuEl.contains(target) &&
      triggerEl && !triggerEl.contains(target)
    ) {
      closeMenu();
    }
  }

  function handleDocumentEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') closeMenu();
  }

  $effect(() => {
    if (isOpen && mode !== 'popover') {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleDocumentEscape);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleDocumentEscape);
      };
    }
  });

  // --- Cleanup timer ---

  onDestroy(() => {
    stopTimer();
    unsubscribe();
  });

  // --- Trigger handlers ---

  function handleTriggerClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'popover' && !isOpen) {
      openMenu();
    } else {
      toggleMenu();
    }
  }

  function handleTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (mode === 'popover' && !isOpen) {
        openMenu();
      } else {
        toggleMenu();
      }
    }
  }

  // --- Menu keyboard nav ---

  function handleMenuKeyDown(e: KeyboardEvent) {
    const els = itemEls.filter(Boolean);
    if (els.length === 0) return;

    const activeIndex = els.indexOf(document.activeElement as HTMLAnchorElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = activeIndex < els.length - 1 ? activeIndex + 1 : 0;
        els[next].focus();
        els[next].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : els.length - 1;
        els[prev].focus();
        els[prev].scrollIntoView({ block: 'nearest' });
        break;
      }
      case 'Home':
        e.preventDefault();
        els[0].focus();
        els[0].scrollIntoView({ block: 'nearest' });
        break;
      case 'End':
        e.preventDefault();
        els[els.length - 1].focus();
        els[els.length - 1].scrollIntoView({ block: 'nearest' });
        break;
      case 'Escape':
        closeMenu();
        break;
      case 'Tab':
        closeMenu();
        break;
    }
  }

  // --- Event hooks ---

  function handleTriggerMouseEnter() {
    onTriggerHover?.({ query, anchorId });
  }

  function handleTriggerContextMenu(e: MouseEvent) {
    onTriggerContext?.({ query, anchorId, event: e });
  }

  function handleItemMouseEnter(item: ResolvedLink) {
    onItemHover?.({ id: item.id, link: item, query });
  }

  function handleItemContextMenu(e: MouseEvent, item: ResolvedLink) {
    onItemContext?.({ id: item.id, link: item, query, event: e });
  }

  // --- Popover toggle ---

  function handlePopoverToggle(e: Event) {
    if ((e as ToggleEvent).newState === 'closed') {
      isOpen = false;
    }
  }
</script>

{#if mode === 'popover'}
  <span
    bind:this={triggerEl}
    id={triggerId}
    role="button"
    tabindex={0}
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-controls={isOpen ? menuId : undefined}
    class={className}
    popovertarget={menuId}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeyDown}
    onmouseenter={handleTriggerMouseEnter}
    oncontextmenu={handleTriggerContextMenu}
  >
    {@render children()}
  </span>
  <!-- popover element always in DOM, browser controls visibility -->
  <div
    bind:this={menuEl}
    id={menuId}
    role="menu"
    tabindex={-1}
    aria-labelledby={triggerId}
    class={mergedMenuClassName}
    style={mergedMenuStyle ? Object.entries(mergedMenuStyle).map(([k, v]) => `${k}: ${v}`).join('; ') : undefined}
    popover="auto"
    onkeydown={handleMenuKeyDown}
    onmouseleave={startTimer}
    onmouseenter={stopTimer}
    ontoggle={handlePopoverToggle}
  >
    {#if isOpen}
      <svelte:element this={resolvedListType} role="presentation" style={scrollStyle}>
        {#each items as item, i}
          <li
            role="none"
            class={item.cssClass ? `alapListElem ${item.cssClass}` : 'alapListElem'}
          >
            <a
              bind:this={itemEls[i]}
              href={sanitizeUrl(item.url)}
              target={item.targetWindow ?? 'fromAlap'}
              role="menuitem"
              tabindex={-1}
              onmouseenter={() => handleItemMouseEnter(item)}
              oncontextmenu={(e) => handleItemContextMenu(e, item)}
            >
              {#if item.image}
                <img src={sanitizeUrl(item.image)} alt={item.altText ?? `image for ${item.id}`} />
              {:else}
                {item.label ?? item.id}
              {/if}
            </a>
          </li>
        {/each}
      </svelte:element>
    {/if}
  </div>

{:else}
  <!-- DOM and Web Component modes -->
  <span bind:this={wrapperEl} style="position: relative; display: inline">
  <span
    bind:this={triggerEl}
    id={triggerId}
    role="button"
    tabindex={0}
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-controls={isOpen ? menuId : undefined}
    class={className}
    onclick={handleTriggerClick}
    onkeydown={handleTriggerKeyDown}
    onmouseenter={handleTriggerMouseEnter}
    oncontextmenu={handleTriggerContextMenu}
  >
    {@render children()}
  </span>
  {#if isOpen}
    <div
      bind:this={menuEl}
      id={menuId}
      role="menu"
      tabindex={-1}
      aria-labelledby={triggerId}
      class={mergedMenuClassName}
      style={mergedMenuStyle ? Object.entries(mergedMenuStyle).map(([k, v]) => `${k}: ${v}`).join('; ') : undefined}
      onkeydown={handleMenuKeyDown}
      onmouseleave={startTimer}
      onmouseenter={stopTimer}
    >
      <svelte:element this={resolvedListType} role="presentation" style={scrollStyle}>
        {#each items as item, i}
          <li
            role="none"
            class={item.cssClass ? `alapListElem ${item.cssClass}` : 'alapListElem'}
          >
            <a
              bind:this={itemEls[i]}
              href={sanitizeUrl(item.url)}
              target={item.targetWindow ?? 'fromAlap'}
              role="menuitem"
              tabindex={-1}
              onmouseenter={() => handleItemMouseEnter(item)}
              oncontextmenu={(e) => handleItemContextMenu(e, item)}
            >
              {#if item.image}
                <img src={sanitizeUrl(item.image)} alt={item.altText ?? `image for ${item.id}`} />
              {:else}
                {item.label ?? item.id}
              {/if}
            </a>
          </li>
        {/each}
      </svelte:element>
    </div>
  {/if}
  </span>
{/if}
